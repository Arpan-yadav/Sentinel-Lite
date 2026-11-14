"""Event ingestion, parsing, and query service."""

from __future__ import annotations

import csv
import io
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Tuple

from sqlalchemy import desc, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.security_event import SecurityEvent
from app.schemas.event import SecurityEventCreate, SecurityEventFilter


class EventService:
    """Manages SecurityEvent lifecycle and CSV/JSON ingestion."""

    @staticmethod
    async def create_event(db: AsyncSession, event_in: SecurityEventCreate) -> SecurityEvent:
        """Create a single security event."""
        db_event = SecurityEvent(
            timestamp=event_in.timestamp or datetime.now(timezone.utc),
            source_ip=event_in.source_ip,
            dest_ip=event_in.dest_ip,
            source_port=event_in.source_port,
            dest_port=event_in.dest_port,
            protocol=event_in.protocol.upper(),
            event_type=event_in.event_type,
            raw_data=event_in.raw_data or {},
            asset_id=event_in.asset_id,
        )
        db.add(db_event)
        await db.flush()
        await db.refresh(db_event)
        return db_event

    @staticmethod
    async def ingest_csv(db: AsyncSession, file_content: bytes) -> Tuple[int, int]:
        """Parse uploaded CSV bytes and bulk insert SecurityEvent records.

        Returns:
            Tuple of (inserted_count, skipped_count).
        """
        text_stream = io.StringIO(file_content.decode("utf-8", errors="replace"))
        reader = csv.DictReader(text_stream)

        events_to_create = []
        skipped = 0

        for row in reader:
            try:
                # Normalize column headers by stripping whitespace and lowercasing
                norm_row = {k.strip().lower(): v.strip() for k, v in row.items() if k}

                # Extract standard fields or map common CICIDS2017 / Netflow names
                src_ip = (
                    norm_row.get("source_ip")
                    or norm_row.get("src_ip")
                    or norm_row.get("source ip")
                    or "192.168.1.100"
                )
                dst_ip = (
                    norm_row.get("dest_ip")
                    or norm_row.get("dst_ip")
                    or norm_row.get("destination ip")
                    or "192.168.1.1"
                )
                src_port = int(
                    norm_row.get("source_port")
                    or norm_row.get("src_port")
                    or norm_row.get("source port")
                    or 0
                )
                dst_port = int(
                    norm_row.get("dest_port")
                    or norm_row.get("dst_port")
                    or norm_row.get("destination port")
                    or 80
                )
                protocol = (
                    norm_row.get("protocol")
                    or norm_row.get("proto")
                    or "TCP"
                ).upper()
                event_type = (
                    norm_row.get("event_type")
                    or norm_row.get("label")
                    or norm_row.get("attack_type")
                    or "connection"
                )

                # Parse timestamp
                raw_ts = norm_row.get("timestamp") or norm_row.get("time")
                if raw_ts:
                    try:
                        ts = datetime.fromisoformat(raw_ts.replace("Z", "+00:00"))
                    except Exception:
                        ts = datetime.now(timezone.utc)
                else:
                    ts = datetime.now(timezone.utc)

                event = SecurityEvent(
                    timestamp=ts,
                    source_ip=src_ip,
                    dest_ip=dst_ip,
                    source_port=src_port,
                    dest_port=dst_port,
                    protocol=protocol,
                    event_type=event_type,
                    raw_data=row,
                )
                events_to_create.append(event)
            except Exception:
                skipped += 1

        if events_to_create:
            db.add_all(events_to_create)
            await db.flush()

        return len(events_to_create), skipped

    @staticmethod
    async def list_events(
        db: AsyncSession,
        filters: SecurityEventFilter,
    ) -> Tuple[List[SecurityEvent], int]:
        """List and paginate events matching optional filters."""
        query = select(SecurityEvent)

        if filters.source_ip:
            query = query.where(SecurityEvent.source_ip.ilike(f"%{filters.source_ip}%"))
        if filters.dest_ip:
            query = query.where(SecurityEvent.dest_ip.ilike(f"%{filters.dest_ip}%"))
        if filters.protocol:
            query = query.where(SecurityEvent.protocol == filters.protocol.upper())
        if filters.event_type:
            query = query.where(SecurityEvent.event_type.ilike(f"%{filters.event_type}%"))
        if filters.start_time:
            query = query.where(SecurityEvent.timestamp >= filters.start_time)
        if filters.end_time:
            query = query.where(SecurityEvent.timestamp <= filters.end_time)

        # Count total
        count_query = select(func.count()).select_from(query.subquery())
        total = (await db.execute(count_query)).scalar_one()

        # Paginate
        offset = (filters.page - 1) * filters.per_page
        query = query.order_by(desc(SecurityEvent.timestamp)).offset(offset).limit(filters.per_page)
        result = await db.execute(query)
        items = list(result.scalars().all())

        return items, total

    @staticmethod
    async def get_event_by_id(db: AsyncSession, event_id: uuid.UUID) -> Optional[SecurityEvent]:
        """Fetch a single event by UUID."""
        result = await db.execute(select(SecurityEvent).where(SecurityEvent.id == event_id))
        return result.scalar_one_or_none()

    @staticmethod
    def get_critical_event_ids_subquery():
        """Subquery returning IDs of all critical and suspicious security events."""
        from sqlalchemy import union
        from app.models.alert import Alert, Severity
        from app.models.incident_event import IncidentEvent

        # 1. Events associated with critical or high severity alerts
        crit_alerts = select(Alert.event_id).where(
            Alert.severity.in_([Severity.critical, Severity.high])
        )

        # 2. Events attached to correlated incidents
        inc_alerts = (
            select(Alert.event_id)
            .join(IncidentEvent, IncidentEvent.alert_id == Alert.id)
        )

        # 3. Events with attack or malicious event types
        attack_types = select(SecurityEvent.id.label("event_id")).where(
            SecurityEvent.event_type.in_([
                "syn_probe",
                "sql_injection_attempt",
                "ssh_login_failure",
                "http_flood",
                "malicious",
            ])
        )

        return union(crit_alerts, inc_alerts, attack_types).subquery()

    @staticmethod
    async def run_retention_cleanup(
        db: AsyncSession,
        retention_days: int = 7,
    ) -> Dict[str, Any]:
        """Automatically delete benign ('good') logs older than retention_days.

        Strictly preserves all critical and suspicious logs.
        """
        from datetime import timedelta
        from sqlalchemy import delete

        cutoff = datetime.now(timezone.utc) - timedelta(days=retention_days)
        crit_sub = EventService.get_critical_event_ids_subquery()

        # Count preserved critical events
        crit_count_q = select(func.count(SecurityEvent.id)).where(
            SecurityEvent.id.in_(select(crit_sub.c.event_id))
        )
        critical_preserved = (await db.execute(crit_count_q)).scalar_one()

        # Delete benign events older than cutoff
        del_stmt = delete(SecurityEvent).where(
            SecurityEvent.timestamp < cutoff,
            SecurityEvent.id.not_in(select(crit_sub.c.event_id)),
        )
        res = await db.execute(del_stmt)
        deleted_count = res.rowcount
        await db.commit()

        return {
            "status": "success",
            "retention_days": retention_days,
            "cutoff_timestamp": cutoff.isoformat(),
            "benign_events_deleted": deleted_count,
            "critical_events_preserved": critical_preserved,
            "message": f"Successfully purged {deleted_count} benign logs older than {retention_days} days. Preserved {critical_preserved} critical/suspicious logs.",
        }

    @staticmethod
    async def purge_telemetry(
        db: AsyncSession,
        target: str = "benign",
        confirmation_phrase: str = "",
    ) -> Dict[str, Any]:
        """Purge telemetry events based on policy and verification safeguards."""
        from sqlalchemy import delete
        from app.models.incident_event import IncidentEvent
        from app.models.investigation import Investigation
        from app.models.recommendation import Recommendation
        from app.models.incident import Incident
        from app.models.alert import Alert
        from app.models.model_prediction import ModelPrediction

        crit_sub = EventService.get_critical_event_ids_subquery()

        if target == "benign":
            # Purge ALL benign events regardless of age, preserving critical ones
            del_stmt = delete(SecurityEvent).where(
                SecurityEvent.id.not_in(select(crit_sub.c.event_id))
            )
            res = await db.execute(del_stmt)
            deleted_count = res.rowcount
            await db.commit()
            return {
                "status": "success",
                "target": "benign",
                "events_deleted": deleted_count,
                "message": f"Purged {deleted_count} benign telemetry logs. All critical and suspicious events remain securely stored.",
            }

        elif target == "all":
            if confirmation_phrase != "CONFIRM_DELETE_ALL":
                from fastapi import HTTPException, status
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Critical safeguard: Deleting critical security logs requires confirmation_phrase='CONFIRM_DELETE_ALL'. Critical logs must be audited and verified prior to manual deletion.",
                )
            await db.execute(delete(IncidentEvent))
            await db.execute(delete(Investigation))
            await db.execute(delete(Recommendation))
            await db.execute(delete(Incident))
            await db.execute(delete(ModelPrediction))
            await db.execute(delete(Alert))
            del_events = await db.execute(delete(SecurityEvent))
            await db.commit()
            return {
                "status": "success",
                "target": "all",
                "events_deleted": del_events.rowcount,
                "message": "Full telemetry and incident database reset successfully.",
            }
        else:
            from fastapi import HTTPException, status
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Unknown target: '{target}'. Supported targets are 'benign' and 'all'.",
            )

    @staticmethod
    async def get_retention_policy_status(
        db: AsyncSession,
        retention_days: int = 7,
    ) -> Dict[str, Any]:
        """Return real-time metrics about the 7-day retention policy and eligible logs."""
        from datetime import timedelta

        cutoff = datetime.now(timezone.utc) - timedelta(days=retention_days)
        crit_sub = EventService.get_critical_event_ids_subquery()

        total_events = (await db.execute(select(func.count(SecurityEvent.id)))).scalar_one()

        critical_events = (await db.execute(
            select(func.count(SecurityEvent.id)).where(
                SecurityEvent.id.in_(select(crit_sub.c.event_id))
            )
        )).scalar_one()

        benign_events = total_events - critical_events

        eligible_for_auto_purge = (await db.execute(
            select(func.count(SecurityEvent.id)).where(
                SecurityEvent.timestamp < cutoff,
                SecurityEvent.id.not_in(select(crit_sub.c.event_id)),
            )
        )).scalar_one()

        return {
            "retention_policy_days": retention_days,
            "auto_retention_enabled": True,
            "cutoff_timestamp": cutoff.isoformat(),
            "total_events": total_events,
            "benign_events": benign_events,
            "critical_suspicious_events": critical_events,
            "eligible_for_auto_purge": eligible_for_auto_purge,
            "policy_rule": "Routine benign logs older than 7 days are automatically purged. Critical & suspicious security logs are permanently preserved until verified and manually authorized.",
        }

    @staticmethod
    async def delete_events_batch(db: AsyncSession, event_ids: List[uuid.UUID]) -> int:
        """Safely delete selected events along with cascading alerts."""
        if not event_ids:
            return 0

        from sqlalchemy import delete
        from app.models.alert import Alert
        from app.models.incident_event import IncidentEvent
        from app.models.model_prediction import ModelPrediction

        alert_ids_q = select(Alert.id).where(Alert.event_id.in_(event_ids))
        alert_ids = list((await db.execute(alert_ids_q)).scalars().all())

        if alert_ids:
            await db.execute(delete(IncidentEvent).where(IncidentEvent.alert_id.in_(alert_ids)))
            await db.execute(delete(ModelPrediction).where(ModelPrediction.alert_id.in_(alert_ids)))
            await db.execute(delete(Alert).where(Alert.id.in_(alert_ids)))

        del_stmt = delete(SecurityEvent).where(SecurityEvent.id.in_(event_ids))
        res = await db.execute(del_stmt)
        await db.commit()
        return res.rowcount

    @staticmethod
    async def delete_all_events(db: AsyncSession) -> int:
        """Delete all security events, alerts, and correlated incidents."""
        from sqlalchemy import delete
        from app.models.alert import Alert
        from app.models.incident import Incident
        from app.models.incident_event import IncidentEvent
        from app.models.investigation import Investigation
        from app.models.model_prediction import ModelPrediction
        from app.models.recommendation import Recommendation

        await db.execute(delete(IncidentEvent))
        await db.execute(delete(Investigation))
        await db.execute(delete(Recommendation))
        await db.execute(delete(Incident))
        await db.execute(delete(ModelPrediction))
        await db.execute(delete(Alert))
        res = await db.execute(delete(SecurityEvent))
        await db.commit()
        return res.rowcount

