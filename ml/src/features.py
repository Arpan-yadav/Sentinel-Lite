"""
Feature engineering module for SentinelLite ML pipeline.

Extracts temporal, flow, statistical, and network features
from raw security event data.
"""

from __future__ import annotations

import logging
from typing import Optional

import numpy as np
import pandas as pd

logger = logging.getLogger(__name__)


def extract_temporal_features(df: pd.DataFrame) -> pd.DataFrame:
    """Extract time-based features from timestamp columns.

    Creates: hour_of_day, day_of_week, is_weekend, time_bin (morning/afternoon/evening/night).

    Args:
        df: DataFrame with a 'timestamp' or 'Timestamp' column.

    Returns:
        DataFrame with added temporal features.
    """
    df = df.copy()

    # Find the timestamp column
    ts_col = None
    for candidate in ["timestamp", "Timestamp", "TIMESTAMP"]:
        if candidate in df.columns:
            ts_col = candidate
            break

    if ts_col is None:
        logger.warning("No timestamp column found; skipping temporal features.")
        return df

    # Parse timestamps
    df[ts_col] = pd.to_datetime(df[ts_col], errors="coerce")

    df["hour_of_day"] = df[ts_col].dt.hour
    df["day_of_week"] = df[ts_col].dt.dayofweek  # 0=Monday, 6=Sunday
    df["is_weekend"] = (df["day_of_week"] >= 5).astype(int)

    # Time bins: 0-5=night, 6-11=morning, 12-17=afternoon, 18-23=evening
    bins = [-1, 5, 11, 17, 23]
    labels_map = [0, 1, 2, 3]  # night=0, morning=1, afternoon=2, evening=3
    df["time_bin"] = pd.cut(
        df["hour_of_day"], bins=bins, labels=labels_map, include_lowest=True
    ).astype(float)

    logger.info("Extracted temporal features: hour_of_day, day_of_week, is_weekend, time_bin")
    return df


def extract_flow_features(df: pd.DataFrame) -> pd.DataFrame:
    """Extract flow-based features from network traffic data.

    Creates: packet_ratio, byte_ratio, flow_rate, bytes_per_packet.

    Args:
        df: DataFrame with flow columns (e.g., duration, packets, bytes).

    Returns:
        DataFrame with added flow features.
    """
    df = df.copy()

    # Flow duration features
    if "duration" in df.columns:
        df["duration"] = pd.to_numeric(df["duration"], errors="coerce").fillna(0)
        df["log_duration"] = np.log1p(df["duration"])
    elif "Flow Duration" in df.columns:
        df["duration"] = pd.to_numeric(df["Flow Duration"], errors="coerce").fillna(0)
        df["log_duration"] = np.log1p(df["duration"])

    # Packet ratio (forward / backward)
    fwd_pkts = None
    bwd_pkts = None
    for col in ["Total Fwd Packets", "fwd_packets", "Fwd Packet Length Total"]:
        if col in df.columns:
            fwd_pkts = col
            break
    for col in ["Total Backward Packets", "bwd_packets", "Bwd Packet Length Total"]:
        if col in df.columns:
            bwd_pkts = col
            break

    if fwd_pkts and bwd_pkts:
        fwd = pd.to_numeric(df[fwd_pkts], errors="coerce").fillna(0)
        bwd = pd.to_numeric(df[bwd_pkts], errors="coerce").fillna(0)
        df["packet_ratio"] = np.where(
            bwd > 0, fwd / bwd, fwd
        )

    # Byte ratio (sent / received)
    if "bytes_sent" in df.columns and "bytes_received" in df.columns:
        sent = pd.to_numeric(df["bytes_sent"], errors="coerce").fillna(0)
        recv = pd.to_numeric(df["bytes_received"], errors="coerce").fillna(0)
        df["byte_ratio"] = np.where(recv > 0, sent / recv, sent)
        df["total_bytes"] = sent + recv

        # Flow rate (bytes per second)
        if "duration" in df.columns:
            dur = df["duration"].replace(0, np.nan)
            df["flow_rate"] = df["total_bytes"] / dur
            df["flow_rate"] = df["flow_rate"].fillna(0)

    # Bytes per packet
    for total_pkts_col in ["Total Fwd Packets", "fwd_packets"]:
        if total_pkts_col in df.columns and "bytes_sent" in df.columns:
            pkts = pd.to_numeric(df[total_pkts_col], errors="coerce").fillna(0)
            df["bytes_per_packet"] = np.where(
                pkts > 0,
                pd.to_numeric(df["bytes_sent"], errors="coerce").fillna(0) / pkts,
                0,
            )
            break

    logger.info("Extracted flow features")
    return df


def extract_statistical_features(df: pd.DataFrame) -> pd.DataFrame:
    """Extract statistical features including rolling counts and burst detection.

    Creates: src_ip_count, event_frequency, burst_indicator.

    Args:
        df: DataFrame with source_ip and event data.

    Returns:
        DataFrame with added statistical features.
    """
    df = df.copy()

    # Source IP frequency count
    src_ip_col = None
    for candidate in ["source_ip", "Source IP", "Src IP"]:
        if candidate in df.columns:
            src_ip_col = candidate
            break

    if src_ip_col:
        ip_counts = df[src_ip_col].value_counts()
        df["src_ip_count"] = df[src_ip_col].map(ip_counts)
        df["src_ip_log_count"] = np.log1p(df["src_ip_count"])

        # Burst detection: flag IPs with counts exceeding 2 standard deviations
        mean_count = ip_counts.mean()
        std_count = ip_counts.std()
        if std_count > 0:
            threshold = mean_count + 2 * std_count
            burst_ips = ip_counts[ip_counts > threshold].index
            df["burst_indicator"] = df[src_ip_col].isin(burst_ips).astype(int)
        else:
            df["burst_indicator"] = 0
    else:
        logger.warning("No source IP column found; skipping statistical features.")

    # Event type frequency
    for evt_col in ["event_type", "Label"]:
        if evt_col in df.columns:
            evt_counts = df[evt_col].value_counts()
            df["event_frequency"] = df[evt_col].map(evt_counts)
            break

    logger.info("Extracted statistical features")
    return df


def extract_network_features(df: pd.DataFrame) -> pd.DataFrame:
    """Extract network-level features including port categorization and protocol encoding.

    Creates: src_port_category, dst_port_category, protocol_encoded.

    Port categories:
        - Well-known: 0-1023
        - Registered: 1024-49151
        - Dynamic: 49152-65535

    Args:
        df: DataFrame with port and protocol columns.

    Returns:
        DataFrame with added network features.
    """
    df = df.copy()

    def categorize_port(port: float) -> int:
        """Categorize port number: 0=well-known, 1=registered, 2=dynamic."""
        if pd.isna(port):
            return -1
        port = int(port)
        if port <= 1023:
            return 0  # well-known
        elif port <= 49151:
            return 1  # registered
        else:
            return 2  # dynamic

    # Source port categorization
    for col in ["source_port", "Source Port", "Src Port"]:
        if col in df.columns:
            df["src_port_category"] = (
                pd.to_numeric(df[col], errors="coerce").apply(categorize_port)
            )
            break

    # Destination port categorization
    for col in ["dest_port", "Destination Port", "Dst Port"]:
        if col in df.columns:
            df["dst_port_category"] = (
                pd.to_numeric(df[col], errors="coerce").apply(categorize_port)
            )
            break

    # Protocol encoding
    for col in ["protocol", "Protocol"]:
        if col in df.columns:
            if df[col].dtype == object:
                protocol_map = {"TCP": 0, "UDP": 1, "ICMP": 2}
                df["protocol_encoded"] = (
                    df[col].str.upper().map(protocol_map).fillna(3).astype(int)
                )
            else:
                df["protocol_encoded"] = pd.to_numeric(
                    df[col], errors="coerce"
                ).fillna(0).astype(int)
            break

    logger.info("Extracted network features")
    return df


def engineer_features(df: pd.DataFrame) -> pd.DataFrame:
    """Run all feature engineering steps.

    Applies temporal, flow, statistical, and network feature extraction.

    Args:
        df: Raw DataFrame.

    Returns:
        DataFrame with all engineered features.
    """
    logger.info("Starting feature engineering pipeline")

    df = extract_temporal_features(df)
    df = extract_flow_features(df)
    df = extract_statistical_features(df)
    df = extract_network_features(df)

    logger.info(
        "Feature engineering complete. DataFrame shape: %s", df.shape
    )
    return df


def get_feature_columns() -> list[str]:
    """Return the list of feature columns used for model training.

    Returns:
        List of feature column names.
    """
    return [
        # Temporal features
        "hour_of_day",
        "day_of_week",
        "is_weekend",
        "time_bin",
        # Flow features
        "log_duration",
        "packet_ratio",
        "byte_ratio",
        "total_bytes",
        "flow_rate",
        "bytes_per_packet",
        # Statistical features
        "src_ip_count",
        "src_ip_log_count",
        "burst_indicator",
        "event_frequency",
        # Network features
        "src_port_category",
        "dst_port_category",
        "protocol_encoded",
    ]
