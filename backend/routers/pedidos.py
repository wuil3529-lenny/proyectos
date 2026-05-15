"""
routers/pedidos.py - CRUD de pedidos (ventas)
"""

import random
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from database import get_db
from models import Pedido, PlanProduccion
from schemas import PedidoCreate, PedidoUpdate, PedidoResponse
from security import get_current_user

router = APIRouter(prefix="/api/pedidos", tags=["Pedidos"])


@router.get("", response_model=List[PedidoResponse])
def listar_pedidos(
    usuario=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return db.query(Pedido).order_by(Pedido.fecha_creacion.desc()).all()


@router.post("", response_model=PedidoResponse, status_code=201)
def crear_pedido(
    body: PedidoCreate,
    usuario=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    numero_pedido = body.numero_pedido or f"PED-{random.randint(1000, 9999)}"
    data = body.model_dump(exclude={"numero_pedido"})
    p = Pedido(**data, creado_por=usuario.id, numero_pedido=numero_pedido)
    db.add(p)
    db.commit()
    db.refresh(p)
    return p


@router.patch("/{pedido_id}", response_model=PedidoResponse)
def actualizar_pedido(
    pedido_id: int,
    body: PedidoUpdate,
    usuario=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    p = db.query(Pedido).filter(Pedido.id == pedido_id).first()
    if not p:
        raise HTTPException(404, "Pedido no encontrado")
    datos = body.model_dump(exclude_none=True)
    for k, v in datos.items():
        setattr(p, k, v)
    # Sincronizar plan cuando el pedido se marca completado
    if datos.get("estado") == "completado":
        db.query(PlanProduccion).filter(
            PlanProduccion.pedido_id == pedido_id,
            PlanProduccion.estado != "completado",
        ).update({"estado": "completado"})
    db.commit()
    db.refresh(p)
    return p


@router.delete("/{pedido_id}")
def eliminar_pedido(
    pedido_id: int,
    usuario=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    p = db.query(Pedido).filter(Pedido.id == pedido_id).first()
    if not p:
        raise HTTPException(404, "Pedido no encontrado")
    db.delete(p)
    db.commit()
    return {"mensaje": "Pedido eliminado"}
