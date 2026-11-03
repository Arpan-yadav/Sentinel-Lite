"""Recommendation ORM model."""

import enum
import uuid
from datetime import datetime, timezone

from sqlalchemy import DateTime, Enum, ForeignKey, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class Priority(str, enum.Enum):
    """Recommendation priority levels."""
    low = "low"
    medium = "medium"
    high = "high"
    urgent = "urgent"


class RecommendationStatus(str, enum.Enum):
    """Recommendation approval statuses."""
    pending = "pending"
    approved = "approved"
    rejected = "rejected"


class Recommendation(Base):
    """Actionable recommendation generated for an incident."""

    __tablename__ = "recommendations"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    incident_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("incidents.id"), nullable=False
    )
    action: Mapped[str] = mapped_column(Text, nullable=False)
    priority: Mapped[Priority] = mapped_column(Enum(Priority), default=Priority.medium, nullable=False)
    status: Mapped[RecommendationStatus] = mapped_column(
        Enum(RecommendationStatus), default=RecommendationStatus.pending, nullable=False
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False
    )

    # Relationships
    incident = relationship("Incident", back_populates="recommendations", lazy="selectin")
    approvals = relationship("Approval", back_populates="recommendation", lazy="selectin")
