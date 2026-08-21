"""
IntelliProcure AI – Authentication API Routes
Handles login, logout, token refresh, and password reset.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
import uuid
from datetime import datetime, timedelta
from app.database.session import get_db
from app.core.security import (
    verify_password, get_password_hash, create_access_token,
    create_refresh_token, decode_token, get_current_active_user
)
from app.models.user import User
from app.schemas.schemas import LoginRequest, TokenResponse, UserCreate, UserResponse
from app.config.settings import settings

router = APIRouter()


@router.post("/login", response_model=TokenResponse)
async def login(credentials: LoginRequest, db: Session = Depends(get_db)):
    """
    Authenticate user and return JWT tokens.
    Returns both access token (short-lived) and refresh token (long-lived).
    """
    user = db.query(User).filter(
        User.email == credentials.email,
        User.is_deleted == False
    ).first()

    if not user or not verify_password(credentials.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your account is disabled. Contact your administrator."
        )

    # Update last login
    user.last_login = datetime.utcnow()
    db.commit()

    # Generate tokens
    token_data = {"sub": str(user.id), "role": user.role, "email": user.email}
    access_token = create_access_token(data=token_data)
    refresh_token = create_refresh_token(data=token_data)

    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        user=UserResponse.model_validate(user)
    )


DISALLOWED_PUBLIC_DOMAINS = {
    "example.com", "test.com", "tempmail.com", "mailinator.com", "fake.com", "xyz.com", "pqr.com", "abc.com"
}

@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def register(user_data: UserCreate, db: Session = Depends(get_db)):
    """Register a new user account with enterprise domain validation."""
    email_clean = user_data.email.strip().lower()
    domain = email_clean.split("@")[-1] if "@" in email_clean else ""

    if not domain or "." not in domain or domain in DISALLOWED_PUBLIC_DOMAINS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Registration denied: '{domain}' is not a recognized corporate enterprise domain."
        )

    # Check if email already registered
    existing = db.query(User).filter(User.email == email_clean).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email address already registered"
        )

    # Auto-generate supplier_code style for users
    user = User(
        email=user_data.email,
        hashed_password=get_password_hash(user_data.password),
        first_name=user_data.first_name,
        last_name=user_data.last_name,
        role=user_data.role,
        department=user_data.department,
        job_title=user_data.job_title,
        phone=user_data.phone,
        is_active=True,
        is_verified=False,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    return UserResponse.model_validate(user)


@router.post("/refresh")
async def refresh_token(refresh_token: str, db: Session = Depends(get_db)):
    """Exchange a refresh token for a new access token."""
    payload = decode_token(refresh_token, expected_type="refresh")

    user_id_str = payload.get("sub")
    user = None
    try:
        user_uuid = uuid.UUID(user_id_str)
        user = db.query(User).filter(User.id == user_uuid).first()
    except (ValueError, AttributeError, TypeError):
        pass

    if not user and user_id_str and "@" in user_id_str:
        user = db.query(User).filter(User.email == user_id_str).first()

    if not user or not user.is_active:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")

    token_data = {"sub": str(user.id), "role": user.role, "email": user.email}
    return {
        "access_token": create_access_token(data=token_data),
        "token_type": "bearer",
        "expires_in": settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60
    }


@router.get("/me", response_model=UserResponse)
async def get_me(current_user: User = Depends(get_current_active_user)):
    """Get currently authenticated user profile."""
    return UserResponse.model_validate(current_user)


@router.post("/sso/{provider}/callback", response_model=TokenResponse)
async def sso_callback(
    provider: str,
    payload: dict,
    db: Session = Depends(get_db)
):
    """
    Handle enterprise SSO callback (Okta, Google).
    Enforces strict access control: User must already be registered or be master admin.
    Random/unregistered emails are rejected with 401 Unauthorized.
    """
    code = payload.get("code")
    if not code:
        raise HTTPException(status_code=400, detail="Missing authorization code")

    requested_email = (payload.get("email") or "").strip().lower()
    if not requested_email:
        raise HTTPException(status_code=400, detail="Email address is required for SSO authentication")

    is_master_admin = requested_email == "pranavkaushikyr@gmail.com"

    user = db.query(User).filter(User.email == requested_email, User.is_deleted == False).first()

    if not user:
        if is_master_admin:
            # Auto-provision master admin if first time
            user = User(
                email="pranavkaushikyr@gmail.com",
                hashed_password=get_password_hash("Admin@1234"),
                first_name="Pranav",
                last_name="Kaushik",
                role="admin",
                department="Executive Board",
                job_title="Chief Procurement Officer & Master Admin",
                is_active=True,
                is_verified=True,
            )
            db.add(user)
            db.commit()
            db.refresh(user)
        else:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=f"Access Denied: No account associated with '{requested_email}'. Please register for access or contact your administrator."
            )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your account has been deactivated or is pending administrator approval."
        )

    user.last_login = datetime.utcnow()
    db.commit()

    token_data = {"sub": str(user.id), "role": user.role, "email": user.email}
    access_token = create_access_token(data=token_data)
    refresh_token = create_refresh_token(data=token_data)

    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        user=UserResponse.model_validate(user)
    )



from app.core.security import (
    verify_password, get_password_hash, create_access_token,
    create_refresh_token, decode_token, get_current_active_user,
    oauth2_scheme, decode_jwt, revoke_token
)

@router.post("/logout")
async def logout(
    token: str = Depends(oauth2_scheme),
    current_user: User = Depends(get_current_active_user)
):
    """Logout current user and revoke access token."""
    try:
        payload = decode_jwt(token)
        jti = payload.get("jti")
        if jti:
            revoke_token(jti)
    except Exception:
        pass
    return {"message": "Logged out successfully"}


@router.post("/change-password")
async def change_password(
    payload: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Change the current user's password after verifying old password."""
    current_password = payload.get("current_password")
    new_password = payload.get("new_password")

    if not current_password or not new_password:
        raise HTTPException(status_code=400, detail="current_password and new_password are required")

    if len(new_password) < 8:
        raise HTTPException(status_code=400, detail="New password must be at least 8 characters")

    if not verify_password(current_password, current_user.hashed_password):
        raise HTTPException(status_code=401, detail="Current password is incorrect")

    current_user.hashed_password = get_password_hash(new_password)
    db.commit()

    return {"message": "Password changed successfully"}
