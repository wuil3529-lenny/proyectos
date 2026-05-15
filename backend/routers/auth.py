"""
routers/auth.py - Endpoints de autenticación
"""

from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session

from database import get_db
from models import Usuario, AuditLog
from schemas import UsuarioCreate, UsuarioResponse, LoginRequest, LoginResponse
from security import hash_password, verify_password, create_access_token, get_current_user

router = APIRouter(prefix="/api/auth", tags=["Autenticación"])


def _audit(db: Session, usuario_id, accion: str, recurso: str, ip: str = "?", detalles: str = None):
    db.add(AuditLog(
        usuario_id=usuario_id,
        accion=accion,
        recurso=recurso,
        ip_origen=ip,
        detalles=detalles,
    ))
    db.commit()


@router.post("/registrar", response_model=UsuarioResponse, status_code=201)
def registrar(body: UsuarioCreate, request: Request, db: Session = Depends(get_db)):
    """Crea un nuevo usuario. Solo Admin debería exponer este endpoint en producción."""
    if db.query(Usuario).filter(Usuario.email == body.email).first():
        raise HTTPException(status_code=400, detail="Email ya registrado")

    usuario = Usuario(
        email=body.email,
        password_hash=hash_password(body.password),
        nombre_completo=body.nombre_completo,
        rol=body.rol,
        departamento=body.departamento,
    )
    db.add(usuario)
    db.commit()
    db.refresh(usuario)

    _audit(db, None, "crear_usuario", f"usuario_{usuario.id}",
           ip=request.client.host if request.client else "?",
           detalles=f"email={usuario.email}, rol={usuario.rol}")
    return usuario


@router.post("/login", response_model=LoginResponse)
def login(body: LoginRequest, request: Request, db: Session = Depends(get_db)):
    """Autentica y retorna JWT token (válido 30 min)."""
    usuario = db.query(Usuario).filter(Usuario.email == body.email).first()

    if not usuario or not verify_password(body.password, usuario.password_hash):
        raise HTTPException(status_code=401, detail="Email o contraseña incorrectos")
    if not usuario.activo:
        raise HTTPException(status_code=403, detail="Usuario inactivo")

    token = create_access_token({"sub": usuario.id, "role": usuario.rol})

    usuario.ultima_conexion = datetime.utcnow()
    db.commit()

    _audit(db, usuario.id, "login", f"usuario_{usuario.id}",
           ip=request.client.host if request.client else "?")

    return {"access_token": token, "token_type": "bearer", "usuario": usuario}


@router.get("/me", response_model=UsuarioResponse)
def get_me(usuario=Depends(get_current_user)):
    """Retorna datos del usuario autenticado."""
    return usuario
