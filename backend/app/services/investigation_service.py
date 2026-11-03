"""AI Investigation and Recommendation orchestration service."""

from __future__ import annotations

import logging
import uuid
from typing import Any, Dict, List, Optional

from sqlalchemy import desc, select
from sqlalchemy.ext.asyncio import AsyncSession

from ai.engine import GeminiInvestigationEngine
from app.core.config import settings
from app.models.approval import Approval
from app.models.incident import Incident
from app.models.investigation import Investigation
from app.models.recommendation import Priority, Recommendation, RecommendationStatus
from app.models.user import User

logger = logging.getLogger(__name__)


class InvestigationService:
    """Manages AI investigations and human-in-the-loop recommendations."""

    @staticmethod
    def _get_engine() -> GeminiInvestigationEngine:
        return GeminiInvestigationEngine(api_key=settings.GEMINI_API_KEY)

    @classmethod
    async def generate_investigation(
        cls,
        db: AsyncSession,
        incident: Incident,
    ) -> Investigation:
        """Collect incident telemetry, invoke Gemini AI, and persist Investigation and Recommendations."""
        engine = cls._get_engine()

        # Collect event telemetry
        events = []
        predictions = []
        for ie in incident.incident_events:
            alert = ie.alert
            if alert:
                predictions.append({
                    "model_name": "XGBoost",
                    "prediction": alert.alert_type,
                    "confidence": alert.confidence,
                    "anomaly_score": alert.anomaly_score,
                })
                if alert.event:
                    ev = alert.event
                    events.append({
                        "timestamp": ev.timestamp.isoformat() if ev.timestamp else "",
                        "source_ip": ev.source_ip,
                        "dest_ip": ev.dest_ip,
                        "source_port": ev.source_port,
                        "dest_port": ev.dest_port,
                        "protocol": ev.protocol,
                        "event_type": ev.event_type,
                    })

        incident_data = {
            "title": incident.title,
            "severity": incident.severity,
            "risk_score": incident.risk_score,
            "alert_count": incident.alert_count,
        }

        # Invoke AI engine
        result = await engine.investigate_incident(incident_data, events, predictions)

        # Store Investigation
        investigation = Investigation(
            incident_id=incident.id,
            summary=result.assessment,
            evidence={
                "evidence_summary": result.evidence_summary,
                "risk_factors": result.risk_factors,
                "confidence_level": result.confidence_level,
            },
            assessment={
                "assessment": result.assessment,
                "timeline_analysis": result.timeline_analysis,
            },
            uncertainty=result.uncertainty,
        )
        db.add(investigation)
        await db.flush()

        # Store recommended remediation actions
        for act in result.recommended_actions:
            prio_enum = Priority.medium
            if act.priority in ["low", "medium", "high", "urgent"]:
                prio_enum = Priority(act.priority)

            rec = Recommendation(
                incident_id=incident.id,
                action=f"{act.action} — Rationale: {act.rationale}",
                priority=prio_enum,
                status=RecommendationStatus.pending,
            )
            db.add(rec)

        await db.commit()
        await db.refresh(investigation)
        return investigation

    @staticmethod
    async def get_investigation_by_incident(
        db: AsyncSession,
        incident_id: uuid.UUID,
    ) -> Optional[Investigation]:
        """Fetch the latest investigation report for an incident."""
        stmt = (
            select(Investigation)
            .where(Investigation.incident_id == incident_id)
            .order_by(desc(Investigation.created_at))
            .limit(1)
        )
        result = await db.execute(stmt)
        return result.scalar_one_or_none()

    @staticmethod
    async def list_recommendations_for_incident(
        db: AsyncSession,
        incident_id: uuid.UUID,
    ) -> List[Recommendation]:
        """Fetch all recommendations for an incident."""
        stmt = (
            select(Recommendation)
            .where(Recommendation.incident_id == incident_id)
            .order_by(desc(Recommendation.created_at))
        )
        result = await db.execute(stmt)
        return list(result.scalars().all())

    @staticmethod
    async def review_recommendation(
        db: AsyncSession,
        recommendation_id: uuid.UUID,
        user: User,
        approved: bool,
        notes: Optional[str] = None,
    ) -> Optional[Recommendation]:
        """Record human analyst approval or rejection."""
        stmt = select(Recommendation).where(Recommendation.id == recommendation_id)
        result = await db.execute(stmt)
        rec = result.scalar_one_or_none()
        if not rec:
            return None

        rec.status = RecommendationStatus.approved if approved else RecommendationStatus.rejected
        approval = Approval(
            recommendation_id=rec.id,
            approved_by=user.id,
            approved=approved,
            notes=notes,
        )
        db.add(approval)
        await db.flush()
        await db.refresh(rec)
        return rec

