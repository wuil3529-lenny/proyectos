"""
script_datos_prueba.py
Pobla la BD con datos exactos que el frontend necesita:
  - 13 usuarios  (roles variados)
  - 13 máquinas  (sopladoras + inyectoras)
  - 81 ciclos    (HOY, para que aparezcan en el dashboard)
  - 52 defectos  → OEE = (total_piezas - 52) / total_piezas ≈ 99.8%
"""

import os, sys
from datetime import datetime, timedelta
import random

from dotenv import load_dotenv
load_dotenv()

sys.path.insert(0, os.path.dirname(__file__))

from database import SessionLocal, engine, Base
from models import Usuario, Maquina, Ciclo, Defecto, Alerta
from security import hash_password

Base.metadata.create_all(bind=engine)
db = SessionLocal()

# ── Helpers ───────────────────────────────────────────────────────

def upsert_usuario(email, pwd, nombre, rol, depto):
    u = db.query(Usuario).filter(Usuario.email == email).first()
    if not u:
        u = Usuario(email=email, password_hash=hash_password(pwd),
                    nombre_completo=nombre, rol=rol, departamento=depto)
        db.add(u)
        db.flush()
        print(f"  + usuario: {email}")
    else:
        u.password_hash = hash_password(pwd)   # actualiza hash por versión bcrypt
    return u

def upsert_maquina(nombre, tipo, std):
    m = db.query(Maquina).filter(Maquina.nombre == nombre).first()
    if not m:
        m = Maquina(nombre=nombre, tipo=tipo, tiempo_ciclo_estandar=std)
        db.add(m)
        db.flush()
        print(f"  + maquina: {nombre}")
    return m

# ── 13 Usuarios ───────────────────────────────────────────────────

print("Usuarios...")
usuarios_data = [
    ("admin@fabrica.com",         "Admin@123456",  "Administrador Sistema",  "admin",               "Sistemas"),
    ("jefe.prod@fabrica.com",     "Prod@123456",   "Carlos Mendez",          "jefe_produccion",     "Producción"),
    ("jefe.cal@fabrica.com",      "Cal@123456",    "Roberto Silva",          "jefe_calidad",        "Calidad"),
    ("jefe.tec@fabrica.com",      "Tec@123456",    "Pedro Alvarez",          "jefe_tecnico",        "Mantenimiento"),
    ("jefe.ven@fabrica.com",      "Ven@123456",    "Sofia Martinez",         "jefe_ventas",         "Ventas"),
    ("jefe.log@fabrica.com",      "Log@123456",    "Diego Reyes",            "jefe_logistica",      "Logística"),
    ("inspector1@fabrica.com",    "Insp@123456",   "Ana Torres",             "inspector_produccion","Producción"),
    ("inspector2@fabrica.com",    "Insp@123456",   "Luis Garcia",            "inspector_produccion","Producción"),
    ("calidad1@fabrica.com",      "Cal@123456",    "Maria Rodriguez",        "inspector_calidad",   "Calidad"),
    ("tecnico1@fabrica.com",      "Tec@123456",    "Juan Perez",             "tecnico",             "Mantenimiento"),
    ("molinero1@fabrica.com",     "Mol@123456",    "Felipe Castro",          "molinero",            "Producción"),
    ("vendedor1@fabrica.com",     "Ven@123456",    "Laura Jimenez",          "vendedor",            "Ventas"),
    ("operario.log@fabrica.com",  "Log@123456",    "Raul Morales",           "operario_logistica",  "Logística"),
]
for row in usuarios_data:
    upsert_usuario(*row)
db.commit()

# ── 13 Máquinas ───────────────────────────────────────────────────

print("Maquinas...")
maquinas_data = [
    ("Sopladora 2",  "Sopladora", 45.0),
    ("Sopladora 4",  "Sopladora", 48.0),
    ("Sopladora 5",  "Sopladora", 44.0),
    ("Sopladora 6",  "Sopladora", 46.0),
    ("Sopladora 7",  "Sopladora", 50.0),
    ("Sopladora 8",  "Sopladora", 43.0),
    ("Sopladora 9",  "Sopladora", 47.0),
    ("Sopladora 10", "Sopladora", 45.5),
    ("Sopladora 11", "Sopladora", 44.5),
    ("Inyectora 1",  "Inyectora", 60.0),
    ("Inyectora 2",  "Inyectora", 55.0),
    ("Inyectora 3",  "Inyectora", 58.0),
    ("Inyectora 4",  "Inyectora", 62.0),
]
maquinas = []
for row in maquinas_data:
    maquinas.append(upsert_maquina(*row))
db.commit()

# ── 81 Ciclos HOY → OEE 99.8% ─────────────────────────────────────
# 81 ciclos × 320 piezas = 25,920 total piezas
# 52 defectos / 25,920 = 0.20% → OEE = 99.80%

print("Ciclos de hoy...")
inspector = db.query(Usuario).filter(Usuario.email == "inspector1@fabrica.com").first()
hoy = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)

# Eliminar ciclos de prueba de hoy para evitar duplicados
ciclos_hoy_existentes = db.query(Ciclo).filter(Ciclo.timestamp >= hoy).all()
for c in ciclos_hoy_existentes:
    db.delete(c)
db.commit()

ciclos_creados = []
random.seed(42)
for i in range(81):
    maquina = maquinas[i % len(maquinas)]
    ts = hoy + timedelta(minutes=i * 10)
    peso_base = maquina.tiempo_ciclo_estandar * 0.9
    ciclo = Ciclo(
        maquina_id=maquina.id,
        numero_ciclo=1000 + i,
        peso_kg=round(peso_base * random.uniform(0.96, 1.04), 2),
        cantidad_piezas=320,
        temperatura_proceso=round(random.uniform(242, 252), 1),
        inspector_id=inspector.id,
        timestamp=ts,
        modo_prueba=False,
    )
    db.add(ciclo)
    ciclos_creados.append(ciclo)

db.flush()
db.commit()

# Re-fetch para tener IDs
ciclos_creados = db.query(Ciclo).filter(Ciclo.timestamp >= hoy).order_by(Ciclo.id).all()
print(f"  {len(ciclos_creados)} ciclos creados ({len(ciclos_creados)*320} piezas totales)")

# ── 52 Defectos → OEE 99.8% ──────────────────────────────────────

print("Defectos...")
calidad = db.query(Usuario).filter(Usuario.email == "calidad1@fabrica.com").first()

# Eliminar defectos existentes de esos ciclos
ids = [c.id for c in ciclos_creados]
db.query(Defecto).filter(Defecto.ciclo_id.in_(ids)).delete(synchronize_session=False)
db.commit()

muestra = random.sample(ciclos_creados, 52)
for ciclo in muestra:
    d = Defecto(
        ciclo_id=ciclo.id,
        tipo=random.choice(["grieta", "deformacion", "peso"]),
        severidad="menor",
        cantidad=1,          # 1 defecto por ciclo → 52 defectos totales
        inspeccionado_por=calidad.id,
    )
    db.add(d)
db.commit()

# Verificar OEE
total_piezas = len(ciclos_creados) * 320
total_defectos = 52
oee = round((total_piezas - total_defectos) / total_piezas * 100, 2)
print(f"  52 defectos / {total_piezas} piezas → OEE = {oee}%")

# ── Alertas demo ──────────────────────────────────────────────────

print("Alertas demo...")
# Solo si no hay alertas sin resolver
sin_resolver = db.query(Alerta).filter(Alerta.resuelta == False).count()
if sin_resolver == 0 and maquinas:
    db.add(Alerta(nivel="warning",   tipo="ciclo_lento",     descripcion=f"{maquinas[0].nombre}: ciclo 12% mas lento que promedio",  maquina_id=maquinas[0].id))
    db.add(Alerta(nivel="critical",  tipo="defecto_critico", descripcion=f"{maquinas[1].nombre}: 11% piezas defectuosas — REVISAR", maquina_id=maquinas[1].id))
    db.add(Alerta(nivel="info",      tipo="calibracion",     descripcion=f"{maquinas[2].nombre}: calibracion vence en 3 dias",       maquina_id=maquinas[2].id))
    db.commit()

db.close()

print()
print("DATOS LISTOS")
print(f"  13 usuarios  |  13 maquinas  |  81 ciclos hoy  |  52 defectos  |  OEE {oee}%")
print()
print("CREDENCIALES:")
print("  admin@fabrica.com        / Admin@123456")
print("  jefe.prod@fabrica.com    / Prod@123456")
print("  inspector1@fabrica.com   / Insp@123456")
print("  calidad1@fabrica.com     / Cal@123456")
