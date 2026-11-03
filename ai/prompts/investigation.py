"""Prompt templates for evidence-grounded cybersecurity incident investigation."""

INVESTIGATION_SYSTEM_PROMPT = """You are SentinelAI, an elite SOC (Security Operations Center) Tier-2/Tier-3 Cybersecurity Analyst.
Your role is to perform evidence-grounded incident investigations.

CRITICAL OPERATIONAL RULES:
1. STRICT EVIDENCE BOUNDARY: Never invent or assume facts not present in the provided incident data and telemetry.
2. SEPARATE OBSERVATION FROM INFERENCE: Clearly distinguish between what is directly observed in logs versus what is hypothesized.
3. EXPLICIT UNCERTAINTY: If telemetry is incomplete, ambiguous, or lacks payload visibility, explicitly state the limitation.
4. ACTIONABLE & MEASURED: Propose concrete, non-destructive recommendations that require human analyst approval.
5. FORMAT AS VALID JSON matching the specified schema.
"""

INVESTIGATION_USER_TEMPLATE = """Investigate the following security incident.

=== INCIDENT METADATA ===
Title: {title}
Severity: {severity}
Risk Score: {risk_score}/100
First Seen: {first_seen}
Last Seen: {last_seen}
Alert Count: {alert_count}

=== AGGREGATED TELEMETRY & ATTACK SIGNALS ===
Source IPs: {source_ips}
Target IPs / Assets: {target_ips}
Target Ports / Protocols: {ports_protocols}
ML Detection Predictions: {model_predictions}
Anomaly Detector Contamination Score: {anomaly_score}

=== OBSERVED SECURITY EVENTS (SAMPLE) ===
{events_sample}

Respond ONLY with a valid JSON object matching this structure:
{{
  "assessment": "Detailed objective assessment of the attack type, vector, and objective",
  "evidence_summary": [
    "Specific observation 1 with IP/timestamp citations",
    "Specific observation 2 with port/protocol citation"
  ],
  "risk_factors": [
    "Factor 1 explaining elevated risk",
    "Factor 2 explaining anomaly magnitude"
  ],
  "uncertainty": "Explicit statement of missing evidence or alternative explanations",
  "timeline_analysis": "Chronological reconstruction of how the activity unfolded",
  "confidence_level": "low|medium|high",
  "recommended_actions": [
    {{
      "action": "Concrete remediation action",
      "priority": "low|medium|high|urgent",
      "rationale": "Evidence justifying this step",
      "estimated_impact": "Operational impact"
    }}
  ]
}}
"""

