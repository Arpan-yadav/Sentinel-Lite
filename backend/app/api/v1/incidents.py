"""Incidents management API routes."""

import uuid
from typing import Any, List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.schemas.incident import IncidentFilter, IncidentResponse, IncidentUpdate
from app.services.incident_service import IncidentService

router = APIRouter(prefix="/v1/incidents", tags=["Incidents"])


@router.post("/correlate")
async def trigger_correlation(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Any:
    """Group unlinked alerts into correlated incidents."""
    count = await IncidentService.correlate_alerts_into_incidents(db)
    return {"status": "success", "incidents_created": count}


@router.get("/", response_model=List[IncidentResponse])
async def list_incidents(
    status: Optional[str] = None,
    severity: Optional[str] = None,
    search: Optional[str] = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Any:
    """List and paginate security incidents."""
    filters = IncidentFilter(
        status=status,
        severity=severity,
        search=search,
        page=page,
        page_size=page_size,
    )
    items, total = await IncidentService.list_incidents(db, filters)
    return items


@router.get("/{id}", response_model=IncidentResponse)
async def get_incident(
    id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Any:
    """Retrieve full incident record."""
    incident = await IncidentService.get_incident(db, id)
    if not incident:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Incident not found",
        )
    return incident


@router.put("/{id}", response_model=IncidentResponse)
async def update_incident(
    id: uuid.UUID,
    update_data: IncidentUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Any:
    """Update status, severity, or description of an incident."""
    updated = await IncidentService.update_incident(db, id, update_data)
    if not updated:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Incident not found",
        )
    await db.commit()
    return updated


@router.get("/{id}/timeline")
async def get_incident_timeline(
    id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Any:
    """Fetch chronological events timeline for an incident."""
    timeline = await IncidentService.get_incident_timeline(db, id)
    return {"incident_id": str(id), "timeline": timeline, "count": len(timeline)}

