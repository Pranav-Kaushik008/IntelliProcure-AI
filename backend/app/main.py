"""
IntelliProcure AI – FastAPI Application Entry Point
Production-ready enterprise API server with:
  - JWT authentication
  - CORS middleware
  - Request logging
  - Error handling
  - API versioning (v1)
  - Database initialization
  - Health checks
"""

from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from contextlib import asynccontextmanager
import logging
import time
import uuid

from app.config.settings import settings
from app.database.session import init_db

# ─── Configure Logging ────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.DEBUG if settings.DEBUG else logging.INFO,
    format="%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger("intelliprocure")


# ─── Application Lifespan ─────────────────────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Manages startup and shutdown events.
    - Startup: Initialize DB, seed data, connect to Redis
    - Shutdown: Close connections, flush queues
    """
    logger.info(f"🚀 Starting {settings.APP_NAME} v{settings.APP_VERSION}")
    
    # Initialize database tables
    try:
        init_db()
        logger.info("✅ Database initialized successfully")
    except Exception as e:
        logger.warning(f"⚠️  Database init warning: {e}")
    
    # Seed demo data on first run
    try:
        from app.core.seeder import seed_demo_data
        seed_demo_data()
    except Exception as e:
        logger.debug(f"Seeder: {e}")
    
    yield  # Application runs here
    
    logger.info("🛑 Shutting down IntelliProcure AI")


# ─── FastAPI Application ──────────────────────────────────────────────────────
app = FastAPI(
    title=settings.APP_NAME,
    description=settings.APP_DESCRIPTION,
    version=settings.APP_VERSION,
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json",
    lifespan=lifespan,
)

# ─── Middleware ───────────────────────────────────────────────────────────────

# CORS — allow frontend origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_origin_regex=r"^https:\/\/.*\.onrender\.com$",
    allow_credentials=True,
    allow_methods=settings.cors_methods,
    allow_headers=settings.cors_headers,
)

# Compression
app.add_middleware(GZipMiddleware, minimum_size=1000)


@app.middleware("http")
async def request_logging_middleware(request: Request, call_next):
    """Log all incoming requests with timing information."""
    request_id = str(uuid.uuid4())[:8]
    start_time = time.time()
    
    logger.info(f"[{request_id}] → {request.method} {request.url.path}")
    
    response = await call_next(request)
    
    duration = (time.time() - start_time) * 1000
    logger.info(f"[{request_id}] ← {response.status_code} ({duration:.1f}ms)")
    
    response.headers["X-Request-ID"] = request_id
    response.headers["X-Response-Time"] = f"{duration:.1f}ms"
    
    return response


# ─── Exception Handlers ───────────────────────────────────────────────────────
@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    """Return structured validation errors."""
    errors = []
    for error in exc.errors():
        errors.append({
            "field": " → ".join(str(loc) for loc in error["loc"]),
            "message": error["msg"],
            "type": error["type"]
        })
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={"detail": "Validation failed", "errors": errors}
    )


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Catch-all exception handler — never expose stack traces in production."""
    logger.exception(f"Unhandled exception: {exc}")
    if settings.DEBUG:
        return JSONResponse(
            status_code=500,
            content={"detail": str(exc)}
        )
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error. Please contact support."}
    )


# ─── Register API Routers ────────────────────────────────────────────────────
from app.api.v1 import (
    auth, suppliers, purchase_requests, purchase_orders,
    rfq, quotations, invoices, contracts, inventory,
    analytics, ai, reports, notifications, users, dashboard,
    health, departments, approvals, supplier_ratings, audit_logs,
    three_way_matching, budget, erp
)
from app.api.v1 import websocket_notifications

API_PREFIX = "/api/v1"

app.include_router(health.router,            prefix=f"{API_PREFIX}/health",            tags=["Health"])
app.include_router(auth.router,              prefix=f"{API_PREFIX}/auth",              tags=["Authentication"])
app.include_router(users.router,             prefix=f"{API_PREFIX}/users",             tags=["Users"])
app.include_router(suppliers.router,         prefix=f"{API_PREFIX}/suppliers",         tags=["Suppliers"])
app.include_router(purchase_requests.router, prefix=f"{API_PREFIX}/purchase-requests", tags=["Purchase Requests"])
app.include_router(purchase_orders.router,   prefix=f"{API_PREFIX}/purchase-orders",   tags=["Purchase Orders"])
app.include_router(rfq.router,               prefix=f"{API_PREFIX}/rfqs",              tags=["RFQs"])
app.include_router(quotations.router,        prefix=f"{API_PREFIX}/quotations",        tags=["Quotations"])
app.include_router(invoices.router,          prefix=f"{API_PREFIX}/invoices",          tags=["Invoices"])
app.include_router(contracts.router,         prefix=f"{API_PREFIX}/contracts",         tags=["Contracts"])
app.include_router(inventory.router,         prefix=f"{API_PREFIX}/inventory",         tags=["Inventory"])
app.include_router(analytics.router,         prefix=f"{API_PREFIX}/analytics",         tags=["Analytics"])
app.include_router(ai.router,                prefix=f"{API_PREFIX}/ai",                tags=["AI Assistant"])
app.include_router(reports.router,           prefix=f"{API_PREFIX}/reports",           tags=["Reports"])
app.include_router(notifications.router,     prefix=f"{API_PREFIX}/notifications",     tags=["Notifications"])
app.include_router(dashboard.router,         prefix=f"{API_PREFIX}/dashboard",         tags=["Dashboard"])
app.include_router(departments.router,       prefix=f"{API_PREFIX}/departments",       tags=["Departments"])
app.include_router(approvals.router,         prefix=f"{API_PREFIX}/approvals",         tags=["Approvals"])
app.include_router(supplier_ratings.router,  prefix=f"{API_PREFIX}/supplier-ratings",  tags=["Supplier Ratings"])
app.include_router(audit_logs.router,        prefix=f"{API_PREFIX}/audit-logs",        tags=["Audit Logs"])
app.include_router(three_way_matching.router, prefix=f"{API_PREFIX}/matching",          tags=["3-Way Matching"])
app.include_router(budget.router,            prefix=f"{API_PREFIX}/budget",            tags=["Budget"])
app.include_router(erp.router,               prefix=f"{API_PREFIX}/erp",               tags=["ERP Integration"])
app.include_router(websocket_notifications.router, prefix=f"{API_PREFIX}",            tags=["WebSocket"])


# ─── Root Endpoint ────────────────────────────────────────────────────────────
@app.get("/", tags=["Root"])
async def root():
    return {
        "application": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "status": "operational",
        "docs": "/api/docs",
        "environment": settings.ENVIRONMENT
    }
