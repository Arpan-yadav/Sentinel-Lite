"""Analytics and SOC metrics service."""

from __future__ import annotations

from typing import Any, Dict, List
from datetime import datetime
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.alert import Alert, Severity
from app.models.incident import Incident, IncidentStatus
from app.models.security_event import SecurityEvent
from app.schemas.analytics import AttackTrendResponse, DashboardStats, SeverityDistribution


class AnalyticsService:
    """Computes SOC operational metrics, threat distributions, and trends."""

    @staticmethod
    async def get_dashboard_stats(db: AsyncSession) -> DashboardStats:
        """Fetch high-level overview metrics."""
        total_events = (await db.execute(select(func.count(SecurityEvent.id)))).scalar_one() or 0
        total_alerts = (await db.execute(select(func.count(Alert.id)))).scalar_one() or 0
        total_incidents = (await db.execute(select(func.count(Incident.id)))).scalar_one() or 0

        open_incidents = (
            await db.execute(
                select(func.count(Incident.id)).where(Incident.status.in_([IncidentStatus.new, IncidentStatus.investigating]))
            )
        ).scalar_one() or 0

        critical_alerts = (
            await db.execute(
                select(func.count(Alert.id)).where(Alert.severity == Severity.critical)
            )
        ).scalar_one() or 0

        avg_risk = (
            await db.execute(select(func.avg(Incident.risk_score)))
        ).scalar_one() or 0.0

        return DashboardStats(
            total_events=total_events,
            total_alerts=total_alerts,
            total_incidents=total_incidents,
            open_incidents=open_incidents,
            critical_alerts=critical_alerts,
            avg_risk_score=round(float(avg_risk), 2),
        )

    @staticmethod
    async def get_severity_distribution(db: AsyncSession) -> List[SeverityDistribution]:
        """Calculate counts across severity brackets."""
        stmt = select(Incident.severity, func.count(Incident.id)).group_by(Incident.severity)
        rows = (await db.execute(stmt)).all()
        return [
            SeverityDistribution(severity=str(row[0]), count=row[1])
            for row in rows
        ]

    @staticmethod
    async def get_attack_trends(db: AsyncSession) -> List[AttackTrendResponse]:
        """Fetch alert frequency breakdown by attack type."""
        stmt = (
            select(Alert.alert_type, func.count(Alert.id))
            .group_by(Alert.alert_type)
            .order_by(func.count(Alert.id).desc())
            .limit(10)
        )
        rows = (await db.execute(stmt)).all()
        today_str = datetime.now().strftime("%Y-%m-%d")
        return [
            AttackTrendResponse(
                date=today_str,
                event_type=str(row[0]),
                count=row[1],
            )
            for row in rows
        ]
