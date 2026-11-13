"""Client / Organization Management API routes."""

import uuid
from typing import Any, List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import desc, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user, require_admin
from app.models.client import Client
from app.models.user import User
from app.schemas.client import ClientCreate, ClientResponse, ClientUpdate

router = APIRouter(prefix="/v1/clients", tags=["Clients"])

DEFAULT_CLIENTS = [
    {
        "name": "FinCorp Global Banking",
        "industry": "Financial Services",
        "tier": "Enterprise",
        "status": "active",
        "network_cidr": "10.100.0.0/16",
        "contact_email": "security@fincorp.io",
        "health_score": 96,
        "active_incidents": 1,
    },
    {
        "name": "HealthSecure Cloud",
        "industry": "Healthcare & Biotech",
        "tier": "Enterprise",
        "status": "warning",
        "network_cidr": "172.16.0.0/16",
        "contact_email": "hipaa-sec@healthsecure.org",
        "health_score": 82,
        "active_incidents": 3,
    },
    {
        "name": "Nexus Aerospace & Defense",
        "industry": "Defense & Logistics",
        "tier": "Enterprise",
        "status": "active",
        "network_cidr": "192.168.10.0/24",
        "contact_email": "ciso@nexusaero.com",
        "health_score": 98,
        "active_incidents": 0,
    },
    {
        "name": "OmniRetail Global eCommerce",
        "industry": "Retail & Payments",
        "tier": "Standard",
        "status": "active",
        "network_cidr": "10.200.0.0/16",
        "contact_email": "ops-security@omniretail.com",
        "health_score": 89,
        "active_incidents": 2,
    },
]


async def _seed_default_clients(db: AsyncSession):
    """Seed initial enterprise client tenants if database table is empty."""
    try:
        stmt = select(Client)
        res = await db.execute(stmt)
        existing = res.scalars().all()
        if not existing:
            for c_data in DEFAULT_CLIENTS:
                db.add(Client(**c_data))
            await db.commit()
    except Exception:
        await db.rollback()


@router.get("", response_model=List[ClientResponse])
async def list_clients(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Any:
    """List all enterprise clients monitored under SentinelLite."""
    await _seed_default_clients(db)
    stmt = select(Client).order_by(desc(Client.created_at))
    result = await db.execute(stmt)
    return result.scalars().all()


@router.post("", response_model=ClientResponse, status_code=status.HTTP_201_CREATED)
async def create_client(
    client_in: ClientCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin),
) -> Any:
    """Register a new enterprise client tenant (Admin only)."""
    # Check duplicate
    stmt = select(Client).where(Client.name == client_in.name)
    existing = (await db.execute(stmt)).scalar_one_or_none()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A client organization with this name already exists",
        )

    client = Client(**client_in.model_dump())
    db.add(client)
    await db.commit()
    await db.refresh(client)
    return client


@router.get("/{id}", response_model=ClientResponse)
async def get_client(
    id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Any:
    """Get single client details."""
    stmt = select(Client).where(Client.id == id)
    client = (await db.execute(stmt)).scalar_one_or_none()
    if not client:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Client not found",
        )
    return client


@router.put("/{id}", response_model=ClientResponse)
async def update_client(
    id: uuid.UUID,
    client_in: ClientUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin),
) -> Any:
    """Update enterprise client status or details (Admin only)."""
    stmt = select(Client).where(Client.id == id)
    client = (await db.execute(stmt)).scalar_one_or_none()
    if not client:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Client not found",
        )

    for field, val in client_in.model_dump(exclude_unset=True).items():
        setattr(client, field, val)

    await db.commit()
    await db.refresh(client)
    return client


@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_client(
    id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin),
) -> None:
    """Remove a client organization (Admin only)."""
    stmt = select(Client).where(Client.id == id)
    client = (await db.execute(stmt)).scalar_one_or_none()
    if not client:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Client not found",
        )
    await db.delete(client)
    await db.commit()

