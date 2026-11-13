"""Import all models so Alembic and Base.metadata can discover them."""

from app.models.user import User  # noqa: F401
from app.models.asset import Asset  # noqa: F401
from app.models.security_event import SecurityEvent  # noqa: F401
from app.models.alert import Alert  # noqa: F401
from app.models.incident import Incident  # noqa: F401
from app.models.incident_event import IncidentEvent  # noqa: F401
from app.models.investigation import Investigation  # noqa: F401
from app.models.model_prediction import ModelPrediction  # noqa: F401
from app.models.recommendation import Recommendation  # noqa: F401
from app.models.approval import Approval  # noqa: F401
from app.models.audit_log import AuditLog  # noqa: F401
from app.models.client import Client  # noqa: F401
