"""Pydantic schemas for incidents."""

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel


class IncidentCreate(BaseModel):
    """Schema for creating an incident."""
    title: str
    description: str | None = None
    severity: str = "low"
    alert_ids: list[UUID] = []


class IncidentResponse(BaseModel):
    """Schema for incident in API responses."""
    id: UUID
    title: str
    description: str | None = None
    status: str
    severity: str
    risk_score: float
    alert_count: int
    first_seen: datetime | None = None
    last_seen: datetime | None = None
    created_at: datetime

    model_config = {"from_attributes": True}


class IncidentUpdate(BaseModel):
    """Schema for updating an incident."""
    status: str | None = None
    severity: str | None = None
    title: str | None = None
    description: str | None = None


class IncidentFilter(BaseModel):
    """Filter params for listing incidents."""
    status: str | None = None
    severity: str | None = None
    start_time: datetime | None = None
    end_time: datetime | None = None
    page: int = 1
    page_size: int = 50
