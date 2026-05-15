# 🎯 CÓMO USAR EL PROMPT MAESTRO CON IA EN VS CODE

**Guía paso a paso para trabajar con Claude/ChatGPT en VS Code**

---

## 📋 RESUMEN DE LO QUE TIENES

Has recibido estos archivos:

```
📁 DOCUMENTACIÓN:
├─ PROMPT_MAESTRO_PARA_IA.md         ← COPIA ESTO A LA IA
├─ SRS_MEJORADO_PLATAFORMA...md      (Especificación para cliente)
├─ ARQUITECTURA_TECNICA_COMPLETA.md  (Diagramas y flujos)
├─ GUIA_INSTALACION_COMPLETA.md      (Cómo instalar)
└─ README.md                          (Inicio rápido)

📁 CÓDIGO BASE:
├─ backend_fastapi_main.py           (Servidor Python)
├─ models_base_datos.py               (Definición de tablas)
├─ schemas_pydantic.py                (Validaciones)
├─ requirements.txt                   (Dependencias)
└─ .env.example                       (Variables de entorno)
```

---

## 🔧 PASO 1: CONFIGURAR VS CODE + IA

### Opción A: Usar Claude en VS Code (Recomendado)

Si tienes **Claude en VS Code** (extensión de Anthropic):

1. **Abre VS Code**
2. **Abre la paleta de comandos**: `Ctrl+Shift+P` (Windows/Linux) o `Cmd+Shift+P` (Mac)
3. **Escribe**: "Claude"
4. **Selecciona**: "Claude: Open Claude"
5. **Se abre panel de Claude en VS Code** ✅

### Opción B: Usar ChatGPT en VS Code

1. **Instala extensión**: "ChatGPT" de OpenAI
2. **Abre**: Click en ícono de ChatGPT en sidebar
3. **Usa igual que Claude**

### Opción C: Usar Claude.ai (web) + VS Code (lado a lado)

1. **Abre Claude.ai en navegador**
2. **Abre VS Code en otra ventana**
3. **Copia-pega entre ellos**

---

## 📝 PASO 2: COPIAR EL PROMPT MAESTRO

### Cómo copiar el Prompt Maestro a la IA

**En VS Code**:

```
1. Abre archivo: PROMPT_MAESTRO_PARA_IA.md
2. Selecciona TODO: Ctrl+A
3. Copia: Ctrl+C
4. Abre panel de Claude (lado derecho)
5. Pega en el chat: Ctrl+V
6. Presiona ENTER
```

**O en Claude.ai web**:
```
1. Abre PROMPT_MAESTRO_PARA_IA.md en editor
2. Selecciona todo y copia
3. Ve a claude.ai
4. Pega en el chat
5. Presiona ENTER
```

### Qué dice el Prompt Maestro

El prompt le dice a la IA:
- ✅ Que eres experto en desarrollo full-stack
- ✅ Cuáles son tus responsabilidades
- ✅ Estructura del proyecto
- ✅ Stack tecnológico
- ✅ Flujos de la aplicación
- ✅ Cómo codificar (comentarios, nombres, etc)

**Resultado**: La IA entiende el proyecto COMPLETO y puede ayudarte mejor.

---

## 💻 PASO 3: CREAR LA ESTRUCTURA DE CARPETAS

### Crear carpetas localmente

En tu computadora:

```bash
# 1. Crear carpeta principal
mkdir fabrica_app
cd fabrica_app

# 2. Crear subcarpetas backend
mkdir backend
mkdir backend/models
mkdir backend/routers
mkdir backend/services
mkdir backend/utils
mkdir backend/database

# 3. Crear subcarpetas frontend
mkdir frontend
mkdir frontend/screens
mkdir frontend/components
mkdir frontend/services

# 4. Crear documentación
mkdir docs
mkdir tests

# 5. Resultado:
fabrica_app/
├── backend/
│   ├── models/
│   ├── routers/
│   ├── services/
│   ├── utils/
│   └── database/
├── frontend/
│   ├── screens/
│   ├── components/
│   └── services/
├── docs/
└── tests/
```

### Usando VS Code:

1. **Abre VS Code**
2. **File → Open Folder → fabrica_app**
3. **Clic derecho en explorador** → New Folder → `backend`
4. Repetir para otras carpetas

---

## 📄 PASO 4: COPIAR ARCHIVOS DE CÓDIGO A CARPETAS

### Archivos que ya tienes:

```
✅ backend_fastapi_main.py      → Copiar a:  backend/main.py
✅ models_base_datos.py          → Copiar a:  backend/models/__init__.py
✅ schemas_pydantic.py           → Copiar a:  backend/schemas.py
✅ requirements.txt              → Copiar a:  backend/requirements.txt
✅ .env.example                  → Copiar a:  backend/.env.example
```

### Cómo copiar (en VS Code):

1. **Abre archivo origen** (ej: `backend_fastapi_main.py`)
2. **Selecciona todo**: `Ctrl+A`
3. **Copia**: `Ctrl+C`
4. **En explorador de VS Code**:
   - Click derecho en `backend/`
   - New File → `main.py`
5. **Pega contenido**: `Ctrl+V`

O simplemente:
```bash
# Terminal en VS Code:
cp backend_fastapi_main.py fabrica_app/backend/main.py
cp models_base_datos.py fabrica_app/backend/models/__init__.py
cp schemas_pydantic.py fabrica_app/backend/schemas.py
cp requirements.txt fabrica_app/backend/
cp .env.example fabrica_app/backend/
```

---

## 🎯 PASO 5: TRABAJAR CON LA IA EN VS CODE

### Flujo de trabajo típico:

#### Ejemplo 1: Crear un nuevo endpoint

**Tú a la IA** (en panel Claude):
```
Necesito crear un endpoint para registrar defectos.

Debes:
1. Crear archivo routers/defectos.py
2. Endpoint POST /api/defectos/registrar
3. Validar que ciclo_id existe
4. Insertar en BD
5. Retornar datos guardados

Usar DefectoCreate schema de schemas.py
Usar Defecto model de models/__init__.py

Cada línea comentada en español.
```

**La IA retorna**: Código completo, bien estructurado, comentado

**Tú haces**:
1. Copia el código
2. Crea archivo `backend/routers/defectos.py`
3. Pega código
4. Testing (probar en http://localhost:8000/docs)

#### Ejemplo 2: Arreglar un error

**Tú a la IA**:
```
Tengo error en main.py línea 45:

Error: ModuleNotFoundError: No module named 'models'

¿Cómo lo arreglo?

Contexto: El archivo models/__init__.py existe en backend/models/
```

**La IA explica**: La importación debe ser diferente

**Tú haces**: Cambias el import según recomendación

#### Ejemplo 3: Agregar feature

**Tú a la IA**:
```
Quiero agregar paginación al endpoint GET /api/ciclos

Debe:
1. Aceptar parámetros ?skip=0&limit=50
2. Retornar solo esos items
3. Incluir total_items en respuesta
4. Validar que limit no sea > 1000

Usa Pydantic para validar.
```

**La IA retorna**: Código actualizado con paginación

---

## 🔄 PASO 6: INTEGRACIÓN COMPLETA

### Estructura que terminarás teniendo

```
fabrica_app/
│
├── backend/
│   ├── main.py                 # ← Creado por ti (copia de backend_fastapi_main.py)
│   ├── schemas.py              # ← Creado por ti (copia de schemas_pydantic.py)
│   ├── requirements.txt         # ← Creado por ti (copia)
│   ├── .env.example            # ← Creado por ti (copia)
│   │
│   ├── models/
│   │   └── __init__.py         # ← Creado por ti (copia de models_base_datos.py)
│   │
│   ├── routers/
│   │   ├── __init__.py         # (vacío)
│   │   ├── auth.py             # ← IA te ayuda a crear
│   │   ├── ciclos.py           # ← IA te ayuda a crear
│   │   ├── defectos.py         # ← IA te ayuda a crear
│   │   ├── alertas.py          # ← IA te ayuda a crear
│   │   ├── maquinas.py         # ← IA te ayuda a crear
│   │   └── usuarios.py         # ← IA te ayuda a crear
│   │
│   ├── services/
│   │   ├── __init__.py
│   │   ├── auth_service.py     # ← IA te ayuda a crear
│   │   ├── ciclo_service.py    # ← IA te ayuda a crear
│   │   └── alerta_service.py   # ← IA te ayuda a crear
│   │
│   ├── utils/
│   │   ├── __init__.py
│   │   ├── security.py         # ← IA te ayuda a crear
│   │   └── dependencies.py     # ← IA te ayuda a crear
│   │
│   └── database/
│       └── __init__.py
│
├── frontend/
│   ├── screens/
│   │   ├── LoginScreen.js      # ← IA te ayuda a crear
│   │   ├── DashboardScreen.js  # ← IA te ayuda a crear
│   │   └── ...
│   │
│   └── components/
│       ├── ButtonPrimary.js    # ← IA te ayuda a crear
│       └── ...
│
├── docs/
│   ├── PROMPT_MAESTRO.md       # ← (Lo que copias a la IA)
│   ├── SRS_MEJORADO.md         # ← Para mostrar a cliente
│   └── ...
│
└── tests/
    └── (Tests que IA ayuda a crear)
```

---

## 🛠️ PASO 7: PROCESO DE DESARROLLO DIARIO

### Cada vez que quieres crear algo:

```
┌─────────────────────────────────┐
│ 1. DEFINE QUÉ QUIERES CREAR     │
│    (endpoint, componente, etc)   │
└──────────────┬──────────────────┘
               ▼
┌─────────────────────────────────┐
│ 2. PREGUNTA A LA IA             │
│    (Abre panel Claude en VS Code)│
└──────────────┬──────────────────┘
               ▼
┌─────────────────────────────────┐
│ 3. COPIA CÓDIGO GENERADO        │
│    (Ctrl+C del chat de IA)      │
└──────────────┬──────────────────┘
               ▼
┌─────────────────────────────────┐
│ 4. CREA/EDITA ARCHIVO           │
│    (New File en VS Code)        │
└──────────────┬──────────────────┘
               ▼
┌─────────────────────────────────┐
│ 5. PEGA CÓDIGO                  │
│    (Ctrl+V en editor)           │
└──────────────┬──────────────────┘
               ▼
┌─────────────────────────────────┐
│ 6. PRUEBA LOCALMENTE            │
│    (python, npm, etc)           │
└──────────────┬──────────────────┘
               ▼
┌─────────────────────────────────┐
│ 7. SI FALLA: Pregunta a IA      │
│    (¿Por qué error X?)          │
└──────────────┬──────────────────┘
               ▼
┌─────────────────────────────────┐
│ 8. COMMIT A GIT                 │
│    (git add, git commit)        │
└─────────────────────────────────┘
```

---

## 📚 CÓMO PEDIR AYUDA A LA IA

### Estructura de preguntas efectivas

**✅ BIEN** (Específico, con contexto):
```
Necesito crear un endpoint para resolver alertas.

Especificaciones:
- POST /api/alertas/{alerta_id}/resolver
- Solo usuarios con rol "jefe_produccion" o "admin"
- Actualizar campo "resuelta" a True
- Registrar en audit log quién resolvió y cuándo
- Retornar AlertaResponse actualizada

Usar:
- Alerta model de models/__init__.py
- AlertaResponse schema de schemas.py
- get_current_user de dependencies

Cada línea comentada.
```

**❌ MAL** (Vago, sin contexto):
```
Necesito un endpoint para alertas
```

### Información a incluir siempre:
1. **QUÉ**: Tipo de cosa (endpoint, componente, etc)
2. **DÓNDE**: En qué archivo
3. **CÓMO**: Especificaciones exactas
4. **CON QUÉ**: Models, schemas a usar
5. **CONTEXTO**: Por qué lo necesitas

### Si hay error:
```
Error en archivo: backend/routers/ciclos.py, línea 45

Código:
ciclo = Ciclo(...)  # Tu código aquí

Error exacto:
AttributeError: 'Ciclo' object has no attribute 'maquina'

¿Qué significa y cómo lo arreglo?
```

---

## 🧪 PASO 8: TESTING Y VALIDACIÓN

### Probar backend

```bash
# En terminal VS Code:

# 1. Ir a carpeta backend
cd backend

# 2. Crear ambiente virtual
python -m venv venv
source venv/bin/activate  # Linux/Mac
# o
.\venv\Scripts\Activate.ps1  # Windows

# 3. Instalar dependencias
pip install -r requirements.txt

# 4. Copiar .env
cp .env.example .env
# Editar .env con datos

# 5. Crear BD PostgreSQL (ver GUIA_INSTALACION)

# 6. Ejecutar servidor
uvicorn main:app --reload

# 7. Acceder a documentación interactiva
# Abre navegador: http://localhost:8000/docs
```

### Probar frontend

```bash
# En otra terminal:

# 1. Ir a carpeta frontend
cd frontend

# 2. Instalar dependencias
npm install

# 3. Ejecutar
npm start

# 4. Se abre en http://localhost:3000
```

---

## 🎓 RECURSOS QUE YA TIENES

| Archivo | Propósito |
|---------|-----------|
| **PROMPT_MAESTRO_PARA_IA.md** | Copia esto a la IA para context |
| **SRS_MEJORADO.md** | Especificación para mostrar cliente |
| **ARQUITECTURA_TECNICA.md** | Cómo funciona todo |
| **GUIA_INSTALACION.md** | Paso a paso instalación |
| **backend_fastapi_main.py** | Código servidor base |
| **models_base_datos.py** | Definición tablas |
| **schemas_pydantic.py** | Validaciones datos |
| **requirements.txt** | Dependencias Python |

---

## 🚀 RESUMEN RÁPIDO

### En 5 minutos:

1. ✅ Copia `PROMPT_MAESTRO_PARA_IA.md` a Claude en VS Code
2. ✅ Crea carpetas (`backend/`, `frontend/`, `docs/`)
3. ✅ Copia archivos de código a sus carpetas
4. ✅ Pregunta a la IA: "Ayúdame a crear routers/auth.py"
5. ✅ Copia código, prueba localmente
6. ✅ **¡Empiezas a desarrollar!**

---

## 📞 TROUBLESHOOTING

### "¿Cómo cargo un archivo para que la IA lo vea?"

En VS Code con Claude:
1. Abre archivo en editor
2. En chat de Claude, menciona el archivo
3. Claude LO VE automáticamente
4. Pregunta: "@archivo: ¿puedes revisar este código?"

### "¿Puedo usar la IA para... X?"

SÍ, puedes preguntar:
- ✅ "Crea un test para este endpoint"
- ✅ "Optimiza este query SQL"
- ✅ "Diseña esta pantalla React Native"
- ✅ "Escribe documentación de API"
- ✅ "Arregla este bug"
- ✅ "Refactoriza este código"

### "¿Cuántas veces puedo preguntar?"

**Ilimitado**. Así se aprende. Pregunta todo lo que necesites.

---

## 🎯 OBJETIVO FINAL

**Después de seguir estos pasos**:

```
✅ Tienes estructura del proyecto
✅ Tienes código base funcionando
✅ Tienes IA ayudándote en VS Code
✅ Puedes crear endpoints/pantallas
✅ Puedes probar localmente
✅ Puedes preguntar dudas
✅ Puedes desarrollar MVP en 2-3 meses
✅ Puedes vender a cliente
✅ Puedes ganar dinero 🚀
```

---

**¿Listo? ¡Comienza ahora!**

1. Copia PROMPT_MAESTRO a Claude
2. Sigue los pasos
3. Pregunta sin miedo
4. **¡Desarrolla!**

---

*Guía creada: Abril 2026*  
*Para: Wilfred*  
*Objetivo: Desarrollo ágil con IA*
