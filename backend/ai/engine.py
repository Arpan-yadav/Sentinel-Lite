"""Gemini-powered AI investigation and remediation engine for SentinelLite."""

from __future__ import annotations

import asyncio
import json
import logging
import re
import time
import warnings
from typing import Any, Dict, List, Optional

# Suppress non-critical SDK warnings
warnings.filterwarnings("ignore", message="Direct use of automatic function calling")
warnings.filterwarnings("ignore", category=FutureWarning, module="google")

try:
    from google import genai
except Exception:
    genai = None  # type: ignore

logger = logging.getLogger(__name__)

# List of models to try in priority order (ultra-fast lite first, fallback to standard)
CANDIDATE_MODELS = [
    "gemini-3.5-flash-lite",
    "gemini-3.5-flash",
    "gemini-flash-latest",
]


def _extract_json(text: str) -> Dict[str, Any]:
    """Robustly extract and parse JSON object from LLM response text."""
    text = text.strip()
    match = re.search(r"```(?:json)?\s*([\s\S]*?)\s*```", text)
    if match:
        text = match.group(1).strip()
    elif "{" in text and "}" in text:
        start_idx = text.find("{")
        end_idx = text.rfind("}") + 1
        text = text[start_idx:end_idx].strip()
    return json.loads(text)


class GeminiInvestigationEngine:
    """Orchestrates LLM-based investigation workflows using Google Gemini API."""

    def __init__(self, api_key: str = "", model_name: str = "gemini-3.5-flash-lite"):
        self.api_key = api_key.strip()
        self.model_name = model_name
        self.client_type: Optional[str] = None
        self._client: Any = None

        if self.api_key and genai is not None:
            try:
                self._client = genai.Client(api_key=self.api_key)
                self.client_type = "google.genai"
                logger.info(f"Initialized Gemini engine with google.genai ({self.model_name})")
            except Exception as e:
                logger.warning(f"Could not initialize google.genai: {e}")

    async def test_connection(self) -> Dict[str, Any]:
        """Test API key validity, measure latency, and detect active model."""
        if not self.api_key:
            return {
                "status": "unconfigured",
                "message": "No GEMINI_API_KEY set in environment",
                "model": "None",
                "latency_ms": 0,
            }

        start = time.perf_counter()
        active_model = self.model_name

        if self.client_type == "google.genai" and self._client is not None:
            active_client: Any = self._client
            for candidate in [self.model_name] + [m for m in CANDIDATE_MODELS if m != self.model_name]:
                try:
                    res = await asyncio.wait_for(
                        asyncio.to_thread(
                            active_client.models.generate_content,
                            model=candidate,
                            contents="Respond with 'OK'",
                        ),
                        timeout=8.0,
                    )
                    elapsed = int((time.perf_counter() - start) * 1000)
                    self.model_name = candidate
                    return {
                        "status": "connected",
                        "model": candidate,
                        "sdk": "google.genai",
                        "latency_ms": elapsed,
                        "message": f"Successfully authenticated with Google Gemini ({candidate})",
                    }
                except Exception as e:
                    logger.debug(f"Candidate {candidate} failed: {e}")
                    continue

        return {
            "status": "fallback",
            "model": self.model_name,
            "latency_ms": int((time.perf_counter() - start) * 1000),
            "message": "Gemini models currently unreachable; deterministic SOC heuristic engine active.",
        }

    async def investigate_incident(
        self,
        incident_data: Dict[str, Any],
        events: List[Dict[str, Any]],
        predictions: List[Dict[str, Any]],
    ) -> Any:
        """Analyze an incident and return an evidence-grounded investigation report."""
        from ai.grounding import extract_evidence, format_timeline
        from ai.prompts.investigation import INVESTIGATION_SYSTEM_PROMPT, INVESTIGATION_USER_TEMPLATE
        from ai.schemas import InvestigationResult

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

        if not self._client:
            return self._build_fallback_investigation(incident_data, evidence)

        # Attempt invocation using modern client
        if self.client_type == "google.genai" and self._client is not None:
            active_client: Any = self._client
            for model_to_use in [self.model_name] + [m for m in CANDIDATE_MODELS if m != self.model_name]:
                try:
                    full_prompt = f"{INVESTIGATION_SYSTEM_PROMPT}\n\nTask: Output strict JSON matching schema.\n\n{user_prompt}"
                    response = await asyncio.wait_for(
                        asyncio.to_thread(
                            active_client.models.generate_content,
                            model=model_to_use,
                            contents=full_prompt,
                        ),
                        timeout=12.0,
                    )
                    data = _extract_json(response.text)
                    return InvestigationResult(**data)
                except Exception as e:
                    logger.warning(f"Generation with {model_to_use} encountered: {e}")
                    continue

        return self._build_fallback_investigation(incident_data, evidence)

    async def generate_remediation(
        self,
        incident_data: Dict[str, Any],
        investigation: Any,
    ) -> Any:
        """Generate targeted remediation recommendations."""
        from ai.prompts.remediation import REMEDIATION_SYSTEM_PROMPT, REMEDIATION_USER_TEMPLATE
        from ai.schemas import RemediationResult

        if not self._client:
            return self._build_fallback_remediation(incident_data)

        user_prompt = REMEDIATION_USER_TEMPLATE.format(
            title=incident_data.get("title", "Incident"),
            severity=incident_data.get("severity", "medium"),
            risk_score=incident_data.get("risk_score", 50.0),
            assessment=getattr(investigation, "assessment", ""),
            assets=", ".join(incident_data.get("assets", [])) or "Host systems",
        )

        if self.client_type == "google.genai" and self._client is not None:
            active_client: Any = self._client
            for model_to_use in [self.model_name] + [m for m in CANDIDATE_MODELS if m != self.model_name]:
                try:
                    full_prompt = f"{REMEDIATION_SYSTEM_PROMPT}\n\nTask: Output strict JSON matching schema.\n\n{user_prompt}"
                    response = await asyncio.wait_for(
                        asyncio.to_thread(
                            active_client.models.generate_content,
                            model=model_to_use,
                            contents=full_prompt,
                        ),
                        timeout=12.0,
                    )
                    data = _extract_json(response.text)
                    return RemediationResult(**data)
                except Exception as e:
                    logger.warning(f"Remediation with {model_to_use} failed: {e}")
                    continue

        return self._build_fallback_remediation(incident_data)

    def _build_fallback_investigation(
        self,
        incident_data: Dict[str, Any],
        evidence: Dict[str, Any],
    ) -> Any:
        from ai.schemas import InvestigationResult

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
                "Elevated event frequency exceeding baseline.",
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
                    "estimated_impact": "Blocks incoming traffic from identified source address.",
                },
                {
                    "action": "Enforce mandatory credential rotation and session invalidation for targeted accounts.",
                    "priority": "high",
                    "rationale": "Prevent unauthorized lateral movement if brute-force attack succeeded.",
                    "estimated_impact": "Users must re-authenticate with multi-factor verification.",
                },
            ],
        )

    def _build_fallback_remediation(self, incident_data: Dict[str, Any]) -> Any:
        from ai.schemas import RemediationResult
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
