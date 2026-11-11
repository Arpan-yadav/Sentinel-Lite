"""
SentinelLite Python SDK & Autonomous Defense Middleware.

Drop this middleware into any FastAPI, Starlette, or Flask web application
to enable real-time telemetry streaming, early threat detection,
and active perimeter IP containment.

Usage in any FastAPI / Starlette app:
    from fastapi import FastAPI
    from sentinellite_sdk import SentinelLiteMiddleware

    app = FastAPI()
    app.add_middleware(
        SentinelLiteMiddleware,
        sentinellite_url="http://localhost:8000/api/v1",
        api_key="your-api-key",
        enable_active_blocking=True,
    )
"""

from __future__ import annotations

import asyncio
import logging
import re
import time
from typing import Any, Callable, Dict, Optional, Set
import urllib.request
import json

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import JSONResponse, Response

logger = logging.getLogger("sentinellite-sdk")

# Attack pattern heuristics for early inline threat prevention
SQLI_PATTERN = re.compile(r"(\b(union|select|insert|update|delete|drop|alter|exec|sleep)\b|['\"]\s*or\s*['\"]|--|/\*|\b1=1\b)", re.IGNORECASE)
XSS_PATTERN = re.compile(r"(<script|javascript:|onerror=|onload=|<svg|<img\s+src=)", re.IGNORECASE)
TRAVERSAL_PATTERN = re.compile(r"(\.\./|\.\.\\|/etc/passwd|win\.ini|/windows/system32)", re.IGNORECASE)


class SentinelLiteClient:
    """Lightweight asynchronous client to sync with SentinelLite SOC."""

    def __init__(self, api_url: str = "http://localhost:8000/api/v1", api_key: str = ""):
        self.api_url = api_url.rstrip("/")
        self.api_key = api_key
        self.blocked_ips: Set[str] = set()
        self.last_sync_time: float = 0.0
        self.sync_interval_seconds: float = 60.0

    def sync_blocklist(self) -> None:
        """Fetch active defense blocklist from SentinelLite API."""
        now = time.time()
        if now - self.last_sync_time < self.sync_interval_seconds:
            return

        try:
            req = urllib.request.Request(
                f"{self.api_url}/defense/blocklist",
                headers={"User-Agent": "SentinelLite-Agent/1.0", "Accept": "application/json"},
            )
            with urllib.request.urlopen(req, timeout=3) as resp:
                data = json.loads(resp.read().decode("utf-8"))
                rules = data.get("rules", [])
                self.blocked_ips = {r["ip"] for r in rules if "ip" in r}
                self.last_sync_time = now
                logger.info(f"[SentinelLite] Synchronized {len(self.blocked_ips)} blocked IP(s).")
        except Exception as e:
            logger.debug(f"[SentinelLite] Blocklist sync notice: {e}")

    def is_ip_blocked(self, client_ip: str) -> bool:
        self.sync_blocklist()
        return client_ip in self.blocked_ips

    def dispatch_event(self, event_payload: Dict[str, Any]) -> None:
        """Send telemetry event to SentinelLite in background."""
        def _post():
            try:
                data_bytes = json.dumps(event_payload).encode("utf-8")
                req = urllib.request.Request(
                    f"{self.api_url}/events/",
                    data=data_bytes,
                    headers={
                        "Content-Type": "application/json",
                        "User-Agent": "SentinelLite-Agent/1.0",
                    },
                    method="POST",
                )
                with urllib.request.urlopen(req, timeout=3) as resp:
                    pass
            except Exception as e:
                logger.debug(f"[SentinelLite] Telemetry send notice: {e}")

        # Fire and forget asynchronously
        asyncio.get_event_loop().run_in_executor(None, _post)


class SentinelLiteMiddleware(BaseHTTPMiddleware):
    """Universal security middleware for Python web servers."""

    def __init__(
        self,
        app,
        sentinellite_url: str = "http://localhost:8000/api/v1",
        api_key: str = "",
        enable_active_blocking: bool = True,
        server_asset_ip: str = "10.0.0.10",
    ):
        super().__init__(app)
        self.client = SentinelLiteClient(api_url=sentinellite_url, api_key=api_key)
        self.enable_active_blocking = enable_active_blocking
        self.server_asset_ip = server_asset_ip

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        client_ip = request.client.host if request.client else "127.0.0.1"

        # 1. Active Defense: Check if IP is in SentinelLite perimeter blocklist
        if self.enable_active_blocking and self.client.is_ip_blocked(client_ip):
            logger.warning(f"[SentinelLite Blocked] Request dropped from blacklisted IP: {client_ip}")
            return JSONResponse(
                status_code=403,
                content={
                    "error": "Access Denied by SentinelLite Active Defense",
                    "reason": "Host IP flagged for malicious cyber activity.",
                    "client_ip": client_ip,
                },
            )

        # 2. Inspect query params & path for injection threats
        raw_url = str(request.url)
        path = request.url.path
        detected_threat: Optional[str] = None

        if SQLI_PATTERN.search(raw_url):
            detected_threat = "sql_injection_attempt"
        elif XSS_PATTERN.search(raw_url):
            detected_threat = "xss_probe"
        elif TRAVERSAL_PATTERN.search(raw_url):
            detected_threat = "directory_traversal"

        # If malicious exploit probe detected, block immediately
        if detected_threat and self.enable_active_blocking:
            logger.warning(f"[SentinelLite Threat Blocked] {detected_threat} from {client_ip} on {path}")
            # Stream alert to SentinelLite
            self.client.dispatch_event({
                "source_ip": client_ip,
                "dest_ip": self.server_asset_ip,
                "dest_port": 443,
                "protocol": "TCP",
                "event_type": detected_threat,
                "raw_data": {"url": raw_url, "path": path, "method": request.method},
            })
            return JSONResponse(
                status_code=400,
                content={
                    "error": "Malicious payload detected by SentinelLite inspection engine.",
                    "violation": detected_threat,
                },
            )

        start_time = time.time()
        try:
            response = await call_next(request)
            duration = round(time.time() - start_time, 4)

            # Stream benign or failed auth event to SentinelLite
            event_type = "http_request"
            if response.status_code in [401, 403]:
                event_type = "http_auth_failure"

            self.client.dispatch_event({
                "source_ip": client_ip,
                "dest_ip": self.server_asset_ip,
                "dest_port": 443,
                "protocol": "TCP",
                "event_type": event_type,
                "duration": duration,
                "raw_data": {
                    "path": path,
                    "status_code": response.status_code,
                    "method": request.method,
                },
            })
            return response
        except Exception as exc:
            duration = round(time.time() - start_time, 4)
            self.client.dispatch_event({
                "source_ip": client_ip,
                "dest_ip": self.server_asset_ip,
                "dest_port": 443,
                "protocol": "TCP",
                "event_type": "server_exception_anomaly",
                "duration": duration,
                "raw_data": {"error": str(exc), "path": path},
            })
            raise exc

