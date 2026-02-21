"""
models/__init__.py  — все модели в одном месте для простоты Alembic-импорта
"""
from app.database import Base
from app.models.user import User, UserRole, AccessLevel
from app.models.kpi import KpiIndicator, KpiValue, KpiTarget, KpiDataSource
from app.models.links import LinkSection, Link, RoleLinkSection
from app.models.role import Role, RoleIndicator
from app.models.audit import AuditLog

__all__ = [
    "Base", "User", "UserRole", "AccessLevel",
    "KpiIndicator", "KpiValue", "KpiTarget", "KpiDataSource",
    "LinkSection", "Link", "RoleLinkSection",
    "Role", "RoleIndicator",
    "AuditLog",
]
