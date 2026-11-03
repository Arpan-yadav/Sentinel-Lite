# 🚀 SentinelLite Setup & Execution Guide

## Quick Start with Docker (Recommended)

### 1. Prerequisites
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) installed and running.
- Python 3.11+
- Node.js 20+ and `pnpm` (`npm install -g pnpm`)

### 2. Environment Setup
Copy the environment template:
```bash
cp .env.example .env
```
Edit `.env` and provide your Google Gemini API key:
```env
GEMINI_API_KEY="AIzaSy..."
```

### 3. Launch Services
Run all containers in detached mode:
```bash
docker compose up -d
```
Verify container health:
```bash
docker compose ps
```

- **Frontend Dashboard**: [http://localhost:3000](http://localhost:3000)
- **Backend REST API**: [http://localhost:8000](http://localhost:8000)
- **Interactive Swagger Docs**: [http://localhost:8000/docs](http://localhost:8000/docs)

### 4. Seed Initial Data
Generate synthetic attack logs and seed default users:
```bash
python scripts/generate_demo_data.py
python scripts/seed_db.py
```

Default credentials:
- **Admin**: `admin@sentinellite.io` / `AdminPass123!`
- **Analyst**: `analyst@sentinellite.io` / `AnalystPass123!`

---

## Local Development (Without Docker)

### Backend
```bash
cd backend
python -m venv venv
.\venv\Scripts\activate       # Windows
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

### Frontend
```bash
cd frontend
pnpm install
pnpm dev
```
Open [http://localhost:3000](http://localhost:3000).

