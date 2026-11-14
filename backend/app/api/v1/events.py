"""Security events API routes."""

import uuid
from typing import Any, List, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.schemas.event import (
    BatchDeleteEventsRequest,
    SecurityEventCreate,
    SecurityEventFilter,
    SecurityEventResponse,
)
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
    reset: bool = Query(False, description="If True, clears previous telemetry & incidents before seeding clean baseline"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Any:
    """Ingest authentic benchmark security events and auto-correlate incidents on demand."""
    from pathlib import Path
    from sqlalchemy import delete
    from app.services.detection_service import DetectionService
    from app.services.incident_service import IncidentService
    from app.models.incident_event import IncidentEvent
    from app.models.investigation import Investigation
    from app.models.recommendation import Recommendation
    from app.models.incident import Incident
    from app.models.alert import Alert
    from app.models.model_prediction import ModelPrediction
    from app.models.security_event import SecurityEvent

    if reset:
        await db.execute(delete(IncidentEvent))
        await db.execute(delete(Investigation))
        await db.execute(delete(Recommendation))
        await db.execute(delete(Incident))
        await db.execute(delete(Alert))
        await db.execute(delete(ModelPrediction))
        await db.execute(delete(SecurityEvent))
        await db.commit()
    else:
        # Check if benchmark is already seeded to prevent duplicate accumulation
        from sqlalchemy import func, select
        count_stmt = select(func.count(SecurityEvent.id))
        existing_count = (await db.execute(count_stmt)).scalar_one()

        if existing_count >= 12500:
            return {
                "status": "already_loaded",
                "events_ingested": 0,
                "total_existing": existing_count,
                "message": f"Authentic benchmark (12,500 records) is already loaded. Duplicates prevented to keep data pristine.",
            }

    csv_candidates = [
        Path("data/authentic/sentinellite_authentic_events.csv"),
        Path("backend/data/authentic/sentinellite_authentic_events.csv"),
        Path("../data/authentic/sentinellite_authentic_events.csv"),
        Path(__file__).resolve().parent.parent.parent.parent / "data" / "authentic" / "sentinellite_authentic_events.csv",
        Path(__file__).resolve().parent.parent.parent / "data" / "authentic" / "sentinellite_authentic_events.csv",
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

    # Run ML detection & correlation on representative sample
    det_summary = await DetectionService.run_detection(db, limit=300)
    incidents_created = await IncidentService.correlate_alerts_into_incidents(db)

    return {
        "status": "success",
        "events_ingested": inserted,
        "rows_skipped": skipped,
        "detection_summary": det_summary,
        "incidents_created": incidents_created,
        "message": f"Successfully loaded {inserted} events and generated {incidents_created} incidents.",
    }


@router.get("/retention-status")
async def get_retention_status(
    days: int = Query(7, ge=1, le=365, description="Retention window in days"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Any:
    """Check retention policy status and counts of benign vs critical records."""
    return await EventService.get_retention_policy_status(db, retention_days=days)


@router.post("/retention-cleanup")
async def trigger_retention_cleanup(
    days: int = Query(7, ge=1, le=365, description="Purge benign logs older than this many days"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Any:
    """Execute 7-day retention cleanup. Deletes benign logs, strictly preserving critical/suspicious logs."""
    return await EventService.run_retention_cleanup(db, retention_days=days)


@router.delete("/purge")
async def purge_events(
    target: str = Query("benign", description="'benign' to clear normal logs; 'all' requires confirmation_phrase"),
    confirmation_phrase: str = Query("", description="Required as 'CONFIRM_DELETE_ALL' if target is 'all'"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Any:
    """Purge telemetry events. Critical logs require explicit manual authorization."""
    return await EventService.purge_telemetry(
        db,
        target=target,
        confirmation_phrase=confirmation_phrase,
    )


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


@router.post("/batch-delete")
@router.delete("/batch")
async def delete_events_batch(
    payload: BatchDeleteEventsRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Any:
    """Delete selected security event records by their IDs."""
    deleted = await EventService.delete_events_batch(db, payload.event_ids)
    return {
        "status": "success",
        "deleted_count": deleted,
        "message": f"Successfully deleted {deleted} selected security events.",
    }


@router.delete("/all")
async def delete_all_events(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Any:
    """Delete all security event records, alerts, and incidents."""
    deleted = await EventService.delete_all_events(db)
    return {
        "status": "success",
        "deleted_count": deleted,
        "message": f"Successfully deleted all {deleted} security events and reset the database.",
    }


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


@router.delete("/{id}")
async def delete_single_event(
    id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Any:
    """Delete a single security event by ID."""
    deleted = await EventService.delete_events_batch(db, [id])
    if deleted == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Security event not found",
        )
    return {"status": "success", "message": "Event deleted successfully"}

