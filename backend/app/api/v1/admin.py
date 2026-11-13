"""Admin Operations & SOC Team Management API routes."""

import uuid
from typing import Any, List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr
from sqlalchemy import desc, select
from sqlalchemy.ext.asyncio import AsyncSession

from ai.engine import GeminiInvestigationEngine
try:
    from app.core.config import settings  # type: ignore
    from app.core.database import get_db  # type: ignore
    from app.core.security import get_current_user, get_password_hash, require_admin  # type: ignore
    from app.models.user import User, UserRole  # type: ignore
except ImportError:
    from backend.app.core.config import settings  # type: ignore
    from backend.app.core.database import get_db  # type: ignore
    from backend.app.core.security import get_current_user, get_password_hash, require_admin  # type: ignore
    from backend.app.models.user import User, UserRole  # type: ignore

router = APIRouter(prefix="/v1/admin", tags=["Admin Operations"])


class AnalystCreate(BaseModel):
    email: EmailStr
    password: str
    full_name: str
    role: UserRole = UserRole.analyst


class AnalystResponse(BaseModel):
    id: uuid.UUID
    email: str
    full_name: str
    role: str
    is_active: bool
    created_at: str


@router.get("/ai-status")
async def get_ai_status(
    current_user: User = Depends(get_current_user),
) -> Any:
    """Test and report live status of the Google Gemini AI investigation engine."""
    engine = GeminiInvestigationEngine(api_key=settings.GEMINI_API_KEY)
    status_info = await engine.test_connection()
    return {
        "gemini_api_configured": bool(settings.GEMINI_API_KEY),
        "key_prefix": (settings.GEMINI_API_KEY[:8] + "...") if settings.GEMINI_API_KEY else "Not configured",
        **status_info,
    }


@router.get("/analysts", response_model=List[AnalystResponse])
async def list_analysts(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Any:
    """List all SOC users and analysts."""
    stmt = select(User).order_by(desc(User.created_at))
    result = await db.execute(stmt)
    users = result.scalars().all()
    return [
        AnalystResponse(
            id=u.id,
            email=u.email,
            full_name=u.full_name,
            role=u.role.value if hasattr(u.role, "value") else str(u.role),
            is_active=u.is_active,
            created_at=u.created_at.isoformat() if u.created_at else "",
        )
        for u in users
    ]


@router.post("/analysts", response_model=AnalystResponse, status_code=status.HTTP_201_CREATED)
async def create_analyst(
    analyst_in: AnalystCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin),
) -> Any:
    """Create / invite a new SOC Analyst or Admin user (Admin only)."""
    stmt = select(User).where(User.email == analyst_in.email)
    existing = (await db.execute(stmt)).scalar_one_or_none()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User with this email already exists",
        )

    user = User(
        email=analyst_in.email,
        hashed_password=get_password_hash(analyst_in.password),
        full_name=analyst_in.full_name,
        role=analyst_in.role,
        is_active=True,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return AnalystResponse(
        id=user.id,
        email=user.email,
        full_name=user.full_name,
        role=user.role.value if hasattr(user.role, "value") else str(user.role),
        is_active=user.is_active,
        created_at=user.created_at.isoformat() if user.created_at else "",
    )


@router.patch("/analysts/{id}/status", response_model=AnalystResponse)
async def toggle_analyst_status(
    id: uuid.UUID,
    active: bool,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin),
) -> Any:
    """Activate or deactivate a user account (Admin only)."""
    if current_user.id == id and not active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot deactivate your own administrative account",
        )

    stmt = select(User).where(User.id == id)
    user = (await db.execute(stmt)).scalar_one_or_none()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    user.is_active = active
    await db.commit()
    await db.refresh(user)
    return AnalystResponse(
        id=user.id,
        email=user.email,
        full_name=user.full_name,
        role=user.role.value if hasattr(user.role, "value") else str(user.role),
        is_active=user.is_active,
        created_at=user.created_at.isoformat() if user.created_at else "",
    )

