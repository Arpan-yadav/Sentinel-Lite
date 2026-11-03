"""
Isolation Forest training script for SentinelLite.

Trains an Isolation Forest model for unsupervised anomaly detection
on network traffic data, designed to flag abnormal patterns.
"""

from __future__ import annotations

import argparse
import json
import logging
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
from sklearn.ensemble import IsolationForest

from ml.src.preprocessing import preprocess_pipeline

logger = logging.getLogger(__name__)


def configure_iforest(
    contamination: float = 0.1,
    n_estimators: int = 200,
    random_state: int = 42,
) -> IsolationForest:
    """Create an IsolationForest with tuned defaults for security anomaly detection.

    Args:
        contamination: Expected proportion of anomalies in the training data.
        n_estimators: Number of base estimators (isolation trees).
        random_state: Random seed for reproducibility.

    Returns:
        Configured IsolationForest instance.
    """
    model = IsolationForest(
        n_estimators=n_estimators,
        contamination=contamination,
        max_samples="auto",
        max_features=1.0,
        bootstrap=False,
        random_state=random_state,
        n_jobs=-1,
        verbose=0,
    )

    logger.info(
        "Configured IsolationForest: n_estimators=%d, contamination=%.2f",
        n_estimators,
        contamination,
    )
    return model


def train_model(
    X_train: np.ndarray,
    contamination: float = 0.1,
    n_estimators: int = 200,
    random_state: int = 42,
) -> IsolationForest:
    """Train an Isolation Forest on (ideally normal) traffic data.

    For best results, train on data that is predominantly normal traffic.

    Args:
        X_train: Training feature matrix (preferably normal traffic only).
        contamination: Expected anomaly fraction.
        n_estimators: Number of isolation trees.
        random_state: Random seed.

    Returns:
        Trained IsolationForest model.
    """
    model = configure_iforest(
        contamination=contamination,
        n_estimators=n_estimators,
        random_state=random_state,
    )

    logger.info("Training IsolationForest on %d samples...", len(X_train))
    model.fit(X_train)
    logger.info("IsolationForest training complete.")

    return model


def predict_anomalies(
    model: IsolationForest,
    X: np.ndarray,
) -> tuple[np.ndarray, np.ndarray]:
    """Predict anomalies and return scores and labels.

    Args:
        model: Trained IsolationForest.
        X: Feature matrix to score.

    Returns:
        Tuple of (anomaly_scores, anomaly_labels).
        - anomaly_scores: Raw anomaly scores (more negative = more anomalous).
        - anomaly_labels: Binary labels where 1 = normal, -1 = anomaly.
    """
    anomaly_scores = model.decision_function(X)
    anomaly_labels = model.predict(X)

    n_anomalies = (anomaly_labels == -1).sum()
    logger.info(
        "Predicted %d anomalies out of %d samples (%.2f%%)",
        n_anomalies,
        len(X),
        100.0 * n_anomalies / len(X),
    )

    return anomaly_scores, anomaly_labels


def save_model(model: IsolationForest, path: str | Path) -> None:
    """Save a trained Isolation Forest model using joblib.

    Args:
        model: Trained model to save.
        path: Output file path.
    """
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    joblib.dump(model, path)
    logger.info("IsolationForest model saved to %s", path)


def main() -> None:
    """Main entrypoint: load data, filter normal traffic, train, save."""
    parser = argparse.ArgumentParser(
        description="Train Isolation Forest for SentinelLite anomaly detection"
    )
    parser.add_argument(
        "--data",
        type=str,
        required=True,
        help="Path to training CSV dataset.",
    )
    parser.add_argument(
        "--output-dir",
        type=str,
        default="ml/models",
        help="Directory to save trained model and artifacts.",
    )
    parser.add_argument(
        "--contamination",
        type=float,
        default=0.1,
        help="Expected anomaly fraction (default: 0.1).",
    )
    parser.add_argument(
        "--normal-label",
        type=str,
        default="BENIGN",
        help="Label value for normal traffic (default: BENIGN).",
    )
    parser.add_argument(
        "--train-on-normal-only",
        action="store_true",
        default=True,
        help="Train only on samples labeled as normal traffic.",
    )
    args = parser.parse_args()

    logging.basicConfig(level=logging.INFO)

    output_dir = Path(args.output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)

    # Preprocess data
    logger.info("Preprocessing data...")
    data = preprocess_pipeline(args.data, normalize=True)

    X_train = data["X_train"]
    y_train = data["y_train"]
    X_test = data["X_test"]
    y_test = data["y_test"]
    encoder = data["encoder"]

    # Filter to normal traffic only for training (if requested)
    if args.train_on_normal_only:
        normal_label_encoded = None
        for idx, cls in enumerate(encoder.classes_):
            if cls.upper() == args.normal_label.upper():
                normal_label_encoded = idx
                break

        if normal_label_encoded is not None:
            normal_mask = y_train == normal_label_encoded
            X_train_normal = X_train[normal_mask]
            logger.info(
                "Training on normal traffic only: %d / %d samples",
                len(X_train_normal),
                len(X_train),
            )
        else:
            logger.warning(
                "Normal label '%s' not found in encoder classes %s. Training on all data.",
                args.normal_label,
                list(encoder.classes_),
            )
            X_train_normal = X_train
    else:
        X_train_normal = X_train

    # Train model
    model = train_model(
        X_train_normal,
        contamination=args.contamination,
    )

    # Evaluate on test set
    anomaly_scores, anomaly_labels = predict_anomalies(model, X_test)

    # Save model and metadata
    save_model(model, output_dir / "iforest_model.joblib")

    metadata = {
        "model_type": "IsolationForest",
        "contamination": args.contamination,
        "training_samples": len(X_train_normal),
        "feature_names": data["feature_names"],
        "test_anomalies_detected": int((anomaly_labels == -1).sum()),
        "test_total_samples": len(X_test),
    }
    with open(output_dir / "iforest_metadata.json", "w") as f:
        json.dump(metadata, f, indent=2)

    logger.info("IsolationForest pipeline complete. Artifacts saved to %s", output_dir)


if __name__ == "__main__":
    main()
