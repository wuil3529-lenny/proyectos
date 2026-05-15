"""
seed_data.py - Poblar BD con datos de ejemplo para desarrollo/demo

Ejecutar: python seed_data.py
"""

import os
import sys
from datetime import datetime, timedelta
import random

from dotenv import load_dotenv
load_dotenv()

from database import SessionLocal, engine, Base
from models import Usuario, Maquina, Ciclo, Defecto, Alerta
from security import hash_password

Base.metadata.create_all(bind=engine)
db = SessionLocal()


def seed():
    print("🌱 Iniciando seed de datos...")

    # ── Usuarios ──────────────────────────────────────────────────
    usuarios_data = [
        ("admin@fabrica.com", "Admin@123456", "Administrador Sistema", "admin", "Sistemas"),
        ("jefe.prod@fabrica.com", "Prod@123456", "Carlos Mendez", "jefe_produccion", "Producción"),
        ("inspector1@fabrica.com", "Insp@123456", "Ana Torres", "inspector_produccion", "Producción"),
        ("inspector2@fabrica.com", "Insp@123456", "Luis García", "inspector_produccion", "Producción"),
        ("calidad@fabrica.com", "Cal@123456", "María Rodríguez", "inspector_calidad", "Calidad"),
        ("jefe.cal@fabrica.com", "Cal@123456", "Roberto Silva", "jefe_calidad", "Calidad"),
        ("tecnico@fabrica.com", "Tec@123456", "Pedro Alvarez", "jefe_tecnico", "Mantenimiento"),
    ]

    usuarios = {}
    for email, pwd, nombre, rol, depto in usuarios_data:
        if not db.query(Usuario).filter(Usuario.email == email).first():
            u = Usuario(
                email=email,
                password_hash=hash_password(pwd),
                nombre_completo=nombre,
                rol=rol,
                departamento=depto,
            )
            db.add(u)
            db.flush()
            usuarios[rol] = u
            print(f"  ✓ Usuario: {email} ({rol})")
    db.commit()

    # Refrescar para obtener IDs
    for email, _, _, rol, _ in usuarios_data:
        u = db.query(Usuario).filter(Usuario.email == email).first()
        usuarios[rol] = u  # Puede pisar si hay varios con mismo rol, pero ok para seed

    admin = db.query(Usuario).filter(Usuario.rol == "admin").first()
    inspector = db.query(Usuario).filter(Usuario.rol == "inspector_produccion").first()
    cal_inspector = db.query(Usuario).filter(Usuario.rol == "inspector_calidad").first()

    # ── Máquinas ──────────────────────────────────────────────────
    maquinas_data = [
        ("Sopladora 2",  "Sopladora", 45.0),
        ("Sopladora 4",  "Sopladora", 48.0),
        ("Sopladora 5",  "Sopladora", 44.0),
        ("Sopladora 6",  "Sopladora", 46.0),
        ("Sopladora 7",  "Sopladora", 50.0),
        ("Sopladora 8",  "Sopladora", 43.0),
        ("Inyectora 1",  "Inyectora", 60.0),
        ("Inyectora 2",  "Inyectora", 55.0),
        ("Inyectora 3",  "Inyectora", 58.0),
        ("Inyectora 4",  "Inyectora", 62.0),
    ]

    maquinas = []
    for nombre, tipo, std in maquinas_data:
        if not db.query(Maquina).filter(Maquina.nombre == nombre).first():
            m = Maquina(nombre=nombre, tipo=tipo, tiempo_ciclo_estandar=std)
            db.add(m)
            db.flush()
            maquinas.append(m)
            print(f"  ✓ Máquina: {nombre}")
    db.commit()

    if not maquinas:
        maquinas = db.query(Maquina).all()

    # ── Ciclos de los últimos 7 días ──────────────────────────────
    if inspector and maquinas:
        ahora = datetime.utcnow()
        ciclos_creados = 0
        for dia_offset in range(7):
            fecha_dia = ahora - timedelta(days=dia_offset)
            for maquina in maquinas[:5]:  # Solo 5 máquinas para no saturar
                for hora in range(0, 16, 2):  # Cada 2 horas
                    ts = fecha_dia.replace(hour=hora, minute=random.randint(0, 59), second=0)
                    # Variación de ±8% en peso
                    peso_base = maquina.tiempo_ciclo_estandar * 0.9
                    peso = round(peso_base * random.uniform(0.92, 1.08), 2)
                    piezas = random.randint(280, 360)

                    ciclo = Ciclo(
                        maquina_id=maquina.id,
                        numero_ciclo=ciclos_creados + 1,
                        peso_kg=peso,
                        cantidad_piezas=piezas,
                        temperatura_proceso=round(random.uniform(240, 255), 1),
                        inspector_id=inspector.id,
                        timestamp=ts,
                    )
                    db.add(ciclo)
                    ciclos_creados += 1

        db.commit()
        print(f"  ✓ {ciclos_creados} ciclos creados")

    # ── Algunos defectos ──────────────────────────────────────────
    if cal_inspector:
        ciclos_muestra = db.query(Ciclo).order_by(Ciclo.timestamp.desc()).limit(20).all()
        for ciclo in random.sample(ciclos_muestra, min(5, len(ciclos_muestra))):
            d = Defecto(
                ciclo_id=ciclo.id,
                tipo=random.choice(["grieta", "deformacion", "peso"]),
                severidad=random.choice(["menor", "menor", "mayor"]),
                cantidad=random.randint(1, 8),
                inspeccionado_por=cal_inspector.id,
            )
            db.add(d)
        db.commit()
        print("  ✓ Defectos de ejemplo creados")

    # ── Alertas de ejemplo ────────────────────────────────────────
    if maquinas:
        alertas_demo = [
            ("warning", "ciclo_lento", f"{maquinas[0].nombre}: ciclo 12% más lento que promedio", maquinas[0].id),
            ("critical", "defecto_critico", f"{maquinas[1].nombre}: 11% piezas defectuosas — REVISAR", maquinas[1].id),
            ("info", "calibracion_pendiente", f"{maquinas[2].nombre}: calibración vence en 3 días", maquinas[2].id),
        ]
        for nivel, tipo, desc, mid in alertas_demo:
            db.add(Alerta(nivel=nivel, tipo=tipo, descripcion=desc, maquina_id=mid))
        db.commit()
        print("  ✓ Alertas de ejemplo creadas")

    print("\n✅ Seed completado.")
    print("\nCredenciales de acceso:")
    print("  admin@fabrica.com       / Admin@123456  (Administrador)")
    print("  jefe.prod@fabrica.com   / Prod@123456   (Jefe Producción)")
    print("  inspector1@fabrica.com  / Insp@123456   (Inspector Producción)")
    print("  calidad@fabrica.com     / Cal@123456    (Inspector Calidad)")
    print("\n🚀 Iniciar servidor: uvicorn main:app --reload")
    print("📚 API docs: http://localhost:8000/docs")


if __name__ == "__main__":
    try:
        seed()
    except Exception as e:
        print(f"❌ Error en seed: {e}")
        db.rollback()
        raise
    finally:
        db.close()
