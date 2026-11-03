"""Pydantic schemas for alerts."""

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel


class AlertResponse(BaseModel):
    """Schema for alert in API responses."""
    id: UUID
    event_id: UUID
    alert_type: str
    confidence: float
    anomaly_score: float
    risk_score: float
    severity: str
    created_at: datetime

    model_config = {"from_attributes": True}


class AlertFilter(BaseModel):
    """Filter params for listing alerts."""
    severity: str | None = None
    alert_type: str | None = None
    min_confidence: float | None = None
    start_time: datetime | None = None
    end_time: datetime | None = None
    page: int = 1
    page_size: int = 50
