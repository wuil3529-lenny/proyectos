"""
routers/alertas.py - Gestión de alertas
"""

from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from database import get_db
from models import Alerta, AuditLog, Usuario
from schemas import AlertaResponse, AlertaCreate, AlertaResolverBody
from security import get_current_user, require_roles

router = APIRouter(prefix="/api/alertas", tags=["Alertas"])


@router.get("", response_model=List[AlertaResponse])
def listar_alertas(
    no_resueltas: bool = False,
    nivel: str = None,
    limite: int = 100,
    usuario=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Lista alertas. Filtros: no_resueltas, nivel (info/warning/critical)."""
    q = db.query(Alerta).order_by(Alerta.fecha_generacion.desc())
    if no_resueltas:
        q = q.filter(Alerta.resuelta == False)
    if nivel:
        q = q.filter(Alerta.nivel == nivel)
    alertas = q.limit(min(limite, 500)).all()

    user_ids = {a.quien_resolvio for a in alertas if a.quien_resolvio}
    nombres = {}
    if user_ids:
        for u in db.query(Usuario).filter(Usuario.id.in_(user_ids)).all():
            nombres[u.id] = u.nombre_completo

    result = []
    for a in alertas:
        d = AlertaResponse.model_validate(a).model_dump()
        d["nombre_resolvio"] = nombres.get(a.quien_resolvio) if a.quien_resolvio else None
        result.append(AlertaResponse(**d))
    return result


@router.post("", response_model=AlertaResponse, status_code=201)
def crear_alerta(
    body: AlertaCreate,
    usuario=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Crea una alerta manualmente."""
    niveles_validos = {"info", "warning", "critical"}
    if body.nivel not in niveles_validos:
        raise HTTPException(422, f"Nivel debe ser: {niveles_validos}")

    alerta = Alerta(
        nivel=body.nivel,
        tipo=body.tipo or "general",
        descripcion=body.descripcion,
        maquina_id=body.maquina_id,
        tipo_rechazo=body.tipo_rechazo,
        tiempo_estimado_horas=body.tiempo_estimado_horas,
    )
    db.add(alerta)
    db.commit()
    db.refresh(alerta)
    return alerta


@router.get("/{alerta_id}", response_model=AlertaResponse)
def detalle_alerta(
    alerta_id: int,
    usuario=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    a = db.query(Alerta).filter(Alerta.id == alerta_id).first()
    if not a:
        raise HTTPException(404, "Alerta no encontrada")
    return a


@router.post("/{alerta_id}/resolver")
def resolver_alerta(
    alerta_id: int,
    body: AlertaResolverBody = None,
    usuario=Depends(require_roles("jefe_produccion", "jefe_calidad")),
    db: Session = Depends(get_db),
):
    """Marca una alerta como resuelta."""
    a = db.query(Alerta).filter(Alerta.id == alerta_id).first()
    if not a:
        raise HTTPException(404, "Alerta no encontrada")
    if a.resuelta:
        raise HTTPException(409, "La alerta ya fue resuelta")

    a.resuelta = True
    a.quien_resolvio = usuario.id
    a.fecha_resolucion = datetime.utcnow()
    if body and body.notas_resolucion:
        a.notas_resolucion = body.notas_resolucion
    db.commit()

    db.add(AuditLog(
        usuario_id=usuario.id,
        accion="resolver_alerta",
        recurso=f"alerta_{alerta_id}",
        detalles=f"tipo={a.tipo} | notas={a.notas_resolucion or ''}",
    ))
    db.commit()

    return {"mensaje": f"Alerta {alerta_id} resuelta"}
