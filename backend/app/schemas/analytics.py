"""Pydantic schemas for analytics / dashboard."""

from datetime import datetime

from pydantic import BaseModel


class AttackTrendResponse(BaseModel):
    """Single data point in an attack trend time-series."""
    date: str
    count: int
    event_type: str | None = None


class SeverityDistribution(BaseModel):
    """Count of alerts / incidents by severity."""
    severity: str
    count: int


class DashboardStats(BaseModel):
    """Aggregate dashboard statistics."""
    total_events: int = 0
    total_alerts: int = 0
    total_incidents: int = 0
    open_incidents: int = 0
    critical_alerts: int = 0
    avg_risk_score: float = 0.0
