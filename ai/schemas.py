"""Pydantic schemas for AI-driven investigation and remediation."""

from __future__ import annotations

from typing import List, Literal, Optional
from pydantic import BaseModel, Field


class RemediationAction(BaseModel):
    """Structured remediation action item recommended by the AI."""
    action: str = Field(description="Concrete action step (e.g., 'Block IP 192.168.1.50 on border firewall')")
    priority: Literal["low", "medium", "high", "urgent"] = Field(default="medium")
    rationale: str = Field(description="Evidence-backed reasoning for this action")
    estimated_impact: str = Field(description="Impact on users or systems (e.g., 'Terminates active connections from attacker')")


class RemediationResult(BaseModel):
    """Overall remediation plan."""
    overall_assessment: str
    actions: List[RemediationAction] = Field(default_factory=list)


class InvestigationResult(BaseModel):
    """Structured, evidence-grounded AI incident investigation."""
    assessment: str = Field(description="Objective assessment of what occurred")
    evidence_summary: List[str] = Field(description="Observed evidence citations from logs and model predictions")
    risk_factors: List[str] = Field(description="Key factors elevating the risk score")
    uncertainty: str = Field(description="Gaps in evidence or alternative hypotheses")
    timeline_analysis: str = Field(description="Temporal flow of observed events")
    confidence_level: Literal["low", "medium", "high"] = Field(default="medium")
    recommended_actions: List[RemediationAction] = Field(default_factory=list)

