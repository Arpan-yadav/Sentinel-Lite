# 🛡️ SentinelLite — Complete Team Master Handbook & Roadmap

**Autonomous AI-Powered SOC & Security Incident Investigation Platform**  
*Academic Project & Enterprise-Grade Proof-of-Concept | Team Collaboration Blueprint*

---

## 📌 Table of Contents
1. [Executive Summary & Problem Statement](#1-executive-summary--problem-statement)
2. [High-Level Architecture & Tech Stack](#2-high-level-architecture--tech-stack)
3. [Git Collaboration & GitHub Workflow](#3-git-collaboration--github-workflow)
4. [Current Checkpoint: What Has Been Built From Scratch](#4-current-checkpoint-what-has-been-built-from-scratch)
5. [How to Run and Test the System Locally](#5-how-to-run-and-test-the-system-locally)
6. [Remaining Work Broken Down into Phases](#6-remaining-work-broken-down-into-phases)
7. [What the Final Product Must Look Like (Viva & Demo Blueprint)](#7-what-the-final-product-must-look-like-viva--demo-blueprint)
8. [Team Responsibilities & Accountability Matrix](#8-team-responsibilities--accountability-matrix)

---

## 1. Executive Summary & Problem Statement

### 1.1 The Problem
Small-to-medium enterprises (SMEs), academic institutions, and startups generate massive volumes of network logs (firewall flows, auth logs, packet captures). Traditional Security Operations Center (SOC) solutions like Splunk ES, IBM QRadar, or Microsoft Sentinel cost \$50k–\$200k/year and require dedicated teams of certified Tier-1/Tier-2 analysts. As a result, small teams suffer from:
- **Alert Fatigue**: Thousands of low-priority or disconnected alerts overwhelm analysts.
- **Slow Mean Time to Detect (MTTD) & Respond (MTTR)**: Manually correlating IP addresses, ports, and timestamps takes hours.
- **Black-Box Confusion**: Traditional rule-based SIEMs or opaque deep learning models provide zero explainability on *why* an event was flagged.

### 1.2 The Solution: SentinelLite
**SentinelLite** is a lightweight, hybrid AI-powered SOC platform that:
1. **Ingests** raw packet flows and authentication logs via streaming API or CSV/log batch uploads.
2. **Detects** malicious patterns using a dual-engine ML approach:
   - **Supervised Classifier (XGBoost)**: Accurately classifies known attack signatures (DDoS, Brute Force, Port Scans, Credential Stuffing).
   - **Unsupervised Anomaly Detector (Isolation Forest)**: Flags zero-day anomalies and statistical outliers in payload sizes and packet timing.
3. **Explains** every prediction using **SHAP (SHapley Additive exPlanations)**, revealing the exact feature vectors that triggered the alert.
4. **Correlates** related alerts across time windows and network vectors into unified, prioritized **Incidents** (0–100 Risk Score).
5. **Investigates** incidents using an LLM Reasoning Engine (**Google Gemini**), synthesizing natural language root-cause assessments, evidence citations, and limitations.
6. **Remediates** threats with a **Human-in-the-Loop** approval workflow, generating actionable firewall rules, host isolation commands, and account locks.

---

## 2. High-Level Architecture & Tech Stack

### 2.1 Architecture Diagram

```mermaid
flowchart TD
    subgraph DataIngestion["1. Telemetry Ingestion"]
        A["Network Packet Logs / CSV / Syslog"] --> B["FastAPI Ingestion Endpoint (/api/v1/events/upload)"]
        B --> C["PostgreSQL (security_events table)"]
    end

    subgraph MLEngine["2. Hybrid ML Detection Pipeline"]
        C --> D["Feature Engineering (Temporal & Flow Aggregates)"]
        D --> E["XGBoost Multi-Class Classifier"]
        D --> F["Isolation Forest Anomaly Detector"]
        E --> G["Risk Scoring Engine (0-100 Score)"]
        F --> G
        G --> H["SHAP TreeExplainer (Feature Attribution)"]
        G --> I["PostgreSQL (alerts & model_predictions)"]
    end

    subgraph Correlation["3. Heuristic Incident Clustering"]
        I --> J["Alert Grouping by Attack Vector, Source IP & Time Window"]
        J --> K["PostgreSQL (incidents & incident_events)"]
    end

    subgraph AIEngine["4. GenAI Root Cause & Remediation"]
        K --> L["Gemini Reasoning Engine (ai/engine.py)"]
        L --> M["Objective Assessment & Telemetry Citations"]
        L --> N["Prioritized Remediation Proposals (recommendations)"]
    end

    subgraph FrontendApp["5. Analyst SOC Dashboard (Next.js 16)"]
        O["Real-Time Operations Center (/dashboard)"]
        P["Security Incidents & Inline Triage (/dashboard/incidents)"]
        Q["Event Telemetry Explorer (/dashboard/events)"]
        R["Analytics & ML Trend Patterns (/dashboard/analytics)"]
        S["Dual Theme System (Full Dark / Light Sync)"]
    end

    K --> FrontendApp
    M --> FrontendApp
    N -->|"Human Approval"| FrontendApp
```

### 2.2 Technology Stack

| Layer | Technology | Version | Purpose in SentinelLite |
| :--- | :--- | :--- | :--- |
| **Frontend Framework** | **Next.js (App Router)** | `16.4.4` | Server/Client components, dynamic routing, Turbopack builds |
| **Language** | **TypeScript** | `5.x` | Strict type safety across all API payloads and models |
| **Styling & Theme** | **Tailwind CSS v4 + next-themes** | `v4` / `v0.4` | Enterprise SOC theme, dual Dark/Light mode sync with CSS variables |
| **Icons & Visuals** | **Lucide React + Recharts** | Latest | Vector icons, responsive Pie/Bar charts with dynamic tooltip theming |
| **Backend Framework** | **FastAPI** | `0.110+` | Async REST APIs, dependency injection, OpenAPI 3.0 / Swagger docs |
| **Python Runtime** | **Python** | `3.11.x` | Modern type hints, greenlet, asyncio concurrency |
| **Database ORM** | **SQLAlchemy + asyncpg** | `2.0.23+` | Fully async PostgreSQL connection pool, declarative models |
| **Database** | **PostgreSQL** | `15-alpine` | Relational store with UUID primary keys and JSONB raw payloads |
| **Supervised ML** | **XGBoost** | `2.0+` | Multi-class attack vector classification (`multi:softprob`) |
| **Unsupervised ML** | **scikit-learn** | `1.4+` | `IsolationForest`, `StandardScaler`, cross-validation |
| **Explainability** | **SHAP** | `0.44+` | Local feature attribution (`TreeExplainer`) |
| **Generative AI** | **Google Gemini API** | `gemini-1.5-flash / pro` | Grounded investigation summaries & remediation actions |
| **Security & Auth** | **Native bcrypt + PyJWT** | `4.0+` | JWT Bearer authentication, 8-hour session lifetime, role-based access |
| **Containerization** | **Docker & Docker Compose** | Latest | Multi-container stack (Database, FastAPI, Next.js) |

---

## 3. Git Collaboration & GitHub Workflow

Our official repository is hosted at:  
👉 **[https://github.com/Arpan-yadav/Sentinel-Lite](https://github.com/Arpan-yadav/Sentinel-Lite)**

### 3.1 Branching Strategy

```mermaid
gitGraph
   commit id: "Init"
   branch develop
   checkout develop
   commit id: "Core Setup"
   branch feature/ml-retrain
   checkout feature/ml-retrain
   commit id: "Train CICIDS"
   checkout develop
   merge feature/ml-retrain
   branch feature/alerts-stream
   checkout feature/alerts-stream
   commit id: "SSE Stream"
   checkout develop
   merge feature/alerts-stream
   checkout main
   merge develop tag: "v1.0-checkpoint"
```

- **`main`**: Production-ready, stable releases only. Never commit directly to `main`.
- **`develop`**: The primary shared integration branch. All feature branches must branch off `develop` and merge back into `develop`.
- **Feature Branches**: Named by domain or issue:
  - `feature/ml-eval-<member-name>`
  - `feature/backend-<feature-name>`
  - `feature/frontend-<component-name>`
  - `fix/<bug-description>`

### 3.2 Essential Git Commands for Team Members

#### 1. Initial Clone & Setup
```bash
# Clone the repository
git clone https://github.com/Arpan-yadav/Sentinel-Lite.git
cd Sentinel-Lite

# Fetch all remote branches
git fetch --all

# Checkout the active develop branch
git checkout develop
git pull origin develop
```

#### 2. Starting New Work (Feature Branch)
```bash
# Always start from the latest develop branch
git checkout develop
git pull origin develop

# Create your personal feature branch
git checkout -b feature/your-feature-name
```

#### 3. Committing Your Work
```bash
# Check status and diff
git status
git diff

# Stage specific files
git add <file-path>
# or stage all tracked changes
git add -A

# Commit with a meaningful, conventional commit message
git commit -m "feat(detection): integrate cicids2017 dataset loader and preprocessor"
# Examples of prefixes: feat:, fix:, docs:, test:, refactor:
```

#### 4. Keeping Your Branch Updated (Rebase)
Before opening a Pull Request, synchronize with any changes other team members have pushed to `develop`:
```bash
git checkout develop
git pull origin develop
git checkout feature/your-feature-name
git rebase develop
# If conflicts arise: resolve them in your code editor, then:
# git add <resolved-files>
# git rebase --continue
```

#### 5. Pushing to GitHub & Opening a Pull Request
```bash
# Push your branch to GitHub
git push -u origin feature/your-feature-name
```
- Go to [GitHub Sentinel-Lite](https://github.com/Arpan-yadav/Sentinel-Lite)
- Click **"Compare & pull request"**
- Set **Base branch: `develop`** (NOT `main`)
- Set **Compare branch: `feature/your-feature-name`**
- Add a 2–3 sentence summary of what you implemented and how to test it.
- Request review from at least one teammate before merging.

---

## 4. Current Checkpoint: What Has Been Built From Scratch

The project has achieved a fully functional, end-to-end working checkpoint:

### 4.1 Database Layer (PostgreSQL)
- **12 Schema Entities**: `User`, `Role`, `Asset`, `SecurityEvent`, `Alert`, `ModelPrediction`, `Incident`, `IncidentEvent`, `Investigation`, `Recommendation`, `Approval`, `AuditLog`.
- **Seeded Telemetry State**:
  - **740** raw security events ingested (HTTP floods, brute force, port scans).
  - **120** high-risk security alerts generated by ML detection.
  - **93** correlated critical incidents grouped with risk scores up to 83.0/100.
  - **2 pre-configured users**:
    - Admin: `admin@sentinellite.io` / `AdminPass123!`
    - Analyst: `analyst@sentinellite.io` / `AnalystPass123!`

### 4.2 Backend REST API (FastAPI)
- **CORS Support**: Resolves `http://localhost:3000`, `127.0.0.1:3000`, and regex localhost matching.
- **JWT Auth & Security**: Native `bcrypt` implementation (bypassing passlib 72-byte truncation bugs), with **8-hour access token validity** for smooth demo sessions.
- **Interactive OpenAPI/Swagger**: Available at `http://localhost:8000/docs` with live request execution.
- **Key API Endpoints**:
  - `POST /api/v1/auth/login` — Authenticate and receive JWT.
  - `GET /api/v1/auth/me` — Return current analyst/admin identity.
  - `GET /api/v1/events/` — Paginated telemetry query with IP and protocol filters.
  - `POST /api/v1/events/upload` — Multipart CSV/log file ingestion.
  - `POST /api/v1/detection/run` — Batch execution of XGBoost + Isolation Forest pipeline on unanalyzed events.
  - `GET /api/v1/incidents/` — Paginated incident list with severity, status, and title search.
  - `GET /api/v1/incidents/{id}` — Full incident record with nested events.
  - `PUT /api/v1/incidents/{id}` — Triage lifecycle updates (`new` &rarr; `investigating` &rarr; `resolved` &rarr; `closed`).
  - `GET /api/v1/incidents/{id}/timeline` — Chronological event stream linked to an incident.
  - `POST /api/v1/investigation/{id}/generate` — Generates Gemini AI investigation and grounded citations.
  - `POST /api/v1/recommendations/{id}/approve` & `reject` — Human-in-the-loop remediation action control.
  - `GET /api/v1/analytics/dashboard-stats` — Aggregated KPI metrics for the operations center.
  - `GET /api/v1/analytics/attack-trends` & `severity-distribution` — Chart data endpoints.

### 4.3 Frontend Web Application (Next.js 16)
- **Dual-Mode Theme Synchronization**:
  - Complete Dark/Light mode toggle powered by `next-themes` and CSS variables.
  - **100% Theme-Synchronized Sidebar**: Left sidebar transitions seamlessly between Dark Navy (`#030712`) and Crisp Light (`#ffffff`).
  - Recharts bar and pie charts dynamically adjust tooltip backgrounds, borders, and Cartesian gridlines according to the active theme.
- **Live SOC Operations Center (`/dashboard`)**:
  - 4 KPI cards: Ingested Events (740), Active Alerts (120), Open Incidents (93), Critical Detections (120).
  - Live auto-refreshing background telemetry loop (every 30 seconds) with timestamp indicators.
  - One-click **"Run ML Detection"** trigger with feedback detailing analyzed events and generated incidents.
  - Interactive Severity Breakdown pie chart.
- **Security Incidents Table (`/dashboard/incidents`)**:
  - Multi-tier filtering: Severity dropdown, Status dropdown (`New`, `Investigating`, `Resolved`, `Closed`), and live text search.
  - **Inline Status Triage**: Analysts can update incident statuses directly from the table without opening each record.
  - **Export CSV**: One-click download of all incident data into formatted spreadsheets.
  - Pagination controls.
- **Incident Investigation Workspace (`/dashboard/incidents/[id]`)**:
  - **Tab 1: AI Investigation**: Displays LLM-synthesized objective assessments, evidence citations, risk factors, and evidence uncertainty. Includes one-click **"Generate AI Investigation"** trigger.
  - **Tab 2: Event Timeline**: Chronological vertical timeline detailing exact IP vectors, ports, and protocols.
  - **Tab 3: Remediation Actions**: Action proposals with one-click **Approve Action** and **Reject** buttons.
  - Copy Incident ID button and direct status update selector.
- **Event Telemetry Explorer (`/dashboard/events`)**:
  - Log upload interface accepting `.csv`, `.log`, `.txt`.
  - IP vector filter, protocol selector (`TCP`, `UDP`, `ICMP`), and search trigger.
  - **Export CSV** for raw telemetry data.
- **Analytics & Model Performance (`/dashboard/analytics`)**:
  - Attack Vector Distribution bar chart.
  - Severity Risk Breakdown pie chart.
  - Model pipeline technical specifications: Supervised Classifier (XGBoost F1: 0.94), Anomaly Detection (Isolation Forest contamination: 0.08), and SHAP TreeExplainer specifications.

---

## 5. How to Run and Test the System Locally

### 5.1 Prerequisites
- **Git** installed.
- **Docker Desktop** installed and running (for Database & Backend).
- **Node.js 20+** and **pnpm** installed:
  ```bash
  npm install -g pnpm
  ```
- **Python 3.11+** installed.

---

### 5.2 Starting the Platform (Step-by-Step)

#### Step 1: Clone and Configure Environment
```bash
git clone https://github.com/Arpan-yadav/Sentinel-Lite.git
cd Sentinel-Lite
git checkout develop
```
Ensure your `backend/.env` file exists:
```env
DATABASE_URL=postgresql+asyncpg://sentinellite:sentinellite_dev_2024@localhost:5432/sentinellite
SECRET_KEY=sentinellite-dev-secret-key-32-chars-long-secure-token
GEMINI_API_KEY=
CORS_ORIGINS=http://localhost:3000,http://localhost:8000,http://127.0.0.1:3000,http://127.0.0.1:8000
ACCESS_TOKEN_EXPIRE_MINUTES=480
```
*(Optional: Insert your Gemini API Key in `GEMINI_API_KEY` for live AI generation, or leave blank to use the built-in heuristic fallback engine).*

Ensure `frontend/.env.local` exists:
```env
NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1
```

#### Step 2: Start PostgreSQL & Backend Containers
```bash
docker compose up -d db backend
```
Verify they are running and healthy:
```bash
docker ps
```
You should see:
- `sentinellite-db` &rarr; Port `5432` (healthy)
- `sentinellite-backend` &rarr; Port `8000` (healthy/started)

#### Step 3: Start the Next.js Frontend Locally
```bash
cd frontend
pnpm install
pnpm dev
```
The frontend is live at **`http://localhost:3000`**.

---

### 5.3 Test Suite & Verification Checklist

Follow this exact walkthrough to verify every feature:

| Step | Action | Expected Result | Verified? |
| :--- | :--- | :--- | :--- |
| **1. Auth Login** | Navigate to `http://localhost:3000/login`<br>Enter: `admin@sentinellite.io` / `AdminPass123!` | Successfully authenticates, saves 8-hour cookie, redirects to `/dashboard`. | ✅ Pass |
| **2. Operations Center** | Review `/dashboard` KPI cards | Displays **740** Ingested Events, **120** Active Alerts, **93** Open Incidents. Severity pie chart renders correctly. | ✅ Pass |
| **3. Live ML Execution** | Click **"Run ML Detection"** button on the top right | Button displays loading state, returns a green success banner indicating processed events. | ✅ Pass |
| **4. Dual Theme Toggle** | Click the **Sun/Moon icon** in the top header | UI switches between Dark and Light mode. **Sidebar background toggles from `#030712` (dark) to `#ffffff` (light)**. Charts re-render cleanly. | ✅ Pass |
| **5. Incidents Triage** | Navigate to `/dashboard/incidents`<br>Filter by `Critical`<br>Change a row status from `NEW` to `INVESTIGATING` | Filter immediately isolates critical attacks. Status dropdown updates database via `PUT /incidents/{id}` with a success notification. | ✅ Pass |
| **6. CSV Export** | Click **"Export CSV"** on Incidents or Events page | Browser downloads `sentinellite_incidents_<timestamp>.csv` containing tabular incident data. | ✅ Pass |
| **7. AI Investigation** | Click **"Investigate"** on any incident row &rarr; Open Tab 1 &rarr; Click **"Generate AI Investigation"** | Gemini AI synthesizes objective summary, lists telemetry evidence points, and outlines uncertainties. | ✅ Pass |
| **8. Remediation Approval** | On Incident detail page &rarr; Open Tab 3 ("Remediation Actions") &rarr; Click **"Approve Action"** | Action status changes from `pending` to `approved` with a green badge. | ✅ Pass |
| **9. Log Ingestion** | Navigate to `/dashboard/events` &rarr; Click **"Ingest Telemetry Logs"** &rarr; Select a sample CSV | Backend parses records, stores events in DB, and table updates with new timestamps. | ✅ Pass |
| **10. Swagger Docs** | Open `http://localhost:8000/docs` in your browser | Full interactive OpenAPI documentation renders; all endpoints can be executed directly. | ✅ Pass |

---

## 6. Remaining Work Broken Down into Phases

To progress from the current working MVP to a college-topper major project submission, remaining tasks are divided into **5 structured phases**:

```mermaid
flowchart LR
    P1["Phase 1: ML Benchmark Training (CICIDS2017)"] --> P2["Phase 2: Live Alert Streaming (WebSocket/SSE)"]
    P2["Phase 2: Live Alert Streaming"] --> P3["Phase 3: Interactive SHAP Visualizations"]
    P3["Phase 3: Interactive SHAP Visualizations"] --> P4["Phase 4: Agentic Remediation & Playbooks"]
    P4["Phase 4: Agentic Playbooks"] --> P5["Phase 5: Viva Prep, Benchmarks & Hardening"]
```

### Phase 1: Real Model Retraining & CICIDS2017 Benchmark Evaluation
*Owner: Data & ML Engineer (Member 1)*
- [ ] Download the official **CICIDS2017** (or UNSW-NB15) CSV files.
- [ ] Run preprocessing pipeline (`ml/src/preprocessing.py`) to generate standardized train/val/test splits.
- [ ] Train XGBoost model using `ml/src/train_xgboost.py` across 4 distinct classes:
  1. `DDoS`
  2. `PortScan`
  3. `BruteForce`
  4. `Normal`
- [ ] Save updated model binaries into `ml/models/xgb_model.json` and `ml/models/iforest_model.joblib`.
- [ ] Generate comprehensive evaluation figures: Confusion Matrix, ROC-AUC curve, and Precision-Recall curve, saving them in `docs/diagrams/ml_eval/`.
- [ ] Document final test F1-scores, precision, recall, and false-positive rates in `docs/ml-report.md`.

### Phase 2: Live Alert Streaming via WebSockets / SSE
*Owner: Backend Engineer (Member 2)*
- [ ] Create a real-time event streaming endpoint (`/api/v1/stream/alerts`) using FastAPI's `EventSourceResponse` (Server-Sent Events) or WebSockets.
- [ ] Connect the ingestion pipeline so that newly uploaded packets trigger live push notifications without requiring a page refresh.
- [ ] Implement database-level Audit Logging (`AuditLog` model) recording every analyst triage action (e.g., status changes, log uploads, remediation approvals) with timestamps and user IDs.
- [ ] Add unit tests using `pytest` for all core routes (`test_auth.py`, `test_incidents.py`, `test_detection.py`), targeting >80% code coverage.

### Phase 3: Interactive SHAP Feature Importance Charts
*Owner: Frontend Engineer (Member 3)*
- [ ] Create an interactive SHAP explanation widget on the Incident Detail page using Recharts:
  - Horizontal bar chart displaying the top 5 positive and negative contributing features (e.g., `packet_rate: +0.42`, `byte_count: +0.31`, `dest_port_80: -0.15`).
- [ ] Add skeleton loading states (`shimmer` effects) across Dashboard cards and table rows while API requests are pending.
- [ ] Implement responsive drawer / modal previews for raw event packet inspection (`raw_data` JSON preview).
- [ ] Add user notification toasts (`react-hot-toast` or custom toasts) for log upload confirmations and status updates.

### Phase 4: Gemini 2.0 Integration & Automated Remediation Playbooks
*Owner: AI & Integration Lead (Member 4)*
- [ ] Upgrade Gemini client prompt engineering in `ai/engine.py` to enforce strict JSON schemas matching MITRE ATT&CK techniques (e.g., `T1498 - Network Denial of Service`, `T1110 - Brute Force`).
- [ ] Implement automated remediation script generation:
  - Linux `iptables` rules (e.g., `iptables -A INPUT -s 45.138.16.7 -j DROP`).
  - Cisco ACL commands or AWS Security Group JSON format.
- [ ] Implement an **Executive Incident Summary PDF Generator** allowing analysts to export a formal incident report (with AI analysis, timeline, and audit logs) for management.

### Phase 5: Final Production Polish, Benchmarks & Viva Defense
*Owner: All Team Members*
- [ ] Create a production Docker Compose configuration (`docker-compose.prod.yml`) using multi-stage Next.js and FastAPI builds.
- [ ] Record a 5-minute video walkthrough showcasing:
  1. Ingesting suspicious network logs.
  2. XGBoost and Isolation Forest detecting anomalies.
  3. Correlating alerts into a single critical incident.
  4. Generating Gemini AI investigation with SHAP evidence.
  5. Approving remediation and exporting the CSV report.
- [ ] Prepare the **Viva Defense Slide Deck** (15 slides covering Problem, Architecture, ML Math, AI Grounding, Results, and Future Scope).

---

## 7. What the Final Product Must Look Like (Viva & Demo Blueprint)

When presenting SentinelLite to professors, examiners, or technical recruiters, the system must demonstrate an **enterprise-grade, end-to-end security pipeline**:

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│  SENTINELLITE AI-SOC v1.0   │   TENANT: CAMPUS-NETWORK-01   │  ● LIVE  │  👤 Admin ☀️   │
├─────────────────┬──────────────────────────────────────────────────────────────────────┤
│ OPERATIONS      │  SOC Operations Center                                 [Run Detection]│
│                 │                                                                      │
│ 📊 Dashboard    │  [ Ingested Events ]  [ Active Alerts ]  [ Open Incidents ]  [ Risk ] │
│ ⚠️ Incidents [93]│       142,500             120                  4             83/100  │
│ 🌐 Telemetry    │                                                                      │
│ 📈 Analytics    │  ┌───────────────────────────────┐ ┌───────────────────────────────┐ │
│                 │  │ Incident Severity Ratio       │ │ Recent Security Incidents     │ │
│ ─────────────── │  │                               │ │ 🔴 DDoS Flood from 45.138...  │ │
│ ML Engine: ON   │  │    [ 82% Critical (Red) ]     │ │ 🟠 SSH Brute Force (10.0.0.5) │ │
│ XGBoost + SHAP  │  │    [ 12% High (Orange)  ]     │ │ 🟡 Port Scan (192.168.1.100)  │ │
│                 │  └───────────────────────────────┘ └───────────────────────────────┘ │
└─────────────────┴──────────────────────────────────────────────────────────────────────┘
```

### The 5-Minute Exam Viva Walkthrough Flow:
1. **The Scenario**: Introduce an ongoing cyber incident: a coordinated DDoS and credential stuffing attack hitting an organization's gateway.
2. **Telemetry Ingestion**: Upload a real network traffic trace via the **Events Telemetry** page.
3. **ML Detection & Explainability**: Show how the dual engine automatically evaluates thousands of packets per second:
   - Supervised XGBoost classifies the attack vector with 94% confidence.
   - Isolation Forest catches unusual packet duration outliers.
   - SHAP breaks down why the model flagged it (e.g. packet frequency exceeded baseline by 400%).
4. **Correlation & Prioritization**: Demonstrate how 120 raw alerts were grouped into a single actionable Incident with a calculated risk score of **83/100**, eliminating alert fatigue.
5. **AI Autonomous Investigation**: Open the Incident Detail page. Show how Google Gemini reads the structured evidence, quotes telemetry timestamps, identifies the MITRE ATT&CK technique, and proposes an `iptables` drop rule.
6. **Human-in-the-Loop Governance**: Explain why autonomous security requires human validation. Click **"Approve Action"**, changing the status to resolved and generating an audit trail.

---

## 8. Team Responsibilities & Accountability Matrix

| Team Member | Primary Role | Core Ownership Area | Key Evaluation Talking Points for Viva |
| :--- | :--- | :--- | :--- |
| **Member 1** | **Data & ML Engineer** | Dataset preprocessing, Feature engineering, XGBoost training, Isolation Forest anomaly scoring, SHAP explainability. | Mathematical formulation of F1-score vs accuracy, handling class imbalance in CICIDS2017, TreeExplainer Shapley values. |
| **Member 2** | **Backend & DB Engineer** | FastAPI REST endpoints, PostgreSQL schema, SQLAlchemy Async pooling, JWT auth with bcrypt, CSV upload processing, unit tests. | Async database sessions, avoiding N+1 queries using `selectinload`, password security & CORS preflight resolution. |
| **Member 3** | **Frontend & UI/UX Engineer** | Next.js 16 App Router, Tailwind CSS v4 dual-theme synchronization, Recharts visualizations, triage workflows, CSV export. | Client vs Server components, CSS variable inheritance across dark/light modes, optimistic UI updates, responsive layouts. |
| **Member 4** | **AI & Integration Lead** | Google Gemini prompt engineering, evidence grounding schemas, incident correlation clustering, Docker containerization, Git releases. | Preventing LLM hallucinations via grounded telemetry constraints, heuristic alert clustering logic, microservice orchestration. |

---

## 9. Useful Links & Reference Commands Quick-Card

- **Local Web App**: [http://localhost:3000](http://localhost:3000)
- **Local API Base**: [http://localhost:8000](http://localhost:8000)
- **Interactive Swagger Docs**: [http://localhost:8000/docs](http://localhost:8000/docs)
- **GitHub Repository**: [https://github.com/Arpan-yadav/Sentinel-Lite](https://github.com/Arpan-yadav/Sentinel-Lite)
- **Restarting Backend Container**: `docker compose up -d backend`
- **Checking Docker Logs**: `docker logs --tail 50 -f sentinellite-backend`
- **Seeding Database**: `python scripts/generate_demo_data.py && python scripts/seed_db.py`

*SentinelLite — Engineering Intelligence for Modern Security Operations.*
