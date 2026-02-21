from datetime import datetime
from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from app.database import Base


class LinkSection(Base):
    __tablename__ = "link_sections"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    icon = Column(String(255), nullable=True)
    order = Column(Integer, default=0)
    is_global = Column(Boolean, default=False)  # видна всем ролям
    created_at = Column(DateTime, default=datetime.utcnow)

    links = relationship("Link", back_populates="section", order_by="Link.order")
    role_links = relationship("RoleLinkSection", back_populates="section")


class Link(Base):
    __tablename__ = "links"

    id = Column(Integer, primary_key=True, index=True)
    section_id = Column(Integer, ForeignKey("link_sections.id"), nullable=False)
    name = Column(String(255), nullable=False)
    url = Column(String(1024), nullable=False)
    icon = Column(String(255), nullable=True)
    description = Column(Text, nullable=True)
    open_in_iframe = Column(Boolean, default=False)
    order = Column(Integer, default=0)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    section = relationship("LinkSection", back_populates="links")


class RoleLinkSection(Base):
    """Привязка секции ссылок к роли."""
    __tablename__ = "role_link_sections"

    id = Column(Integer, primary_key=True)
    role_id = Column(Integer, ForeignKey("roles.id"), nullable=False)
    section_id = Column(Integer, ForeignKey("link_sections.id"), nullable=False)

    role = relationship("Role", back_populates="link_sections")
    section = relationship("LinkSection", back_populates="role_links")
