"""Incident ORM model."""

import enum
import uuid
from datetime import datetime, timezone

from sqlalchemy import DateTime, Enum, Float, Integer, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class IncidentStatus(str, enum.Enum):
    """Incident lifecycle statuses."""
    new = "new"
    investigating = "investigating"
    resolved = "resolved"
    closed = "closed"


class Incident(Base):
    """Security incident aggregated from one or more alerts."""

    __tablename__ = "incidents"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    title: Mapped[str] = mapped_column(String(500), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[IncidentStatus] = mapped_column(
        Enum(IncidentStatus), default=IncidentStatus.new, nullable=False
    )
    severity: Mapped[str] = mapped_column(String(20), default="low", nullable=False)
    risk_score: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    alert_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    first_seen: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    last_seen: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False
    )

    # Relationships
    incident_events = relationship("IncidentEvent", back_populates="incident", lazy="selectin")
    investigations = relationship("Investigation", back_populates="incident", lazy="selectin")
    recommendations = relationship("Recommendation", back_populates="incident", lazy="selectin")
