# 🛡️ SentinelLite

**AI-Powered Security Incident Detection & Investigation System**

[![CI](https://github.com/YOUR_USERNAME/sentinellite/actions/workflows/ci.yml/badge.svg)](https://github.com/YOUR_USERNAME/sentinellite/actions/workflows/ci.yml)

SentinelLite is a web-based security monitoring and incident investigation platform for small organizations, colleges, and startups. It ingests security logs, detects suspicious activity using machine learning, calculates interpretable risk scores, groups related alerts into incidents, explains evidence using SHAP, and uses an LLM to assist investigation and recommend remediation.

---

## 🏗️ Architecture

```
Security Logs → Preprocessing → ML Detection → Risk Scoring → Incident Creation → AI Investigation → Dashboard
```

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 14 + TypeScript + Tailwind CSS + shadcn/ui |
| Backend | FastAPI + Python 3.11+ |
| Database | PostgreSQL 15 |
| ML | XGBoost + Isolation Forest + SHAP |
| AI | Google Gemini API |
| Deployment | Docker + Docker Compose |

---

## 🚀 Quick Start

### Prerequisites
- Docker & Docker Compose
- Node.js 20+ & pnpm
- Python 3.11+
- Git

### Setup

```bash
# Clone the repository
git clone https://github.com/YOUR_USERNAME/sentinellite.git
cd sentinellite

# Copy environment variables
cp .env.example .env
# Edit .env and add your GEMINI_API_KEY

# Start all services
docker compose up -d

# Access the application
# Frontend: http://localhost:3000
# Backend API: http://localhost:8000
# API Docs: http://localhost:8000/docs
```

### Local Development (without Docker)

```bash
# Backend
cd backend
python -m venv venv
source venv/bin/activate  # or venv\Scripts\activate on Windows
pip install -r requirements.txt
uvicorn app.main:app --reload

# Frontend
cd frontend
pnpm install
pnpm dev

# ML
cd ml
pip install -r requirements.txt
```

---

## 📁 Project Structure

```
sentinellite/
├── frontend/          # Next.js + TypeScript dashboard
├── backend/           # FastAPI + Python backend
├── ml/                # ML training & evaluation
├── ai/                # LLM investigation engine
├── data/              # Sample & demo datasets
├── docs/              # Documentation
├── tests/             # Test suites
├── scripts/           # Utility scripts
├── docker-compose.yml # Docker orchestration
└── README.md
```

---

## 🔑 Key Features

- **Log Ingestion** — Upload CSV/JSON security logs
- **ML Detection** — XGBoost (supervised) + Isolation Forest (anomaly)
- **Risk Scoring** — 0-100 risk scores with severity classification
- **Incident Grouping** — Automatic alert-to-incident correlation
- **SHAP Explanations** — Per-prediction feature importance
- **AI Investigation** — Evidence-grounded LLM analysis
- **Remediation** — AI-suggested actions with human approval
- **Dashboard** — Real-time metrics, charts, and analytics

---

## 👥 Team

| Member | Role |
|--------|------|
| Member 1 | Data & ML Engineer |
| Member 2 | Backend Engineer |
| Member 3 | Frontend Engineer |
| Member 4 | AI & Integration Lead |

---

## 📜 License

This project is developed as a Sem-5 Major Project.

