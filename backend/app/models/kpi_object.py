from sqlalchemy import Column, Integer, String, ForeignKey, Enum
from sqlalchemy.orm import relationship
from app.database import Base
import enum


class KpiObjectType(str, enum.Enum):
    SUBDIVISION = "subdivision"   # Подразделение
    COMPANY = "company"           # Компания
    INDUSTRY = "industry"         # Отрасль
    CITY = "city"                 # Город
    COUNTRY = "country"           # Страна
    CONTINENT = "continent"       # Континент


class KpiObject(Base):
    """Объект, за который отвечает пользователь — может иметь KPI."""
    __tablename__ = "kpi_objects"
    id = Column(Integer, primary_key=True)
    name = Column(String(256), nullable=False)
    object_type = Column(Enum(KpiObjectType), nullable=False)
    parent_id = Column(Integer, ForeignKey("kpi_objects.id"), nullable=True)
    parent = relationship("KpiObject", remote_side="KpiObject.id", backref="children")
