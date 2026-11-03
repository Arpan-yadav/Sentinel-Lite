"""SHAP Explainability module for SentinelLite detection engine."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple, Union

import numpy as np
import pandas as pd
import shap


class ShapExplainer:
    """Wrapper around SHAP TreeExplainer for tree-based cybersecurity models (XGBoost)."""

    def __init__(self, model: Any, feature_names: Optional[List[str]] = None):
        self.model = model
        self.feature_names = feature_names
        # Use TreeExplainer for tree models (XGBoost)
        self.explainer = shap.TreeExplainer(model)

    def explain_instance(
        self,
        X_single: Union[np.ndarray, pd.DataFrame, pd.Series],
    ) -> Dict[str, Any]:
        """Compute SHAP explanation for a single event or flow."""
        if isinstance(X_single, pd.Series):
            df_instance = X_single.to_frame().T
        elif isinstance(X_single, np.ndarray):
            if X_single.ndim == 1:
                df_instance = pd.DataFrame([X_single], columns=self.feature_names)
            else:
                df_instance = pd.DataFrame(X_single, columns=self.feature_names)
        else:
            df_instance = X_single

        shap_vals = self.explainer.shap_values(df_instance)

        # Handle multiclass vs binary shap values
        if isinstance(shap_vals, list):
            # For multiclass, take predictions of the highest scoring class or positive class
            shap_array = shap_vals[-1][0]
        elif isinstance(shap_vals, np.ndarray) and shap_vals.ndim == 3:
            shap_array = shap_vals[0, :, 1] if shap_vals.shape[2] > 1 else shap_vals[0, :, 0]
        elif isinstance(shap_vals, np.ndarray) and shap_vals.ndim == 2:
            shap_array = shap_vals[0]
        else:
            shap_array = np.array(shap_vals)

        feature_names = self.feature_names or [f"feature_{i}" for i in range(len(shap_array))]
        contributions = {
            feature_names[i]: float(shap_array[i])
            for i in range(min(len(feature_names), len(shap_array)))
        }

        # Sort features by absolute contribution
        sorted_contributions = dict(
            sorted(contributions.items(), key=lambda item: abs(item[1]), reverse=True)
        )

        base_value = float(
            self.explainer.expected_value[-1]
            if isinstance(self.explainer.expected_value, (list, np.ndarray))
            else self.explainer.expected_value
        )

        return {
            "base_value": base_value,
            "feature_contributions": sorted_contributions,
            "top_positive": [
                {"feature": k, "impact": v} for k, v in sorted_contributions.items() if v > 0
            ][:5],
            "top_negative": [
                {"feature": k, "impact": v} for k, v in sorted_contributions.items() if v < 0
            ][:5],
        }

    def explain_batch(
        self,
        X_batch: Union[np.ndarray, pd.DataFrame],
    ) -> List[Dict[str, Any]]:
        """Explain a batch of events."""
        results = []
        if isinstance(X_batch, pd.DataFrame):
            for _, row in X_batch.iterrows():
                results.append(self.explain_instance(row))
        else:
            for i in range(len(X_batch)):
                results.append(self.explain_instance(X_batch[i]))
        return results

    def save_summary_plot(
        self,
        X: Union[np.ndarray, pd.DataFrame],
        save_path: str | Path,
        max_display: int = 15,
    ) -> None:
        """Generate and save SHAP summary beeswarm plot."""
        shap_values = self.explainer.shap_values(X)
        Path(save_path).parent.mkdir(parents=True, exist_ok=True)

        import matplotlib.pyplot as plt

        plt.figure(figsize=(10, 6))
        shap.summary_plot(
            shap_values,
            X,
            feature_names=self.feature_names,
            max_display=max_display,
            show=False,
        )
        plt.tight_layout()
        plt.savefig(save_path, dpi=300)
        plt.close()


def explain_prediction(
    model: Any,
    X_single: Any,
    feature_names: Optional[List[str]] = None,
) -> Dict[str, Any]:
    """Functional helper for single instance explanation."""
    explainer = ShapExplainer(model, feature_names)
    return explainer.explain_instance(X_single)


def shap_values_to_dict(shap_dict: Dict[str, Any]) -> str:
    """Format explanation dictionary to a compact JSON string."""
    return json.dumps(shap_dict)

