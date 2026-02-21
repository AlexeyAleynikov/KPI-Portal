import enum
from datetime import datetime
from sqlalchemy import (
    Column, Integer, String, Float, Boolean, DateTime,
    ForeignKey, Enum, Text, JSON, Date
)
from sqlalchemy.orm import relationship
from app.database import Base


class ValueType(str, enum.Enum):
    NUMBER = "number"
    PERCENT = "percent"
    BOOLEAN = "boolean"
    TIME = "time"


class SourceType(str, enum.Enum):
    REST_API = "rest_api"
    DATABASE = "database"
    CSV = "csv"
    XLSX = "xlsx"
    WEBHOOK = "webhook"
    MANUAL = "manual"
    COMPUTED = "computed"


class KpiIndicator(Base):
    __tablename__ = "kpi_indicators"

    id = Column(Integer, primary_key=True, index=True)
    name_display = Column(String(255), nullable=False)   # отображаемое название
    name_system = Column(String(128), unique=True, nullable=False)  # системное
    value_type = Column(Enum(ValueType), nullable=False, default=ValueType.NUMBER)
    source_type = Column(Enum(SourceType), nullable=False, default=SourceType.MANUAL)

    # Формула (для computed)
    formula = Column(Text, nullable=True)

    # Расписание обновления (cron)
    cron_schedule = Column(String(64), nullable=True)
    last_run_at = Column(DateTime, nullable=True)
    last_run_status = Column(String(32), nullable=True)  # success / error

    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    values = relationship("KpiValue", back_populates="indicator", lazy="dynamic")
    targets = relationship("KpiTarget", back_populates="indicator")
    data_source = relationship("KpiDataSource", back_populates="indicator", uselist=False)
    role_links = relationship("RoleIndicator", back_populates="indicator")


class KpiDataSource(Base):
    """Настройки источника данных для показателя."""
    __tablename__ = "kpi_data_sources"

    id = Column(Integer, primary_key=True)
    indicator_id = Column(Integer, ForeignKey("kpi_indicators.id"), unique=True, nullable=False)

    # REST API
    api_url = Column(String(512), nullable=True)
    api_method = Column(String(8), default="GET")
    api_auth_type = Column(String(32), nullable=True)  # bearer / basic / api_key
    api_auth_value = Column(Text, nullable=True)        # encrypted

    # Database
    db_connection_string = Column(Text, nullable=True)  # encrypted
    db_query = Column(Text, nullable=True)

    # SFTP / File
    sftp_host = Column(String(255), nullable=True)
    sftp_path = Column(String(512), nullable=True)
    sftp_credentials = Column(Text, nullable=True)  # encrypted JSON

    # Computed formula / extra config
    extra_config = Column(JSON, nullable=True)

    indicator = relationship("KpiIndicator", back_populates="data_source")


class KpiValue(Base):
    """Фактическое значение показателя для конкретного пользователя за дату."""
    __tablename__ = "kpi_values"

    id = Column(Integer, primary_key=True)
    indicator_id = Column(Integer, ForeignKey("kpi_indicators.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    date = Column(Date, nullable=False)
    value = Column(Float, nullable=True)
    adjusted_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)  # менеджер
    adjusted_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    indicator = relationship("KpiIndicator", back_populates="values")
    user = relationship("User", foreign_keys=[user_id], back_populates="kpi_values")


class KpiTarget(Base):
    """Плановое значение показателя для пользователя за период."""
    __tablename__ = "kpi_targets"

    id = Column(Integer, primary_key=True)
    indicator_id = Column(Integer, ForeignKey("kpi_indicators.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    period_start = Column(Date, nullable=False)
    period_end = Column(Date, nullable=False)
    target_value = Column(Float, nullable=False)
    set_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    indicator = relationship("KpiIndicator", back_populates="targets")
