"""
routers/usuarios.py - Gestión de usuarios (Admin)
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from database import get_db
from models import Usuario, AuditLog
from schemas import UsuarioCreate, UsuarioResponse, UsuarioUpdate, PasswordResetBody
from security import require_roles, hash_password, get_current_user

router = APIRouter(prefix="/api/usuarios", tags=["Usuarios"])


@router.get("", response_model=List[UsuarioResponse])
def listar_usuarios(
    usuario=Depends(require_roles("admin")),
    db: Session = Depends(get_db),
):
    """Lista todos los usuarios (solo Admin)."""
    return db.query(Usuario).order_by(Usuario.nombre_completo).all()


@router.get("/directorio", response_model=List[UsuarioResponse])
def directorio_usuarios(
    usuario=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Lista usuarios activos para asignación de personal (todos los roles)."""
    return db.query(Usuario).filter(Usuario.activo == True).order_by(Usuario.nombre_completo).all()


@router.post("", response_model=UsuarioResponse, status_code=201)
def crear_usuario(
    body: UsuarioCreate,
    usuario=Depends(require_roles("admin")),
    db: Session = Depends(get_db),
):
    """Crea un nuevo usuario (solo Admin)."""
    if db.query(Usuario).filter(Usuario.email == body.email).first():
        raise HTTPException(400, "Email ya registrado")

    nuevo = Usuario(
        email=body.email,
        password_hash=hash_password(body.password),
        nombre_completo=body.nombre_completo,
        rol=body.rol,
        departamento=body.departamento,
    )
    db.add(nuevo)
    db.commit()
    db.refresh(nuevo)

    db.add(AuditLog(
        usuario_id=usuario.id,
        accion="crear_usuario",
        recurso=f"usuario_{nuevo.id}",
        detalles=f"email={nuevo.email}, rol={nuevo.rol}",
    ))
    db.commit()
    return nuevo


@router.get("/resumen-activos")
def resumen_activos(
    usuario=Depends(require_roles("admin")),
    db: Session = Depends(get_db),
):
    """Total de usuarios activos agrupados por rol."""
    usuarios = db.query(Usuario).filter(Usuario.activo == True).all()
    por_rol: dict = {}
    for u in usuarios:
        por_rol[u.rol] = por_rol.get(u.rol, 0) + 1
    return {
        "total_activos": len(usuarios),
        "por_rol": [{"rol": rol, "cantidad": cnt} for rol, cnt in sorted(por_rol.items())],
    }


@router.get("/{usuario_id}", response_model=UsuarioResponse)
def detalle_usuario(
    usuario_id: int,
    usuario=Depends(require_roles("admin")),
    db: Session = Depends(get_db),
):
    u = db.query(Usuario).filter(Usuario.id == usuario_id).first()
    if not u:
        raise HTTPException(404, "Usuario no encontrado")
    return u


@router.patch("/{usuario_id}", response_model=UsuarioResponse)
def actualizar_usuario(
    usuario_id: int,
    body: UsuarioUpdate,
    usuario=Depends(require_roles("admin")),
    db: Session = Depends(get_db),
):
    u = db.query(Usuario).filter(Usuario.id == usuario_id).first()
    if not u:
        raise HTTPException(404, "Usuario no encontrado")

    for field, value in body.model_dump(exclude_none=True).items():
        setattr(u, field, value)

    db.commit()
    db.refresh(u)

    db.add(AuditLog(
        usuario_id=usuario.id,
        accion="actualizar_usuario",
        recurso=f"usuario_{usuario_id}",
        detalles=str(body.model_dump(exclude_none=True)),
    ))
    db.commit()
    return u


@router.post("/{usuario_id}/reset-password")
def resetear_password(
    usuario_id: int,
    body: PasswordResetBody,
    usuario=Depends(require_roles("admin")),
    db: Session = Depends(get_db),
):
    """Resetea la contraseña de un usuario (solo Admin)."""
    u = db.query(Usuario).filter(Usuario.id == usuario_id).first()
    if not u:
        raise HTTPException(404, "Usuario no encontrado")
    if u.id == usuario.id:
        raise HTTPException(400, "Usa el perfil para cambiar tu propia contraseña")

    u.password_hash = hash_password(body.nueva_password)
    db.commit()

    db.add(AuditLog(
        usuario_id=usuario.id,
        accion="resetear_password",
        recurso=f"usuario_{usuario_id}",
        detalles=f"reset por admin id={usuario.id}",
    ))
    db.commit()
    return {"mensaje": "Contraseña actualizada correctamente"}


@router.delete("/{usuario_id}")
def desactivar_usuario(
    usuario_id: int,
    usuario=Depends(require_roles("admin")),
    db: Session = Depends(get_db),
):
    """Desactiva un usuario (no borra de BD)."""
    u = db.query(Usuario).filter(Usuario.id == usuario_id).first()
    if not u:
        raise HTTPException(404, "Usuario no encontrado")
    if u.id == usuario.id:
        raise HTTPException(400, "No puedes desactivarte a ti mismo")

    u.activo = False
    db.commit()

    db.add(AuditLog(
        usuario_id=usuario.id,
        accion="desactivar_usuario",
        recurso=f"usuario_{usuario_id}",
    ))
    db.commit()
    return {"mensaje": f"Usuario {usuario_id} desactivado"}
