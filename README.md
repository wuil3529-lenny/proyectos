# 🏭 PLATAFORMA INDUSTRIAL - GESTIÓN DE PRODUCCIÓN

**Versión**: 1.0 MVP  
**Estado**: En Desarrollo (Fase 1)  
**Autor**: Wilfred + IA  
**Fecha**: Abril 2026  

---

## 📌 ¿QUÉ ES ESTO?

Una aplicación **mobile-first + web dashboard** para gestionar la operación completa de una planta de fabricación de plásticos.

**Problema que resuelve**:
- ❌ Datos dispersos en papel y Excel
- ❌ Sin visibilidad de producción en tiempo real
- ❌ Reportes manuales que toman horas

**Solución**:
- ✅ Un sistema centralizado
- ✅ Alertas automáticas
- ✅ Inteligencia artificial predictiva (Fase 2)
- ✅ Decisiones basadas en datos

---

## 🎯 CARACTERÍSTICAS PRINCIPALES

### MVP (Ahora)
- ✅ Login seguro con JWT
- ✅ Registro de ciclos (cada 2 horas)
- ✅ Alertas automáticas en tiempo real
- ✅ Reportes diarios
- ✅ Exportación a Excel/PDF
- ✅ Auditoría completa

### Fase 2 (3 meses después)
- 🤖 Predicción de defectos
- 🤖 Predicción de tiempo de ciclo
- 🤖 Detección de anomalías
- 📊 Dashboards analíticos

### Fase 3 (6 meses después)
- 📡 Integración IoT (sensores en máquinas)
- 🤖 Monitoreo completamente automático

---

## 📁 ESTRUCTURA DEL PROYECTO

```
fabrica_app/
├── backend/                    # Servidor Python FastAPI
│   ├── main.py                 # Punto de entrada
│   ├── requirements.txt         # Dependencias
│   ├── models_base_datos.py     # Definición de tablas
│   ├── schemas_pydantic.py      # Validaciones
│   └── routers/                 # Endpoints API
│
├── frontend/                    # App React Native (móvil)
│   ├── App.js
│   ├── screens/                 # Pantallas
│   └── components/              # Componentes reutilizables
│
├── docs/                        # Documentación
│   ├── PROMPT_MAESTRO_PARA_IA.md
│   ├── SRS_MEJORADO.md
│   ├── ARQUITECTURA.md
│   └── GUIA_INSTALACION.md
│
└── tests/                       # Tests unitarios
```

---

## 🚀 INICIO RÁPIDO

### Requisitos
- Python 3.10+
- PostgreSQL 12+
- Node.js 18+ (para frontend)

### Backend - Instalación Rápida

```bash
# 1. Clonar/descargar proyecto
cd backend

# 2. Crear ambiente virtual
python -m venv venv
source venv/bin/activate  # Linux/Mac
# o en Windows:
.\venv\Scripts\Activate.ps1

# 3. Instalar dependencias
pip install -r requirements.txt

# 4. Configurar variables de entorno
cp .env.example .env
# Editar .env con tus datos

# 5. Crear base de datos PostgreSQL
# Ver GUIA_INSTALACION.md

# 6. Ejecutar servidor
uvicorn main:app --reload

# 7. Acceder a documentación
# http://localhost:8000/docs
```

### Frontend - Instalación Rápida

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

## 📱 CÓMO USAR LA APP

### 1. Login
- Abrir app
- Ingresar email y contraseña
- Click "Ingresar"

### 2. Registrar Ciclo (Inspector Producción)
- Dashboard → "Nuevo Ciclo"
- Seleccionar máquina
- Ingresar:
  - Número de ciclo
  - Peso total (kg)
  - Cantidad de piezas
- Click "Guardar"
- ✓ Ciclo registrado
- Si hay anomalía → Ver alerta

### 3. Ver Alertas
- Dashboard → "Alertas"
- Ver lista de alertas no resueltas
- Leer descripción
- Click "Resolver" cuando termines de revisar

### 4. Descargar Reportes
- Admin → "Centro de Datos"
- Seleccionar fechas
- Elegir formato (Excel, PDF)
- Click "Descargar"

---

## 🔐 SEGURIDAD

- ✅ **Contraseñas**: Hasheadas con bcrypt (imposible recuperar)
- ✅ **Tokens**: JWT con expiración 30 min
- ✅ **HTTPS**: Encriptación TLS 1.3
- ✅ **Auditoría**: Cada acción registrada (quién, cuándo, qué)
- ✅ **Roles**: Control de acceso por rol
- ✅ **Validaciones**: En servidor, no confiar en cliente

---

## 🏗️ STACK TECNOLÓGICO

| Componente | Tecnología |
|---|---|
| **Backend** | Python FastAPI |
| **Frontend Móvil** | React Native |
| **Frontend Web** | React.js |
| **Base de Datos** | PostgreSQL |
| **Autenticación** | JWT + bcrypt |
| **ML/IA** | scikit-learn, pandas |
| **Hosting** | On-premise del cliente |

---

## 📊 ENDPOINTS PRINCIPALES

### Autenticación
```
POST   /api/auth/login          Login
POST   /api/auth/registrar      Registrar usuario
GET    /api/auth/me             Datos usuario actual
```

### Ciclos
```
POST   /api/ciclos/registrar    Registrar ciclo
GET    /api/ciclos              Listar ciclos
GET    /api/ciclos/{id}         Detalle ciclo
```

### Alertas
```
GET    /api/alertas             Listar alertas
POST   /api/alertas/{id}/resolver  Resolver alerta
```

### Máquinas
```
GET    /api/maquinas            Listar máquinas
GET    /api/maquinas/{id}/ciclos    Ciclos máquina
```

### Reportes
```
GET    /api/reportes/diario     Reporte del día
POST   /api/reportes/exportar   Descargar Excel/PDF
```

Documentación completa en: **http://localhost:8000/docs**

---

## 🧪 TESTING

### Backend (pytest)
```bash
# Ejecutar tests
pytest

# Con cobertura
pytest --cov=.

# Tests específicos
pytest tests/test_auth.py
```

### Frontend (Jest)
```bash
# Ejecutar tests
npm test

# Con cobertura
npm test -- --coverage
```

---

## 📚 DOCUMENTACIÓN

| Documento | Propósito |
|---|---|
| **PROMPT_MAESTRO_PARA_IA.md** | Cómo trabajar con IA |
| **SRS_MEJORADO.md** | Especificación técnica (para cliente) |
| **ARQUITECTURA.md** | Diagramas y flujos |
| **GUIA_INSTALACION.md** | Paso a paso instalación |
| **API_ENDPOINTS.md** | Documentación detallada de endpoints |

---

## 🐛 SOLUCIÓN DE PROBLEMAS

### Error: "ModuleNotFoundError: No module named 'fastapi'"
```bash
# Activar ambiente virtual
source venv/bin/activate  # Linux/Mac
# o
.\venv\Scripts\Activate.ps1  # Windows

# Instalar de nuevo
pip install -r requirements.txt
```

### Error: "FATAL: Ident authentication failed"
- Revisar credenciales PostgreSQL en .env
- Ver GUIA_INSTALACION.md → "Problema: PostgreSQL authentication"

### Error: "Port 8000 already in use"
```bash
# Usar otro puerto
uvicorn main:app --reload --port 8001
```

### Error: "CORS error"
- Verificar CORS_ORIGINS en .env
- Para desarrollo: `CORS_ORIGINS=*`

---

## 🎯 ROADMAP

### ✅ Completado
- [x] Especificación técnica
- [x] Arquitectura de sistema
- [x] Backend base (autenticación, BD)
- [x] Modelos de datos
- [x] Schemas de validación

### 🚧 En Progreso
- [ ] Endpoints API completos
- [ ] Frontend React Native
- [ ] Notificaciones push
- [ ] Generación de reportes

### 📋 Próximo
- [ ] Pruebas unitarias y e2e
- [ ] MVP listo para presentar cliente
- [ ] Negociación y contrato
- [ ] IA predictiva (Fase 2)

---

## 👥 USUARIOS DEL SISTEMA

1. **Administrador**: Todo acceso, gestión de usuarios
2. **Jefe Ventas**: Carga pedidos, seguimiento
3. **Jefe Producción**: Planifica máquinas, resuelve alertas
4. **Inspector Producción**: Registra ciclos
5. **Inspector Calidad**: Registra defectos, genera alertas
6. **Jefe Técnico**: Programa mantenimientos
7. **Logística**: Control de materia prima

---

## 💰 MODELO DE NEGOCIO

### Opción A: Licencia Única
- **$8,000 - $15,000 USD**
- Instalación + capacitación 1 mes + soporte 3 meses

### Opción B: SaaS
- **$500 - $2,000/mes**
- Alojamiento cloud + actualizaciones + soporte 24/7

### Opción C: Híbrido (Recomendado)
- **Licencia**: $5,000 USD
- **IA predictiva**: $300/mes
- **Soporte premium**: $100/mes

---

## 📞 SOPORTE Y CONTACTO

- **Email**: wilfred@fabrica.app
- **Documentación**: Ver carpeta `/docs`
- **Issues**: Reportar bugs en issues del proyecto
- **Chat**: Disponible para consultas técnicas

---

## 📄 LICENCIA

Privada - No distribuir sin autorización

---

## ✨ CRÉDITOS

- **Idea**: Cliente Fábrica de Plásticos
- **Desarrollo**: Wilfred + IA
- **Arquitectura**: Equipo técnico

---

## 🚀 PRÓXIMOS PASOS

1. **Clona este repositorio**
2. **Sigue GUIA_INSTALACION.md**
3. **Prueba en http://localhost:8000/docs**
4. **Copia el PROMPT_MAESTRO_PARA_IA.md a Claude en VS Code**
5. **¡Comienza a desarrollar!**

---

**¿Listo para transformar la fabricación con datos e IA?** 🎯

Contáctame si tienes preguntas o necesitas ayuda.

---

*Última actualización: Abril 2026*
