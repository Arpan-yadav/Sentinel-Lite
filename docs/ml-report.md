# 🔬 SentinelLite Machine Learning Report & Methodology

## 1. Problem Framing
Traditional SIEM solutions generate excessive alert volume without context, leading to analyst fatigue. SentinelLite combines supervised classification (for high-fidelity detection of known attack vectors) with unsupervised anomaly detection (to flag novel network behavior).

---

## 2. Dataset Strategy
- **Primary Benchmark**: CICIDS2017 (Canadian Institute for Cybersecurity).
- **Target Attack Classes**:
  1. **Brute Force** (SSH / FTP Patator)
  2. **Port Scan** (Reconnaissance)
  3. **DDoS** (Volumetric LOIC / HTTP Flood)
  4. **Benign / Normal** (Baseline operational traffic)
- **Class Balancing**: Stratified train/validation/test splits (70/15/15) with weighted loss functions (`scale_pos_weight`) to accommodate network traffic class imbalance.

---

## 3. Feature Engineering (`ml/src/features.py`)
Over 15 engineered features extracted from raw network flow logs:
- **Temporal Features**: `hour_of_day`, `day_of_week`, `is_weekend`, inter-arrival time gaps.
- **Flow Statistics**: Packet count, total bytes sent/received, packet length mean/std, byte transfer ratio.
- **Behavioral Indicators**: Rolling 10-second request frequency per source IP, sequential destination port divergence (port scan indicator), consecutive failed authentication flags.

---

## 4. Model Architectures

### A. Supervised Detector: Extreme Gradient Boosting (XGBoost)
- **Objective**: `multi:softprob`
- **Hyperparameters**: `max_depth=6`, `learning_rate=0.1`, `n_estimators=200`, `subsample=0.8`.
- **Target Metrics**: Macro F1-score > 0.90, minimizing false positive rate on normal traffic.

### B. Anomaly Detector: Isolation Forest
- **Purpose**: Detect anomalous flows differing from normal network profile without requiring explicit labels.
- **Contamination**: Set to `0.05` - `0.10`.
- **Inverted Anomaly Score**: Normalized to `[0.0, 1.0]` where 1.0 indicates maximum divergence.

---

## 5. Explainability with SHAP (`ml/src/explain.py`)
- Utilizes `shap.TreeExplainer` for exact Shapley value computation.
- Each alert surfaces top contributing features (e.g., `failed_attempts (+0.62)`, `dest_port (+0.25)`).
- Provides transparency so human analysts can verify ML detections before taking containment action.

---

## 6. Risk Scoring Algorithm (`ml/src/risk_scoring.py`)
Continuous score calculated via:
$$\text{Risk} = (0.40 \times \text{Confidence} + 0.25 \times \text{Anomaly} + 0.20 \times \text{BurstFrequency} + 0.15 \times \text{ThreatWeight}) \times 100$$

Severities:
- `0 - 34`: Low
- `35 - 59`: Medium
- `60 - 79`: High
- `80 - 100`: Critical

