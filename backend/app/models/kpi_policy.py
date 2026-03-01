from sqlalchemy import Column, Integer, String, ForeignKey, Boolean
from sqlalchemy.orm import relationship
from app.database import Base


class KpiPolicy(Base):
    """Политика доступа к KPI — по локации или на конкретного пользователя."""
    __tablename__ = "kpi_policies"
    id = Column(Integer, primary_key=True)

    # Область применения — одно из полей заполнено (или user_id для персональной)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)      # Персональная
    continent = Column(String(64), nullable=True)                          # По континенту
    country = Column(String(64), nullable=True)                            # По стране
    city = Column(String(128), nullable=True)                              # По городу

    # Права
    can_view = Column(Boolean, default=True)           # Просмотр своих KPI
    can_edit = Column(Boolean, default=False)          # Редактирование своих KPI
    can_view_subordinates = Column(Boolean, default=False)   # Просмотр KPI подчинённых
    can_edit_subordinates = Column(Boolean, default=False)   # Редактирование KPI подчинённых

    # Ограничение редактирования по дате
    edit_days_limit = Column(Integer, nullable=True)          # None = без ограничения (свои)
    edit_days_limit_subordinates = Column(Integer, nullable=True)  # None = без ограничения (подчинённые)

    # Метка что это персональная политика (перекрывает локационную)
    is_personal = Column(Boolean, default=False)

    user = relationship("User", foreign_keys=[user_id])
