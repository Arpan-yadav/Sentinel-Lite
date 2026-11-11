"""IncidentEvent association ORM model."""

import uuid

from sqlalchemy import ForeignKey
from sqlalchemy.types import Uuid
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class IncidentEvent(Base):
    """Many-to-many link between incidents and alerts."""

    __tablename__ = "incident_events"

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    incident_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("incidents.id"), nullable=False
    )
    alert_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("alerts.id"), nullable=False
    )

    # Relationships
    incident = relationship("Incident", back_populates="incident_events", lazy="selectin")
    alert = relationship("Alert", lazy="selectin")
