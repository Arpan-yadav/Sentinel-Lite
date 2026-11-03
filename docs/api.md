# 📡 SentinelLite REST API Documentation

Base URL: `http://localhost:8000/api/v1`
Interactive Swagger Documentation: `http://localhost:8000/docs`

---

## Authentication (`/v1/auth`)

### `POST /auth/register`
Create a new user account.
- **Request Body**: `{"email": "user@example.com", "password": "...", "full_name": "...", "role": "analyst|admin"}`
- **Response**: `201 Created` with User object.

### `POST /auth/login`
Authenticate with email and password to receive a JWT Bearer token.
- **Request Body**: `{"email": "user@example.com", "password": "..."}`
- **Response**: `200 OK` with `{"access_token": "...", "token_type": "bearer"}`

### `GET /auth/me`
Return profile of currently authenticated user.
- **Headers**: `Authorization: Bearer <token>`
- **Response**: `200 OK`

---

## Security Events (`/v1/events`)

### `POST /events/upload`
Upload a CSV security log file for parsing and ingestion.
- **Form Data**: `file` (multipart/form-data)
- **Response**: `201 Created` with ingestion count.

### `GET /events/`
List and filter events with pagination.
- **Query Params**: `source_ip`, `dest_ip`, `event_type`, `protocol`, `page` (default 1), `page_size` (default 50)
- **Response**: `200 OK` with list of events.

---

## Detection & Alerts (`/v1/detection`)

### `POST /detection/run`
Trigger ML detection and anomaly scoring on unanalyzed events.
- **Query Params**: `limit=500`, `auto_correlate=true`
- **Response**: `200 OK` with summary of alerts and incidents created.

### `GET /detection/alerts`
List generated security alerts.
- **Query Params**: `alert_type`, `severity`, `page`, `page_size`
- **Response**: `200 OK`

---

## Incidents (`/v1/incidents`)

### `GET /incidents/`
List incidents with filtering by status and severity.
- **Query Params**: `status`, `severity`, `search`, `page`, `page_size`
- **Response**: `200 OK`

### `GET /incidents/{id}`
Retrieve complete incident record including linked alerts.
- **Response**: `200 OK`

### `PUT /incidents/{id}`
Update incident lifecycle status (`new`, `investigating`, `resolved`, `closed`).
- **Request Body**: `{"status": "investigating"}`
- **Response**: `200 OK`

### `GET /incidents/{id}/timeline`
Retrieve chronological event sequence for incident.
- **Response**: `200 OK` with ordered event entries.

---

## Investigation (`/v1/investigation`)

### `POST /investigation/{incident_id}/generate`
Trigger Gemini AI investigation and remediation generation.
- **Response**: `200 OK` with structured investigation summary, evidence citations, and uncertainty.

### `GET /investigation/{incident_id}`
Fetch the latest investigation report for the incident.
- **Response**: `200 OK`

---

## Recommendations (`/v1/recommendations`)

### `GET /recommendations/incident/{incident_id}`
List all recommendations generated for an incident.
- **Response**: `200 OK`

### `POST /recommendations/{id}/approve`
Approve recommended remediation action (Human-in-the-loop).
- **Request Body**: `{"approved": true, "notes": "Approved by senior analyst"}`
- **Response**: `200 OK`

### `POST /recommendations/{id}/reject`
Reject recommended remediation action.
- **Request Body**: `{"approved": false, "notes": "False positive"}`
- **Response**: `200 OK`

---

## Analytics (`/v1/analytics`)

### `GET /analytics/dashboard-stats`
High-level KPI metrics (total events, alerts, active incidents, critical count).

### `GET /analytics/attack-trends`
Distribution of detections categorized by attack type.

### `GET /analytics/severity-distribution`
Breakdown of incidents across low, medium, high, and critical tiers.

