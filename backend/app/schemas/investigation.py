"""Pydantic schemas for investigations."""

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel


class InvestigationCreate(BaseModel):
    """Schema for requesting an investigation."""
    additional_context: str | None = None


class InvestigationResponse(BaseModel):
    """Schema for investigation in API responses."""
    id: UUID
    incident_id: UUID
    summary: str | None = None
    evidence: dict | None = None
    assessment: dict | None = None
    uncertainty: str | None = None
    created_at: datetime

    model_config = {"from_attributes": True}
