"""Unit tests for SentinelLite Backend API & Core Services."""

import pytest
from app.core.config import settings
from app.core.security import create_access_token, verify_password, get_password_hash
from app.services.cti_service import CTIService
from app.services.tkg_service import TKGService
from app.ml.predictor import ModelPredictor


def test_settings_load():
    """Verify application configuration loads default parameters."""
    assert settings.PROJECT_NAME == "SentinelLite"


def test_password_hashing_and_verification():
    """Verify Argon2 / Bcrypt password hashing roundtrip."""
    raw = "SecureSecretPassword123!"
    hashed = get_password_hash(raw)
    assert hashed != raw
    assert verify_password(raw, hashed) is True
    assert verify_password("WrongPassword!", hashed) is False


def test_jwt_access_token_creation():
    """Verify JWT access token generation."""
    token = create_access_token(data={"sub": "admin@sentinellite.io", "role": "admin"})
    assert isinstance(token, str)
    assert len(token.split(".")) == 3  # Standard JWT 3 parts


def test_cti_mitre_mapping():
    """Verify CTI service retrieves valid MITRE ATT&CK techniques."""
    tech = CTIService.get_technique_details("T1046")
    assert tech is not None
    assert tech["name"] == "Network Service Discovery"
    assert tech["tactic"] in ["TA0007", "Discovery"]

    # Test event mapping
    mapping = CTIService.map_event_to_mitre("syn_probe", 80)
    assert mapping["id"] == "T1046"


def test_tkg_graph_construction():
    """Verify Temporal Knowledge Graph structure and node/edge assembly."""
    incident = {
        "id": "test-inc-1",
        "title": "PortScan Discovery Attack",
        "severity": "high",
        "risk_score": 75.0,
        "alert_count": 5,
        "status": "open",
    }
    timeline_events = [
        {
            "id": "ev-1",
            "source_ip": "194.26.29.112",
            "dest_ip": "10.0.0.10",
            "dest_port": 80,
            "event_type": "syn_probe",
            "timestamp": "2026-11-12T10:00:00Z",
        }
    ]
    tkg = TKGService.build_incident_tkg(incident, timeline_events)
    assert "nodes" in tkg
    assert "edges" in tkg
    assert len(tkg["nodes"]) >= 3
    assert tkg["chokepoint"]["attacker_ip"] == "194.26.29.112"
    assert "iptables" in tkg["defense_playbook"]


def test_ml_predictor_heuristics():
    """Verify ML predictor handles events with high accuracy fallback."""
    predictor = ModelPredictor()
    pred = predictor.predict_event({
        "event_type": "syn_probe",
        "dest_port": 445,
        "bytes_sent": 40,
        "bytes_received": 0,
        "duration": 0.002,
        "label": "PortScan",
    })
    assert pred["prediction"] == "PortScan"
    assert pred["confidence"] >= 0.85
    assert pred["anomaly_score"] > 0.0


def test_client_schema_and_defaults():
    """Verify Client models and schemas validate properly."""
    from app.schemas.client import ClientCreate
    client = ClientCreate(
        name="Test FinTech Bank",
        industry="Finance",
        tier="Enterprise",
        status="active",
        network_cidr="10.50.0.0/16",
        contact_email="ciso@testbank.com",
        health_score=95,
        active_incidents=1,
    )
    assert client.name == "Test FinTech Bank"
    assert client.health_score == 95


def test_telemetry_samples_generator():
    """Verify authentic CICIDS2017 telemetry samples generation for analytics."""
    from app.api.v1.analytics import _load_stratified_telemetry_samples
    samples = _load_stratified_telemetry_samples(limit=25)
    assert len(samples) > 0
    s0 = samples[0]
    assert "attack_type" in s0
    assert "anomaly_score" in s0
    assert "packet_length_mean" in s0
    assert "severity" in s0


@pytest.mark.asyncio
async def test_multi_provider_ai_engine():
    """Verify SOCAIEngine initializes with Gemini, OpenAI, and Claude, and produces valid reports."""
    from ai.engine import SOCAIEngine, GeminiInvestigationEngine

    # Verify alias
    assert GeminiInvestigationEngine is SOCAIEngine

    # Test initialization with various providers
    gemini_eng = SOCAIEngine(provider="gemini", api_key="", model_name="gemini-3.5-flash-lite")
    assert gemini_eng.provider == "gemini"

    openai_eng = SOCAIEngine(provider="openai", api_key="test-key", model_name="gpt-4o-mini")
    assert openai_eng.provider == "openai"
    assert openai_eng.model_name == "gpt-4o-mini"

    claude_eng = SOCAIEngine(provider="claude", api_key="test-key", model_name="claude-3-5-haiku-20241022")
    assert claude_eng.provider == "claude"

    # Test unconfigured test_connection
    res = await gemini_eng.test_connection()
    assert res["status"] in ["unconfigured", "fallback"]

    # Test fallback investigation generation
    incident_data = {
        "title": "Brute Force SSH Attack",
        "severity": "critical",
        "risk_score": 92.0,
        "alert_count": 10,
    }
    events = [
        {
            "source_ip": "185.220.101.5",
            "dest_ip": "10.0.0.15",
            "source_port": 54321,
            "dest_port": 22,
            "protocol": "TCP",
            "event_type": "ssh_brute",
            "timestamp": "2026-11-14T00:00:00Z",
        }
    ]
    predictions = [{"model_name": "XGBoost", "prediction": "SSH-Bruteforce", "confidence": 0.98, "anomaly_score": 0.85}]

    investigation = await gemini_eng.investigate_incident(incident_data, events, predictions)
    assert investigation.confidence_level in ["low", "medium", "high"]
    assert len(investigation.recommended_actions) >= 1


def test_keep_alive_configuration():
    """Verify Keep-Alive parameters prevent Render spin-down."""
    assert hasattr(settings, "KEEP_ALIVE_ENABLED")
    assert settings.KEEP_ALIVE_ENABLED is True
    assert hasattr(settings, "KEEP_ALIVE_INTERVAL_SECONDS")
    assert settings.KEEP_ALIVE_INTERVAL_SECONDS <= 900  # Must be less than 15-minute Render limit

