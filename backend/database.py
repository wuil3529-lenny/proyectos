"""
database.py - Configuración de conexión a PostgreSQL
"""

import os
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv

load_dotenv()

# SQLite por defecto (sin instalación) — cambiar a PostgreSQL en producción
DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "sqlite:///./fabrica_produccion.db"
)

# SQLite no soporta pool_size ni max_overflow
if DATABASE_URL.startswith("sqlite"):
    engine = create_engine(
        DATABASE_URL,
        connect_args={"check_same_thread": False},
        echo=os.getenv("DEBUG_MODE", "False") == "True",
    )
else:
    engine = create_engine(
        DATABASE_URL,
        echo=os.getenv("DEBUG_MODE", "False") == "True",
        pool_pre_ping=True,
        pool_size=10,
        max_overflow=20,
    )

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_db():
    """Dependency: provee sesión de BD por request."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
