"""Master API router aggregating all versioned endpoints."""

from fastapi import APIRouter

from app.api.v1.analytics import router as analytics_router
from app.api.v1.audit import router as audit_router
from app.api.v1.auth import router as auth_router
from app.api.v1.detection import router as detection_router
from app.api.v1.events import router as events_router
from app.api.v1.incidents import router as incidents_router
from app.api.v1.investigation import router as investigation_router
from app.api.v1.recommendations import router as recommendations_router

api_router = APIRouter()

api_router.include_router(auth_router)
api_router.include_router(events_router)
api_router.include_router(detection_router)
api_router.include_router(incidents_router)
api_router.include_router(investigation_router)
api_router.include_router(recommendations_router)
api_router.include_router(analytics_router)
api_router.include_router(audit_router)

