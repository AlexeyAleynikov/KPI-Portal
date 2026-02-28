from sqlalchemy import Column, Integer, String, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base


class Dimension(Base):
    """Тип измерения: Регион, Продукт, Канал продаж и т.д."""
    __tablename__ = "dimensions"
    id = Column(Integer, primary_key=True)
    name = Column(String(128), unique=True, nullable=False)   # Регион
    name_system = Column(String(64), unique=True, nullable=False)  # region
    values = relationship("DimensionValue", back_populates="dimension", cascade="all, delete-orphan")


class DimensionValue(Base):
    """Значение измерения: Европа, Азия, Америка и т.д."""
    __tablename__ = "dimension_values"
    id = Column(Integer, primary_key=True)
    dimension_id = Column(Integer, ForeignKey("dimensions.id"), nullable=False)
    value = Column(String(256), nullable=False)   # Европа
    dimension = relationship("Dimension", back_populates="values")
