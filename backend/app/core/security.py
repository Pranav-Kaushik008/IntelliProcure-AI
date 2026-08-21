"""
IntelliProcure AI – Security, Authentication & Authorization Engine
Hardened security module enforcing:
  - Strong password hashing (bcrypt with HMAC-SHA256 fallback)
  - JWT Access Token generation & type validation
  - Token Revocation / Blacklist tracking
  - Role-Based Access Control (RBAC) authorization dependencies
"""

from datetime import datetime, timedelta
from typing import Optional, List, Set, Any, Dict
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
import uuid

from jose import jwt as jose_jwt
from jose.exceptions import JWTError, ExpiredSignatureError

from app.config.settings import settings
from app.database.session import get_db

# ─── OAuth2 Bearer Scheme ──────────────────────────────────────────────────────
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")

# ─── In-Memory Token Revocation Blacklist ─────────────────────────────────────
_revoked_tokens: Set[str] = set()


def revoke_token(jti: str):
    """Add token identifier to revocation list (Logout)."""
    _revoked_tokens.add(jti)


def is_token_revoked(jti: str) -> bool:
    """Check if token identifier has been revoked."""
    return jti in _revoked_tokens


# ─── Password Hashing ────────────────────────────────────────────────────────
try:
    import bcrypt

    def get_password_hash(password: str) -> str:
        pwd_bytes = password.encode('utf-8')
        salt = bcrypt.gensalt(rounds=12)
        return bcrypt.hashpw(pwd_bytes, salt).decode('utf-8')

    def verify_password(plain_password: str, hashed_password: str) -> bool:
        try:
            return bcrypt.checkpw(
                plain_password.encode('utf-8'),
                hashed_password.encode('utf-8')
            )
        except Exception:
            return False
except Exception:
    import hmac
    import hashlib

    def get_password_hash(password: str) -> str:
        return hmac.new(
            settings.SECRET_KEY.encode('utf-8'),
            password.encode('utf-8'),
            hashlib.sha256
        ).hexdigest()

    def verify_password(plain_password: str, hashed_password: str) -> bool:
        return get_password_hash(plain_password) == hashed_password


# ─── JWT Encoding & Decoding ─────────────────────────────────────────────────

def encode_jwt(payload: dict) -> str:
    return jose_jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def decode_jwt(token: str) -> dict:
    return jose_jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + (
        expires_delta or timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    jti = str(uuid.uuid4())
    to_encode.update({
        "exp": expire,
        "iat": datetime.utcnow(),
        "type": "access",
        "jti": jti
    })
    return encode_jwt(to_encode)


def create_refresh_token(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
    jti = str(uuid.uuid4())
    to_encode.update({
        "exp": expire,
        "iat": datetime.utcnow(),
        "type": "refresh",
        "jti": jti
    })
    return encode_jwt(to_encode)


def decode_token(token: str, expected_type: str = "access") -> dict:
    try:
        payload = decode_jwt(token)

        # 1. Token Type Validation
        token_type = payload.get("type")
        if token_type != expected_type:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=f"Invalid token type. Expected '{expected_type}' token.",
                headers={"WWW-Authenticate": "Bearer"},
            )

        # 2. Revocation Check
        jti = payload.get("jti")
        if jti and is_token_revoked(jti):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token has been revoked.",
                headers={"WWW-Authenticate": "Bearer"},
            )

        return payload

    except ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has expired. Please log in again.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid signature or corrupted token.",
            headers={"WWW-Authenticate": "Bearer"},
        )


# ─── User Authentication Dependencies ────────────────────────────────────────

async def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
):
    from app.models.user import User

    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    payload = decode_token(token, expected_type="access")
    user_id_str: str = payload.get("sub")

    if not user_id_str:
        raise credentials_exception

    user = None
    try:
        user_uuid = uuid.UUID(user_id_str)
        user = db.query(User).filter(User.id == user_uuid, User.is_active == True).first()
    except (ValueError, AttributeError):
        pass

    if not user and "@" in user_id_str:
        user = db.query(User).filter(User.email == user_id_str, User.is_active == True).first()

    if not user:
        raise credentials_exception

    return user


async def get_current_active_user(current_user=Depends(get_current_user)):
    if not current_user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is disabled"
        )
    return current_user


# ─── Role-Based Access Control (RBAC) Engine ─────────────────────────────────

ROLE_ALIASES = {
    "procurement_manager": "manager",
    "manager": "manager",
    "viewer": "auditor",
    "auditor": "auditor",
    "admin": "admin",
    "buyer": "buyer",
    "finance": "finance",
    "supplier": "supplier",
}


def normalize_role(role_val: Any) -> str:
    """Normalize user role string or enum to standard role name."""
    if hasattr(role_val, "value"):
        r = str(role_val.value).lower().strip()
    else:
        r = str(role_val).lower().strip()
    return ROLE_ALIASES.get(r, r)


def require_roles(*allowed_roles: str):
    """
    Dependency enforcing Role-Based Access Control (RBAC).
    Admins are always granted permission.
    Maps aliases (e.g. procurement_manager -> manager, viewer -> auditor).
    """
    async def role_checker(current_user=Depends(get_current_active_user)):
        user_role = normalize_role(current_user.role)
        allowed_normalized = {normalize_role(r) for r in allowed_roles}
        allowed_normalized.add("admin")  # Admin always has access

        if user_role == "admin" or user_role in allowed_normalized:
            return current_user

        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Permission denied. Required role(s): {', '.join(allowed_roles)}. Your role is '{user_role}'."
        )

    return role_checker


# ── Common Role Dependencies ──────────────────────────────────────────────────
require_admin = require_roles("admin")
require_manager = require_roles("admin", "manager")
require_finance = require_roles("admin", "finance")
require_buyer = require_roles("admin", "buyer", "manager")


async def require_internal_user(current_user=Depends(get_current_active_user)):
    """
    Ensures user is an internal enterprise staff member (Admin, Manager, Buyer, Finance, Auditor).
    Blocks external supplier accounts from accessing internal company data.
    """
    user_role = normalize_role(current_user.role)
    if user_role == "supplier":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access restricted to internal enterprise personnel."
        )
    return current_user


async def require_non_auditor(current_user=Depends(get_current_active_user)):
    """
    Ensures user is NOT an Auditor or Viewer.
    Auditors are strictly read-only and cannot create, modify, or delete records.
    """
    user_role = normalize_role(current_user.role)
    if user_role == "auditor":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Auditors have read-only access. Mutation operations are prohibited."
        )
    return current_user


def get_supplier_for_user(current_user, db: Session):
    """
    If current_user is a supplier, returns their linked Supplier object.
    Matches by email or contact name. Returns None if internal staff.
    """
    from app.models.supplier import Supplier
    if normalize_role(current_user.role) != "supplier":
        return None
    supplier = db.query(Supplier).filter(
        (Supplier.email.ilike(current_user.email)) |
        (Supplier.contact_person.ilike(f"%{current_user.last_name}%")),
        Supplier.is_deleted == False
    ).first()
    return supplier


