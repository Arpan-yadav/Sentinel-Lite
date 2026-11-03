"""Model evaluation module for SentinelLite detection engine."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
from sklearn.metrics import (
    accuracy_score,
    average_precision_score,
    classification_report,
    confusion_matrix,
    f1_score,
    precision_recall_curve,
    precision_score,
    recall_score,
    roc_auc_score,
    roc_curve,
)


def classification_report_dict(y_true: np.ndarray, y_pred: np.ndarray) -> Dict[str, Any]:
    """Return sklearn classification report as a structured dictionary."""
    return classification_report(y_true, y_pred, output_dict=True, zero_division=0)


def compute_metrics(
    y_true: np.ndarray,
    y_pred: np.ndarray,
    y_proba: Optional[np.ndarray] = None,
) -> Dict[str, float]:
    """Compute precision, recall, F1, ROC-AUC, and PR-AUC.

    Args:
        y_true: Ground truth binary or multiclass labels.
        y_pred: Predicted class labels.
        y_proba: Predicted probabilities (optional for AUC metrics).
    """
    metrics = {
        "accuracy": float(accuracy_score(y_true, y_pred)),
        "precision_macro": float(precision_score(y_true, y_pred, average="macro", zero_division=0)),
        "precision_weighted": float(precision_score(y_true, y_pred, average="weighted", zero_division=0)),
        "recall_macro": float(recall_score(y_true, y_pred, average="macro", zero_division=0)),
        "recall_weighted": float(recall_score(y_true, y_pred, average="weighted", zero_division=0)),
        "f1_macro": float(f1_score(y_true, y_pred, average="macro", zero_division=0)),
        "f1_weighted": float(f1_score(y_true, y_pred, average="weighted", zero_division=0)),
    }

    if y_proba is not None:
        try:
            # Handle binary vs multiclass
            if len(np.unique(y_true)) == 2:
                prob_positive = y_proba[:, 1] if y_proba.ndim > 1 else y_proba
                metrics["roc_auc"] = float(roc_auc_score(y_true, prob_positive))
                metrics["pr_auc"] = float(average_precision_score(y_true, prob_positive))
            else:
                metrics["roc_auc"] = float(
                    roc_auc_score(y_true, y_proba, multi_class="ovr", average="weighted")
                )
        except Exception as e:
            metrics["auc_error"] = str(e)

    return metrics


def plot_confusion_matrix(
    y_true: np.ndarray,
    y_pred: np.ndarray,
    labels: Optional[List[str]] = None,
    save_path: Optional[str | Path] = None,
) -> None:
    """Plot and save confusion matrix heatmap."""
    cm = confusion_matrix(y_true, y_pred)
    fig, ax = plt.subplots(figsize=(8, 6))

    cax = ax.matshow(cm, cmap="Blues")
    fig.colorbar(cax)

    if labels is not None:
        ax.set_xticks(range(len(labels)))
        ax.set_yticks(range(len(labels)))
        ax.set_xticklabels(labels, rotation=45, ha="left")
        ax.set_yticklabels(labels)

    for i in range(cm.shape[0]):
        for j in range(cm.shape[1]):
            ax.text(j, i, str(cm[i, j]), ha="center", va="center", color="red" if cm[i, j] > cm.max() / 2 else "black")

    ax.set_xlabel("Predicted")
    ax.set_ylabel("Actual")
    ax.set_title("SentinelLite Confusion Matrix")
    plt.tight_layout()

    if save_path:
        Path(save_path).parent.mkdir(parents=True, exist_ok=True)
        plt.savefig(save_path, dpi=300)
    plt.close()


def plot_roc_curve(
    y_true: np.ndarray,
    y_proba: np.ndarray,
    save_path: Optional[str | Path] = None,
) -> None:
    """Plot Receiver Operating Characteristic (ROC) curve for binary or one-vs-rest."""
    fig, ax = plt.subplots(figsize=(8, 6))
    if len(np.unique(y_true)) == 2:
        prob = y_proba[:, 1] if y_proba.ndim > 1 else y_proba
        fpr, tpr, _ = roc_curve(y_true, prob)
        auc_val = roc_auc_score(y_true, prob)
        ax.plot(fpr, tpr, label=f"ROC (AUC = {auc_val:.4f})", color="navy", lw=2)
    ax.plot([0, 1], [0, 1], "k--", lw=1)
    ax.set_xlim([0.0, 1.0])
    ax.set_ylim([0.0, 1.05])
    ax.set_xlabel("False Positive Rate")
    ax.set_ylabel("True Positive Rate")
    ax.set_title("SentinelLite ROC Curve")
    ax.legend(loc="lower right")
    plt.tight_layout()

    if save_path:
        Path(save_path).parent.mkdir(parents=True, exist_ok=True)
        plt.savefig(save_path, dpi=300)
    plt.close()


def plot_pr_curve(
    y_true: np.ndarray,
    y_proba: np.ndarray,
    save_path: Optional[str | Path] = None,
) -> None:
    """Plot Precision-Recall curve."""
    fig, ax = plt.subplots(figsize=(8, 6))
    prob = y_proba[:, 1] if y_proba.ndim > 1 else y_proba
    precision, recall, _ = precision_recall_curve(y_true, prob)
    ap = average_precision_score(y_true, prob)

    ax.plot(recall, precision, label=f"PR Curve (AP = {ap:.4f})", color="darkgreen", lw=2)
    ax.set_xlabel("Recall")
    ax.set_ylabel("Precision")
    ax.set_title("SentinelLite Precision-Recall Curve")
    ax.legend(loc="lower left")
    plt.tight_layout()

    if save_path:
        Path(save_path).parent.mkdir(parents=True, exist_ok=True)
        plt.savefig(save_path, dpi=300)
    plt.close()


def evaluate_model(
    model: Any,
    X_test: np.ndarray | pd.DataFrame,
    y_test: np.ndarray | pd.Series,
    model_name: str = "xgboost_detector",
    output_dir: str | Path = "ml/reports",
) -> Dict[str, Any]:
    """Execute complete evaluation workflow: computes metrics, confusion matrix, and saves artifacts."""
    out_dir = Path(output_dir)
    out_dir.mkdir(parents=True, exist_ok=True)

    y_pred = model.predict(X_test)
    y_proba = None
    if hasattr(model, "predict_proba"):
        y_proba = model.predict_proba(X_test)

    metrics = compute_metrics(np.array(y_test), np.array(y_pred), y_proba)
    report = classification_report_dict(np.array(y_test), np.array(y_pred))

    results = {
        "model_name": model_name,
        "metrics": metrics,
        "classification_report": report,
    }

    # Save metrics JSON
    json_path = out_dir / f"{model_name}_metrics.json"
    with open(json_path, "w", encoding="utf-8") as f:
        json.dump(results, f, indent=2)

    # Save confusion matrix plot
    plot_confusion_matrix(np.array(y_test), np.array(y_pred), save_path=out_dir / f"{model_name}_cm.png")

    if y_proba is not None and len(np.unique(y_test)) == 2:
        plot_roc_curve(np.array(y_test), y_proba, save_path=out_dir / f"{model_name}_roc.png")
        plot_pr_curve(np.array(y_test), y_proba, save_path=out_dir / f"{model_name}_pr.png")

    return results


def compare_models(results_dict: Dict[str, Dict[str, Any]]) -> pd.DataFrame:
    """Compare multiple model evaluation results side by side."""
    rows = []
    for name, res in results_dict.items():
        metrics = res.get("metrics", {})
        row = {"Model": name}
        row.update(metrics)
        rows.append(row)
    return pd.DataFrame(rows).set_index("Model")

