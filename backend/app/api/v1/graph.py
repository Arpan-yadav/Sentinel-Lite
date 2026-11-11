"""
Temporal Knowledge Graph (TKG) and MITRE CTI API routes.
"""

import uuid
from typing import Any
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.services.cti_service import CTIService
from app.services.incident_service import IncidentService
from app.services.tkg_service import TKGService

router = APIRouter(prefix="/v1/graph", tags=["Knowledge Graph & CTI"])


@router.get("/incident/{id}")
async def get_incident_tkg(
    id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Any:
    """Construct and return the Temporal Knowledge Graph for a specific incident."""
    incident = await IncidentService.get_incident(db, id)
    if not incident:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Incident record not found",
        )

    timeline_events = await IncidentService.get_incident_timeline(db, id)

    incident_dict = {
        "id": str(incident.id),
        "title": incident.title,
        "severity": incident.severity,
        "risk_score": incident.risk_score,
        "alert_count": incident.alert_count,
        "status": incident.status,
    }

    tkg_data = TKGService.build_incident_tkg(incident_dict, timeline_events)
    return tkg_data


@router.get("/mitre-catalog")
async def list_mitre_techniques(
    current_user: User = Depends(get_current_user),
) -> Any:
    """Return catalog of indexed MITRE ATT&CK Enterprise techniques and D3FEND mitigations."""
    return CTIService.get_all_techniques()

