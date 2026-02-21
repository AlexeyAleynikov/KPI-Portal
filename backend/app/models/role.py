from datetime import datetime
from sqlalchemy import Column, Integer, String, DateTime, Text
from sqlalchemy.orm import relationship
from app.database import Base


class Role(Base):
    """Набор прав: определяет, какие ссылки и KPI видит пользователь."""
    __tablename__ = "roles"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(128), unique=True, nullable=False)
    description = Column(Text, nullable=True)
    icon = Column(String(255), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    users = relationship("User", back_populates="portal_role")
    indicators = relationship("RoleIndicator", back_populates="role")
    link_sections = relationship("RoleLinkSection", back_populates="role")


class RoleIndicator(Base):
    """Привязка KPI-показателя к роли с весом."""
    __tablename__ = "role_indicators"

    id = Column(Integer, primary_key=True)
    role_id = Column(Integer, __import__('sqlalchemy').ForeignKey("roles.id"), nullable=False)
    indicator_id = Column(Integer, __import__('sqlalchemy').ForeignKey("kpi_indicators.id"), nullable=False)
    weight = Column(Integer, default=10)  # 0-100, сумма по роли = 100

    role = relationship("Role", back_populates="indicators")
    indicator = relationship("KpiIndicator", back_populates="role_links")
