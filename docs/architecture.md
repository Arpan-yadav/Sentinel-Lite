# 🏛️ SentinelLite System Architecture

## Overview
SentinelLite is an end-to-end security analytics and incident investigation platform designed to bridge the gap between raw ML threat alerts and actionable SOC investigation.

---

## High-Level Data Flow

```
[ Security Logs / Telemetry ]
              │
              ▼
[ Ingestion & Normalization ]
   ├── Schema Normalization (IPs, Ports, Timestamps)
   └── Storage in PostgreSQL (security_events)
              │
              ▼
[ ML Detection Engine ]
   ├── Supervised XGBoost (Known Attack Classification)
   ├── Isolation Forest (Zero-Day Anomaly Detection)
   └── Risk Scorer (0-100 Weighted Severity Index)
              │
              ▼
[ Incident Correlation ]
   ├── IP & Temporal Window Clustering
   └── Incident Lifecycle Management (New -> Investigating -> Resolved)
              │
              ▼
[ AI Investigation Engine (Gemini) ]
   ├── Strict Grounding on Telemetry Citations
   ├── Evidence vs Inference Separation
   └── Non-destructive Remediation Proposals
              │
              ▼
[ SOC Analyst Dashboard ]
   ├── Incident Timeline & Evidence Explorer
   ├── SHAP Feature Explanations
   └── Human-in-the-Loop Remediation Approval
```

---

## Component Breakdown

### 1. Ingestion Layer (`backend/app/services/event_service.py`)
- Ingests raw CSV and syslog events.
- Performs column sanitization, IP/port normalization, and timestamp parsing.
- Stores events in PostgreSQL with indexing on source IP, destination IP, and timestamp.

### 2. Machine Learning Layer (`ml/` & `backend/app/ml/`)
- **Supervised Classifier**: Multi-class XGBoost trained on CICIDS2017 to classify Brute Force, Port Scan, DDoS, and Normal traffic.
- **Anomaly Detector**: Isolation Forest fitted on clean baseline network flows to capture zero-day or unusual activity.
- **Explainability**: SHAP (SHapley Additive exPlanations) provides local feature contribution plots explaining why a packet was classified as malicious.
- **Risk Scorer**: Computes a continuous 0-100 score combining classifier probability, anomaly deviation, temporal burst frequency, and asset criticality.

### 3. Incident Correlation Engine (`backend/app/services/incident_service.py`)
- Groups related alerts sharing common source vectors within dynamic time windows.
- Prevents alert fatigue by converting hundreds of atomic alerts into a single cohesive Incident entity with chronological timeline reconstruction.

### 4. AI Investigation Engine (`ai/engine.py`)
- Integrates Google Gemini API using structured JSON schema output.
- Features explicit evidence grounding to eliminate hallucinations.
- Separates observed facts from analyst hypotheses.

### 5. Frontend Presentation Layer (`frontend/`)
- Next.js 14 App Router with TypeScript.
- Tailwind CSS and shadcn/ui component library.
- Recharts visualizations for attack trends, incident severity, and feature importance.

