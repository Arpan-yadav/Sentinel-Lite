"""Pydantic schemas for Client / Tenant Organizations."""

from datetime import datetime
from typing import Optional
from uuid import UUID
from pydantic import BaseModel, ConfigDict, Field


class ClientBase(BaseModel):
    name: str = Field(..., min_length=2, max_length=255)
    industry: str = Field(default="Technology", max_length=100)
    tier: str = Field(default="Enterprise", max_length=50)
    status: str = Field(default="active", max_length=50)
    network_cidr: str = Field(default="10.0.0.0/16", max_length=100)
    contact_email: str = Field(default="soc-notify@client.com", max_length=255)
    health_score: int = Field(default=95, ge=0, le=100)
    active_incidents: int = Field(default=0, ge=0)
    is_active: bool = True


class ClientCreate(ClientBase):
    pass


class ClientUpdate(BaseModel):
    name: Optional[str] = None
    industry: Optional[str] = None
    tier: Optional[str] = None
    status: Optional[str] = None
    network_cidr: Optional[str] = None
    contact_email: Optional[str] = None
    health_score: Optional[int] = None
    active_incidents: Optional[int] = None
    is_active: Optional[bool] = None


class ClientResponse(ClientBase):
    id: UUID
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

