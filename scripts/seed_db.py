"""Seed database with default accounts and ingest the demo dataset."""

import os
import sys
import httpx

API_BASE = os.environ.get("SENTINEL_API_URL", "http://localhost:8000/api/v1")


def seed_system():
    print(f"Connecting to SentinelLite API at {API_BASE}...")

    # 1. Register admin user
    admin_payload = {
        "email": "admin@sentinellite.local",
        "password": "AdminPass123!",
        "full_name": "Security Admin",
        "role": "admin",
    }
    try:
        resp = httpx.post(f"{API_BASE}/auth/register", json=admin_payload, timeout=10.0)
        if resp.status_code == 201:
            print("Successfully registered default admin: admin@sentinellite.local")
        elif resp.status_code == 400 and "already exists" in resp.text:
            print("Admin user already registered.")
        else:
            print(f"Admin registration notice: {resp.status_code} - {resp.text}")
    except httpx.ConnectError:
        print(f"Could not connect to {API_BASE}. Is the backend service running?")
        sys.exit(1)

    # 2. Login as admin
    login_resp = httpx.post(
        f"{API_BASE}/auth/login",
        json={"email": "admin@sentinellite.local", "password": "AdminPass123!"},
        timeout=10.0,
    )
    if login_resp.status_code != 200:
        print(f"Login failed: {login_resp.text}")
        sys.exit(1)

    token = login_resp.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    print("Authenticated successfully.")

    # 3. Register analyst
    analyst_payload = {
        "email": "analyst@sentinellite.local",
        "password": "AnalystPass123!",
        "full_name": "Tier-1 Analyst",
        "role": "analyst",
    }
    httpx.post(f"{API_BASE}/auth/register", json=analyst_payload, timeout=10.0)
    print("Registered analyst account: analyst@sentinellite.local")

    # 4. Upload demo dataset if available
    csv_path = "data/synthetic/demo_security_logs.csv"
    if os.path.exists(csv_path):
        with open(csv_path, "rb") as f:
            files = {"file": ("demo_security_logs.csv", f, "text/csv")}
            up_resp = httpx.post(f"{API_BASE}/events/upload", headers=headers, files=files, timeout=30.0)
            if up_resp.status_code == 201:
                print(f"Uploaded demo logs: {up_resp.json()}")
            else:
                print(f"Upload response: {up_resp.status_code} - {up_resp.text}")

        # 5. Run detection and correlation
        det_resp = httpx.post(f"{API_BASE}/detection/run?limit=1000&auto_correlate=true", headers=headers, timeout=60.0)
        if det_resp.status_code == 200:
            print(f"Detection & correlation triggered: {det_resp.json()}")
    else:
        print(f"Warning: {csv_path} not found. Run python scripts/generate_demo_data.py first.")

    print("\nDatabase seeded and demo telemetry initialized!")


if __name__ == "__main__":
    seed_system()

