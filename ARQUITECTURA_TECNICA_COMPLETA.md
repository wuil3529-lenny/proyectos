# ARQUITECTURA TÉCNICA - PLATAFORMA INDUSTRIAL

**Fecha**: Abril 2026  
**Versión**: 1.0  

---

## 🏗️ ARQUITECTURA DE SISTEMA

```
┌────────────────────────────────────────────────────────────────────┐
│                          CAPA DE PRESENTACIÓN                       │
├────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌──────────────────┐      ┌──────────────────┐                    │
│  │   APP MÓVIL      │      │  DASHBOARD WEB   │                    │
│  │  React Native    │      │    React.js      │                    │
│  │  (Android/iOS)   │      │  (Navegador)     │                    │
│  │                  │      │                  │                    │
│  │ - Login          │      │ - Reportes       │                    │
│  │ - Registro ciclos│      │ - Exportación    │                    │
│  │ - Alertas push   │      │ - Auditoría      │                    │
│  │ - Notificaciones │      │ - Análisis IA    │                    │
│  └────────┬─────────┘      └────────┬─────────┘                    │
│           │                         │                              │
└───────────┼─────────────────────────┼──────────────────────────────┘
            │                         │
            │      HTTPS/TLS 1.3      │
            │   (Encriptado siempre)  │
            │                         │
┌───────────┼─────────────────────────┼──────────────────────────────┐
│           ▼                         ▼                              │
│  ┌────────────────────────────────────────────────┐               │
│  │        API GATEWAY / LOAD BALANCER             │               │
│  │  (Distribuye conexiones, valida permisos)     │               │
│  └────────────────────────────────────────────────┘               │
│                                                                    │
│                   CAPA DE LÓGICA (BACKEND)                        │
│                                                                    │
│  ┌──────────────────────────────────────────────────┐             │
│  │     SERVIDOR PYTHON + FastAPI                    │             │
│  │                                                   │             │
│  │  ┌────────────────────────────────────────┐     │             │
│  │  │  MÓDULOS DE NEGOCIO                    │     │             │
│  │  │                                        │     │             │
│  │  │  ✓ Autenticación (JWT + bcrypt)       │     │             │
│  │  │  ✓ Gestión de Usuarios (RBAC)        │     │             │
│  │  │  ✓ Ciclos de Producción               │     │             │
│  │  │  ✓ Control de Calidad                 │     │             │
│  │  │  ✓ Alertas y Notificaciones           │     │             │
│  │  │  ✓ Generación de Reportes             │     │             │
│  │  │  ✓ Exportación de Datos               │     │             │
│  │  │  ✓ Auditoría y Logs                   │     │             │
│  │  └────────────────────────────────────────┘     │             │
│  │                                                   │             │
│  │  ┌────────────────────────────────────────┐     │             │
│  │  │  MOTOR DE INTELIGENCIA ARTIFICIAL      │     │             │
│  │  │                                        │     │             │
│  │  │  ✓ Predicción ciclos                  │     │             │
│  │  │  ✓ Predicción defectos                │     │             │
│  │  │  ✓ Detección anomalías                │     │             │
│  │  │  ✓ Recomendaciones                    │     │             │
│  │  │  ✓ Análisis datos históricos          │     │             │
│  │  │    (scikit-learn, TensorFlow)         │     │             │
│  │  └────────────────────────────────────────┘     │             │
│  │                                                   │             │
│  │  ┌────────────────────────────────────────┐     │             │
│  │  │  SERVICIOS AUXILIARES                 │     │             │
│  │  │                                        │     │             │
│  │  │  ✓ Envío de emails/notificaciones     │     │             │
│  │  │  ✓ Generación PDFs                    │     │             │
│  │  │  ✓ Cálculos OEE                       │     │             │
│  │  │  ✓ Integración backups               │     │             │
│  │  └────────────────────────────────────────┘     │             │
│  │                                                   │             │
│  └──────────────────────────────────────────────────┘             │
│                           ▲                                       │
│                           │                                       │
└───────────────────────────┼───────────────────────────────────────┘
                            │
        ┌───────────────────┼───────────────────┐
        │                   │                   │
        ▼                   ▼                   ▼
    ┌────────┐         ┌─────────┐        ┌──────────┐
    │Database│         │ Caché   │        │ Queue    │
    │        │         │ Redis   │        │ (Tareas) │
    │Postgr. │         │         │        │Celery    │
    │        │         │Sesiones │        │          │
    │Usuarios│         │Alertas  │        │Reports   │
    │Ciclos  │         │Cache IA │        │Emails    │
    │Defectos│         │         │        │          │
    │Reportes│         │         │        │          │
    │Auditoría       │         │        │          │
    └────────┘         └─────────┘        └──────────┘
        ▲
        │
        └─── BACKUPS AUTOMÁTICOS DIARIOS (Local + Cloud Opcional)
```

---

## 📡 FLUJO DE DATOS - CASO: REGISTRO DE CICLO

```
1. INSPECTOR EN MÁQUINA (Tablet con App Móvil)
   └─> Abre app → Selecciona "Sopladora 5"
   └─> Ingresa: Ciclo#, Peso (kg), Cantidad piezas
   └─> Presiona "GUARDAR"

2. VALIDACIÓN LOCAL (React Native)
   └─> ¿Peso dentro de rango? ✓
   └─> ¿Cantidad > 0? ✓
   └─> ¿Internet disponible? 
       Si SÍ  → Va a paso 3
       Si NO → Guarda en caché local, reintenta cuando hay conexión

3. ENVÍO ENCRIPTADO AL SERVIDOR
   └─> POST /api/ciclos/registrar
   └─> Headers: {Authorization: "Bearer JWT_TOKEN"}
   └─> Body: {
         maquina_id: 5,
         ciclo_numero: 142,
         peso_kg: 45.3,
         cantidad_piezas: 320,
         timestamp: "2026-04-15T14:30:00Z"
       }
   └─> HTTPS/TLS 1.3 (encriptado siempre)

4. SERVIDOR RECIBE Y VALIDA (FastAPI)
   └─> Verifica JWT token válido
   └─> Verifica usuario tiene rol "Inspector Producción"
   └─> Valida datos nuevamente
   └─> Calcula peso_estándar × cantidad
   └─> Compara con peso ingresado
       Si diferencia > 10% → genera ALERTA
   └─> Guarda en PostgreSQL

5. BASE DE DATOS ALMACENA
   └─> INSERT INTO ciclos (...)
   └─> INSERT INTO audit_log (
         quien: "Inspector_42",
         qué: "Registró ciclo 142",
         cuándo: "2026-04-15T14:30:00Z",
         ip: "192.168.1.85",
         dispositivo: "Tablet_Samsung"
       )

6. ANÁLISIS EN TIEMPO REAL
   └─> Sistema chequea:
       ✓ Peso vs histórico → ¿Anomalía?
       ✓ Ciclo vs tiempo estándar → ¿Lento?
       ✓ Defectos últimos 5 ciclos → ¿Tendencia?
   └─> Si hay alerta → genera notificación

7. NOTIFICACIÓN A USUARIOS
   └─> Push notification a Jefe Producción: 
       "⚠️ Máquina 5: ciclo 15% más lento"
   └─> Email a Jefe Calidad (si crítico)
   └─> App muestra alerta en dashboard

8. DATOS DISPONIBLES PARA IA
   └─> Modelo predictivo analiza ciclo nuevo
   └─> Compara con últimos 100 ciclos
   └─> Genera predicción: "Próximo ciclo tardará 8% más"
   └─> Sugerencia guardada para reporte

9. RESPONSE AL CLIENTE (Tablet)
   └─> {
         status: "success",
         mensaje: "Ciclo registrado exitosamente",
         alerta: {
           tipo: "warning",
           texto: "Ciclo 10% más lento que promedio"
         }
       }
   └─> App muestra confirmación ✓ + alerta
   └─> Inspector puede continuar con siguiente ciclo
```

---

## 🔐 FLUJO DE SEGURIDAD - LOGIN

```
1. USUARIO ABRE APP
   └─> Pantalla de login
   └─> Ingresa usuario + contraseña

2. VALIDACIÓN LOCAL
   └─> ¿Email en formato válido? ✓
   └─> ¿Contraseña no vacía? ✓
   └─> Envía POST /api/auth/login

3. SERVIDOR VALIDA CREDENCIALES
   └─> SELECT usuario FROM usuarios WHERE email = ?
   └─> Compara contraseña con hash bcrypt en BD
       hash_bd = "$2b$12$abc123xyz..."
       hash_ingreso = bcrypt(contraseña_usuario)
   └─> ¿Coinciden?
       SÍ  → Va a paso 4
       NO  → Retorna error, intenta de nuevo

4. GENERACIÓN DE JWT TOKEN
   └─> Crea token con payload:
       {
         sub: "usuario_id_42",
         email: "juan@fabrica.com",
         role: "inspector_produccion",
         iat: 1713190200,
         exp: 1713193800  (30 minutos después)
       }
   └─> Firma con clave secreta del servidor
   └─> Retorna token al cliente

5. CLIENT RECIBE TOKEN Y LO GUARDA
   └─> Almacena en localStorage encriptado
   └─> O en keystore (Android nativo)
   └─> No en texto plano

6. PRÓXIMAS SOLICITUDES USA TOKEN
   └─> Header: Authorization: "Bearer eyJhbGc..."
   └─> Servidor verifica firma
   └─> Si válido → procesa solicitud
   └─> Si inválido/expirado → retorna 401 Unauthorized

7. SI USUARIO INACTIVO 30 MINUTOS
   └─> Token expira automáticamente
   └─> Login requerido nuevamente
   └─> Sesión anterior se cierra

8. OPCIÓN: MFA PARA ADMINISTRADOR
   └─> Después de contraseña validada
   └─> Sistema envía código 6-dígitos por SMS/email
   └─> Usuario ingresa código
   └─> Genera token después de validar código
```

---

## 🤖 FLUJO DE IA - PREDICCIÓN DE TIEMPO DE CICLO

```
ENTRADA: Nuevo ciclo registrado

1. RECOLECCIÓN DE CARACTERÍSTICAS
   └─> maquina_id = 5 (Sopladora)
   └─> resina_tipo = "ABS Blanco"
   └─> molde_id = 203
   └─> temperatura = 245°C
   └─> timestamp del ciclo

2. EXTRACCIÓN DE HISTÓRICO
   └─> SELECT tiempo_ciclo FROM ciclos WHERE
       maquina_id = 5 AND 
       resina_tipo = "ABS Blanco" AND
       molde_id = 203
       ORDER BY timestamp DESC LIMIT 100
   └─> Obtiene últimos 100 ciclos similares

3. FEATURE ENGINEERING (Ingeniería de características)
   └─> Calcula:
       - Promedio tiempo ciclo (historial)
       - Desv. estándar
       - Tendencia últimos 10 ciclos
       - Varianza de temperatura
       - Día de semana (martes = 2, jueves = 4)
       - Turno (mañana, tarde, noche)
       - Velocidad promedio máquina
   └─> Normaliza valores entre 0-1

4. CARGA MODELO ENTRENADO
   └─> random_forest_ciclos.pkl
   └─> Modelo entrenado con 10,000+ ciclos históricos
   └─> Features: [maquina, resina, molde, temp, turno, tendencia...]
   └─> Target: tiempo_ciclo_segundos

5. PREDICCIÓN
   └─> predicción = modelo.predict([features])[0]
   └─> Resultado: 47.3 segundos (±1.5 segundos)
   └─> Tiempo estándar esperado: 45 segundos
   └─> DIFERENCIA: +2.3 segundos (5% más lento)

6. INTERPRETACIÓN
   └─> Si predicción > estándar × 1.1
       └─> Nivel: WARNING
       └─> Mensaje: "Próximo ciclo puede ser 5% más lento"
       └─> Causa: "Temperatura 3°C superior a promedio"
   └─> Si predicción > estándar × 1.2
       └─> Nivel: CRITICAL
       └─> Mensaje: "Máquina puede estar en falla"
       └─> Recomendación: "Revisar calibración URGENTE"

7. ALMACENAMIENTO DE PREDICCIÓN
   └─> INSERT INTO predicciones_ia (
         ciclo_id,
         modelo_usado: "random_forest_v2",
         prediccion_segundos: 47.3,
         confianza: 0.92 (92%),
         timestamp: now()
       )

8. NOTIFICACIÓN
   └─> Si crítico → Push a Jefe Producción
   └─> Si warning → Registra en log, aparece en dashboard
   └─> Si normal → Solo para reporte

9. FEEDBACK LOOP
   └─> Cuando ciclo actual termina (registro nuevo)
   └─> Sistema compara predicción vs realidad
   └─> predicción: 47.3s, real: 48.1s → Error: 0.8s (1.7%)
   └─> Guarda este error para reentrenamiento del modelo
   └─> Cada 100 ciclos → reentrana modelo con nuevos datos
```

---

## 📊 FLUJO DE REPORTES - GENERACIÓN AUTOMÁTICA

```
CADA DÍA A LAS 23:59 (11:59 PM)

1. TRIGGER AUTOMÁTICO
   └─> Scheduler (APScheduler) ejecuta función
   └─> generar_reportes_diarios()

2. RECOLECCIÓN DE DATOS DEL DÍA
   └─> SELECT ciclos FROM ciclos 
       WHERE DATE(timestamp) = today()
   └─> SELECT defectos FROM defectos 
       WHERE DATE(fecha_registro) = today()
   └─> SELECT cambios FROM cambios_molde 
       WHERE DATE(timestamp) = today()
   └─> SELECT paros FROM paros_maquina 
       WHERE DATE(timestamp) = today()

3. CÁLCULO DE MÉTRICAS
   └─> Total kg producido = SUM(peso_kg)
   └─> Total piezas = SUM(cantidad_piezas)
   └─> % defectos = (defectos / piezas) × 100
   └─> Tiempo máquina operativa = 16h - paros_h
   └─> OEE = (piezas_buenas / piezas_posibles) × eficiencia_tiempo × calidad
   └─> Máquinas más lentas (ranking)
   └─> Defectos por tipo (grieta, deformación, etc)

4. ANÁLISIS IA
   └─> Predicción producción mañana (basado en hoy)
   └─> Máquinas que necesitarán mantenimiento próximamente
   └─> Resinas con mayor tasa de defectos
   └─> Turnos/días con peor rendimiento
   └─> Recomendaciones de optimización

5. GENERACIÓN DE PDF
   └─> Crea documento con:
       Header: Logo, fecha, período
       KPIs: Producción total, defectos%, OEE
       Tabla: Detalle por máquina
       Gráficos: Defectos trending, OEE timeline
       Recomendaciones: Insights de IA
   └─> Firma digital (solo lectura)

6. EXPORTACIÓN A EXCEL
   └─> Libro con 4 hojas:
       Hoja 1: Resumen ejecutivo
       Hoja 2: Ciclos detallados (todos)
       Hoja 3: Defectos detallados
       Hoja 4: Máquinas y métricas

7. ENVÍO POR EMAIL
   └─> Para: [jefe_produccion@, jefe_calidad@, gerente@]
   └─> Asunto: "Reporte Producción 15-04-2026"
   └─> Body: Resumen en texto
   └─> Adjuntos: PDF + XLSX
   └─> Footer: "Generado automáticamente por Sistema"

8. ALMACENAMIENTO
   └─> INSERT INTO reportes (
         fecha: 2026-04-15,
         tipo: "produccion_diaria",
         archivo_pdf: "/reports/2026-04-15.pdf",
         archivo_xlsx: "/reports/2026-04-15.xlsx",
         metricas_json: {...}
       )

9. AUDIT LOG
   └─> INSERT INTO audit_log (
         quien: "SISTEMA",
         qué: "Generó reporte diario",
         cuándo: now(),
         detalles: "Ciclos: 72, Defectos: 3, OEE: 89%"
       )

10. NOTIFICACIÓN A USUARIOS
    └─> Push a usuarios: "✓ Reporte diario disponible"
    └─> Dashboard muestra: "Última generación: hoy 23:59"
    └─> Botón "Descargar" apunta a archivos
```

---

## 💾 ESTRUCTURA DE BASE DE DATOS

```
PostgreSQL Database: "fabrica_produccion"

TABLAS PRINCIPALES:

┌─ usuarios
│  ├─ id (PRIMARY KEY)
│  ├─ email (UNIQUE)
│  ├─ password_hash (bcrypt)
│  ├─ nombre_completo
│  ├─ rol_id (FOREIGN KEY → roles)
│  ├─ departamento_id (FOREIGN KEY → departamentos)
│  ├─ foto_url
│  ├─ estado (activo/inactivo)
│  ├─ fecha_creacion
│  └─ última_conexión

┌─ roles
│  ├─ id
│  ├─ nombre ("Administrador", "Inspector Producción", etc)
│  └─ permisos (JSON array de permisos)

┌─ maquinas
│  ├─ id
│  ├─ nombre ("Sopladora 5", "Inyectora 2")
│  ├─ tipo ("Sopladora" / "Inyectora")
│  ├─ estado (operativa/mantenimiento/falla)
│  ├─ última_calibración
│  └─ ciclos_totales

┌─ ciclos
│  ├─ id (PRIMARY KEY)
│  ├─ maquina_id (FOREIGN KEY → maquinas)
│  ├─ numero_ciclo
│  ├─ peso_kg
│  ├─ cantidad_piezas
│  ├─ temperatura_proceso
│  ├─ tiempo_ciclo_segundos (calculado automático)
│  ├─ inspector_id (FOREIGN KEY → usuarios)
│  ├─ timestamp
│  ├─ orden_produccion_id (FOREIGN KEY)
│  └─ modo_prueba (true/false)

┌─ defectos
│  ├─ id
│  ├─ ciclo_id (FOREIGN KEY → ciclos)
│  ├─ tipo ("grieta", "deformación", "peso", "medida")
│  ├─ severidad ("menor", "mayor", "crítica")
│  ├─ cantidad_defectos
│  ├─ observaciones
│  ├─ foto_url (evidencia)
│  ├─ inspeccionado_por (FOREIGN KEY → usuarios)
│  └─ fecha

┌─ alertas
│  ├─ id
│  ├─ nivel ("info", "warning", "critical")
│  ├─ tipo ("ciclo_lento", "defecto_alto", "maquina_falla", etc)
│  ├─ descripción
│  ├─ maquina_id (referencia)
│  ├─ fecha_generación
│  ├─ resuelta (true/false)
│  └─ quien_resolvió

┌─ predicciones_ia
│  ├─ id
│  ├─ ciclo_id (referencia)
│  ├─ tipo_prediccion ("tiempo_ciclo", "defectos", "falla_proxima")
│  ├─ valor_predicho
│  ├─ confianza (0.0-1.0)
│  ├─ modelo_usado ("random_forest_v2", etc)
│  ├─ timestamp
│  └─ feedback_real (después que se realiza ciclo)

┌─ audit_log
│  ├─ id
│  ├─ usuario_id (FOREIGN KEY → usuarios)
│  ├─ acción ("login", "registró_ciclo", "exportó_datos")
│  ├─ recurso ("ciclo_142", "usuario_juan", etc)
│  ├─ timestamp
│  ├─ ip_origen
│  ├─ dispositivo
│  └─ detalles_json
│  *** NOTA: Inmutable - No permitir DELETE

┌─ reportes
│  ├─ id
│  ├─ fecha
│  ├─ tipo ("produccion_diaria", "defectos", "oee")
│  ├─ archivo_pdf_url
│  ├─ archivo_xlsx_url
│  ├─ metricas_json (resumen de datos)
│  ├─ generado_por ("SISTEMA")
│  └─ timestamp

[... más tablas para moldes, materias primas, órdenes, etc ...]
```

---

## 🚀 PIPELINE DE DESPLIEGUE (DEPLOYMENT)

```
FASE 1: DESARROLLO LOCAL
└─> Desarrollador trabaja en máquina local
└─> Python 3.10 + FastAPI
└─> PostgreSQL en Docker
└─> Cambios en Git

FASE 2: CONTROL DE CALIDAD
└─> Push a rama "desarrollo"
└─> Servidor CI/CD ejecuta tests automáticos
└─> Si pasan tests → se despliega a servidor "staging"

FASE 3: PRUEBA EN SERVIDOR CLIENTE
└─> Servidor on-premise del cliente
└─> IP: 192.168.1.100 (ejemplo)
└─> Docker Compose sube containers:
    ├─ API FastAPI (puerto 8000)
    ├─ PostgreSQL (puerto 5432, no expuesto)
    ├─ Redis caché (puerto 6379, no expuesto)
    └─ Nginx reverse proxy (puerto 443 HTTPS)

FASE 4: ACTUALIZACIÓN AUTOMÁTICA
└─> Nuevo release disponible
└─> Admin recibe notificación
└─> Presiona "Actualizar"
└─> Sistema:
    ├─ Hace backup automático
    ├─ Descarga nueva versión
    ├─ Ejecuta migraciones BD
    ├─ Reinicia servicios
    └─ Notifica cuando listo

FASE 5: ROLLBACK SI FALLA
└─> Si algo falla en actualización
└─> Sistema revierte a backup anterior
└─> Admin notificado
└─> Cero downtime
```

---

## 📱 ARQUITECTURA REACT NATIVE (Frontend Móvil)

```
/src
├─ /screens              (Pantallas principales)
│  ├─ LoginScreen.js
│  ├─ DashboardScreen.js
│  ├─ RegistroCiclosScreen.js
│  ├─ AlertasScreen.js
│  ├─ ReportesScreen.js
│  └─ PerfilScreen.js
│
├─ /components           (Componentes reutilizables)
│  ├─ ModalAlert.js
│  ├─ ButtonPrimary.js
│  ├─ CardCiclo.js
│  ├─ ChartOEE.js
│  └─ ...
│
├─ /services            (Llamadas a API)
│  ├─ apiClient.js      (configuración axios + JWT)
│  ├─ ciclosService.js
│  ├─ usuariosService.js
│  ├─ reportesService.js
│  └─ ...
│
├─ /store               (Estado global - Redux/Context)
│  ├─ authSlice.js      (usuario logueado, token)
│  ├─ ciclosSlice.js    (ciclos cargados)
│  ├─ alertasSlice.js   (alertas activas)
│  └─ ...
│
├─ /utils
│  ├─ validaciones.js
│  ├─ formatters.js
│  ├─ storage.js        (localStorage encriptado)
│  └─ ...
│
├─ /assets
│  ├─ /images
│  ├─ /fonts
│  └─ /colors
│
└─ App.js               (Punto de entrada)
```

---

## 🔗 INTEGRACIONES EXTERNAS (Fase 2+)

```
Google Drive Backup
    ↓
Sistema Python ejecuta:
    def backup_a_google_drive():
        - Exporta BD completa
        - Crea ZIP encriptado
        - Sube a Google Drive
        - Crea link compartido
        - Registra en audit log
    ↓
Ejecuta cada noche a las 03:00 AM

OneDrive / Dropbox
    ↓
Similar a Google Drive
    ↓
Cliente elige qué usar (1 o más simultáneamente)

Integración IoT (Fase 3)
    ↓
Sensores en máquinas envían datos:
    - Temperatura molde
    - Presión hidráulica
    - Vibración
    - Ciclo en tiempo real
    ↓
MQTT/Kafka recibe datos
    ↓
Procesa y almacena
    ↓
Reemplaza registros manuales
```

---

## 📈 MÉTRICAS DE RENDIMIENTO ESPERADAS

```
Latencia API
├─ Login: <200ms
├─ Registrar ciclo: <150ms
├─ Obtener dashboard: <300ms
├─ Generar reporte: <2s
└─ Predicción IA: <500ms

Capacidad
├─ Usuarios simultáneos: 20+ (MVP)
├─ Ciclos/día: 200+ (fácilmente)
├─ Almacenamiento/año: ~50GB (dato y backups)
├─ Disponibilidad: 99.5% (servidor on-premise)
└─ Tiempo backup: <5 minutos

Seguridad
├─ Cifrado en tránsito: TLS 1.3 (100%)
├─ Cifrado datos sensibles: AES-256
├─ Contraseñas: bcrypt (imposible romper)
├─ MFA: Disponible para Admin
├─ Audit log: Inmutable
└─ Sesión: Timeout 30 minutos
```

---

Esta arquitectura es **robusta, escalable y lista para producción**. 

Siguiente paso: Code base inicial en Python + React Native.
