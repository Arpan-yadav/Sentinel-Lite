"""SOC Analytics and Metrics API routes."""

from typing import Any, List
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.schemas.analytics import AttackTrendResponse, DashboardStats, SeverityDistribution
from app.services.analytics_service import AnalyticsService

router = APIRouter(prefix="/v1/analytics", tags=["Analytics"])


@router.get("/dashboard-stats", response_model=DashboardStats)
async def get_dashboard_stats(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Any:
    """Fetch high-level SOC dashboard KPI metrics."""
    return await AnalyticsService.get_dashboard_stats(db)


@router.get("/attack-trends", response_model=List[AttackTrendResponse])
async def get_attack_trends(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Any:
    """Fetch attack frequency breakdown across attack types."""
    return await AnalyticsService.get_attack_trends(db)


@router.get("/severity-distribution", response_model=List[SeverityDistribution])
async def get_severity_distribution(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Any:
    """Fetch incident count grouped by severity level."""
    return await AnalyticsService.get_severity_distribution(db)

