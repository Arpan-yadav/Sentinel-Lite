"""SecurityEvent ORM model."""

import uuid
from datetime import datetime, timezone

from sqlalchemy import DateTime, ForeignKey, Integer, String
from sqlalchemy.types import Uuid, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class SecurityEvent(Base):
    """Raw security event ingested from network sensors / logs."""

    __tablename__ = "security_events"

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    timestamp: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, index=True)
    source_ip: Mapped[str] = mapped_column(String(45), nullable=False, index=True)
    dest_ip: Mapped[str] = mapped_column(String(45), nullable=False, index=True)
    source_port: Mapped[int] = mapped_column(Integer, nullable=False)
    dest_port: Mapped[int] = mapped_column(Integer, nullable=False)
    protocol: Mapped[str] = mapped_column(String(20), nullable=False)
    event_type: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    raw_data: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    asset_id: Mapped[uuid.UUID | None] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("assets.id"), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False
    )

    # Relationships
    asset = relationship("Asset", back_populates="events", lazy="selectin")
    alerts = relationship("Alert", back_populates="event", lazy="selectin")
