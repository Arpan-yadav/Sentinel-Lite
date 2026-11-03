"""AI Investigation API routes."""

import uuid
from typing import Any
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.schemas.investigation import InvestigationResponse
from app.services.incident_service import IncidentService
from app.services.investigation_service import InvestigationService

router = APIRouter(prefix="/v1/investigation", tags=["Investigation"])


@router.post("/{incident_id}/generate", response_model=InvestigationResponse)
async def generate_investigation(
    incident_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Any:
    """Generate an AI-driven, evidence-grounded investigation report."""
    incident = await IncidentService.get_incident(db, incident_id)
    if not incident:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Incident not found",
        )

    investigation = await InvestigationService.generate_investigation(db, incident)
    return investigation


@router.get("/{incident_id}", response_model=InvestigationResponse)
async def get_investigation(
    incident_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Any:
    """Retrieve existing investigation report for an incident."""
    investigation = await InvestigationService.get_investigation_by_incident(db, incident_id)
    if not investigation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No investigation found for this incident. Use POST to generate one.",
        )
    return investigation

