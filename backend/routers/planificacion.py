"""
routers/planificacion.py - Plan de producción
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from database import get_db
from models import PlanProduccion, Pedido, Maquina
from schemas import PlanCreate, PlanUpdate, PlanResponse
from security import get_current_user

router = APIRouter(prefix="/api/plan", tags=["Planificación"])


@router.get("", response_model=List[PlanResponse])
def listar_plan(
    usuario=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return db.query(PlanProduccion).order_by(PlanProduccion.orden).all()


def _maquina_libre(maquina_id: int, db, excluir_plan_id: int = None):
    """Devuelve True si la máquina no tiene planes activos (planificado/en_curso)."""
    q = db.query(PlanProduccion).filter(
        PlanProduccion.maquina_id == maquina_id,
        PlanProduccion.estado.in_(["planificado", "en_curso"]),
    )
    if excluir_plan_id:
        q = q.filter(PlanProduccion.id != excluir_plan_id)
    return q.count() == 0


@router.post("", response_model=PlanResponse, status_code=201)
def asignar(
    body: PlanCreate,
    usuario=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if not db.query(Pedido).filter(Pedido.id == body.pedido_id).first():
        raise HTTPException(404, "Pedido no encontrado")
    maquina = db.query(Maquina).filter(Maquina.id == body.maquina_id).first()
    if not maquina:
        raise HTTPException(404, "Máquina no encontrada")

    max_orden = db.query(PlanProduccion).count()
    data = body.model_dump()
    data["orden"] = data["orden"] if data["orden"] else max_orden + 1
    plan = PlanProduccion(**data, creado_por=usuario.id)
    db.add(plan)

    # Poner máquina en planificado y pedido planificado
    maquina.estado = "planificado"
    pedido_obj = db.query(Pedido).filter(Pedido.id == body.pedido_id).first()
    if pedido_obj and pedido_obj.estado in ("en_espera", "pendiente"):
        pedido_obj.estado = "planificado"

    db.commit()
    db.refresh(plan)
    return plan


@router.patch("/{plan_id}", response_model=PlanResponse)
def actualizar_plan(
    plan_id: int,
    body: PlanUpdate,
    usuario=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    plan = db.query(PlanProduccion).filter(PlanProduccion.id == plan_id).first()
    if not plan:
        raise HTTPException(404, "Entrada de plan no encontrada")

    for k, v in body.model_dump(exclude_none=True).items():
        setattr(plan, k, v)

    # Sincronizar estado del pedido con el estado del plan
    _ESTADO_PEDIDO = {
        "planificado": "planificado",
        "en_curso":    "en_curso",
        "completado":  "completado",
    }
    if body.estado in _ESTADO_PEDIDO:
        pedido = db.query(Pedido).filter(Pedido.id == plan.pedido_id).first()
        if pedido:
            pedido.estado = _ESTADO_PEDIDO[body.estado]

    # Sincronizar estado máquina con estado plan
    maquina_sync = db.query(Maquina).filter(Maquina.id == plan.maquina_id).first()
    if maquina_sync:
        if body.estado == "completado":
            maquina_sync.estado = "operativa" if _maquina_libre(plan.maquina_id, db, excluir_plan_id=plan_id) else "planificado"
        elif body.estado == "en_curso":
            maquina_sync.estado = "en_curso"
        elif body.estado == "planificado":
            maquina_sync.estado = "planificado"

    db.commit()
    db.refresh(plan)
    return plan


@router.delete("/{plan_id}")
def quitar_del_plan(
    plan_id: int,
    usuario=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    plan = db.query(PlanProduccion).filter(PlanProduccion.id == plan_id).first()
    if not plan:
        raise HTTPException(404, "Entrada de plan no encontrada")

    maquina_id = plan.maquina_id
    db.delete(plan)
    db.flush()

    # Si no quedan planes activos → en_espera
    if _maquina_libre(maquina_id, db):
        maquina = db.query(Maquina).filter(Maquina.id == maquina_id).first()
        if maquina:
            maquina.estado = "en_espera"

    db.commit()
    return {"mensaje": "Quitado del plan"}
