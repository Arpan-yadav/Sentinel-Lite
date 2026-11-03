"""Pydantic schemas for recommendations and approvals."""

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel


class RecommendationResponse(BaseModel):
    """Schema for recommendation in API responses."""
    id: UUID
    incident_id: UUID
    action: str
    priority: str
    status: str
    created_at: datetime

    model_config = {"from_attributes": True}


class ApprovalCreate(BaseModel):
    """Schema for approving / rejecting a recommendation."""
    approved: bool
    notes: str | None = None
