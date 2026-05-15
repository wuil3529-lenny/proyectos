"""
routers/materiales.py - Catálogo de resinas y colorantes (logística)
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from database import get_db
from models import Material
from schemas import MaterialCreate, MaterialUpdate, MaterialResponse, MaterialConsumir
from security import get_current_user

router = APIRouter(prefix="/api/materiales", tags=["Materiales"])


@router.get("", response_model=List[MaterialResponse])
def listar(
    solo_activos: bool = False,
    usuario=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    q = db.query(Material)
    if solo_activos:
        q = q.filter(Material.activo == True)
    return q.order_by(Material.fecha_creacion.desc()).all()


@router.post("", response_model=MaterialResponse, status_code=201)
def crear(
    body: MaterialCreate,
    usuario=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    data = body.model_dump()
    if data.get("stock_inicial") is not None:
        data["stock_disponible"] = data["stock_inicial"]
    m = Material(**data, registrado_por=usuario.id)
    db.add(m)
    db.commit()
    db.refresh(m)
    return m


@router.patch("/{mat_id}", response_model=MaterialResponse)
def actualizar(
    mat_id: int,
    body: MaterialUpdate,
    usuario=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    m = db.query(Material).filter(Material.id == mat_id).first()
    if not m:
        raise HTTPException(404, "Material no encontrado")
    updates = body.model_dump(exclude_none=True)
    for k, v in updates.items():
        setattr(m, k, v)
    if "stock_inicial" in updates:
        m.stock_disponible = updates["stock_inicial"]
    db.commit()
    db.refresh(m)
    return m


@router.post("/{mat_id}/consumir", response_model=MaterialResponse)
def consumir(
    mat_id: int,
    body: MaterialConsumir,
    usuario=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    m = db.query(Material).filter(Material.id == mat_id).first()
    if not m:
        raise HTTPException(404, "Material no encontrado")
    if m.stock_disponible is None:
        raise HTTPException(400, "Este material no tiene stock registrado")
    nuevo = m.stock_disponible - body.cantidad
    if nuevo < 0:
        raise HTTPException(400, f"Stock insuficiente (disponible: {m.stock_disponible} {m.unidad or ''})")
    m.stock_disponible = nuevo
    db.commit()
    db.refresh(m)
    return m


@router.delete("/{mat_id}")
def eliminar(
    mat_id: int,
    usuario=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    m = db.query(Material).filter(Material.id == mat_id).first()
    if not m:
        raise HTTPException(404, "Material no encontrado")
    db.delete(m)
    db.commit()
    return {"mensaje": "Material eliminado"}
