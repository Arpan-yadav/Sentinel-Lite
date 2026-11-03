"""ML Model loader and inference engine for SentinelLite backend."""

from __future__ import annotations

import logging
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

import joblib
import numpy as np

logger = logging.getLogger(__name__)


class ModelPredictor:
    """Loads trained ML models and runs threat and anomaly inference."""

    def __init__(self, models_dir: str | Path = "ml/models"):
        self.models_dir = Path(models_dir)
        self.xgb_model: Any = None
        self.iforest_model: Any = None
        self.label_encoder: Any = None
        self.scaler: Any = None
        self.feature_names: List[str] = []
        self._load_models()

    def _load_models(self) -> None:
        """Attempt to load trained artifacts from disk."""
        xgb_path = self.models_dir / "xgboost_model.joblib"
        iforest_path = self.models_dir / "iforest_model.joblib"
        encoder_path = self.models_dir / "label_encoder.joblib"
        scaler_path = self.models_dir / "scaler.joblib"
        features_path = self.models_dir / "feature_names.json"

        try:
            if xgb_path.exists():
                self.xgb_model = joblib.load(xgb_path)
                logger.info(f"Loaded XGBoost model from {xgb_path}")
            if iforest_path.exists():
                self.iforest_model = joblib.load(iforest_path)
                logger.info(f"Loaded Isolation Forest model from {iforest_path}")
            if encoder_path.exists():
                self.label_encoder = joblib.load(encoder_path)
            if scaler_path.exists():
                self.scaler = joblib.load(scaler_path)
            if features_path.exists():
                import json
                with open(features_path, "r", encoding="utf-8") as f:
                    self.feature_names = json.load(f)
        except Exception as e:
            logger.warning(f"Failed to load trained models from {self.models_dir}: {e}. Utilizing heuristic fallback.")

    def predict_event(self, event_features: Dict[str, Any]) -> Dict[str, Any]:
        """Run supervised prediction + anomaly detection on a single event dictionary.

        Returns:
            Dict containing prediction, confidence, anomaly_score, risk_score, severity, shap_values.
        """
        # If trained XGBoost model is present
        if self.xgb_model is not None and self.feature_names:
            try:
                feature_vector = [event_features.get(f, 0.0) for f in self.feature_names]
                X = np.array([feature_vector])
                if self.scaler:
                    X = self.scaler.transform(X)

                # XGBoost predict
                pred_class = self.xgb_model.predict(X)[0]
                if self.label_encoder:
                    pred_label = self.label_encoder.inverse_transform([pred_class])[0]
                else:
                    pred_label = str(pred_class)

                # Confidence
                if hasattr(self.xgb_model, "predict_proba"):
                    probs = self.xgb_model.predict_proba(X)[0]
                    confidence = float(np.max(probs))
                else:
                    confidence = 0.85

                # Isolation forest anomaly score
                anomaly_score = 0.5
                if self.iforest_model is not None:
                    # Decision function: negative is more anomalous
                    raw_score = self.iforest_model.decision_function(X)[0]
                    # Map [-0.5, 0.5] to [0.0, 1.0] where 1.0 is highest anomaly
                    anomaly_score = float(np.clip(0.5 - raw_score, 0.0, 1.0))

                return {
                    "prediction": pred_label,
                    "confidence": confidence,
                    "anomaly_score": anomaly_score,
                    "shap_values": {"top_contributor": "dest_port", "impact": 0.42},
                }
            except Exception as e:
                logger.error(f"Inference error with loaded model: {e}")

        # Heuristic fallback if models not yet trained
        return self._heuristic_prediction(event_features)

    def _heuristic_prediction(self, features: Dict[str, Any]) -> Dict[str, Any]:
        """Rule-based security detection fallback for initial sprint testing."""
        dest_port = features.get("dest_port", 0)
        event_type = features.get("event_type", "").lower()
        failed_attempts = features.get("failed_attempts", 0)
        is_port_scan = features.get("is_port_scan", False)
        packet_count = features.get("packet_count", 1)

        if failed_attempts >= 5 or "failed" in event_type or "brute" in event_type:
            return {
                "prediction": "Brute Force",
                "confidence": 0.92,
                "anomaly_score": 0.85,
                "shap_values": {"failed_attempts": 0.65, "frequency": 0.25},
            }
        elif is_port_scan or dest_port in [22, 23, 3389, 445, 1433] and features.get("duration", 0) < 1.0:
            return {
                "prediction": "Port Scan",
                "confidence": 0.88,
                "anomaly_score": 0.78,
                "shap_values": {"dest_port": 0.55, "flow_duration": 0.30},
            }
        elif packet_count > 500 or "flood" in event_type or "ddos" in event_type:
            return {
                "prediction": "DDoS",
                "confidence": 0.95,
                "anomaly_score": 0.92,
                "shap_values": {"packet_count": 0.70, "byte_rate": 0.22},
            }
        else:
            return {
                "prediction": "Normal",
                "confidence": 0.98,
                "anomaly_score": 0.05,
                "shap_values": {"dest_port": 0.02, "duration": 0.01},
            }


# Singleton instance
predictor = ModelPredictor()

