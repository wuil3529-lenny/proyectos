"""
main.py - Servidor principal FastAPI
Plataforma Industrial - Gestión de Producción v1.0
"""

import os
from dotenv import load_dotenv

load_dotenv()

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from database import engine, Base
from routers import auth, maquinas, ciclos, defectos, alertas, reportes, usuarios, dashboard, productos, pedidos, planificacion, materiales, inspector

# ──────────────────────────────────────────────────────────────────
# Instancia de la aplicación
# ──────────────────────────────────────────────────────────────────

app = FastAPI(
    title="Plataforma Industrial - Gestión de Producción",
    version="1.0.0",
    description=(
        "Sistema integral para plantas de fabricación de plásticos. "
        "Registro de ciclos, alertas automáticas, reportes y IA predictiva."
    ),
    docs_url="/docs",
    redoc_url="/redoc",
)

# ──────────────────────────────────────────────────────────────────
# CORS
# ──────────────────────────────────────────────────────────────────

origins = os.getenv("CORS_ORIGINS", "*").split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ──────────────────────────────────────────────────────────────────
# Routers
# ──────────────────────────────────────────────────────────────────

app.include_router(auth.router)
app.include_router(maquinas.router)
app.include_router(ciclos.router)
app.include_router(defectos.router)
app.include_router(alertas.router)
app.include_router(reportes.router)
app.include_router(usuarios.router)
app.include_router(dashboard.router)
app.include_router(productos.router)
app.include_router(pedidos.router)
app.include_router(planificacion.router)
app.include_router(materiales.router)
app.include_router(inspector.router)

# ──────────────────────────────────────────────────────────────────
# Eventos de startup
# ──────────────────────────────────────────────────────────────────

@app.on_event("startup")
def startup():
    print("[*] Iniciando Plataforma Industrial...")
    Base.metadata.create_all(bind=engine)
    print("[OK] Tablas creadas/verificadas en BD")

    # Crear admin por defecto si no existe
    from database import SessionLocal
    from models import Usuario
    from security import hash_password

    db = SessionLocal()
    try:
        admin_email = os.getenv("DEFAULT_ADMIN_EMAIL", "admin@fabrica.com")
        if not db.query(Usuario).filter(Usuario.email == admin_email).first():
            admin = Usuario(
                email=admin_email,
                password_hash=hash_password(os.getenv("DEFAULT_ADMIN_PASSWORD", "Admin@123456")),
                nombre_completo="Administrador",
                rol="admin",
                departamento="Sistemas",
            )
            db.add(admin)
            db.commit()
            print(f"[+] Admin creado: {admin_email}")
    finally:
        db.close()

    print("[>>] Servidor listo -> http://localhost:8000/docs")


# ──────────────────────────────────────────────────────────────────
# Endpoints básicos
# ──────────────────────────────────────────────────────────────────

@app.get("/", tags=["Health"])
def root():
    return {
        "nombre": "Plataforma Industrial",
        "version": "1.0.0",
        "estado": "operativo",
        "docs": "/docs",
    }


@app.get("/api/health", tags=["Health"])
def health():
    from database import SessionLocal
    from sqlalchemy import text
    try:
        db = SessionLocal()
        db.execute(text("SELECT 1"))
        db.close()
        db_status = "conectada"
    except Exception as e:
        db_status = f"error: {e}"

    return {
        "status": "OK" if db_status == "conectada" else "ERROR",
        "database": db_status,
    }
