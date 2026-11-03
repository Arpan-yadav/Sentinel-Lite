"""Unit tests for ML preprocessing, feature extraction, and risk scoring."""

import pytest
import numpy as np
import pandas as pd

from ml.src.risk_scoring import calculate_risk_score, classify_severity


def test_calculate_risk_score_normal():
    score = calculate_risk_score(confidence=0.99, anomaly_score=0.05, event_frequency=1.0, attack_type="normal")
    assert 0.0 <= score <= 100.0
    assert score < 50.0
    assert classify_severity(score) in ["low", "medium"]


def test_calculate_risk_score_critical_brute_force():
    score = calculate_risk_score(confidence=0.95, anomaly_score=0.9, event_frequency=80.0, attack_type="brute_force")
    assert score >= 70.0
    assert classify_severity(score) in ["high", "critical"]


def test_classify_severity_boundaries():
    assert classify_severity(85.0) == "critical"
    assert classify_severity(65.0) == "high"
    assert classify_severity(45.0) == "medium"
    assert classify_severity(20.0) == "low"

