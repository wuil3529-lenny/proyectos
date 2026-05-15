"""
routers/inspector.py - Inspector de producción: cierres de turno y mediciones
"""

import json
from math import ceil
from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from database import get_db
from models import CierreTurno, MedicionProduccion, Maquina, Usuario, PlanProduccion, Pedido
from schemas import CierreTurnoCreate, CierreTurnoResponse, MedicionCreate, MedicionResponse
from security import get_current_user

router = APIRouter(prefix="/api/inspector", tags=["Inspector"])

VE = timezone(timedelta(hours=-4))


def _enrich_cierres(items, db):
    maq_ids = {i.maquina_id for i in items}
    usr_ids = {i.inspector_id for i in items}
    maquinas = {m.id: m.nombre for m in db.query(Maquina).filter(Maquina.id.in_(maq_ids)).all()}
    usuarios = {u.id: u.nombre_completo for u in db.query(Usuario).filter(Usuario.id.in_(usr_ids)).all()}
    result = []
    for item in items:
        d = CierreTurnoResponse.model_validate(item).model_dump()
        d["maquina_nombre"] = maquinas.get(item.maquina_id)
        d["inspector_nombre"] = usuarios.get(item.inspector_id)
        result.append(CierreTurnoResponse(**d))
    return result


def _enrich_mediciones(items, db):
    maq_ids = {i.maquina_id for i in items}
    usr_ids = {i.inspector_id for i in items}
    maquinas = {m.id: m.nombre for m in db.query(Maquina).filter(Maquina.id.in_(maq_ids)).all()}
    usuarios = {u.id: u.nombre_completo for u in db.query(Usuario).filter(Usuario.id.in_(usr_ids)).all()}

    plan_ids = {i.plan_id for i in items if i.plan_id}
    planes = {p.id: p for p in db.query(PlanProduccion).filter(PlanProduccion.id.in_(plan_ids)).all()} if plan_ids else {}
    pedido_ids = {p.pedido_id for p in planes.values() if p.pedido_id}
    pedidos = {p.id: p for p in db.query(Pedido).filter(Pedido.id.in_(pedido_ids)).all()} if pedido_ids else {}

    result = []
    for item in items:
        d = MedicionResponse.model_validate(item).model_dump()
        d["maquina_nombre"] = maquinas.get(item.maquina_id)
        d["inspector_nombre"] = usuarios.get(item.inspector_id)

        plan = planes.get(item.plan_id) if item.plan_id else None
        if plan and item.tiempo_ciclo_seg and item.tiempo_ciclo_seg > 0:
            cavidades = plan.cavidades_arranque or 1
            d["cavidades"] = cavidades
            d["piezas_por_hora"] = round((cavidades * 3600) / item.tiempo_ciclo_seg, 1)

            pedido = pedidos.get(plan.pedido_id) if plan.pedido_id else None
            if pedido and pedido.cantidad_unidades:
                faltante = max(0, pedido.cantidad_unidades - (plan.envases_producidos or 0))
                d["faltante"] = faltante
                ciclos_restantes = ceil(faltante / cavidades)
                d["tiempo_restante_min"] = round((ciclos_restantes * item.tiempo_ciclo_seg) / 60, 1)

        result.append(MedicionResponse(**d))
    return result


@router.get("/cierres", response_model=List[CierreTurnoResponse])
def listar_cierres(
    fecha: str = None,
    maquina_id: int = None,
    usuario=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    q = db.query(CierreTurno).order_by(CierreTurno.fecha_registro.desc())
    if fecha:
        q = q.filter(CierreTurno.fecha_turno == fecha)
    if maquina_id:
        q = q.filter(CierreTurno.maquina_id == maquina_id)
    items = q.limit(200).all()
    return _enrich_cierres(items, db)


@router.post("/cierres", response_model=CierreTurnoResponse, status_code=201)
def crear_cierre(
    body: CierreTurnoCreate,
    usuario=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    # Validar: solo un cierre por turno por plan
    if body.plan_id and body.turno:
        cierre_existente = db.query(CierreTurno).filter(
            CierreTurno.plan_id == body.plan_id,
            CierreTurno.turno == body.turno,
        ).first()
        if cierre_existente:
            raise HTTPException(400, f"Ya existe un cierre registrado para el turno '{body.turno}' en este plan.")

    # Validar: plan no completado
    if body.plan_id:
        plan_check = db.query(PlanProduccion).filter(PlanProduccion.id == body.plan_id).first()
        if plan_check and plan_check.estado == "completado":
            raise HTTPException(400, "No se puede registrar un cierre: la producción ya fue completada.")

    defectos_json = json.dumps([d.model_dump() for d in body.defectos]) if body.defectos else None
    paradas_json = json.dumps([p.model_dump() for p in body.paradas]) if body.paradas else None
    cierre = CierreTurno(
        maquina_id=body.maquina_id,
        plan_id=body.plan_id,
        turno=body.turno,
        fecha_turno=body.fecha_turno,
        operador_nombre=body.operador_nombre,
        envases_buenos=body.envases_buenos,
        defectos=defectos_json,
        paradas=paradas_json,
        notas=body.notas,
        inspector_id=usuario.id,
    )
    db.add(cierre)
    db.flush()  # obtener ID sin commit

    # Propagar acumulado al plan para que Dashboard y Datos estén actualizados
    if body.plan_id:
        plan = db.query(PlanProduccion).filter(PlanProduccion.id == body.plan_id).first()
        if plan:
            # Sumar todos los cierres anteriores + este
            cierres_plan = db.query(CierreTurno).filter(
                CierreTurno.plan_id == body.plan_id,
                CierreTurno.id != cierre.id,
            ).all()
            total_buenos = body.envases_buenos + sum(c.envases_buenos for c in cierres_plan)

            # Total rechazos: sumar defectos de todos los cierres
            total_rechazo = sum(d.cantidad for d in body.defectos) if body.defectos else 0
            for c in cierres_plan:
                try:
                    defs = json.loads(c.defectos or "[]")
                    total_rechazo += sum(d.get("cantidad", 0) for d in defs)
                except Exception:
                    pass

            total_producido = total_buenos + total_rechazo
            plan.envases_producidos = total_buenos
            plan.indice_rechazo = round((total_rechazo / total_producido) * 100, 2) if total_producido > 0 else 0
            plan.inspector_produccion_id = usuario.id

            # Kg consumidos acumulado
            if plan.peso_bruto_arranque and total_producido > 0:
                plan.kg_consumidos = round(total_producido * plan.peso_bruto_arranque, 3)

            # Auto-completar si se alcanzó la meta de unidades
            pedido_obj = db.query(Pedido).filter(Pedido.id == plan.pedido_id).first()
            meta = pedido_obj.cantidad_unidades if pedido_obj else None
            if meta and total_buenos >= meta:
                plan.estado = "completado"
                plan.hora_finalizacion = datetime.utcnow()
                # Máquina vuelve a operativa
                maq = db.query(Maquina).filter(Maquina.id == plan.maquina_id).first()
                if maq:
                    maq.estado = "operativa"
                # Pedido pasa a completado
                if pedido_obj:
                    pedido_obj.estado = "completado"

    db.commit()
    db.refresh(cierre)
    return _enrich_cierres([cierre], db)[0]


@router.get("/mediciones", response_model=List[MedicionResponse])
def listar_mediciones(
    fecha: str = None,
    maquina_id: int = None,
    plan_id: int = None,
    usuario=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    q = db.query(MedicionProduccion).order_by(MedicionProduccion.fecha_registro.desc())
    if fecha:
        # fecha_registro se guarda en UTC; VE = UTC-4, así que un día VE va de 04:00 UTC a 03:59 UTC siguiente
        start_utc = datetime.strptime(fecha, "%Y-%m-%d") + timedelta(hours=4)
        end_utc = start_utc + timedelta(hours=24)
        q = q.filter(MedicionProduccion.fecha_registro >= start_utc,
                     MedicionProduccion.fecha_registro < end_utc)
    if maquina_id:
        q = q.filter(MedicionProduccion.maquina_id == maquina_id)
    if plan_id:
        q = q.filter(MedicionProduccion.plan_id == plan_id)
    items = q.limit(200).all()
    return _enrich_mediciones(items, db)


@router.post("/mediciones", response_model=MedicionResponse, status_code=201)
def crear_medicion(
    body: MedicionCreate,
    usuario=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    defectos_json = json.dumps([d.model_dump() for d in body.defectos]) if body.defectos else None
    med = MedicionProduccion(
        maquina_id=body.maquina_id,
        plan_id=body.plan_id,
        tipo=body.tipo,
        tiempo_ciclo_seg=body.tiempo_ciclo_seg,
        peso_gramos=body.peso_gramos,
        temperatura=body.temperatura,
        peso_neto_gramos=body.peso_neto_gramos,
        peso_bruto_gramos=body.peso_bruto_gramos,
        defectos=defectos_json,
        inspector_id=usuario.id,
    )
    db.add(med)

    # Si es arranque → validar que no haya uno previo
    if body.tipo == "arranque" and body.plan_id:
        ya_existe = db.query(MedicionProduccion).filter(
            MedicionProduccion.plan_id == body.plan_id,
            MedicionProduccion.tipo == "arranque"
        ).first()
        if ya_existe:
            raise HTTPException(400, "Este plan ya tiene un arranque registrado. No se puede registrar otro.")

    if body.tipo == "arranque" and body.plan_id:
        plan = db.query(PlanProduccion).filter(PlanProduccion.id == body.plan_id).first()
        if plan:
            if plan.estado == "planificado":
                plan.estado = "en_curso"
                plan.hora_arranque = datetime.utcnow()
            # Propagar al plan para que Dashboard y Datos puedan calcular
            if body.peso_bruto_gramos is not None:
                plan.peso_bruto_arranque = body.peso_bruto_gramos / 1000  # g → kg
            if body.cavidades is not None:
                plan.cavidades_arranque = body.cavidades
            # Sincronizar máquina a en_curso
            maquina = db.query(Maquina).filter(Maquina.id == plan.maquina_id).first()
            if maquina:
                maquina.estado = "en_curso"
            # Sincronizar pedido a en_curso
            if plan.pedido_id:
                pedido = db.query(Pedido).filter(Pedido.id == plan.pedido_id).first()
                if pedido and pedido.estado not in ("en_curso", "completado", "entregado", "cancelado"):
                    pedido.estado = "en_curso"
    db.commit()
    db.refresh(med)
    return _enrich_mediciones([med], db)[0]
