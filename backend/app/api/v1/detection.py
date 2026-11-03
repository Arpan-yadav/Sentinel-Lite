"""ML Detection API routes."""

import uuid
from typing import Any, List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.schemas.alert import AlertFilter, AlertResponse
from app.services.detection_service import DetectionService
from app.services.incident_service import IncidentService

router = APIRouter(prefix="/v1/detection", tags=["Detection"])


@router.post("/run")
async def run_detection(
    limit: int = Query(500, ge=1, le=2000),
    auto_correlate: bool = Query(True, description="Automatically correlate generated alerts into incidents"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Any:
    """Run supervised and anomaly ML detection on unprocessed security events."""
    detection_summary = await DetectionService.run_detection(db, limit=limit)

    incidents_created = 0
    if auto_correlate and detection_summary["alerts_created"] > 0:
        incidents_created = await IncidentService.correlate_alerts_into_incidents(db)

    return {
        "status": "success",
        "detection_summary": detection_summary,
        "incidents_created": incidents_created,
    }


@router.get("/alerts", response_model=List[AlertResponse])
async def list_alerts(
    alert_type: Optional[str] = None,
    severity: Optional[str] = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=500),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Any:
    """List detected security alerts."""
    filters = AlertFilter(
        alert_type=alert_type,
        severity=severity,
        page=page,
        page_size=page_size,
    )
    items, total = await DetectionService.list_alerts(db, filters)
    return items


@router.get("/predictions/{event_id}", response_model=AlertResponse)
async def get_prediction_for_event(
    event_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Any:
    """Retrieve detection prediction and risk alert for a specific event."""
    alert = await DetectionService.get_prediction_for_event(db, event_id)
    if not alert:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No alert or prediction recorded for this event",
        )
    return alert

