"""Async SQLAlchemy engine, session, and Base declarative model."""

import os
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase

from app.core.config import settings

# Use the configured DATABASE_URL; fall back to SQLite for local dev if postgres isn't reachable
_db_url = settings.DATABASE_URL

# If the URL looks like postgres+asyncpg but no asyncpg env override, check for a SQLite override
_sqlite_override = os.environ.get("SQLITE_OVERRIDE", "")
if _sqlite_override:
    _db_url = f"sqlite+aiosqlite:///{_sqlite_override}"

_connect_args = {}
if _db_url.startswith("sqlite"):
    _connect_args = {"check_same_thread": False}

engine = create_async_engine(
    _db_url,
    echo=False,
    future=True,
    connect_args=_connect_args,
)

async_session = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


class Base(DeclarativeBase):
    """Declarative base for all ORM models."""
    pass


async def get_db():
    """FastAPI dependency that yields an async database session."""
    async with async_session() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()
