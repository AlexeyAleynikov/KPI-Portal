from sqlalchemy import Column, Integer, String, ForeignKey, Table
from sqlalchemy.orm import relationship
from app.database import Base

# Связь страна ↔ континент (many-to-many)
country_continent = Table(
    "country_continent",
    Base.metadata,
    Column("country_id", Integer, ForeignKey("countries.id"), primary_key=True),
    Column("continent_id", Integer, ForeignKey("continents.id"), primary_key=True),
)


class Continent(Base):
    __tablename__ = "continents"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(64), unique=True, nullable=False)
    countries = relationship("Country", secondary=country_continent, back_populates="continents")
    cities = relationship("City", back_populates="continent", cascade="all, delete-orphan")


class Country(Base):
    __tablename__ = "countries"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(64), unique=True, nullable=False)
    continents = relationship("Continent", secondary=country_continent, back_populates="countries")


class City(Base):
    __tablename__ = "cities"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(128), nullable=False)
    continent_id = Column(Integer, ForeignKey("continents.id"), nullable=False)
    continent = relationship("Continent", back_populates="cities")
