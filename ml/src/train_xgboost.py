"""
XGBoost training script for SentinelLite.

Trains an XGBoost classifier on preprocessed network security data
with support for imbalanced classes, early stopping, and hyperparameter tuning.
"""

from __future__ import annotations

import argparse
import json
import logging
from pathlib import Path
from typing import Any, Optional

import joblib
import numpy as np
from sklearn.model_selection import GridSearchCV
from xgboost import XGBClassifier

from ml.src.evaluate import evaluate_model
from ml.src.preprocessing import preprocess_pipeline

logger = logging.getLogger(__name__)


def configure_xgboost(
    num_classes: int = 2,
    scale_pos_weight: float = 1.0,
    early_stopping_rounds: int = 20,
) -> XGBClassifier:
    """Create an XGBClassifier with defaults tuned for imbalanced security data."""
    objective = "binary:logistic" if num_classes <= 2 else "multi:softprob"

    params: dict[str, Any] = {
        "objective": objective,
        "n_estimators": 200,
        "max_depth": 6,
        "learning_rate": 0.1,
        "subsample": 0.8,
        "colsample_bytree": 0.8,
        "min_child_weight": 5,
        "gamma": 0.1,
        "reg_alpha": 0.1,
        "reg_lambda": 1.0,
        "random_state": 42,
        "n_jobs": -1,
        "eval_metric": "logloss" if num_classes <= 2 else "mlogloss",
    }
    if early_stopping_rounds and early_stopping_rounds > 0:
        params["early_stopping_rounds"] = early_stopping_rounds
    if num_classes <= 2:
        params["scale_pos_weight"] = scale_pos_weight

    model = XGBClassifier(**params)
    logger.info("Configured XGBoost: objective=%s, n_estimators=200, max_depth=6, lr=0.1", objective)
    return model


def train_model(
    X_train: np.ndarray,
    y_train: np.ndarray,
    X_val: np.ndarray,
    y_val: np.ndarray,
    num_classes: int = 2,
    scale_pos_weight: float = 1.0,
    early_stopping_rounds: int = 20,
) -> XGBClassifier:
    """Train an XGBoost model with early stopping."""
    model = configure_xgboost(
        num_classes=num_classes,
        scale_pos_weight=scale_pos_weight,
        early_stopping_rounds=early_stopping_rounds,
    )

    logger.info("Training XGBoost model on %d samples...", len(X_train))

    model.fit(
        X_train,
        y_train,
        eval_set=[(X_val, y_val)],
        verbose=False,
    )

    try:
        best_score = float(model.best_score)
        best_iteration = int(model.best_iteration)
    except Exception:
        best_score = 0.0
        best_iteration = int(getattr(model, "n_estimators", 200))

    logger.info("Training complete. Best iteration: %d, Best score: %.4f", best_iteration, best_score)
    return model


def tune_hyperparameters(
    X_train: np.ndarray,
    y_train: np.ndarray,
    cv: int = 3,
    scoring: str = "f1_weighted",
) -> dict[str, Any]:
    """Tune XGBoost hyperparameters using GridSearchCV.

    Args:
        X_train: Training feature matrix.
        y_train: Training labels.
        cv: Number of cross-validation folds.
        scoring: Scoring metric for optimization.

    Returns:
        Dictionary with best parameters and best score.
    """
    param_grid = {
        "max_depth": [4, 6, 8],
        "learning_rate": [0.05, 0.1, 0.2],
        "n_estimators": [100, 200, 300],
        "min_child_weight": [3, 5, 7],
        "subsample": [0.7, 0.8, 0.9],
    }

    base_model = XGBClassifier(
        objective="multi:softprob",
        random_state=42,
        n_jobs=-1,
        use_label_encoder=False,
        eval_metric="mlogloss",
    )

    logger.info("Starting hyperparameter tuning with %d-fold CV...", cv)

    grid_search = GridSearchCV(
        estimator=base_model,
        param_grid=param_grid,
        cv=cv,
        scoring=scoring,
        n_jobs=-1,
        verbose=1,
        refit=True,
    )

    grid_search.fit(X_train, y_train)

    logger.info("Best parameters: %s", grid_search.best_params_)
    logger.info("Best %s score: %.4f", scoring, grid_search.best_score_)

    return {
        "best_params": grid_search.best_params_,
        "best_score": grid_search.best_score_,
        "best_estimator": grid_search.best_estimator_,
    }


def save_model(model: XGBClassifier, path: str | Path) -> None:
    """Save a trained model using joblib.

    Args:
        model: Trained model to save.
        path: Output file path.
    """
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    joblib.dump(model, path)
    logger.info("Model saved to %s", path)


def main() -> None:
    """Main training entrypoint: load data, train, evaluate, save."""
    parser = argparse.ArgumentParser(description="Train XGBoost for SentinelLite")
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
        "--tune",
        action="store_true",
        help="Run hyperparameter tuning before training.",
    )
    args = parser.parse_args()

    logging.basicConfig(level=logging.INFO)

    output_dir = Path(args.output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)

    # Preprocess data
    logger.info("Preprocessing data...")
    data = preprocess_pipeline(args.data)

    X_train = data["X_train"]
    X_val = data["X_val"]
    X_test = data["X_test"]
    y_train = data["y_train"]
    y_val = data["y_val"]
    y_test = data["y_test"]

    num_classes = len(data["encoder"].classes_)

    # Calculate class weight for imbalanced data
    class_counts = np.bincount(y_train)
    if len(class_counts) == 2:
        scale_pos_weight = class_counts[0] / max(class_counts[1], 1)
    else:
        scale_pos_weight = 1.0

    # Optional hyperparameter tuning
    if args.tune:
        tune_result = tune_hyperparameters(X_train, y_train)
        logger.info("Tuning results: %s", tune_result["best_params"])

    # Train model
    model = train_model(
        X_train, y_train, X_val, y_val,
        num_classes=num_classes,
        scale_pos_weight=scale_pos_weight,
    )

    # Evaluate
    logger.info("Evaluating model on test set...")
    metrics = evaluate_model(
        model, X_test, y_test,
        model_name="xgboost",
        output_dir=str(output_dir),
    )

    # Save model and metadata
    save_model(model, output_dir / "xgboost_model.joblib")
    if data.get("scaler") is not None:
        joblib.dump(data["scaler"], output_dir / "scaler.joblib")
    if data.get("encoder") is not None:
        joblib.dump(data["encoder"], output_dir / "label_encoder.joblib")
    with open(output_dir / "feature_names.json", "w", encoding="utf-8") as f:
        json.dump(data["feature_names"], f, indent=2)

    metadata = {
        "model_type": "XGBoost",
        "num_classes": num_classes,
        "feature_names": data["feature_names"],
        "class_labels": list(data["encoder"].classes_),
        "metrics": metrics,
    }
    with open(output_dir / "xgboost_metadata.json", "w", encoding="utf-8") as f:
        json.dump(metadata, f, indent=2, default=str)

    logger.info("Training pipeline complete. Artifacts saved to %s", output_dir)


if __name__ == "__main__":
    main()
