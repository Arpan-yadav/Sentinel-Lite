"""
Active Defense & Autonomous Mitigation API routes.
Provides dynamic blocklists, one-click incident containment, and defense playbooks.
"""

from datetime import datetime, timezone
from typing import Any, Dict, List
import uuid
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.services.incident_service import IncidentService
from app.services.tkg_service import TKGService

router = APIRouter(prefix="/v1/defense", tags=["Active Defense"])

# In-memory fast active blocklist cache (synced for real-time edge/SDK polling)
ACTIVE_BLOCKLIST: Dict[str, Dict[str, Any]] = {
    "185.220.101.42": {
        "ip": "185.220.101.42",
        "reason": "SSH Brute Force (MITRE T1110) targeting internal gateway",
        "blocked_at": "2026-11-06T18:00:00Z",
        "severity": "critical",
        "expires_at": "2026-11-13T18:00:00Z",
        "hits_blocked": 1420,
    },
    "194.26.29.112": {
        "ip": "194.26.29.112",
        "reason": "Network Service Discovery Port Scan (MITRE T1046)",
        "blocked_at": "2026-11-06T18:30:00Z",
        "severity": "high",
        "expires_at": "2026-11-13T18:30:00Z",
        "hits_blocked": 389,
    },
}


class BlockRequest(BaseModel):
    ip: str = Field(..., description="IPv4 or IPv6 address to block")
    reason: str = Field("Manual SOC block rule", description="Justification for containment")
    severity: str = Field("critical", description="Threat severity level")
    duration_hours: int = Field(168, ge=1, le=8760, description="Block rule TTL in hours (default 7 days)")


@router.get("/blocklist")
async def get_active_blocklist() -> Any:
    """Return active IP blocklist for external websites, firewalls, and SentinelLite SDKs."""
    return {
        "status": "success",
        "total_blocked": len(ACTIVE_BLOCKLIST),
        "updated_at": datetime.now(timezone.utc).isoformat(),
        "rules": list(ACTIVE_BLOCKLIST.values()),
    }


@router.post("/block", status_code=status.HTTP_201_CREATED)
async def block_ip(
    request: BlockRequest,
    current_user: User = Depends(get_current_user),
) -> Any:
    """Add a malicious IP to the active defense blocklist."""
    now = datetime.now(timezone.utc)
    ip = request.ip.strip()
    ACTIVE_BLOCKLIST[ip] = {
        "ip": ip,
        "reason": request.reason,
        "severity": request.severity,
        "blocked_at": now.isoformat(),
        "expires_at": (now).isoformat(),
        "blocked_by": current_user.email,
        "hits_blocked": 0,
    }
    return {
        "status": "success",
        "message": f"IP {ip} successfully contained on perimeter boundary.",
        "rule": ACTIVE_BLOCKLIST[ip],
    }


@router.delete("/unblock/{ip}")
async def unblock_ip(
    ip: str,
    current_user: User = Depends(get_current_user),
) -> Any:
    """Remove an IP address from the active defense blocklist."""
    clean_ip = ip.strip()
    if clean_ip in ACTIVE_BLOCKLIST:
        del ACTIVE_BLOCKLIST[clean_ip]
        return {"status": "success", "message": f"IP {clean_ip} removed from blocklist."}
    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="IP not found in active blocklist")


@router.post("/contain-incident/{incident_id}")
async def contain_incident(
    incident_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Any:
    """Execute one-click chokepoint containment for all source IPs in an incident."""
    incident = await IncidentService.get_incident(db, incident_id)
    if not incident:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Incident not found")

    timeline_events = await IncidentService.get_incident_timeline(db, incident_id)
    blocked_ips = []

    for ev in timeline_events:
        src_ip = ev.get("source_ip")
        if src_ip and src_ip not in ACTIVE_BLOCKLIST and not src_ip.startswith("192.168.") and not src_ip.startswith("10."):
            ACTIVE_BLOCKLIST[src_ip] = {
                "ip": src_ip,
                "reason": f"Automated TKG Chokepoint Containment: {incident.title}",
                "severity": incident.severity,
                "blocked_at": datetime.now(timezone.utc).isoformat(),
                "blocked_by": current_user.email,
                "hits_blocked": 0,
            }
            blocked_ips.append(src_ip)

    # Update incident status to investigating or resolved
    await IncidentService.update_incident(db, incident_id, {"status": "investigating"})
    await db.commit()

    return {
        "status": "success",
        "incident_id": str(incident_id),
        "contained_ips": blocked_ips,
        "message": f"Contained {len(blocked_ips)} malicious attacker vector(s) across perimeter boundary.",
    }

