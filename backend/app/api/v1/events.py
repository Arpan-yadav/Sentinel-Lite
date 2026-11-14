"""Security events API routes."""

import uuid
from typing import Any, List, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.schemas.event import SecurityEventCreate, SecurityEventFilter, SecurityEventResponse
from app.services.event_service import EventService

router = APIRouter(prefix="/v1/events", tags=["Events"])


@router.post("/upload", status_code=status.HTTP_201_CREATED)
async def upload_csv_events(
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Any:
    """Upload CSV or log file containing security events."""
    if not file.filename or not file.filename.lower().endswith((".csv", ".txt", ".log")):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded file must be a CSV or text log file",
        )

    content = await file.read()
    inserted, skipped = await EventService.ingest_csv(db, content)
    await db.commit()

    return {
        "filename": file.filename,
        "events_ingested": inserted,
        "rows_skipped": skipped,
        "message": f"Successfully ingested {inserted} events",
    }


@router.post("/seed-authentic", status_code=status.HTTP_200_OK)
async def seed_authentic_events(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Any:
    """Ingest authentic benchmark security events and auto-correlate incidents on demand."""
    from pathlib import Path
    from app.services.detection_service import DetectionService
    from app.services.incident_service import IncidentService

    csv_candidates = [
        Path("data/authentic/sentinellite_authentic_events.csv"),
        Path("../data/authentic/sentinellite_authentic_events.csv"),
        Path(__file__).resolve().parents[4] / "data" / "authentic" / "sentinellite_authentic_events.csv",
        Path(__file__).resolve().parents[3] / "data" / "authentic" / "sentinellite_authentic_events.csv",
    ]
    target_csv = None
    for c in csv_candidates:
        if c.exists():
            target_csv = c
            break

    if not target_csv:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Benchmark CSV dataset not found on server",
        )

    with open(target_csv, "rb") as f:
        content = f.read()

    inserted, skipped = await EventService.ingest_csv(db, content)
    await db.commit()

    # Run ML detection & correlation
    det_summary = await DetectionService.run_detection(db, limit=2000)
    incidents_created = await IncidentService.correlate_alerts_into_incidents(db)

    return {
        "status": "success",
        "events_ingested": inserted,
        "rows_skipped": skipped,
        "detection_summary": det_summary,
        "incidents_created": incidents_created,
        "message": f"Successfully loaded {inserted} events and generated {incidents_created} incidents.",
    }


@router.get("/", response_model=List[SecurityEventResponse])
async def list_events(
    source_ip: Optional[str] = None,
    dest_ip: Optional[str] = None,
    event_type: Optional[str] = None,
    protocol: Optional[str] = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=500),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Any:
    """List and filter ingested security events."""
    filters = SecurityEventFilter(
        source_ip=source_ip,
        dest_ip=dest_ip,
        event_type=event_type,
        protocol=protocol,
        page=page,
        page_size=page_size,
    )
    items, total = await EventService.list_events(db, filters)
    return items


@router.post("/", response_model=SecurityEventResponse, status_code=status.HTTP_201_CREATED)
async def create_event(
    event_in: SecurityEventCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Any:
    """Manually insert a security event."""
    event = await EventService.create_event(db, event_in)
    await db.commit()
    return event


@router.get("/{id}", response_model=SecurityEventResponse)
async def get_event(
    id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Any:
    """Get security event details by ID."""
    event = await EventService.get_event_by_id(db, id)
    if not event:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Security event not found",
        )
    return event

