"""
routers/defectos.py - Registro y consulta de defectos
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from database import get_db
from models import Defecto, Ciclo, Alerta, AuditLog
from schemas import DefectoCreate, DefectoResponse
from security import require_roles, get_current_user

router = APIRouter(prefix="/api/defectos", tags=["Defectos"])

UMBRAL_DEFECTO_WARNING = 0.05   # 5% piezas defectuosas → warning
UMBRAL_DEFECTO_CRITICAL = 0.10  # 10%                   → critical


@router.post("", response_model=DefectoResponse, status_code=201)
def registrar_defecto(
    body: DefectoCreate,
    usuario=Depends(require_roles("inspector_calidad", "jefe_calidad")),
    db: Session = Depends(get_db),
):
    """
    Registra un defecto en un ciclo.
    Genera alerta automática si el porcentaje de defectos supera umbral.
    """
    ciclo = db.query(Ciclo).filter(Ciclo.id == body.ciclo_id).first()
    if not ciclo:
        raise HTTPException(404, "Ciclo no encontrado")

    defecto = Defecto(
        ciclo_id=body.ciclo_id,
        tipo=body.tipo,
        severidad=body.severidad,
        cantidad=body.cantidad,
        observaciones=body.observaciones,
        foto_url=body.foto_url,
        inspeccionado_por=usuario.id,
    )
    db.add(defecto)
    db.commit()
    db.refresh(defecto)

    # ── Calcular porcentaje acumulado de defectos del ciclo ───────
    total_defectos = sum(d.cantidad for d in ciclo.defectos)
    pct = total_defectos / ciclo.cantidad_piezas if ciclo.cantidad_piezas > 0 else 0

    if pct >= UMBRAL_DEFECTO_CRITICAL:
        db.add(Alerta(
            nivel="critical",
            tipo="defecto_critico",
            descripcion=f"Ciclo {ciclo.id} en máquina {ciclo.maquina_id}: "
                        f"{pct*100:.1f}% piezas defectuosas — PARAR PRODUCCIÓN",
            maquina_id=ciclo.maquina_id,
            ciclo_id=ciclo.id,
        ))
        db.commit()
    elif pct >= UMBRAL_DEFECTO_WARNING:
        db.add(Alerta(
            nivel="warning",
            tipo="defecto_alto",
            descripcion=f"Ciclo {ciclo.id}: {pct*100:.1f}% defectos (umbral 5%)",
            maquina_id=ciclo.maquina_id,
            ciclo_id=ciclo.id,
        ))
        db.commit()

    db.add(AuditLog(
        usuario_id=usuario.id,
        accion="registrar_defecto",
        recurso=f"defecto_{defecto.id}",
        detalles=f"ciclo={ciclo.id}, tipo={defecto.tipo}, severidad={defecto.severidad}, qty={defecto.cantidad}",
    ))
    db.commit()

    return defecto


@router.get("", response_model=List[DefectoResponse])
def listar_defectos(
    ciclo_id: int = None,
    limite: int = 50,
    usuario=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    q = db.query(Defecto).order_by(Defecto.fecha.desc())
    if ciclo_id:
        q = q.filter(Defecto.ciclo_id == ciclo_id)
    return q.limit(min(limite, 500)).all()
