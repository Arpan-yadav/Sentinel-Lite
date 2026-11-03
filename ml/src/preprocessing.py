"""
Preprocessing module for SentinelLite ML pipeline.

Handles data loading, cleaning, normalization, encoding, and splitting
for network security datasets (optimized for CICIDS2017 format).
"""

from __future__ import annotations

import logging
from pathlib import Path
from typing import Optional

import numpy as np
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder, StandardScaler

logger = logging.getLogger(__name__)


def load_dataset(filepath: str | Path) -> pd.DataFrame:
    """Load a CSV dataset and perform initial inspection.

    Args:
        filepath: Path to the CSV file.

    Returns:
        Loaded DataFrame.

    Raises:
        FileNotFoundError: If the file does not exist.
        ValueError: If the file cannot be parsed as CSV.
    """
    filepath = Path(filepath)
    if not filepath.exists():
        raise FileNotFoundError(f"Dataset not found: {filepath}")

    logger.info("Loading dataset from %s", filepath)
    try:
        df = pd.read_csv(filepath, low_memory=False)
    except Exception as exc:
        raise ValueError(f"Failed to parse CSV: {exc}") from exc

    # CICIDS2017 format: strip whitespace from column names
    df.columns = df.columns.str.strip()

    logger.info(
        "Loaded dataset: %d rows, %d columns", df.shape[0], df.shape[1]
    )
    return df


def clean_data(df: pd.DataFrame) -> pd.DataFrame:
    """Clean the dataset by handling infinities, NaN values, and dropping unnecessary columns.

    Args:
        df: Raw DataFrame.

    Returns:
        Cleaned DataFrame.
    """
    df = df.copy()
    initial_rows = len(df)

    # Replace infinities with NaN
    df.replace([np.inf, -np.inf], np.nan, inplace=True)

    # Drop columns that are entirely NaN
    all_nan_cols = df.columns[df.isna().all()].tolist()
    if all_nan_cols:
        logger.info("Dropping all-NaN columns: %s", all_nan_cols)
        df.drop(columns=all_nan_cols, inplace=True)

    # Drop columns with very low variance (constant or near-constant)
    numeric_cols = df.select_dtypes(include=[np.number]).columns
    low_var_cols = [
        col for col in numeric_cols if df[col].nunique() <= 1
    ]
    if low_var_cols:
        logger.info("Dropping low-variance columns: %s", low_var_cols)
        df.drop(columns=low_var_cols, inplace=True)

    # Drop duplicate rows
    dup_count = df.duplicated().sum()
    if dup_count > 0:
        logger.info("Dropping %d duplicate rows", dup_count)
        df.drop_duplicates(inplace=True)

    # Fill remaining NaN values with column median for numeric columns
    numeric_cols = df.select_dtypes(include=[np.number]).columns
    for col in numeric_cols:
        if df[col].isna().any():
            median_val = df[col].median()
            df[col].fillna(median_val, inplace=True)

    # Drop CICIDS2017-specific unnecessary columns if present
    unnecessary = ["Flow ID", "Source IP", "Destination IP", "Timestamp"]
    cols_to_drop = [c for c in unnecessary if c in df.columns]
    if cols_to_drop:
        logger.info("Dropping unnecessary columns: %s", cols_to_drop)
        df.drop(columns=cols_to_drop, inplace=True)

    logger.info(
        "Cleaned dataset: %d → %d rows, %d columns",
        initial_rows,
        len(df),
        df.shape[1],
    )
    return df


def normalize_features(
    df: pd.DataFrame,
    columns: Optional[list[str]] = None,
) -> tuple[pd.DataFrame, StandardScaler]:
    """Normalize numerical features using StandardScaler.

    Args:
        df: DataFrame with features to normalize.
        columns: Specific columns to normalize. If None, normalizes all numeric columns.

    Returns:
        Tuple of (normalized DataFrame, fitted scaler).
    """
    df = df.copy()
    if columns is None:
        columns = df.select_dtypes(include=[np.number]).columns.tolist()

    # Filter to columns that actually exist in the DataFrame
    columns = [c for c in columns if c in df.columns]

    if not columns:
        logger.warning("No numeric columns to normalize.")
        return df, StandardScaler()

    scaler = StandardScaler()
    df[columns] = scaler.fit_transform(df[columns])

    logger.info("Normalized %d columns", len(columns))
    return df, scaler


def encode_labels(
    df: pd.DataFrame,
    label_column: str = "Label",
) -> tuple[pd.DataFrame, LabelEncoder]:
    """Encode categorical labels using LabelEncoder.

    Args:
        df: DataFrame containing the label column.
        label_column: Name of the label column.

    Returns:
        Tuple of (DataFrame with encoded labels, fitted encoder).

    Raises:
        KeyError: If the label column is not found.
    """
    if label_column not in df.columns:
        raise KeyError(f"Label column '{label_column}' not found in DataFrame")

    df = df.copy()
    encoder = LabelEncoder()

    # Strip whitespace from labels if they are strings
    if df[label_column].dtype == object:
        df[label_column] = df[label_column].str.strip()

    df[label_column] = encoder.fit_transform(df[label_column])

    logger.info(
        "Encoded %d unique labels: %s",
        len(encoder.classes_),
        list(encoder.classes_),
    )
    return df, encoder


def split_data(
    X: pd.DataFrame | np.ndarray,
    y: pd.Series | np.ndarray,
    test_size: float = 0.2,
    val_size: float = 0.1,
    random_state: int = 42,
) -> tuple[
    np.ndarray, np.ndarray, np.ndarray, np.ndarray, np.ndarray, np.ndarray
]:
    """Split data into stratified train/validation/test sets.

    Args:
        X: Feature matrix.
        y: Target labels.
        test_size: Fraction of data for the test set.
        val_size: Fraction of data for the validation set (taken from training set).
        random_state: Random seed for reproducibility.

    Returns:
        Tuple of (X_train, X_val, X_test, y_train, y_val, y_test).
    """
    # First split: train+val vs test
    X_train_val, X_test, y_train_val, y_test = train_test_split(
        X, y, test_size=test_size, random_state=random_state, stratify=y
    )

    # Second split: train vs val (adjust val_size relative to train+val)
    relative_val_size = val_size / (1.0 - test_size)
    X_train, X_val, y_train, y_val = train_test_split(
        X_train_val,
        y_train_val,
        test_size=relative_val_size,
        random_state=random_state,
        stratify=y_train_val,
    )

    logger.info(
        "Split sizes — Train: %d, Val: %d, Test: %d",
        len(X_train),
        len(X_val),
        len(X_test),
    )
    return X_train, X_val, X_test, y_train, y_val, y_test


def preprocess_pipeline(
    filepath: str | Path,
    label_column: str = "Label",
    normalize: bool = True,
) -> dict:
    """Run the full preprocessing pipeline.

    Chains: load → clean → encode → normalize → split.

    Args:
        filepath: Path to the CSV dataset.
        label_column: Name of the label column.
        normalize: Whether to normalize features.

    Returns:
        Dictionary containing:
            - X_train, X_val, X_test: Feature arrays.
            - y_train, y_val, y_test: Label arrays.
            - scaler: Fitted StandardScaler (or None).
            - encoder: Fitted LabelEncoder.
            - feature_names: List of feature column names.
    """
    logger.info("Starting preprocessing pipeline for %s", filepath)

    # Load
    df = load_dataset(filepath)

    # Clean
    df = clean_data(df)

    # Encode labels
    df, encoder = encode_labels(df, label_column)

    # Separate features and labels
    y = df[label_column]
    X = df.drop(columns=[label_column])

    # Keep only numeric features
    X = X.select_dtypes(include=[np.number])
    feature_names = X.columns.tolist()

    # Normalize
    scaler = None
    if normalize:
        X, scaler = normalize_features(X)

    # Split
    X_train, X_val, X_test, y_train, y_val, y_test = split_data(
        X.values, y.values
    )

    result = {
        "X_train": X_train,
        "X_val": X_val,
        "X_test": X_test,
        "y_train": y_train,
        "y_val": y_val,
        "y_test": y_test,
        "scaler": scaler,
        "encoder": encoder,
        "feature_names": feature_names,
    }

    logger.info("Preprocessing pipeline complete.")
    return result
