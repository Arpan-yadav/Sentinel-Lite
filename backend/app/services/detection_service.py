"""ML detection and alert generation service."""

from __future__ import annotations

import logging
from typing import Any, Dict, List, Optional, Tuple
import uuid

from sqlalchemy import desc, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.ml.predictor import predictor
from app.models.alert import Alert, Severity
from app.models.model_prediction import ModelPrediction
from app.models.security_event import SecurityEvent
from app.schemas.alert import AlertFilter

logger = logging.getLogger(__name__)


class DetectionService:
    """Orchestrates ML detection on security events."""

    @staticmethod
    async def run_detection(db: AsyncSession, limit: int = 500) -> Dict[str, Any]:
        """Fetch recent events that do not yet have alerts, run inference, and generate alerts."""
        # Find events without alerts
        subquery = select(Alert.event_id)
        stmt = (
            select(SecurityEvent)
            .where(~SecurityEvent.id.in_(subquery))
            .order_by(desc(SecurityEvent.timestamp))
            .limit(limit)
        )
        result = await db.execute(stmt)
        events = list(result.scalars().all())

        alerts_created = 0
        normal_events = 0

        for event in events:
            features = {
                "dest_port": event.dest_port,
                "source_port": event.source_port,
                "protocol": event.protocol,
                "event_type": event.event_type,
            }
            if event.raw_data and isinstance(event.raw_data, dict):
                features.update(event.raw_data)

            prediction_result = predictor.predict_event(features)

            pred_label = prediction_result.get("prediction", "Normal")
            confidence = prediction_result.get("confidence", 0.95)
            anomaly_score = prediction_result.get("anomaly_score", 0.0)
            shap_values = prediction_result.get("shap_values", {})

            # Only generate an Alert if it's anomalous or an attack
            if pred_label.lower() != "normal" or anomaly_score > 0.65:
                # Calculate risk score (0-100)
                risk_score = round(
                    (0.40 * confidence + 0.25 * anomaly_score + 0.20 * 0.5 + 0.15 * 0.8) * 100.0,
                    2,
                )

                # Map to severity enum
                if risk_score >= 80:
                    sev = Severity.critical
                elif risk_score >= 60:
                    sev = Severity.high
                elif risk_score >= 35:
                    sev = Severity.medium
                else:
                    sev = Severity.low

                alert = Alert(
                    event_id=event.id,
                    alert_type=pred_label,
                    confidence=confidence,
                    anomaly_score=anomaly_score,
                    risk_score=risk_score,
                    severity=sev,
                )
                db.add(alert)
                await db.flush()

                # Record ModelPrediction
                model_pred = ModelPrediction(
                    alert_id=alert.id,
                    model_name="XGBoost+IsolationForest",
                    prediction=pred_label,
                    confidence=confidence,
                    shap_values=shap_values,
                )
                db.add(model_pred)
                alerts_created += 1
            else:
                normal_events += 1

        await db.commit()
        return {
            "events_analyzed": len(events),
            "alerts_created": alerts_created,
            "normal_events": normal_events,
        }

    @staticmethod
    async def list_alerts(
        db: AsyncSession,
        filters: AlertFilter,
    ) -> Tuple[List[Alert], int]:
        """List and filter alerts."""
        query = select(Alert)

        if filters.alert_type:
            query = query.where(Alert.alert_type.ilike(f"%{filters.alert_type}%"))
        if filters.severity:
            query = query.where(Alert.severity == filters.severity)
        if filters.min_risk_score is not None:
            query = query.where(Alert.risk_score >= filters.min_risk_score)
        if filters.max_risk_score is not None:
            query = query.where(Alert.risk_score <= filters.max_risk_score)

        count_query = select(func.count()).select_from(query.subquery())
        total = (await db.execute(count_query)).scalar_one()

        offset = (filters.page - 1) * filters.per_page
        query = query.order_by(desc(Alert.created_at)).offset(offset).limit(filters.per_page)
        result = await db.execute(query)
        items = list(result.scalars().all())

        return items, total

    @staticmethod
    async def get_prediction_for_event(db: AsyncSession, event_id: uuid.UUID) -> Optional[Alert]:
        """Fetch the alert associated with a specific event ID."""
        stmt = select(Alert).where(Alert.event_id == event_id)
        res = await db.execute(stmt)
        return res.scalar_one_or_none()

