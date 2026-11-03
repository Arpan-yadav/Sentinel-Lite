"""Pydantic schemas for security events."""

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel


class SecurityEventCreate(BaseModel):
    """Schema for creating a security event."""
    timestamp: datetime
    source_ip: str
    dest_ip: str
    source_port: int
    dest_port: int
    protocol: str
    event_type: str
    raw_data: dict | None = None
    asset_id: UUID | None = None


class SecurityEventResponse(BaseModel):
    """Schema for security event in API responses."""
    id: UUID
    timestamp: datetime
    source_ip: str
    dest_ip: str
    source_port: int
    dest_port: int
    protocol: str
    event_type: str
    raw_data: dict | None = None
    asset_id: UUID | None = None
    created_at: datetime

    model_config = {"from_attributes": True}


class SecurityEventFilter(BaseModel):
    """Filter / pagination params for listing security events."""
    source_ip: str | None = None
    dest_ip: str | None = None
    event_type: str | None = None
    protocol: str | None = None
    start_time: datetime | None = None
    end_time: datetime | None = None
    page: int = 1
    page_size: int = 50
