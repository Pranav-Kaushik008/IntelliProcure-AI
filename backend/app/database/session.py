"""
IntelliProcure AI – Database Session Management
SQLAlchemy engine and session factory configuration.
Supports both PostgreSQL and SQLite seamlessly.
"""

from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy.exc import SQLAlchemyError
from fastapi import HTTPException
from typing import Generator
import logging

from app.config.settings import settings

logger = logging.getLogger(__name__)

# ─── Database Engine Configuration ─────────────────────────────────────────────
db_url = settings.DATABASE_URL
if db_url.startswith("postgres://"):
    db_url = db_url.replace("postgres://", "postgresql://", 1)

engine_kwargs = {
    "echo": False,
}

if db_url.startswith("sqlite"):
    engine_kwargs["connect_args"] = {"check_same_thread": False}
else:
    engine_kwargs.update({
        "pool_size": settings.DB_POOL_SIZE,
        "max_overflow": settings.DB_MAX_OVERFLOW,
        "pool_timeout": settings.DB_POOL_TIMEOUT,
        "pool_pre_ping": True,
    })

try:
    engine = create_engine(db_url, **engine_kwargs)
    with engine.connect() as conn:
        pass
except Exception as e:
    logger.warning(f"⚠️ Failed to connect to {db_url}. Falling back to SQLite: {e}")
    db_url = "sqlite:///./intelliprocure.db"
    engine = create_engine(db_url, connect_args={"check_same_thread": False})

# ─── Session Factory ──────────────────────────────────────────────────────────
SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine,
)

# ─── Base Model ───────────────────────────────────────────────────────────────
Base = declarative_base()


# ─── Dependency Injection ─────────────────────────────────────────────────────
def get_db() -> Generator[Session, None, None]:
    """
    FastAPI dependency that provides a database session.
    Automatically handles session lifecycle (open/close).
    Only logs real SQLAlchemy/database errors — not HTTP exceptions.
    """
    db = SessionLocal()
    try:
        yield db
    except HTTPException:
        # Re-raise HTTP exceptions (auth errors, 404s, etc.) without logging as DB error
        db.rollback()
        raise
    except SQLAlchemyError as e:
        logger.error(f"Database error: {e}")
        db.rollback()
        raise
    except Exception as e:
        logger.error(f"Unexpected error in DB session: {e}")
        db.rollback()
        raise
    finally:
        db.close()


def init_db() -> None:
    """
    Initialize database by creating all tables.
    Called on application startup.
    Applies lightweight SQLite column migrations for schema evolution
    without requiring Alembic or losing existing data.
    """
    from app.models import (  # noqa: F401 - Import models to register them
        user, supplier, purchase_request, purchase_order,
        rfq, quotation, invoice, contract, inventory,
        department, role, notification, audit_log,
        ai_recommendation, supplier_rating,
        purchase_order_item, purchase_request_item, budget
    )
    Base.metadata.create_all(bind=engine)
    logger.info("Database tables created successfully")

    # ── SQLite Schema Migrations ────────────────────────────────────────────────
    # Add new columns that may not exist in older DB files.
    # SQLite does not support IF NOT EXISTS on ALTER TABLE,
    # so we check PRAGMA table_info first.
    if settings.DATABASE_URL.startswith("sqlite"):
        _sqlite_add_columns_if_missing()


def _sqlite_add_columns_if_missing() -> None:
    """
    Idempotent SQLite column migrations.
    Adds any new columns introduced by model changes without dropping data.
    """
    migrations = [
        # Table            Column                    DDL type
        ("invoices", "goods_receipt_id",   "TEXT"),
        ("invoices", "match_status",       "TEXT"),
        ("invoices", "match_result",       "TEXT"),
        ("invoices", "match_performed_at", "DATETIME"),
        ("invoices", "partially_matched",  None),  # enum value — no column needed
        ("goods_receipts", "__check__",    None),  # sentinel — table existence checked by create_all
        ("contracts", "document_file_path", "TEXT"),
        ("contracts", "current_version",    "INTEGER"),
        ("contracts", "versions_history",   "TEXT"),
        ("contracts", "ai_summary",         "TEXT"),
        ("contracts", "ai_risk_assessment", "TEXT"),
        ("contracts", "ai_expiry_terms",    "TEXT"),
    ]

    with engine.connect() as conn:
        for table, column, col_type in migrations:
            if column == "__check__" or col_type is None:
                continue  # skip sentinels / enum extensions
            try:
                # Check if column already exists
                result = conn.execute(
                    __import__("sqlalchemy").text(f"PRAGMA table_info({table})")
                )
                existing_cols = {row[1] for row in result.fetchall()}
                if column not in existing_cols:
                    conn.execute(
                        __import__("sqlalchemy").text(
                            f"ALTER TABLE {table} ADD COLUMN {column} {col_type}"
                        )
                    )
                    conn.commit()
                    logger.info(f"✅ Migration: added column '{column}' to '{table}'")
            except Exception as e:
                logger.warning(f"Migration warning for {table}.{column}: {e}")

