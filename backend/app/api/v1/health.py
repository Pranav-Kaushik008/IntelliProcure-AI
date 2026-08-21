"""IntelliProcure AI – Health Check Endpoints"""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import text
from datetime import datetime

from app.database.session import get_db
from app.config.settings import settings

router = APIRouter()


@router.get("/")
async def health_check(db: Session = Depends(get_db)):
    """Comprehensive health check for load balancers and monitoring."""
    db_status = "healthy"
    try:
        db.execute(text("SELECT 1"))
    except Exception:
        db_status = "unhealthy"

    return {
        "status": "healthy" if db_status == "healthy" else "degraded",
        "timestamp": datetime.utcnow().isoformat(),
        "version": settings.APP_VERSION,
        "environment": settings.ENVIRONMENT,
        "services": {
            "database": db_status,
            "api": "healthy"
        }
    }


@router.get("/ping")
async def ping():
    """Simple liveness check."""
    return {"ping": "pong", "timestamp": datetime.utcnow().isoformat()}
