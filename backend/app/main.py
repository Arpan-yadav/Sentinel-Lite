"""FastAPI application entry point for SentinelLite."""

import asyncio
from contextlib import asynccontextmanager
from datetime import datetime, timezone
import logging
import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import httpx
from sqlalchemy import select

from app.core.config import settings
from app.core.database import engine, Base, async_session
from app.api.router import api_router

logger = logging.getLogger(__name__)

# Keep-alive status tracker for Render zero-sleep monitoring
_keep_alive_stats = {
    "enabled": settings.KEEP_ALIVE_ENABLED,
    "interval_seconds": settings.KEEP_ALIVE_INTERVAL_SECONDS,
    "target_url": None,
    "ping_count": 0,
    "last_ping_utc": None,
    "last_status_code": None,
    "last_error": None,
}


async def _keep_alive_worker() -> None:
    """Periodically ping public health endpoint to prevent Render free-tier spin down."""
    if not settings.KEEP_ALIVE_ENABLED:
        logger.info("[KeepAlive] Disabled by configuration.")
        return

    # Wait 45 seconds after initial boot before beginning keepalive loop
    await asyncio.sleep(45)

    while True:
        try:
            target_url = (
                os.getenv("RENDER_EXTERNAL_URL", "").strip()
                or os.getenv("BACKEND_URL", "").strip()
                or settings.RENDER_EXTERNAL_URL.strip()
            )
            _keep_alive_stats["target_url"] = target_url or "auto-detected-or-waiting"

            if target_url:
                ping_url = f"{target_url.rstrip('/')}/health"
                async with httpx.AsyncClient(timeout=15.0) as client:
                    resp = await client.get(ping_url)
                    _keep_alive_stats["ping_count"] += 1
                    _keep_alive_stats["last_ping_utc"] = datetime.now(timezone.utc).isoformat()
                    _keep_alive_stats["last_status_code"] = resp.status_code
                    _keep_alive_stats["last_error"] = None
                    logger.info(f"[KeepAlive] Self-ping to {ping_url} returned HTTP {resp.status_code} (total pings: {_keep_alive_stats['ping_count']})")
            else:
                logger.debug("[KeepAlive] No external URL detected; awaiting deployment environment.")
        except asyncio.CancelledError:
            logger.info("[KeepAlive] Task cancelled during shutdown.")
            break
        except Exception as exc:
            _keep_alive_stats["last_error"] = str(exc)
            logger.warning(f"[KeepAlive] Ping encountered error: {exc}")

        await asyncio.sleep(max(60, settings.KEEP_ALIVE_INTERVAL_SECONDS))


async def _seed_default_users() -> None:
    """Create default admin and analyst users on first startup if they don't exist."""
    from app.models.user import User, UserRole
    from app.core.security import get_password_hash

    seed_users = [
        {
            "email": "admin@sentinellite.io",
            "full_name": "Security Admin",
            "password": "AdminPass123!",
            "role": UserRole.admin,
        },
        {
            "email": "analyst@sentinellite.io",
            "full_name": "SOC Analyst",
            "password": "AnalystPass123!",
            "role": UserRole.analyst,
        },
    ]

    async with async_session() as session:
        for u in seed_users:
            existing = (await session.execute(select(User).where(User.email == u["email"]))).scalar_one_or_none()
            if not existing:
                user = User(
                    email=u["email"],
                    full_name=u["full_name"],
                    hashed_password=get_password_hash(u["password"]),
                    role=u["role"],
                    is_active=True,
                )
                session.add(user)
                logger.info(f"[Seed] Created default user: {u['email']}")
        await session.commit()


@asynccontextmanager
async def lifespan(application: FastAPI):
    """Application lifespan: create tables, seed default users, and run keepalive worker."""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    await _seed_default_users()

    keepalive_task = None
    if settings.KEEP_ALIVE_ENABLED:
        keepalive_task = asyncio.create_task(_keep_alive_worker())

    yield

    if keepalive_task:
        keepalive_task.cancel()
        try:
            await keepalive_task
        except asyncio.CancelledError:
            pass

    await engine.dispose()


app = FastAPI(
    title=settings.PROJECT_NAME,
    description="AI-driven security operations platform",
    version="0.1.0",
    lifespan=lifespan,
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_origin_regex=r"^https?://(localhost|127\.0\.0\.1)(:[0-9]+)?$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API routers
app.include_router(api_router, prefix="/api")


@app.get("/health", tags=["Health"])
@app.get("/api/v1/health", tags=["Health"])
async def health_check():
    """Health check endpoint with keepalive telemetry."""
    return {
        "status": "healthy",
        "project": settings.PROJECT_NAME,
        "keep_alive": _keep_alive_stats,
    }
