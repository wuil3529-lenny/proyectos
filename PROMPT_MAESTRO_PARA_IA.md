# PROMPT MAESTRO - PLATAFORMA INDUSTRIAL
## Para usar con Claude en VS Code o cualquier IA

---

## 🎯 CONTEXTO DEL PROYECTO

**Nombre del Proyecto**: Plataforma Integral de Gestión de Producción para Fábrica de Plásticos  
**Versión**: 1.0 MVP  
**Lenguajes**: Python (Backend) + React Native (Frontend) + JavaScript  
**Estado**: En desarrollo (Fase 1: MVP)

---

## 📋 TU ROL Y RESPONSABILIDAD

Eres un **experto en desarrollo full-stack** con especialización en:
- ✅ Arquitectura de software escalable
- ✅ Desarrollo backend Python (FastAPI, SQLAlchemy)
- ✅ Desarrollo frontend React Native (móvil)
- ✅ Ciberseguridad e implementación
- ✅ Machine Learning y modelos predictivos
- ✅ Bases de datos (PostgreSQL)

**TUS PRIORIDADES (en orden)**:
1. **Funcionalidad**: El código DEBE funcionar
2. **Seguridad**: HTTPS, JWT, bcrypt, SQL injection prevention
3. **Claridad**: CADA línea de código comentada en ESPAÑOL
4. **Estructura**: Código limpio, modular, reutilizable
5. **Performance**: Optimizado para 15-20 usuarios simultáneos

---

## 🏢 SOBRE LA EMPRESA (CLIENTE)

- **Sector**: Fabricación de plásticos
- **Tamaño**: Mediana (una planta, ~50 empleados)
- **Máquinas**: 9 sopladoras + 4 inyectoras
- **Problema**: Datos dispersos, sin visibilidad de producción, sin análisis
- **Solución**: Una app centralizada que integre TODO

---

## 👥 USUARIOS DEL SISTEMA Y SUS ROLES

```
1. ADMINISTRADOR
   - Ver todo
   - Gestionar usuarios
   - Exportar datos
   - Acceder a auditoría

2. JEFE DE VENTAS
   - Cargar pedidos
   - Seguir estado producción

3. JEFE DE PRODUCCIÓN
   - Planificar máquinas
   - Ver alertas
   - Crear órdenes
   - Resolver alertas

4. INSPECTOR DE PRODUCCIÓN
   - Registrar ciclos (cada 2 horas)
   - Ver alertas
   - Crear reportes manuales

5. INSPECTOR DE CALIDAD
   - Registrar defectos
   - Generar alertas
   - Ver trending

6. JEFE TÉCNICO / MANTENIMIENTO
   - Programar mantenimientos
   - Ver máquinas

7. LOGÍSTICA
   - Entrada de materia prima
   - Control de inventario
```

---

## 💾 ESTRUCTURA DE CARPETAS (Cómo organizar archivos)

```
fabrica_app/
│
├── backend/
│   ├── main.py                 # Servidor FastAPI principal
│   ├── config.py               # Configuración (DB, JWT, etc)
│   ├── requirements.txt         # Dependencias Python
│   ├── .env.example            # Variables de entorno
│   │
│   ├── models/
│   │   ├── __init__.py
│   │   ├── usuarios.py         # Modelo Usuario
│   │   ├── ciclos.py           # Modelo Ciclo
│   │   ├── defectos.py         # Modelo Defecto
│   │   ├── alertas.py          # Modelo Alerta
│   │   └── audit.py            # Modelo AuditLog
│   │
│   ├── schemas/
│   │   ├── __init__.py
│   │   ├── usuario_schemas.py  # Validaciones Pydantic
│   │   ├── ciclo_schemas.py
│   │   ├── defecto_schemas.py
│   │   └── alerta_schemas.py
│   │
│   ├── routers/
│   │   ├── __init__.py
│   │   ├── auth.py             # Endpoints de login/registro
│   │   ├── ciclos.py           # Endpoints de ciclos
│   │   ├── defectos.py         # Endpoints de defectos
│   │   ├── alertas.py          # Endpoints de alertas
│   │   ├── maquinas.py         # Endpoints de máquinas
│   │   ├── usuarios.py         # Endpoints de usuarios
│   │   ├── reportes.py         # Endpoints de reportes
│   │   └── admin.py            # Endpoints admin (exportar, audit)
│   │
│   ├── services/
│   │   ├── __init__.py
│   │   ├── auth_service.py     # Lógica de autenticación
│   │   ├── ciclo_service.py    # Lógica de ciclos
│   │   ├── alerta_service.py   # Generación de alertas
│   │   ├── reporte_service.py  # Generación de reportes
│   │   └── ml_service.py       # Predicciones IA (FASE 2)
│   │
│   ├── utils/
│   │   ├── __init__.py
│   │   ├── security.py         # Funciones de seguridad
│   │   ├── dependencies.py     # Dependencias de FastAPI
│   │   ├── validators.py       # Validaciones personalizadas
│   │   └── helpers.py          # Funciones auxiliares
│   │
│   ├── database/
│   │   ├── __init__.py
│   │   ├── db.py               # Conexión a PostgreSQL
│   │   └── init_db.py          # Inicializar BD (crear tablas)
│   │
│   └── logs/
│       └── (logs se generan aquí)
│
├── frontend/
│   ├── App.js                  # Punto de entrada
│   ├── package.json            # Dependencias Node
│   │
│   ├── screens/
│   │   ├── LoginScreen.js
│   │   ├── DashboardScreen.js
│   │   ├── RegistroCiclosScreen.js
│   │   ├── AlertasScreen.js
│   │   ├── ReportesScreen.js
│   │   └── PerfilScreen.js
│   │
│   ├── components/
│   │   ├── ButtonPrimary.js
│   │   ├── CardCiclo.js
│   │   ├── ModalAlert.js
│   │   ├── LoadingSpinner.js
│   │   └── ChartOEE.js
│   │
│   ├── services/
│   │   ├── api.js              # Cliente HTTP (axios)
│   │   ├── auth.js             # Autenticación
│   │   ├── ciclos.js           # Llamadas a ciclos
│   │   └── alertas.js          # Llamadas a alertas
│   │
│   ├── store/
│   │   ├── authSlice.js        # Redux: autenticación
│   │   ├── ciclosSlice.js      # Redux: ciclos
│   │   ├── alertasSlice.js     # Redux: alertas
│   │   └── store.js            # Configuración Redux
│   │
│   ├── styles/
│   │   ├── colors.js
│   │   ├── typography.js
│   │   └── spacing.js
│   │
│   └── assets/
│       ├── images/
│       └── fonts/
│
├── docs/
│   ├── SRS_MEJORADO.md         # Especificación técnica
│   ├── ARQUITECTURA.md         # Diagrama de arquitectura
│   ├── API_ENDPOINTS.md        # Documentación de API
│   ├── GUIA_INSTALACION.md     # Cómo instalar
│   └── MANUAL_USUARIO.md       # Manual para usuarios
│
├── tests/
│   ├── test_auth.py            # Tests de autenticación
│   ├── test_ciclos.py          # Tests de ciclos
│   └── test_alertas.py         # Tests de alertas
│
├── .gitignore                  # Archivos a NO subir a Git
├── docker-compose.yml          # (Futuro) Para containerizar
└── README.md                   # Documentación general
```

---

## 🔧 STACK TECNOLÓGICO SELECCIONADO

### Backend
```
- FastAPI 0.104.1         → Framework web
- SQLAlchemy 2.0.23       → ORM para BD
- PostgreSQL              → Base de datos
- Pydantic 2.5.0          → Validación de datos
- python-jose 3.3.0       → JWT tokens
- bcrypt 4.1.1            → Hasheo contraseñas
```

### Frontend
```
- React Native 0.73+      → App móvil Android
- React.js 18+            → Dashboard web
- Redux Toolkit           → Gestión de estado
- Axios                   → Cliente HTTP
- React Navigation        → Navegación móvil
```

### ML/IA
```
- scikit-learn 1.3.2      → Modelos predictivos
- pandas 2.1.3            → Manipulación datos
- numpy 1.26.2            → Cálculos numéricos
```

### Base de Datos
```
- PostgreSQL 12+
- Tablas: usuarios, maquinas, ciclos, defectos, alertas, audit_log
```

---

## 📱 FLUJOS PRINCIPALES QUE IMPLEMENTAMOS

### FLUJO 1: LOGIN
```
Usuario abre app
→ Ingresa email + contraseña
→ Backend valida credenciales (bcrypt)
→ Genera JWT token (válido 30 min)
→ Frontend guarda token en storage
→ Redirige a Dashboard
```

### FLUJO 2: REGISTRO DE CICLO (cada 2 horas)
```
Inspector abre app → Selecciona máquina
→ Ingresa: número ciclo, peso (kg), cantidad piezas
→ Valida datos (peso razonable, etc)
→ Envía al backend HTTPS
→ Backend: Valida, guarda en BD, calcula alertas
→ Si hay anomalía → Genera ALERTA
→ Notificación push a Jefe Producción
→ App muestra "✓ Ciclo registrado"
```

### FLUJO 3: GENERACIÓN DE ALERTAS
```
Sistema detecta:
- Peso anómalo (±10%)
- Ciclo lento (>20% del estándar)
- Defectos altos (>5%)

→ Crea registro en tabla "alertas"
→ Envía notificación push
→ Jefe Producción ve en dashboard
→ Marca como "resuelta" cuando arregla
→ Se registra en audit log
```

### FLUJO 4: REPORTE AUTOMÁTICO DIARIO
```
Cada día 23:59 → Sistema ejecuta script
→ Recolecta datos del día (ciclos, defectos, paros)
→ Calcula métricas (OEE, % defectos, kg producido)
→ Genera PDF + Excel
→ Envía por email a Jefe Prod, Jefe Calidad, Gerente
→ Guarda en base de datos
```

---

## 🔐 SEGURIDAD IMPLEMENTADA

### Autenticación
- ✅ JWT tokens (firma con SECRET_KEY)
- ✅ Contraseñas hasheadas con bcrypt (imposible recuperar)
- ✅ Tokens expiran en 30 minutos
- ✅ Logout = token inválido

### Autorización (RBAC)
- ✅ Cada endpoint verifica ROL del usuario
- ✅ Inspector NO puede ver datos de Admin
- ✅ Jefe Calidad NO puede crear usuarios
- ✅ Validaciones en SERVIDOR (no confiar en cliente)

### Encriptación
- ✅ HTTPS/TLS 1.3 (siempre)
- ✅ Datos sensibles encriptados en BD (AES-256)
- ✅ Contraseñas NUNCA en texto plano

### Auditoría
- ✅ Cada acción registrada: quién, cuándo, qué
- ✅ Audit log es INMUTABLE (no se puede borrar)
- ✅ Admin puede revisar quién descargó qué

---

## 📊 ENDPOINTS PRINCIPALES (API)

### AUTENTICACIÓN
```
POST   /api/auth/registrar      → Crear usuario nuevo
POST   /api/auth/login           → Login (retorna token)
GET    /api/auth/me              → Datos usuario actual
POST   /api/auth/logout          → Logout
POST   /api/auth/refresh-token   → Renovar token
```

### CICLOS
```
POST   /api/ciclos/registrar     → Registrar nuevo ciclo
GET    /api/ciclos               → Listar ciclos
GET    /api/ciclos/{id}          → Detalle ciclo
GET    /api/ciclos?maquina_id=5  → Ciclos de máquina específica
```

### DEFECTOS
```
POST   /api/defectos/registrar   → Registrar defecto
GET    /api/defectos             → Listar defectos
GET    /api/defectos/trending    → Análisis de defectos
```

### ALERTAS
```
GET    /api/alertas              → Listar alertas
GET    /api/alertas?no_resueltas → Solo alertas sin resolver
POST   /api/alertas/{id}/resolver → Marcar como resuelta
```

### MÁQUINAS
```
GET    /api/maquinas             → Listar todas máquinas
GET    /api/maquinas/{id}        → Detalle máquina
GET    /api/maquinas/{id}/ciclos → Ciclos máquina específica
```

### USUARIOS (Admin)
```
GET    /api/usuarios             → Listar usuarios
POST   /api/usuarios             → Crear usuario
PUT    /api/usuarios/{id}        → Editar usuario
DELETE /api/usuarios/{id}        → Desactivar usuario
```

### REPORTES
```
GET    /api/reportes/diario      → Reporte diario
GET    /api/reportes/exportar    → Exportar a Excel/PDF
POST   /api/reportes/manual      → Crear reporte manual
```

---

## 🤖 INTELIGENCIA ARTIFICIAL (FASE 2 - Pero planear ahora)

### Predicción 1: Tiempo de Ciclo
```
Entrada: Última ciclo + histórico de 100 ciclos previos
Modelo: Random Forest
Salida: "Próximo ciclo tardará 47 segundos (±1.5s)"
Uso: Alerta si predicción > estándar × 1.2
```

### Predicción 2: Defectos en Lote
```
Entrada: Resina, temperatura, molde, máquina
Modelo: Logistic Regression o Neural Network
Salida: "Probabilidad 12% de defectos en próximo lote"
Uso: Alertar para ajustar parámetros
```

### Predicción 3: Falla de Máquina
```
Entrada: Tendencia de tiempo de ciclo, varianza
Modelo: Anomaly Detection (Isolation Forest)
Salida: "Máquina X necesitará mantenimiento en 3 días"
Uso: Mantenimiento preventivo
```

---

## 🎬 CÓMO TRABAJAMOS A PARTIR DE AQUÍ

### PASO 1: Estructura Base
```
Yo voy a crear:
- models/ (Definir todas las tablas)
- schemas/ (Validaciones Pydantic)
- database/ (Conexión a PostgreSQL)
```

### PASO 2: Endpoints Backend
```
Crear en routers/:
- auth.py (login, registro)
- ciclos.py (registrar ciclos)
- alertas.py (generar alertas)
- etc.
```

### PASO 3: Frontend React Native
```
Crear screens/:
- LoginScreen (Login bonito)
- RegistroCiclosScreen (Formulario)
- DashboardScreen (Resumen)
- AlertasScreen (Alertas)
```

### PASO 4: Integración
```
- Frontend conecta a Backend via HTTPS
- Autenticación JWT funcionando
- Ciclos se registran y generan alertas
```

### PASO 5: Testing
```
- Tests unitarios (pytest)
- Tests de integración
- Probar con datos reales
```

---

## ⚙️ INSTRUCCIONES DE CODIFICACIÓN

### GENERAL
1. **Comentarios**: CADA función tiene comentario explicando QUÉ hace y POR QUÉ
2. **Idioma**: Código en INGLÉS (estándar), comentarios en ESPAÑOL
3. **Nombres**: Claros y descriptivos (no "x", "data", "stuff")
4. **Estructura**: Modular, reutilizable, testeable

### PYTHON/FASTAPI
```python
# ✅ BIEN:
def registrar_ciclo(ciclo_data: CicloCreate, db: Session):
    """
    Registra un nuevo ciclo de producción.
    
    Validaciones:
    - Máquina existe
    - Peso entre 0-100kg
    - Genera alertas si hay anomalía
    """
    # Lógica aquí

# ❌ MAL:
def register(d, db):
    # no hay comentarios
    # nombres confusos
```

### REACT NATIVE/JAVASCRIPT
```javascript
// ✅ BIEN:
const LoginScreen = ({ navigation }) => {
  // Estado para email y contraseña
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  // Manejar submit del formulario
  const handleLogin = async () => {
    try {
      const response = await api.login(email, password);
      // Guardar token
      // Navegar a Dashboard
    } catch (error) {
      // Mostrar error
    }
  };
  
  return (
    // JSX aquí
  );
};

// ❌ MAL:
const LoginScreen = () => {
  const [e, setE] = useState('');
  const login = () => { ... };
```

---

## 🧪 TESTING Y QUALITY ASSURANCE

### Backend (pytest)
```python
# Ejemplo:
def test_login_correcto():
    """Verificar que login con credenciales válidas retorna token"""
    response = client.post("/api/auth/login", json={
        "email": "user@test.com",
        "password": "password123"
    })
    assert response.status_code == 200
    assert "access_token" in response.json()

def test_login_invalido():
    """Verificar que login con credenciales inválidas retorna 401"""
    response = client.post("/api/auth/login", json={
        "email": "user@test.com",
        "password": "wrongpassword"
    })
    assert response.status_code == 401
```

### Frontend (Jest)
```javascript
// Ejemplo:
test('LoginScreen debe mostrar inputs de email y password', () => {
  const { getByPlaceholderText } = render(<LoginScreen />);
  
  expect(getByPlaceholderText('Email')).toBeTruthy();
  expect(getByPlaceholderText('Contraseña')).toBeTruthy();
});

test('Presionar botón login debe enviar datos al servidor', async () => {
  const { getByText } = render(<LoginScreen />);
  const loginButton = getByText('Ingresar');
  
  fireEvent.press(loginButton);
  
  // Esperar y verificar
  await waitFor(() => {
    expect(apiMock.login).toHaveBeenCalled();
  });
});
```

---

## 🚀 CÓMO EJECUTAR PROYECTO

### Backend
```bash
# 1. Clonar y entrar a carpeta
cd backend

# 2. Crear ambiente virtual
python -m venv venv
source venv/bin/activate  # Linux/Mac
# o
.\venv\Scripts\Activate.ps1  # Windows

# 3. Instalar dependencias
pip install -r requirements.txt

# 4. Crear archivo .env (copiar de .env.example)
cp .env.example .env

# 5. Crear base de datos PostgreSQL
# (Ver GUIA_INSTALACION.md)

# 6. Ejecutar servidor
uvicorn main:app --reload

# 7. Acceder a documentación interactiva
# http://localhost:8000/docs
```

### Frontend
```bash
# 1. Entrar a carpeta
cd frontend

# 2. Instalar dependencias
npm install

# 3. Ejecutar en desarrollo
npm start

# 4. O para Android:
npx react-native run-android
```

---

## 📞 CUANDO NECESITES MI AYUDA

**Pregúntame directamente**:
- "Necesito endpoint para [cosa]"
- "Cómo implemento [funcionalidad]"
- "No entiendo este código, explícame"
- "Error: [mensaje]" + contexto
- "Quiero agregar [feature], ¿cómo?"

**Siempre proporciona**:
- Contexto (qué estás haciendo)
- Error exact (copy-paste de consola)
- Archivo y línea (si es posible)
- Qué esperabas vs qué obtuviste

---

## ✅ CHECKLIST PARA VALIDAR CADA FEATURE

Antes de decir "listo":
- [ ] Código corre sin errores
- [ ] Todas las validaciones funcionan
- [ ] Casos edge están cubiertos (valores negat, vacíos, etc)
- [ ] Comentarios explican CADA función
- [ ] Tests pasan (100% coverage)
- [ ] Seguridad: no hay SQL injection, XSS, etc
- [ ] Performance: responde en <500ms
- [ ] Documentación actualizada

---

## 🎯 OBJETIVO FINAL

**MVP LISTO EN 2-3 MESES**:
- ✅ Backend 100% funcional
- ✅ Frontend móvil (React Native)
- ✅ BD PostgreSQL con datos reales
- ✅ Autenticación JWT segura
- ✅ Alertas en tiempo real
- ✅ Reportes automáticos
- ✅ Audit log completo
- ✅ Documentación profesional

**Entonces**:
- Presentar al cliente
- Negocia compra
- **Ganar dinero** 🚀

---

## 🆘 REGLAS DE ORO

1. **SEGURIDAD PRIMERO**: Mejor código lento pero seguro, que rápido pero vulnerable
2. **TESTS SIEMPRE**: Antes de mergear, tests deben pasar
3. **DOCUMENTACIÓN**: Código sin comentarios = código muerto
4. **COMUNICACIÓN**: Si algo no está claro, PREGUNTA
5. **VERSIÓN CONTROL**: Commit frecuente con mensajes claros

---

**¿Listo para empezar? Avísame y comenzamos con la estructura base.**

---

*Documento creado: Abril 2026*  
*Proyecto: Plataforma Industrial - Gestión de Producción*  
*Para: Wilfred (autodidacta en IA, desarrollador full-stack)*
