"""
Seed the SentinelLite database with authentic CICIDS2017 events.
Uploads the authentic telemetry CSV then triggers ML detection + incident correlation.
"""

import os
import sys
import json
import httpx

API_BASE = os.environ.get("SENTINEL_API_URL", "http://localhost:8000/api/v1")
CSV_PATH = os.path.join(os.path.dirname(__file__), "..", "data", "authentic", "sentinellite_authentic_events.csv")


def seed():
    print(f"Connecting to SentinelLite API at {API_BASE}...")

    # 1. Register admin
    admin_payload = {
        "email": "admin@sentinellite.io",
        "password": "AdminPass123!",
        "full_name": "Security Admin",
        "role": "admin",
    }
    try:
        resp = httpx.post(f"{API_BASE}/auth/register", json=admin_payload, timeout=10.0)
        if resp.status_code == 201:
            print("Admin registered: admin@sentinellite.io")
        elif "already exists" in resp.text or resp.status_code == 400:
            print("Admin already registered.")
        else:
            print(f"Register: {resp.status_code} {resp.text}")
    except httpx.ConnectError:
        print(f"Cannot connect to {API_BASE}. Is the backend running?")
        sys.exit(1)

    # 2. Register analyst
    analyst_payload = {
        "email": "analyst@sentinellite.io",
        "password": "AnalystPass123!",
        "full_name": "Tier-1 Analyst",
        "role": "analyst",
    }
    resp = httpx.post(f"{API_BASE}/auth/register", json=analyst_payload, timeout=10.0)
    if resp.status_code == 201:
        print("Analyst registered: analyst@sentinellite.io")
    else:
        print("Analyst already registered.")

    # 3. Login
    login_resp = httpx.post(
        f"{API_BASE}/auth/login",
        json={"email": "admin@sentinellite.io", "password": "AdminPass123!"},
        timeout=10.0,
    )
    if login_resp.status_code != 200:
        print(f"Login failed: {login_resp.text}")
        sys.exit(1)
    token = login_resp.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    print("Authenticated successfully.")

    # 4. Upload authentic CICIDS2017 events CSV
    if not os.path.exists(CSV_PATH):
        print(f"ERROR: Authentic events CSV not found at {CSV_PATH}")
        print("Run: python scripts/download_authentic_dataset.py first")
        sys.exit(1)

    print(f"Uploading authentic CICIDS2017 events from {CSV_PATH}...")
    file_size_mb = os.path.getsize(CSV_PATH) / 1024 / 1024
    print(f"  File size: {file_size_mb:.2f} MB")

    with open(CSV_PATH, "rb") as f:
        up_resp = httpx.post(
            f"{API_BASE}/events/upload",
            headers=headers,
            files={"file": ("sentinellite_authentic_events.csv", f, "text/csv")},
            timeout=120.0,
        )

    if up_resp.status_code == 201:
        result = up_resp.json()
        print(f"Upload successful: {result}")
    else:
        print(f"Upload response: {up_resp.status_code} - {up_resp.text[:500]}")
        return

    # 5. Run ML detection
    print("Running ML detection pipeline...")
    det_resp = httpx.post(
        f"{API_BASE}/detection/run?limit=2000&auto_correlate=true",
        headers=headers,
        timeout=120.0,
    )
    if det_resp.status_code == 200:
        det_result = det_resp.json()
        print(f"Detection complete: {det_result}")
    else:
        print(f"Detection response: {det_resp.status_code} - {det_resp.text[:500]}")

    # 6. Final stats
    stats_resp = httpx.get(f"{API_BASE}/analytics/dashboard-stats", headers=headers, timeout=10.0)
    if stats_resp.status_code == 200:
        stats = stats_resp.json()
        print(f"\n=== Dashboard Stats ===")
        print(f"  Ingested Events: {stats.get('total_events', 0)}")
        print(f"  Active Alerts: {stats.get('total_alerts', 0)}")
        print(f"  Total Incidents: {stats.get('total_incidents', 0)}")
        print(f"  Open Incidents: {stats.get('open_incidents', 0)}")
        print(f"  Critical Alerts: {stats.get('critical_alerts', 0)}")
        print(f"  Avg Risk Score: {stats.get('avg_risk_score', 0.0)}")

    print("\n[DONE] Database seeded with authentic CICIDS2017 attack telemetry!")
    print("  Admin:   admin@sentinellite.io / AdminPass123!")
    print("  Analyst: analyst@sentinellite.io / AnalystPass123!")


if __name__ == "__main__":
    seed()

