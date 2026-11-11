"""Alert ORM model."""

import enum
import uuid
from datetime import datetime, timezone

from sqlalchemy import DateTime, Enum, Float, ForeignKey, String
from sqlalchemy.types import Uuid
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class Severity(str, enum.Enum):
    """Alert / incident severity levels."""
    low = "low"
    medium = "medium"
    high = "high"
    critical = "critical"


class Alert(Base):
    """Detection alert generated from a security event."""

    __tablename__ = "alerts"

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    event_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("security_events.id"), nullable=False
    )
    alert_type: Mapped[str] = mapped_column(String(100), nullable=False)
    confidence: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    anomaly_score: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    risk_score: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    severity: Mapped[Severity] = mapped_column(Enum(Severity), default=Severity.low, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False
    )

    # Relationships
    event = relationship("SecurityEvent", back_populates="alerts", lazy="selectin")
    predictions = relationship("ModelPrediction", back_populates="alert", lazy="selectin")
