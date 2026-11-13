"""FastAPI application entry point for SentinelLite."""

from contextlib import asynccontextmanager
import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import select

from app.core.config import settings
from app.core.database import engine, Base, async_session
from app.api.router import api_router

logger = logging.getLogger(__name__)


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
    """Application lifespan: create tables and seed default users on startup."""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    await _seed_default_users()
    yield
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
    """Health check endpoint."""
    return {"status": "healthy", "project": settings.PROJECT_NAME}
