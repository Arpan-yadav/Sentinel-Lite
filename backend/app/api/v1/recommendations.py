"""Remediation and Human Approval API routes."""

import uuid
from typing import Any, List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.schemas.recommendation import ApprovalCreate, RecommendationResponse
from app.services.investigation_service import InvestigationService

router = APIRouter(prefix="/v1/recommendations", tags=["Recommendations"])


@router.get("/incident/{incident_id}", response_model=List[RecommendationResponse])
async def list_recommendations(
    incident_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Any:
    """List all AI recommendations generated for an incident."""
    return await InvestigationService.list_recommendations_for_incident(db, incident_id)


@router.post("/{id}/approve", response_model=RecommendationResponse)
async def approve_recommendation(
    id: uuid.UUID,
    approval_in: ApprovalCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Any:
    """Human analyst approval for an automated or recommended security action."""
    rec = await InvestigationService.review_recommendation(
        db, recommendation_id=id, user=current_user, approved=True, notes=approval_in.notes
    )
    if not rec:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Recommendation not found",
        )
    await db.commit()
    return rec


@router.post("/{id}/reject", response_model=RecommendationResponse)
async def reject_recommendation(
    id: uuid.UUID,
    approval_in: ApprovalCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Any:
    """Human analyst rejection of an AI recommendation."""
    rec = await InvestigationService.review_recommendation(
        db, recommendation_id=id, user=current_user, approved=False, notes=approval_in.notes
    )
    if not rec:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Recommendation not found",
        )
    await db.commit()
    return rec

