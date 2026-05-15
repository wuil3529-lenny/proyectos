"""
routers/productos.py - CRUD de productos
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from database import get_db
from models import Producto, PlanProduccion, Pedido
from schemas import ProductoCreate, ProductoUpdate, ProductoResponse
from security import get_current_user

router = APIRouter(prefix="/api/productos", tags=["Productos"])


@router.get("", response_model=List[ProductoResponse])
def listar_productos(
    usuario=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return db.query(Producto).order_by(Producto.nombre).all()


@router.post("", response_model=ProductoResponse, status_code=201)
def crear_producto(
    body: ProductoCreate,
    usuario=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    p = Producto(**body.model_dump())
    db.add(p)
    db.commit()
    db.refresh(p)
    return p


@router.patch("/{producto_id}", response_model=ProductoResponse)
def actualizar_producto(
    producto_id: int,
    body: ProductoUpdate,
    usuario=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    p = db.query(Producto).filter(Producto.id == producto_id).first()
    if not p:
        raise HTTPException(404, "Producto no encontrado")
    data = body.model_dump(exclude_none=True)
    for k, v in data.items():
        setattr(p, k, v)

    # Propagar cambios a planes activos (planificado o en_curso) vinculados a este producto
    pedidos_ids = [
        ped.id for ped in db.query(Pedido).filter(Pedido.producto_id == producto_id).all()
    ]
    if pedidos_ids:
        planes_activos = db.query(PlanProduccion).filter(
            PlanProduccion.pedido_id.in_(pedidos_ids),
            PlanProduccion.estado.in_(["planificado", "en_curso"]),
        ).all()
        peso_bruto_promedio = round((p.peso_bruto_min + p.peso_bruto_max) / 2, 6)
        temp_promedio = round((p.temp_min + p.temp_max) / 2, 1)
        for plan in planes_activos:
            plan.cavidades_arranque   = p.cavidades
            plan.peso_bruto_arranque  = peso_bruto_promedio
            plan.temperatura_referencia = temp_promedio

    db.commit()
    db.refresh(p)
    return p


@router.delete("/{producto_id}")
def eliminar_producto(
    producto_id: int,
    usuario=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    p = db.query(Producto).filter(Producto.id == producto_id).first()
    if not p:
        raise HTTPException(404, "Producto no encontrado")
    db.delete(p)
    db.commit()
    return {"mensaje": "Producto eliminado"}
