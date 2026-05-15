"""
routers/ciclos.py - Registro y consulta de ciclos de producción
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional

from database import get_db
from models import Ciclo, Maquina, Alerta, AuditLog
from schemas import CicloCreate, CicloResponse
from security import get_current_user, require_roles

router = APIRouter(prefix="/api/ciclos", tags=["Ciclos"])

UMBRAL_PESO_ANOMALO = 0.10    # 10% de desviación del promedio
UMBRAL_DEFECTO_CRITICO = 0.05  # 5% de piezas defectuosas


def _generar_alerta(db: Session, nivel: str, tipo: str, descripcion: str,
                    maquina_id: int = None, ciclo_id: int = None):
    db.add(Alerta(
        nivel=nivel, tipo=tipo, descripcion=descripcion,
        maquina_id=maquina_id, ciclo_id=ciclo_id,
    ))
    db.commit()


@router.post("/registrar", response_model=CicloResponse, status_code=201)
def registrar_ciclo(
    body: CicloCreate,
    usuario=Depends(require_roles("inspector_produccion", "jefe_produccion")),
    db: Session = Depends(get_db),
):
    """
    Registra un nuevo ciclo.
    Genera alerta automática si el peso está fuera de rango (±10%).
    """
    maquina = db.query(Maquina).filter(Maquina.id == body.maquina_id).first()
    if not maquina:
        raise HTTPException(404, "Máquina no encontrada")
    if maquina.estado == "falla":
        raise HTTPException(409, f"Máquina '{maquina.nombre}' está en estado de FALLA")

    ciclo = Ciclo(
        maquina_id=body.maquina_id,
        numero_ciclo=body.numero_ciclo,
        peso_kg=body.peso_kg,
        cantidad_piezas=body.cantidad_piezas,
        temperatura_proceso=body.temperatura_proceso,
        inspector_id=usuario.id,
        modo_prueba=body.modo_prueba,
        observaciones=body.observaciones,
    )
    db.add(ciclo)
    db.commit()
    db.refresh(ciclo)

    # ── Alerta: peso anómalo ──────────────────────────────────────
    if not body.modo_prueba:
        ultimos = (
            db.query(Ciclo)
            .filter(Ciclo.maquina_id == maquina.id, Ciclo.id != ciclo.id, Ciclo.modo_prueba == False)
            .order_by(Ciclo.timestamp.desc())
            .limit(10)
            .all()
        )
        if ultimos:
            promedios = [c.peso_kg / c.cantidad_piezas for c in ultimos]
            prom = sum(promedios) / len(promedios)
            actual = ciclo.peso_kg / ciclo.cantidad_piezas
            diff = abs(actual - prom) / prom
            if diff > UMBRAL_PESO_ANOMALO:
                _generar_alerta(
                    db, "warning", "peso_anomalo",
                    f"{maquina.nombre}: peso/pieza {diff*100:.1f}% fuera del promedio "
                    f"(esperado {prom:.3f} kg, registrado {actual:.3f} kg)",
                    maquina_id=maquina.id, ciclo_id=ciclo.id,
                )

    # ── Actualizar contador de ciclos ─────────────────────────────
    maquina.ciclos_totales += 1
    db.commit()

    # ── Audit log ─────────────────────────────────────────────────
    db.add(AuditLog(
        usuario_id=usuario.id,
        accion="registrar_ciclo",
        recurso=f"ciclo_{ciclo.id}",
        detalles=f"máquina={maquina.nombre}, piezas={ciclo.cantidad_piezas}, kg={ciclo.peso_kg}",
    ))
    db.commit()

    return ciclo


@router.get("", response_model=List[CicloResponse])
def listar_ciclos(
    maquina_id: Optional[int] = None,
    limite: int = 50,
    usuario=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Lista ciclos, opcionalmente filtrados por máquina."""
    q = db.query(Ciclo).order_by(Ciclo.timestamp.desc())
    if maquina_id:
        q = q.filter(Ciclo.maquina_id == maquina_id)
    return q.limit(min(limite, 500)).all()


@router.get("/{ciclo_id}", response_model=CicloResponse)
def detalle_ciclo(
    ciclo_id: int,
    usuario=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    ciclo = db.query(Ciclo).filter(Ciclo.id == ciclo_id).first()
    if not ciclo:
        raise HTTPException(404, "Ciclo no encontrado")
    return ciclo
