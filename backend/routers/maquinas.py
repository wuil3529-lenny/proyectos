"""
routers/maquinas.py - CRUD de máquinas
"""

from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from database import get_db
from models import Maquina, AuditLog
from schemas import MaquinaCreate, MaquinaResponse, MaquinaUpdate, CicloResponse
from security import get_current_user, require_roles

router = APIRouter(prefix="/api/maquinas", tags=["Máquinas"])


@router.get("", response_model=List[MaquinaResponse])
def listar_maquinas(db: Session = Depends(get_db)):
    """Lista todas las máquinas (no requiere auth)."""
    return db.query(Maquina).order_by(Maquina.nombre).all()


@router.get("/estado-hoy")
def estado_hoy(db: Session = Depends(get_db)):
    """Estado de todas las máquinas con ciclos registrados hoy."""
    from models import Ciclo
    from sqlalchemy import func
    hoy = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    ciclos_hoy = (
        db.query(Ciclo.maquina_id, func.count(Ciclo.id).label("ciclos_hoy"))
        .filter(Ciclo.timestamp >= hoy)
        .group_by(Ciclo.maquina_id)
        .all()
    )
    ciclos_map = {r.maquina_id: r.ciclos_hoy for r in ciclos_hoy}
    maquinas = db.query(Maquina).order_by(Maquina.nombre).all()
    return [
        {
            "id": m.id,
            "nombre": m.nombre,
            "tipo": m.tipo,
            "estado": m.estado,
            "ciclos_totales": m.ciclos_totales,
            "ciclos_hoy": ciclos_map.get(m.id, 0),
        }
        for m in maquinas
    ]


@router.get("/{maquina_id}", response_model=MaquinaResponse)
def detalle_maquina(maquina_id: int, db: Session = Depends(get_db)):
    m = db.query(Maquina).filter(Maquina.id == maquina_id).first()
    if not m:
        raise HTTPException(404, "Máquina no encontrada")
    return m


@router.post("", response_model=MaquinaResponse, status_code=201)
def crear_maquina(
    body: MaquinaCreate,
    usuario=Depends(require_roles("admin", "jefe_produccion")),
    db: Session = Depends(get_db),
):
    if db.query(Maquina).filter(Maquina.nombre == body.nombre).first():
        raise HTTPException(400, "Ya existe una máquina con ese nombre")

    m = Maquina(**body.model_dump())
    db.add(m)
    db.commit()
    db.refresh(m)
    return m


@router.patch("/{maquina_id}", response_model=MaquinaResponse)
def actualizar_maquina(
    maquina_id: int,
    body: MaquinaUpdate,
    usuario=Depends(require_roles("admin", "jefe_produccion", "jefe_tecnico")),
    db: Session = Depends(get_db),
):
    m = db.query(Maquina).filter(Maquina.id == maquina_id).first()
    if not m:
        raise HTTPException(404, "Máquina no encontrada")

    for field, value in body.model_dump(exclude_none=True).items():
        setattr(m, field, value)

    db.commit()
    db.refresh(m)

    db.add(AuditLog(
        usuario_id=usuario.id,
        accion="actualizar_maquina",
        recurso=f"maquina_{maquina_id}",
        detalles=str(body.model_dump(exclude_none=True)),
    ))
    db.commit()
    return m


@router.get("/{maquina_id}/ciclos", response_model=List[CicloResponse])
def ciclos_de_maquina(
    maquina_id: int,
    limite: int = 100,
    usuario=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    from models import Ciclo
    return (
        db.query(Ciclo)
        .filter(Ciclo.maquina_id == maquina_id)
        .order_by(Ciclo.timestamp.desc())
        .limit(limite)
        .all()
    )
