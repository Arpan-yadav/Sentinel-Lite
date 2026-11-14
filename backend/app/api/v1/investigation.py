"""AI Investigation API routes supporting Gemini, OpenAI, and Claude."""

import uuid
from typing import Any, Dict, Optional
from fastapi import APIRouter, Depends, Header, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.schemas.investigation import InvestigationResponse
from app.services.incident_service import IncidentService
from app.services.investigation_service import InvestigationService

router = APIRouter(prefix="/v1/investigation", tags=["Investigation"])


class GenerateInvestigationRequest(BaseModel):
    """Optional per-request AI configuration allowing users to supply their own model/key."""
    provider: Optional[str] = Field(None, description="AI provider: 'gemini', 'openai', or 'claude'")
    api_key: Optional[str] = Field(None, description="Custom API key (overrides server default)")
    model: Optional[str] = Field(None, description="Custom model identifier")


class TestAIRequest(BaseModel):
    """Request payload to test AI provider connectivity and latency."""
    provider: str = Field("gemini", description="AI provider: 'gemini', 'openai', or 'claude'")
    api_key: Optional[str] = Field(None, description="API key to test (uses server default if empty)")
    model: Optional[str] = Field(None, description="Model to test")


@router.get("/ai-config")
async def get_ai_config(
    current_user: User = Depends(get_current_user),
) -> Dict[str, Any]:
    """Retrieve available AI reasoning providers and server-configured defaults."""
    return {
        "default_provider": settings.DEFAULT_AI_PROVIDER,
        "supported_providers": [
            {
                "id": "gemini",
                "name": "Google Gemini",
                "default_model": "gemini-3.5-flash-lite",
                "models": ["gemini-3.5-flash-lite", "gemini-3.5-flash", "gemini-flash-latest"],
                "has_server_key": bool(settings.GEMINI_API_KEY),
            },
            {
                "id": "openai",
                "name": "OpenAI GPT",
                "default_model": "gpt-4o-mini",
                "models": ["gpt-4o-mini", "gpt-4o", "gpt-4-turbo"],
                "has_server_key": bool(settings.OPENAI_API_KEY),
            },
            {
                "id": "claude",
                "name": "Anthropic Claude",
                "default_model": "claude-3-5-haiku-20241022",
                "models": ["claude-3-5-haiku-20241022", "claude-3-5-sonnet-20241022", "claude-3-haiku-20240307"],
                "has_server_key": bool(settings.ANTHROPIC_API_KEY),
            },
        ],
    }


@router.post("/test-ai")
async def test_ai_connection(
    payload: TestAIRequest,
    current_user: User = Depends(get_current_user),
) -> Dict[str, Any]:
    """Test connectivity, model accessibility, and latency for any chosen AI provider."""
    engine = InvestigationService.get_engine(
        provider=payload.provider,
        api_key=payload.api_key,
        model_name=payload.model,
    )
    result = await engine.test_connection()
    return result


@router.post("/{incident_id}/generate", response_model=InvestigationResponse)
async def generate_investigation(
    incident_id: uuid.UUID,
    payload: Optional[GenerateInvestigationRequest] = None,
    x_ai_provider: Optional[str] = Header(None, alias="X-AI-Provider"),
    x_ai_key: Optional[str] = Header(None, alias="X-AI-Key"),
    x_ai_model: Optional[str] = Header(None, alias="X-AI-Model"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Any:
    """Generate an AI-driven, evidence-grounded investigation report using the user's chosen AI provider."""
    incident = await IncidentService.get_incident(db, incident_id)
    if not incident:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Incident not found",
        )

    # Resolution precedence: Request body > HTTP Headers > Server defaults
    prov = payload.provider if (payload and payload.provider) else x_ai_provider
    key = payload.api_key if (payload and payload.api_key) else x_ai_key
    model = payload.model if (payload and payload.model) else x_ai_model

    investigation = await InvestigationService.generate_investigation(
        db=db,
        incident=incident,
        provider=prov,
        api_key=key,
        model_name=model,
    )
    return investigation


@router.get("/{incident_id}", response_model=InvestigationResponse)
async def get_investigation(
    incident_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Any:
    """Retrieve existing investigation report for an incident."""
    investigation = await InvestigationService.get_investigation_by_incident(db, incident_id)
    if not investigation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No investigation found for this incident. Use POST to generate one.",
        )
    return investigation

