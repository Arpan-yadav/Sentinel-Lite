"""Gemini-powered AI investigation and remediation engine for SentinelLite."""

from __future__ import annotations

import json
import logging
from typing import Any, Dict, List, Optional

import google.generativeai as genai

from ai.grounding import extract_evidence, format_timeline
from ai.prompts.investigation import INVESTIGATION_SYSTEM_PROMPT, INVESTIGATION_USER_TEMPLATE
from ai.prompts.remediation import REMEDIATION_SYSTEM_PROMPT, REMEDIATION_USER_TEMPLATE
from ai.schemas import InvestigationResult, RemediationResult

logger = logging.getLogger(__name__)


class GeminiInvestigationEngine:
    """Orchestrates LLM-based investigation workflows using Google Gemini API."""

    def __init__(self, api_key: str = "", model_name: str = "gemini-1.5-flash"):
        self.api_key = api_key
        self.model_name = model_name
        if self.api_key:
            genai.configure(api_key=self.api_key)
            self.model = genai.GenerativeModel(
                model_name=self.model_name,
                system_instruction=INVESTIGATION_SYSTEM_PROMPT,
            )
        else:
            self.model = None

    async def investigate_incident(
        self,
        incident_data: Dict[str, Any],
        events: List[Dict[str, Any]],
        predictions: List[Dict[str, Any]],
    ) -> InvestigationResult:
        """Analyze an incident and return an evidence-grounded investigation report."""
        evidence = extract_evidence(events, predictions)
        timeline_str = format_timeline(events)

        user_prompt = INVESTIGATION_USER_TEMPLATE.format(
            title=incident_data.get("title", "Unknown Incident"),
            severity=incident_data.get("severity", "medium"),
            risk_score=incident_data.get("risk_score", 50.0),
            first_seen=evidence["first_seen"],
            last_seen=evidence["last_seen"],
            alert_count=incident_data.get("alert_count", len(events)),
            source_ips=", ".join(evidence["source_ips"]) or "None",
            target_ips=", ".join(evidence["target_ips"]) or "None",
            ports_protocols=", ".join(evidence["ports_protocols"]) or "None",
            model_predictions=evidence["model_predictions"],
            anomaly_score=evidence["anomaly_score"],
            events_sample=timeline_str,
        )

        # Fallback if no API key is configured
        if not self.model:
            logger.warning("No GEMINI_API_KEY provided. Using deterministic fallback investigation.")
            return self._build_fallback_investigation(incident_data, evidence)

        try:
            response = await self.model.generate_content_async(
                user_prompt,
                generation_config=genai.GenerationConfig(
                    response_mime_type="application/json",
                    temperature=0.2,  # Low temperature for strict determinism
                ),
            )
            data = json.loads(response.text)
            return InvestigationResult(**data)
        except Exception as e:
            logger.error(f"Gemini API invocation failed: {e}. Falling back to rule-based summary.")
            return self._build_fallback_investigation(incident_data, evidence)

    async def generate_remediation(
        self,
        incident_data: Dict[str, Any],
        investigation: InvestigationResult,
    ) -> RemediationResult:
        """Generate targeted remediation recommendations."""
        if not self.model:
            return self._build_fallback_remediation(incident_data)

        user_prompt = REMEDIATION_USER_TEMPLATE.format(
            title=incident_data.get("title", "Incident"),
            severity=incident_data.get("severity", "medium"),
            risk_score=incident_data.get("risk_score", 50.0),
            assessment=investigation.assessment,
            assets=", ".join(incident_data.get("assets", [])) or "Host systems",
        )

        try:
            rem_model = genai.GenerativeModel(
                model_name=self.model_name,
                system_instruction=REMEDIATION_SYSTEM_PROMPT,
            )
            response = await rem_model.generate_content_async(
                user_prompt,
                generation_config=genai.GenerationConfig(
                    response_mime_type="application/json",
                    temperature=0.2,
                ),
            )
            data = json.loads(response.text)
            return RemediationResult(**data)
        except Exception as e:
            logger.error(f"Gemini remediation failed: {e}")
            return self._build_fallback_remediation(incident_data)

    def _build_fallback_investigation(
        self,
        incident_data: Dict[str, Any],
        evidence: Dict[str, Any],
    ) -> InvestigationResult:
        """Deterministic grounded output when LLM is unavailable."""
        title = incident_data.get("title", "Suspicious Activity")
        srcs = evidence.get("source_ips", ["Unknown IP"])
        dsts = evidence.get("target_ips", ["Internal Target"])
        ports = evidence.get("ports_protocols", ["TCP/Any"])

        return InvestigationResult(
            assessment=(
                f"Detected anomalous security activity consistent with {title.lower()}. "
                f"Observed repeated interaction originating from {', '.join(srcs)} targeting {', '.join(dsts)} "
                f"across ports {', '.join(ports)}."
            ),
            evidence_summary=[
                f"Source telemetry recorded {evidence.get('total_event_count', 0)} security events.",
                f"Originating hosts: {', '.join(srcs)}.",
                f"Target destinations: {', '.join(dsts)}.",
                f"ML model consensus: {evidence.get('model_predictions', 'Anomalous')}.",
            ],
            risk_factors=[
                f"Elevated event frequency exceeding standard baseline.",
                f"Model anomaly score: {evidence.get('anomaly_score', '0.0')}.",
            ],
            uncertainty=(
                "Packet application layer payload was not deeply inspected. "
                "Recommend verifying credential validity and external threat intelligence indicators."
            ),
            timeline_analysis=(
                f"Activity started at {evidence.get('first_seen', 'N/A')} and persisted until "
                f"{evidence.get('last_seen', 'N/A')}."
            ),
            confidence_level="medium",
            recommended_actions=[
                {
                    "action": f"Apply temporary block rule on perimeter firewall for IP(s): {', '.join(srcs)}",
                    "priority": "urgent" if incident_data.get("risk_score", 0) > 75 else "high",
                    "rationale": "Mitigate ongoing connection attempts while investigation concludes.",
                    "estimated_impact": "Blocks incoming traffic from identified source address without interrupting internal operations.",
                },
                {
                    "action": "Enforce mandatory credential rotation and session invalidation for targeted accounts.",
                    "priority": "high",
                    "rationale": "Prevent unauthorized lateral movement if brute-force attack succeeded.",
                    "estimated_impact": "Users must re-authenticate with multi-factor verification.",
                },
            ],
        )

    def _build_fallback_remediation(self, incident_data: Dict[str, Any]) -> RemediationResult:
        return RemediationResult(
            overall_assessment="Immediate defensive isolation and account review recommended.",
            actions=[
                {
                    "action": "Isolate suspect source IP on firewall / ingress security group.",
                    "priority": "high",
                    "rationale": "Halt further reconnaissance and brute-force attempts.",
                    "estimated_impact": "Minimal impact if source is external untrusted IP.",
                },
                {
                    "action": "Inspect endpoint auth logs for any accepted SSH / RDP sessions.",
                    "priority": "medium",
                    "rationale": "Verify whether unauthorized access was achieved.",
                    "estimated_impact": "Read-only inspection, zero downtime.",
                },
            ],
        )

