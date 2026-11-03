"""Audit Log API routes."""

from typing import Any, List, Optional
import uuid
from fastapi import APIRouter, Depends, Query
from sqlalchemy import desc, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import require_admin
from app.models.audit_log import AuditLog
from app.models.user import User

router = APIRouter(prefix="/v1/audit", tags=["Audit"])


@router.get("/")
async def list_audit_logs(
    action: Optional[str] = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
    admin_user: User = Depends(require_admin),
) -> Any:
    """Retrieve immutable system audit trail (Admin only)."""
    query = select(AuditLog)
    if action:
        query = query.where(AuditLog.action.ilike(f"%{action}%"))

    offset = (page - 1) * page_size
    query = query.order_by(desc(AuditLog.created_at)).offset(offset).limit(page_size)

    result = await db.execute(query)
    items = list(result.scalars().all())

    return [
        {
            "id": str(log.id),
            "user_id": str(log.user_id),
            "action": log.action,
            "resource": log.resource,
            "details": log.details,
            "created_at": log.created_at.isoformat(),
        }
        for log in items
    ]

