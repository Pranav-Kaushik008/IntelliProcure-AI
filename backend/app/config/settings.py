"""
IntelliProcure AI – Application Configuration
Centralized settings management using Pydantic.
Supports fallback to sqlite:///./intelliprocure.db if PostgreSQL is not configured.
"""

from typing import List
import os

try:
    from pydantic_settings import BaseSettings
except ImportError:
    from pydantic import BaseModel as BaseSettings

    class BaseSettings(BaseSettings):
        def __init__(self, **kwargs):
            super().__init__(**kwargs)
            # Read from os.environ for overrides
            for key in self.model_fields.keys():
                env_val = os.getenv(key)
                if env_val is not None:
                    field_type = type(getattr(self, key))
                    if field_type == bool:
                        setattr(self, key, env_val.lower() in ("true", "1", "yes"))
                    elif field_type == int:
                        setattr(self, key, int(env_val))
                    else:
                        setattr(self, key, env_val)


class Settings(BaseSettings):
    """
    Application settings with environment variable support.
    All settings can be overridden via .env file or environment variables.
    """

    # ─── Application ─────────────────────────────────────────────────────────
    APP_NAME: str = "IntelliProcure AI"
    APP_VERSION: str = "1.0.0"
    APP_DESCRIPTION: str = "Enterprise Procurement Intelligence Platform"
    DEBUG: bool = True
    ENVIRONMENT: str = "development"

    # ─── Server ───────────────────────────────────────────────────────────────
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    WORKERS: int = 4

    # ─── Database ─────────────────────────────────────────────────────────────
    # Default to local SQLite for instant out-of-the-box development without requiring PostgreSQL setup
    DATABASE_URL: str = os.getenv(
        "DATABASE_URL",
        "sqlite:///./intelliprocure.db"
    )
    DB_POOL_SIZE: int = 10
    DB_MAX_OVERFLOW: int = 20
    DB_POOL_TIMEOUT: int = 30

    # ─── Redis ────────────────────────────────────────────────────────────────
    REDIS_URL: str = "redis://localhost:6379/0"
    REDIS_CACHE_TTL: int = 3600  # 1 hour

    # ─── JWT Authentication ───────────────────────────────────────────────────
    SECRET_KEY: str = os.getenv("SECRET_KEY", "NK52hYqFNjaZVwlR0nA4xqzjoUqHmLl1ccKSD3wcKNp")
    ALGORITHM: str = os.getenv("JWT_ALGORITHM", "HS256")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", 60))
    REFRESH_TOKEN_EXPIRE_DAYS: int = int(os.getenv("REFRESH_TOKEN_EXPIRE_DAYS", 30))

    # ─── CORS ─────────────────────────────────────────────────────────────────
    ALLOWED_ORIGINS: List[str] = [
        origin.strip()
        for origin in os.getenv(
            "ALLOWED_ORIGINS",
            "http://localhost:3000,http://localhost:5173,http://localhost:5174,http://127.0.0.1:5173"
        ).split(",")
        if origin.strip()
    ]
    ALLOWED_METHODS: List[str] = ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"]
    ALLOWED_HEADERS: List[str] = ["*"]

    # ─── AI / ML ──────────────────────────────────────────────────────────────
    OPENAI_API_KEY: str = os.getenv("OPENAI_API_KEY", "")
    OPENAI_MODEL: str = os.getenv("OPENAI_MODEL", "gpt-4o-mini")
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")
    GEMINI_MODEL: str = os.getenv("GEMINI_MODEL", "gemini-1.5-flash")
    ANTHROPIC_API_KEY: str = os.getenv("ANTHROPIC_API_KEY", "")
    AI_MODEL: str = "gpt-4o-mini"
    MAX_TOKENS: int = 4096

    # ─── SSO / OAuth 2.0 ──────────────────────────────────────────────────────
    OKTA_DOMAIN: str = os.getenv("OKTA_DOMAIN", "")
    OKTA_CLIENT_ID: str = os.getenv("OKTA_CLIENT_ID", "")
    OKTA_CLIENT_SECRET: str = os.getenv("OKTA_CLIENT_SECRET", "")
    GOOGLE_CLIENT_ID: str = os.getenv("GOOGLE_CLIENT_ID", "")
    GOOGLE_CLIENT_SECRET: str = os.getenv("GOOGLE_CLIENT_SECRET", "")

    # ─── Document OCR ─────────────────────────────────────────────────────────
    AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT: str = os.getenv("AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT", "")
    AZURE_DOCUMENT_INTELLIGENCE_KEY: str = os.getenv("AZURE_DOCUMENT_INTELLIGENCE_KEY", "")

    # ─── File Storage ─────────────────────────────────────────────────────────
    UPLOAD_DIR: str = "uploads"
    MAX_FILE_SIZE: int = 10 * 1024 * 1024  # 10MB
    AWS_ACCESS_KEY_ID: str = os.getenv("AWS_ACCESS_KEY_ID", "")
    AWS_SECRET_ACCESS_KEY: str = os.getenv("AWS_SECRET_ACCESS_KEY", "")
    AWS_REGION: str = os.getenv("AWS_REGION", "us-east-1")
    AWS_S3_BUCKET: str = os.getenv("AWS_S3_BUCKET", "intelliprocure-documents")

    # ─── Email ────────────────────────────────────────────────────────────────
    SENDGRID_API_KEY: str = os.getenv("SENDGRID_API_KEY", "")
    SENDGRID_FROM_EMAIL: str = os.getenv("SENDGRID_FROM_EMAIL", "noreply@intelliprocure.ai")
    SENDGRID_FROM_NAME: str = os.getenv("SENDGRID_FROM_NAME", "IntelliProcure AI")
    SMTP_HOST: str = os.getenv("SMTP_HOST", "smtp.gmail.com")
    SMTP_PORT: int = int(os.getenv("SMTP_PORT", 587))
    SMTP_USER: str = os.getenv("SMTP_USER", "")
    SMTP_PASSWORD: str = os.getenv("SMTP_PASSWORD", "")

    # ─── Celery ───────────────────────────────────────────────────────────────
    CELERY_BROKER_URL: str = os.getenv("CELERY_BROKER_URL", "redis://localhost:6379/1")
    CELERY_RESULT_BACKEND: str = os.getenv("CELERY_RESULT_BACKEND", "redis://localhost:6379/2")

    # ─── Monitoring & Security ────────────────────────────────────────────────
    SENTRY_DSN: str = os.getenv("SENTRY_DSN", "")
    STRIPE_SECRET_KEY: str = os.getenv("STRIPE_SECRET_KEY", "")
    STRIPE_WEBHOOK_SECRET: str = os.getenv("STRIPE_WEBHOOK_SECRET", "")

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = True


# Global settings instance
settings = Settings()
