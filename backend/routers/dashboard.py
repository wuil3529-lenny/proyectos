"""
routers/dashboard.py - Endpoints consolidados para el dashboard
"""

from datetime import datetime
from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlalchemy.orm import Session

from database import get_db
from models import Ciclo, Defecto, Alerta, Maquina, Usuario
from security import get_current_user

router = APIRouter(prefix="/api/dashboard", tags=["Dashboard"])


@router.get("/vision-general")
def vision_general(
    usuario=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Todo lo que necesita el dashboard en una sola llamada:
    métricas del día, alertas activas, estado máquinas, resumen usuarios.
    """
    hoy = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    fin = hoy.replace(hour=23, minute=59, second=59)

    ciclos = (
        db.query(Ciclo)
        .filter(Ciclo.timestamp >= hoy, Ciclo.timestamp <= fin, Ciclo.modo_prueba == False)
        .all()
    )
    total_piezas = sum(c.cantidad_piezas for c in ciclos)
    total_kg = sum(c.peso_kg for c in ciclos)
    ciclo_ids = [c.id for c in ciclos]

    defectos = db.query(Defecto).filter(Defecto.ciclo_id.in_(ciclo_ids)).all() if ciclo_ids else []
    total_defectos = sum(d.cantidad for d in defectos)
    pct_defectos = round(total_defectos / total_piezas * 100, 2) if total_piezas > 0 else 0.0
    oee = round((total_piezas - total_defectos) / total_piezas * 100, 2) if total_piezas > 0 else 0.0

    alertas_activas = db.query(func.count(Alerta.id)).filter(Alerta.resuelta == False).scalar()
    alertas = (
        db.query(Alerta)
        .filter(Alerta.resuelta == False)
        .order_by(Alerta.fecha_generacion.desc())
        .limit(5)
        .all()
    )

    maquinas = db.query(Maquina).order_by(Maquina.nombre).all()
    estados = {"operativa": 0, "mantenimiento": 0, "falla": 0}
    for m in maquinas:
        if m.estado in estados:
            estados[m.estado] += 1

    return {
        "metricas": {
            "fecha": hoy.date().isoformat(),
            "total_kg_producido": round(total_kg, 2),
            "total_piezas": total_piezas,
            "total_ciclos": len(ciclos),
            "total_defectos": total_defectos,
            "porcentaje_defectos": pct_defectos,
            "oee": oee,
            "alertas_activas": alertas_activas,
        },
        "alertas": [
            {
                "id": a.id,
                "nivel": a.nivel,
                "tipo": a.tipo,
                "descripcion": a.descripcion,
                "fecha_generacion": a.fecha_generacion,
            }
            for a in alertas
        ],
        "maquinas_estado": {
            "total": len(maquinas),
            **estados,
        },
    }
