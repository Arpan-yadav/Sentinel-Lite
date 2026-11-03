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

