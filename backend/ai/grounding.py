"""Evidence grounding utilities for SentinelLite AI investigations."""

from __future__ import annotations

from typing import Any, Dict, List, Optional
from datetime import datetime


def extract_evidence(events: List[Dict[str, Any]], predictions: List[Dict[str, Any]]) -> Dict[str, Any]:
    """Extract structured evidence from events and ML predictions to feed into LLM."""
    source_ips = set()
    dest_ips = set()
    ports_protocols = set()
    timestamps = []

    for ev in events:
        if "source_ip" in ev and ev["source_ip"]:
            source_ips.add(ev["source_ip"])
        if "dest_ip" in ev and ev["dest_ip"]:
            dest_ips.add(ev["dest_ip"])
        proto = ev.get("protocol", "TCP")
        port = ev.get("dest_port", "")
        if port:
            ports_protocols.add(f"{proto}/{port}")
        ts = ev.get("timestamp")
        if ts:
            timestamps.append(ts)

    model_preds_summary = []
    anomaly_scores = []
    for pred in predictions:
        p_name = pred.get("prediction", "Unknown")
        conf = pred.get("confidence", 0.0)
        model_preds_summary.append(f"{pred.get('model_name', 'model')}: {p_name} ({conf:.1%})")
        if "anomaly_score" in pred:
            anomaly_scores.append(pred["anomaly_score"])

    avg_anomaly = sum(anomaly_scores) / len(anomaly_scores) if anomaly_scores else 0.0

    return {
        "source_ips": list(source_ips),
        "target_ips": list(dest_ips),
        "ports_protocols": list(ports_protocols),
        "model_predictions": ", ".join(model_preds_summary) if model_preds_summary else "N/A",
        "anomaly_score": f"{avg_anomaly:.2f}",
        "first_seen": min(timestamps) if timestamps else "Unknown",
        "last_seen": max(timestamps) if timestamps else "Unknown",
        "total_event_count": len(events),
    }


def format_timeline(events: List[Dict[str, Any]], max_events: int = 15) -> str:
    """Format events into a human-readable chronological timeline for LLM prompt."""
    sorted_events = sorted(events, key=lambda x: str(x.get("timestamp", "")))
    sample = sorted_events[:max_events]

    lines = []
    for ev in sample:
        ts = ev.get("timestamp", "N/A")
        src = ev.get("source_ip", "N/A")
        dst = ev.get("dest_ip", "N/A")
        port = ev.get("dest_port", "N/A")
        proto = ev.get("protocol", "TCP")
        etype = ev.get("event_type", "connection")
        lines.append(f"- [{ts}] {src} -> {dst}:{port} ({proto}) | Type: {etype}")

    if len(events) > max_events:
        lines.append(f"... and {len(events) - max_events} more events in this burst")

    return "\n".join(lines)


def validate_grounding(investigation_assessment: str, known_ips: List[str]) -> bool:
    """Basic check ensuring hallucinated IP addresses not in telemetry are flagged."""
    # Returns true if all mentioned IPv4 addresses match known IPs
    import re
    ip_pattern = r'\b(?:[0-9]{1,3}\.){3}[0-9]{1,3}\b'
    found_ips = re.findall(ip_pattern, investigation_assessment)
    for ip in found_ips:
        if ip not in known_ips and not ip.startswith("127.") and not ip.startswith("0.0."):
            # IP mentioned was not in the input data
            return False
    return True

