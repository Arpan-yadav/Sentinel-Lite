"""Risk and Severity scoring algorithm for SentinelLite."""

from __future__ import annotations

from typing import Any, Dict, List, Literal, Union
import numpy as np
import pandas as pd

SeverityLevel = Literal["low", "medium", "high", "critical"]

SEVERITY_WEIGHTS: Dict[str, float] = {
    "normal": 0.0,
    "probe": 0.4,
    "port_scan": 0.5,
    "brute_force": 0.8,
    "dos": 0.85,
    "ddos": 0.95,
    "botnet": 0.9,
    "data_exfiltration": 1.0,
    "unknown": 0.5,
}


def calculate_risk_score(
    confidence: float,
    anomaly_score: float,
    event_frequency: float = 1.0,
    attack_type: str = "unknown",
) -> float:
    """Calculate an interpretable 0-100 risk score.

    Weighted formula:
      - 40% Supervised Model Confidence (0.0 - 1.0)
      - 25% Anomaly Detector Score (Normalized 0.0 - 1.0)
      - 20% Event Frequency Factor (Log-scaled bursts normalized 0.0 - 1.0)
      - 15% Attack Type Threat Weight (0.0 - 1.0)

    Returns:
        float: Rounded score in the range [0.0, 100.0].
    """
    conf = min(max(float(confidence), 0.0), 1.0)

    # Isolation Forest scores: typically negative for outliers or [-0.5, 0.5]
    # We normalize to [0, 1]
    norm_anomaly = min(max(float(anomaly_score), 0.0), 1.0)

    # Frequency factor: log scaled (burst of 100 events -> ~1.0)
    freq_factor = min(np.log1p(max(event_frequency, 0.0)) / np.log1p(100.0), 1.0)

    weight = SEVERITY_WEIGHTS.get(attack_type.lower(), 0.5)

    raw_risk = (
        0.40 * conf +
        0.25 * norm_anomaly +
        0.20 * freq_factor +
        0.15 * weight
    ) * 100.0

    return round(float(np.clip(raw_risk, 0.0, 100.0)), 2)


def classify_severity(risk_score: float) -> SeverityLevel:
    """Map a 0-100 risk score to standard security severity levels."""
    if risk_score >= 80.0:
        return "critical"
    elif risk_score >= 60.0:
        return "high"
    elif risk_score >= 35.0:
        return "medium"
    else:
        return "low"


def batch_risk_scores(
    predictions_df: pd.DataFrame,
) -> pd.DataFrame:
    """Compute risk score and severity for a batch dataframe.

    Expected columns in predictions_df:
      - confidence (float)
      - anomaly_score (float)
      - [optional] event_frequency (float/int)
      - [optional] attack_type (str)
    """
    df = predictions_df.copy()
    if "event_frequency" not in df.columns:
        df["event_frequency"] = 1.0
    if "attack_type" not in df.columns:
        df["attack_type"] = "unknown"

    risk_scores = []
    severities = []

    for _, row in df.iterrows():
        score = calculate_risk_score(
            confidence=row["confidence"],
            anomaly_score=row["anomaly_score"],
            event_frequency=row["event_frequency"],
            attack_type=str(row["attack_type"]),
        )
        risk_scores.append(score)
        severities.append(classify_severity(score))

    df["risk_score"] = risk_scores
    df["severity"] = severities
    return df

