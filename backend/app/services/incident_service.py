"""Incident correlation, lifecycle management, and timeline service."""

from __future__ import annotations

import logging
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Tuple

from sqlalchemy import desc, func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.alert import Alert, Severity
from app.models.incident import Incident, IncidentStatus
from app.models.incident_event import IncidentEvent
from app.models.security_event import SecurityEvent
from app.schemas.incident import IncidentCreate, IncidentFilter, IncidentUpdate

logger = logging.getLogger(__name__)


class IncidentService:
    """Manages Incident correlation and lifecycle workflows."""

    @staticmethod
    async def correlate_alerts_into_incidents(db: AsyncSession) -> int:
        """Find alerts not yet associated with any incident and group them.

        Grouping logic:
          - Group by related attack type and source IP of underlying event.
        """
        # Find alerts not present in IncidentEvent
        subquery = select(IncidentEvent.alert_id)
        stmt = (
            select(Alert)
            .join(Alert.event)
            .where(~Alert.id.in_(subquery))
            .order_by(Alert.created_at)
        )
        result = await db.execute(stmt)
        unlinked_alerts = list(result.scalars().all())

        if not unlinked_alerts:
            return 0

        # Group by (alert_type, source_ip)
        groups: Dict[Tuple[str, str], List[Alert]] = {}
        for alert in unlinked_alerts:
            src_ip = alert.event.source_ip if alert.event else "unknown"
            key = (alert.alert_type, src_ip)
            groups.setdefault(key, []).append(alert)

        incidents_created = 0
        for (alert_type, src_ip), alerts_in_group in groups.items():
            max_risk = max(a.risk_score for a in alerts_in_group)
            alert_count = len(alerts_in_group)
            first_seen = min((a.event.timestamp for a in alerts_in_group if a.event), default=datetime.now(timezone.utc))
            last_seen = max((a.event.timestamp for a in alerts_in_group if a.event), default=datetime.now(timezone.utc))

            if max_risk >= 80:
                sev = "critical"
            elif max_risk >= 60:
                sev = "high"
            elif max_risk >= 35:
                sev = "medium"
            else:
                sev = "low"

            title = f"Possible {alert_type} Attack from {src_ip}"
            desc = (
                f"Aggregated {alert_count} suspicious alert(s) consistent with {alert_type} "
                f"originating from {src_ip}. Peak risk score: {max_risk:.1f}/100."
            )

            incident = Incident(
                title=title,
                description=desc,
                status=IncidentStatus.new,
                severity=sev,
                risk_score=max_risk,
                alert_count=alert_count,
                first_seen=first_seen,
                last_seen=last_seen,
            )
            db.add(incident)
            await db.flush()

            for a in alerts_in_group:
                assoc = IncidentEvent(incident_id=incident.id, alert_id=a.id)
                db.add(assoc)

            incidents_created += 1

        await db.commit()
        return incidents_created

    @staticmethod
    async def list_incidents(
        db: AsyncSession,
        filters: IncidentFilter,
    ) -> Tuple[List[Incident], int]:
        """List and paginate incidents with filtering."""
        query = select(Incident)

        if filters.status:
            query = query.where(Incident.status == filters.status)
        if filters.severity:
            query = query.where(Incident.severity == filters.severity)
        if filters.search:
            query = query.where(Incident.title.ilike(f"%{filters.search}%"))
        if filters.min_risk_score is not None:
            query = query.where(Incident.risk_score >= filters.min_risk_score)

        count_query = select(func.count()).select_from(query.subquery())
        total = (await db.execute(count_query)).scalar_one()

        offset = (filters.page - 1) * filters.per_page
        query = query.order_by(desc(Incident.risk_score), desc(Incident.created_at)).offset(offset).limit(filters.per_page)
        result = await db.execute(query)
        items = list(result.scalars().all())

        return items, total

    @staticmethod
    async def get_incident(db: AsyncSession, incident_id: uuid.UUID) -> Optional[Incident]:
        """Retrieve single incident with related details."""
        stmt = (
            select(Incident)
            .options(
                selectinload(Incident.incident_events).selectinload(IncidentEvent.alert).selectinload(Alert.event),
                selectinload(Incident.investigations),
                selectinload(Incident.recommendations),
            )
            .where(Incident.id == incident_id)
        )
        result = await db.execute(stmt)
        return result.scalar_one_or_none()

    @staticmethod
    async def update_incident(
        db: AsyncSession,
        incident_id: uuid.UUID,
        update_data: IncidentUpdate,
    ) -> Optional[Incident]:
        """Update status, description, or severity of an incident."""
        incident = await IncidentService.get_incident(db, incident_id)
        if not incident:
            return None

        if update_data.status is not None:
            incident.status = update_data.status
        if update_data.description is not None:
            incident.description = update_data.description
        if update_data.severity is not None:
            incident.severity = update_data.severity

        await db.flush()
        await db.refresh(incident)
        return incident

    @staticmethod
    async def get_incident_timeline(
        db: AsyncSession,
        incident_id: uuid.UUID,
    ) -> List[Dict[str, Any]]:
        """Fetch all events linked to an incident in chronological order."""
        incident = await IncidentService.get_incident(db, incident_id)
        if not incident:
            return []

        events = []
        for ie in incident.incident_events:
            alert = ie.alert
            if alert and alert.event:
                ev = alert.event
                events.append({
                    "id": str(ev.id),
                    "timestamp": ev.timestamp.isoformat() if ev.timestamp else None,
                    "source_ip": ev.source_ip,
                    "dest_ip": ev.dest_ip,
                    "source_port": ev.source_port,
                    "dest_port": ev.dest_port,
                    "protocol": ev.protocol,
                    "event_type": ev.event_type,
                    "alert_type": alert.alert_type,
                    "risk_score": alert.risk_score,
                    "severity": alert.severity.value if hasattr(alert.severity, "value") else str(alert.severity),
                    "confidence": alert.confidence,
                })

        events.sort(key=lambda x: x["timestamp"] or "")
        return events

