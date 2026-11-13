"""Client / Tenant Organization ORM model for SentinelLite Multi-Tenant MSSP."""

import uuid
from datetime import datetime, timezone
from sqlalchemy import Boolean, DateTime, Integer, String
from sqlalchemy.types import Uuid
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class Client(Base):
    """Client / Enterprise organization monitored by SentinelLite SOC."""

    __tablename__ = "clients"

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    industry: Mapped[str] = mapped_column(String(100), default="Technology", nullable=False)
    tier: Mapped[str] = mapped_column(String(50), default="Enterprise", nullable=False)  # Enterprise, Standard, Starter
    status: Mapped[str] = mapped_column(String(50), default="active", nullable=False)   # active, warning, critical, maintenance
    network_cidr: Mapped[str] = mapped_column(String(100), default="10.0.0.0/16", nullable=False)
    contact_email: Mapped[str] = mapped_column(String(255), default="soc-notify@client.com", nullable=False)
    health_score: Mapped[int] = mapped_column(Integer, default=95, nullable=False)      # 0 - 100
    active_incidents: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False
    )

