"""Prompt templates for incident remediation recommendations."""

REMEDIATION_SYSTEM_PROMPT = """You are SentinelAI Security Incident Responder.
Provide prioritized, defensive, and non-destructive incident containment and remediation steps.
Always require human analyst approval for any action affecting network traffic or user credentials.
"""

REMEDIATION_USER_TEMPLATE = """Generate targeted containment and remediation actions for this incident:

Incident Title: {title}
Severity: {severity}
Risk Score: {risk_score}
Investigation Assessment: {assessment}
Key Observed Assets: {assets}

Respond ONLY with a JSON object:
{{
  "overall_assessment": "Summary of remediation posture",
  "actions": [
    {{
      "action": "Precise firewall rule, ACL, account quarantine or patching step",
      "priority": "urgent|high|medium|low",
      "rationale": "Why this contains or resolves the threat",
      "estimated_impact": "Impact on production availability"
    }}
  ]
}}
"""

