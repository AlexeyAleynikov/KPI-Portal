import enum
from datetime import datetime
from sqlalchemy import (
    Column, Integer, String, Boolean, DateTime, ForeignKey, Enum, Text
)
from sqlalchemy.orm import relationship
from app.database import Base


class AccessLevel(str, enum.Enum):
    GLOBAL = "global"          # верхний — без ограничений
    CONTINENTAL = "continental"  # Азия, Африка, Америка, Австралия, Антарктида
    COUNTRY = "country"
    INDUSTRY = "industry"
    CITY = "city"


class UserRole(str, enum.Enum):
    EMPLOYEE = "employee"
    MANAGER = "manager"
    ADMIN = "admin"


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    full_name = Column(String(255), nullable=False)

    # Гео-атрибуты
    continent = Column(String(64), nullable=True)
    country = Column(String(64), nullable=True)
    city = Column(String(128), nullable=True)

    role = Column(Enum(UserRole), default=UserRole.EMPLOYEE, nullable=False)
    access_level = Column(Enum(AccessLevel), default=AccessLevel.CITY, nullable=True)

    # Ограничения делегирования (для менеджеров/администраторов)
    scope_value = Column(String(255), nullable=True)  # e.g. "Asia" / "Russia" / "Moscow"

    # Иерархия
    manager_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    manager = relationship("User", remote_side=[id], back_populates="subordinates")
    subordinates = relationship("User", back_populates="manager")

    # Привязка к роли-набору (ссылки, показатели)
    portal_role_id = Column(Integer, ForeignKey("roles.id"), nullable=True)
    portal_role = relationship("Role", back_populates="users")

    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Настройки делегирования (что разрешено менеджеру)
    can_edit_links = Column(Boolean, default=False)
    can_edit_kpi = Column(Boolean, default=False)
    can_set_plan = Column(Boolean, default=False)
    can_adjust_kpi = Column(Boolean, default=False)
    kpi_adjust_limit_pct = Column(Integer, default=0)       # ±N%
    can_manage_team = Column(Boolean, default=False)

    # Логи входов
    audit_logs = relationship("AuditLog", back_populates="user", lazy="dynamic")

    # KPI значения
    kpi_values = relationship("KpiValue", back_populates="user", lazy="dynamic")

    def display_name(self) -> str:
        """Возвращает публичный идентификатор: Азия-Россия-Москва-17"""
        parts = [p for p in [self.continent, self.country, self.city] if p]
        parts.append(str(self.id))
        return "-".join(parts)
