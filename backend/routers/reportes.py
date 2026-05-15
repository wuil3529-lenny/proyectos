"""
routers/reportes.py - Generación y consulta de reportes
"""

from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func
from sqlalchemy.orm import Session
from typing import List

from database import get_db
from models import Ciclo, Defecto, Alerta, Reporte, AuditLog, PlanProduccion
from schemas import ReporteRequest, MetricasProduccion
from security import get_current_user, require_roles

router = APIRouter(prefix="/api/reportes", tags=["Reportes"])


def _calcular_metricas(db: Session, fecha_inicio: datetime, fecha_fin: datetime) -> dict:
    # Leer de PlanProduccion completados en el rango de fechas
    planes = (
        db.query(PlanProduccion)
        .filter(
            PlanProduccion.estado == "completado",
            PlanProduccion.hora_finalizacion >= fecha_inicio,
            PlanProduccion.hora_finalizacion <= fecha_fin,
        )
        .all()
    )

    total_piezas_buenas = sum(p.envases_producidos or 0 for p in planes)
    total_rechazados = sum(
        round((p.envases_producidos or 0) * (p.indice_rechazo or 0) / 100)
        for p in planes
    )
    total_piezas = total_piezas_buenas + total_rechazados
    total_kg = sum(p.kg_consumidos or 0 for p in planes)

    pct_defectos = round(total_rechazados / total_piezas * 100, 2) if total_piezas > 0 else 0.0
    oee = round(total_piezas_buenas / total_piezas * 100, 2) if total_piezas > 0 else 0.0

    alertas_activas = (
        db.query(func.count(Alerta.id))
        .filter(Alerta.resuelta == False)
        .scalar()
    )

    from collections import Counter
    maquinas_counter = Counter(p.maquina_id for p in planes if p.maquina_id)
    maquinas_lentas = [
        {"maquina_id": mid, "total_ciclos": cnt}
        for mid, cnt in maquinas_counter.most_common(3)
    ]

    return {
        "fecha_inicio": fecha_inicio,
        "fecha_fin": fecha_fin,
        "total_kg_producido": round(total_kg, 2),
        "total_piezas": total_piezas,
        "total_ciclos": len(planes),
        "total_defectos": total_rechazados,
        "porcentaje_defectos": pct_defectos,
        "oee": oee,
        "alertas_activas": alertas_activas,
        "maquinas_lentas": maquinas_lentas,
    }


@router.get("/diario", response_model=MetricasProduccion)
def reporte_diario(
    fecha: str = None,
    usuario=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Métricas del día. Si no se pasa fecha, usa hoy.
    Formato fecha: YYYY-MM-DD
    """
    if fecha:
        try:
            dia = datetime.strptime(fecha, "%Y-%m-%d")
        except ValueError:
            raise HTTPException(400, "Formato de fecha inválido. Usar: YYYY-MM-DD")
    else:
        dia = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)

    fin = dia.replace(hour=23, minute=59, second=59)
    return _calcular_metricas(db, dia, fin)


@router.post("/generar", response_model=MetricasProduccion)
def generar_reporte(
    body: ReporteRequest,
    usuario=Depends(require_roles("jefe_produccion", "jefe_calidad", "admin")),
    db: Session = Depends(get_db),
):
    """
    Genera un reporte en el rango de fechas dado.
    Actualmente retorna métricas en JSON (PDF/Excel en próxima versión).
    """
    if body.fecha_inicio > body.fecha_fin:
        raise HTTPException(400, "fecha_inicio debe ser anterior a fecha_fin")

    metricas = _calcular_metricas(db, body.fecha_inicio, body.fecha_fin)

    import json
    reporte = Reporte(
        fecha=body.fecha_inicio,
        tipo=body.tipo,
        metricas_json=json.dumps(metricas, default=str),
        generado_por=str(usuario.id),
    )
    db.add(reporte)
    db.commit()

    db.add(AuditLog(
        usuario_id=usuario.id,
        accion="generar_reporte",
        recurso=f"reporte_{reporte.id}",
        detalles=f"tipo={body.tipo}, desde={body.fecha_inicio}, hasta={body.fecha_fin}",
    ))
    db.commit()

    return metricas
