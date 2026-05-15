"""
audit_roles.py - Auditoria completa de permisos por rol
Plataforma Industrial

Logica de verificacion:
  - GET endpoints: espera 200
  - POST/PATCH restringidos: verifica que roles SIN permiso reciben 403,
    y roles CON permiso reciben cualquier codigo != 403 (200,201,400,409,etc)
  - La validacion es sobre RBAC, no sobre logica de negocio

Ejecutar: python audit_roles.py
"""

import json, urllib.request, urllib.error
from datetime import datetime, timezone
from urllib.parse import urlparse

BASE = "http://localhost:8000"

GRN  = "\033[92m"; RED = "\033[91m"; YEL = "\033[93m"
BLU  = "\033[94m"; GRY = "\033[90m"; BOLD = "\033[1m"; RST = "\033[0m"

USUARIOS = [
    {"rol": "admin",                "email": "admin@fabrica.com",          "password": "Admin@123456"},
    {"rol": "jefe_produccion",      "email": "jefe.prod@fabrica.com",      "password": "12345678"},
    {"rol": "inspector_produccion", "email": "inspector1@fabrica.com",     "password": "12345678"},
    {"rol": "jefe_calidad",         "email": "jefe.cal@fabrica.com",       "password": "12345678"},
    {"rol": "inspector_calidad",    "email": "calidad@fabrica.com",        "password": "12345678"},
    {"rol": "jefe_tecnico",         "email": "tecnico@fabrica.com",        "password": "12345678"},
    {"rol": "tecnico",              "email": "tecnico2@fabrica.com",       "password": "12345678"},
    {"rol": "jefe_logistica",       "email": "jefe.logistica@fabrica.com", "password": "12345678"},
    {"rol": "operario_logistica",   "email": "operario.log@fabrica.com",   "password": "12345678"},
    {"rol": "jefe_ventas",          "email": "jefe.ventas@fabrica.com",    "password": "12345678"},
    {"rol": "vendedor",             "email": "vendedor@fabrica.com",       "password": "12345678"},
    {"rol": "molinero",             "email": "molinero@fabrica.com",       "password": "12345678"},
]

# Permisos esperados: que roles tienen acceso (admin siempre tiene acceso)
PERMISOS = {
    "Maquinas PATCH":     ["admin", "jefe_produccion", "jefe_tecnico"],
    "Maquinas POST":      ["admin", "jefe_produccion"],
    "Ciclos POST":        ["admin", "inspector_produccion", "jefe_produccion"],
    "Defectos POST":      ["admin", "inspector_calidad", "jefe_calidad"],
    "Alertas resolver":   ["admin", "jefe_produccion", "jefe_calidad"],
    "Reportes generar":   ["admin", "jefe_produccion", "jefe_calidad"],
    "Usuarios GET":       ["admin"],
    "Usuarios POST":      ["admin"],
}

def http(method, path, token=None, body=None):
    url = BASE + path
    if urlparse(url).scheme not in ("http", "https"):
        return 0, {"detail": "Esquema de URL no permitido"}
    data = json.dumps(body).encode() if body else None
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    r = urllib.request.Request(url, data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(r, timeout=8) as resp:  # nosec B310 — esquema validado arriba
            return resp.status, json.loads(resp.read())
    except urllib.error.HTTPError as e:
        try:
            detail = json.loads(e.read()).get("detail", "")
        except Exception:
            detail = ""
        return e.code, {"detail": detail}
    except Exception as e:
        return 0, {"detail": str(e)}

def login(email, pwd):
    code, data = http("POST", "/api/auth/login", body={"email": email, "password": pwd})
    return data.get("access_token") if code == 200 else None

def obtener_ids(token):
    _, maquinas = http("GET", "/api/maquinas", token)
    mid = maquinas[0]["id"] if isinstance(maquinas, list) and maquinas else 1

    _, ciclos = http("GET", "/api/ciclos", token)
    cid = ciclos[0]["id"] if isinstance(ciclos, list) and ciclos else 1

    # Crear una alerta de prueba fresca para poder resolverla
    _, alertas = http("GET", "/api/alertas", token)
    alerta_no_resuelta = None
    if isinstance(alertas, list):
        for a in alertas:
            if not a.get("resuelta"):
                alerta_no_resuelta = a["id"]
                break
    aid = alerta_no_resuelta or (alertas[0]["id"] if isinstance(alertas, list) and alertas else 1)
    return mid, cid, aid

def puede(rol, key):
    return rol in PERMISOS.get(key, [])

def check(label, perm_key, code, rol, fallos_list, nota=""):
    """
    Para endpoints restringidos (perm_key != None):
      - si tiene permiso: cualquier codigo != 403 es PASS (200,201,400,409...)
      - si NO tiene permiso: solo 403 es PASS
    Para endpoints publicos (perm_key == None):
      - 200 o 201 es PASS
    """
    if perm_key is None:
        ok = code in (200, 201)
        exp_str = "200"
    elif puede(rol, perm_key):
        ok = code != 403
        exp_str = "!403"
    else:
        ok = code == 403
        exp_str = "403"

    icon = f"{GRN}PASS{RST}" if ok else f"{RED}FAIL{RST}"
    got  = f"{RED}{code}{RST}" if not ok else str(code)
    n    = f"  {GRY}{nota}{GRY}{RST}" if nota else ""
    print(f"  {icon}  {label:<44} esp={YEL}{exp_str:<4}{RST}  got={got}{n}")
    if not ok:
        fallos_list.append({"rol": rol, "test": label, "esperado": exp_str, "obtenido": code})
    return ok

def run():
    print(f"\n{BOLD}{'='*68}{RST}")
    print(f"{BOLD}  AUDITORIA DE ROLES — Plataforma Industrial{RST}")
    print(f"  {datetime.now().strftime('%d/%m/%Y  %H:%M:%S')}")
    print(f"{BOLD}{'='*68}{RST}\n")

    admin_token = login("admin@fabrica.com", "Admin@123456")
    if not admin_token:
        print(f"{RED}ERROR: Backend no responde o credenciales admin incorrectas.{RST}")
        return

    mid, cid, aid = obtener_ids(admin_token)
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    print(f"{GRY}  Datos base: maquina_id={mid}  ciclo_id={cid}  alerta_id={aid}{RST}\n")

    total_pass = total_fail = 0
    fallos = []

    for u in USUARIOS:
        rol   = u["rol"]
        email = u["email"]
        token = login(email, u["password"])

        lbl = rol.upper().replace("_", " ")
        print(f"{BOLD}{BLU}[ {lbl} ]{RST}  {GRY}{email}{RST}")

        if not token:
            print(f"  {RED}FAIL{RST}  LOGIN — no autenticado")
            fallos.append({"rol": rol, "test": "LOGIN", "esperado": "200", "obtenido": "401"})
            total_fail += 1
            print()
            continue

        print(f"  {GRN}PASS{RST}  Login OK")

        # ── Auth ─────────────────────────────────────────────────
        code, _ = http("GET", "/api/auth/me", token)
        r = check("Auth: GET /me", None, code, rol, fallos)
        total_pass += r; total_fail += not r

        # ── Maquinas ─────────────────────────────────────────────
        code, _ = http("GET", "/api/maquinas")          # publico, sin token
        r = check("Maquinas: GET lista (publico)", None, code, rol, fallos)
        total_pass += r; total_fail += not r

        code, _ = http("GET", f"/api/maquinas/{mid}", token)
        r = check("Maquinas: GET detalle", None, code, rol, fallos)
        total_pass += r; total_fail += not r

        code, _ = http("PATCH", f"/api/maquinas/{mid}", token, {"estado": "operativa"})
        r = check("Maquinas: PATCH estado", "Maquinas PATCH", code, rol, fallos)
        total_pass += r; total_fail += not r

        code, _ = http("POST", "/api/maquinas", token, {"nombre": f"TEST_{rol[:6]}", "tipo": "Sopladora", "tiempo_ciclo_estandar": 45.0})
        r = check("Maquinas: POST crear nueva", "Maquinas POST", code, rol, fallos, "400=ya existe OK")
        total_pass += r; total_fail += not r

        # ── Ciclos ───────────────────────────────────────────────
        code, _ = http("GET", "/api/ciclos", token)
        r = check("Ciclos: GET lista", None, code, rol, fallos)
        total_pass += r; total_fail += not r

        code, _ = http("POST", "/api/ciclos/registrar", token,
                        {"maquina_id": mid, "numero_ciclo": 9999, "peso_kg": 40.0, "cantidad_piezas": 300, "modo_prueba": True})
        r = check("Ciclos: POST registrar", "Ciclos POST", code, rol, fallos)
        total_pass += r; total_fail += not r

        # ── Defectos ─────────────────────────────────────────────
        code, _ = http("GET", "/api/defectos", token)
        r = check("Defectos: GET lista", None, code, rol, fallos)
        total_pass += r; total_fail += not r

        code, _ = http("POST", "/api/defectos", token,
                        {"ciclo_id": cid, "tipo": "grieta", "severidad": "menor", "cantidad": 1})
        r = check("Defectos: POST registrar", "Defectos POST", code, rol, fallos)
        total_pass += r; total_fail += not r

        # ── Alertas ──────────────────────────────────────────────
        code, _ = http("GET", "/api/alertas", token)
        r = check("Alertas: GET lista", None, code, rol, fallos)
        total_pass += r; total_fail += not r

        code, _ = http("POST", f"/api/alertas/{aid}/resolver", token)
        r = check("Alertas: POST resolver", "Alertas resolver", code, rol, fallos, "409=ya resuelta OK")
        total_pass += r; total_fail += not r

        # ── Reportes ─────────────────────────────────────────────
        code, _ = http("GET", "/api/reportes/diario", token)
        r = check("Reportes: GET diario", None, code, rol, fallos)
        total_pass += r; total_fail += not r

        code, _ = http("POST", "/api/reportes/generar", token, {
            "fecha_inicio": f"{today}T00:00:00",
            "fecha_fin":    f"{today}T23:59:59",
            "tipo": "produccion_diaria", "formato": "json"
        })
        r = check("Reportes: POST generar", "Reportes generar", code, rol, fallos)
        total_pass += r; total_fail += not r

        # ── Usuarios (admin only) ─────────────────────────────────
        code, _ = http("GET", "/api/usuarios", token)
        r = check("Usuarios: GET lista", "Usuarios GET", code, rol, fallos)
        total_pass += r; total_fail += not r

        code, _ = http("POST", "/api/usuarios", token, {
            "email": f"auditoria_{rol}@test.com",
            "password": "12345678",
            "nombre_completo": f"Audit {rol}",
            "rol": "tecnico",
            "departamento": "Test"
        })
        r = check("Usuarios: POST crear", "Usuarios POST", code, rol, fallos, "400=ya existe OK")
        total_pass += r; total_fail += not r

        print()

    # ── Limpiar usuarios de prueba ────────────────────────────────
    _, usuarios = http("GET", "/api/usuarios", admin_token)
    if isinstance(usuarios, list):
        borrados = 0
        for u in usuarios:
            if "@test.com" in u.get("email", ""):
                http("DELETE", f"/api/usuarios/{u['id']}", admin_token)
                borrados += 1
        if borrados:
            print(f"{GRY}  Usuarios de prueba eliminados: {borrados}{RST}\n")

    # ── Resumen ───────────────────────────────────────────────────
    print(f"{BOLD}{'='*68}{RST}")
    print(f"{BOLD}  RESUMEN{RST}")
    print(f"{BOLD}{'='*68}{RST}")
    ejecutados = total_pass + total_fail
    print(f"  Tests ejecutados : {ejecutados}")
    print(f"  {GRN}PASS{RST}             : {total_pass}")
    print(f"  {RED}FAIL{RST}             : {total_fail}")

    if fallos:
        print(f"\n{BOLD}{RED}  FALLOS:{RST}")
        print(f"  {'─'*64}")
        for f in fallos:
            print(f"  {RED}x{RST}  [{f['rol']}]  {f['test']}")
            print(f"       esperado={YEL}{f['esperado']}{RST}  obtenido={RED}{f['obtenido']}{RST}")
        print()
        print(f"  {YEL}Estos son los puntos a revisar y corregir.{RST}")
    else:
        print(f"\n  {GRN}{BOLD}Sin fallos. Todos los permisos funcionan correctamente.{RST}")

    print(f"\n{BOLD}{'='*68}{RST}\n")

if __name__ == "__main__":
    run()
