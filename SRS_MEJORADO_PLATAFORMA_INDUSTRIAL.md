# SOFTWARE REQUIREMENTS SPECIFICATION (SRS)
## Plataforma Integral de Gestión de Producción - Fábrica de Plásticos

**Versión**: 2.0  
**Fecha**: Abril 2026  
**Estado**: Listo para Presentación a Cliente  

---

## 📌 1. VISIÓN GENERAL DEL PROYECTO

### Objetivo Estratégico
Desarrollar una **plataforma mobile-first, escalable y segura** que centralice la operación completa de una planta de fabricación de plásticos, integrando datos en tiempo real, automatización de reportes y análisis predictivo basado en inteligencia artificial.

### Problema que Resolvemos
- ❌ **Antes**: Datos dispersos en papel, Excel, máquinas sin conectividad
- ✅ **Después**: Un único sistema que integra ventas, producción, calidad, técnica y logística

### Casos de Uso Principales
1. **Ventas**: Carga pedidos y monitorea estado en tiempo real
2. **Producción**: Planifica máquinas, asigna materiales, registra ciclos cada 2 horas
3. **Calidad**: Verifica defectos, genera alertas automáticas
4. **Logística**: Controla entrada de materia prima y despachos
5. **Administración**: Exporta datos, gestiona backups, audita accesos

---

## 👥 2. ARQUITECTURA DE USUARIOS Y ROLES (RBAC)

El sistema implementa **Control de Acceso Basado en Roles (RBAC)** con UI consciente del rol. Cada usuario solo ve lo que puede hacer.

| **Rol** | **Departamento** | **Permisos Principales** |
|---------|-----------------|-------------------------|
| **Administrador** | Dirección | Gestión de usuarios, backups, exportación de datos, auditoría completa |
| **Jefe de Ventas** | Ventas | Carga pedidos, seguimiento de producción, reportes de venta |
| **Vendedor** | Ventas | Carga pedidos, consulta estados |
| **Jefe de Producción** | Producción | Planificación de máquinas/moldes, asignación de materiales, creación de órdenes |
| **Inspector de Producción** | Producción | Registro de ciclos cada 2h, pesos, cierre de turnos, alertas |
| **Molinero** | Producción | Gestión de mezclas (virgen/molido/color), consumo de resina |
| **Jefe de Calidad** | Calidad | Definición de estándares, auditoría de procesos, análisis de defectos |
| **Inspector de Calidad** | Calidad | Pruebas físicas (impacto, fuga, medidas), generación de alertas |
| **Jefe Técnico** | Mantenimiento | Programación de mantenimientos, cambios de molde |
| **Técnico** | Mantenimiento | Ejecución de montajes, reparación de fallas |
| **Jefe de Logística** | Logística | Control de inventario, entrada de materia prima, despachos |
| **Operario Logística** | Logística | Registro de lotes y kilajes |

---

## 🔧 3. MÓDULOS FUNCIONALES DETALLADOS

### 3.1 Gestión de Activos y Maquinaria
**Sopladoras**: Máquinas 2, 4, 5, 6, 7, 8, 9, 10, 11  
**Inyectoras**: Máquinas 1, 2, 3, 4  

Cada máquina tiene:
- Identificación única (ID)
- Estado (Operativa, En Mantenimiento, En Falla)
- Última calibración
- Ciclos ejecutados (histórico)

### 3.2 Maestro de Productos (Datos de Referencia)
Carga administrativa de productos con 4 secciones:

**Información General**
- Cliente (nombre)
- Producto (SKU, nombre)
- Imagen del producto

**Especificaciones Técnicas**
- Peso Neto/Bruto (en gramos)
- Dimensiones (largo, ancho, alto)
- Color estándar

**Configuración de Producción**
- Molde asignado (ID)
- Cantidad de cavidades
- Tiempo de ciclo estándar (en segundos)
- Máquinas donde se produce

**Receta de Mezcla**
- Tipo de resina base
- % de resina virgen
- % de resina molida (reciclada)
- % de colorante
- Temperatura de proceso

### 3.3 Gestión de Órdenes de Producción

#### Orden Estándar
- Basada en pedidos reales de clientes
- Metricas OEE (Overall Equipment Effectiveness) normales
- Se registra en histórico
- Genera reportes automáticos

#### Orden de Prueba (Trial)
- Para nuevas resinas, moldes o variaciones
- Marcada visualmente con cintillo rojo "MODO PRUEBA"
- No afecta métricas históricas ni alertas
- Datos recolectados pero no incluidos en análisis

### 3.4 Registro de Ciclos y Control de Producción

**Cada 2 horas** se registran:
- ID de máquina
- Ciclo número (secuencial)
- Peso del lote producido (en kg)
- Cantidad de piezas
- Timestamp exacto
- Inspector que registra

**Validaciones**:
- Si peso ≠ cantidad × peso_estándar → ALERTA (posible defecto)
- Si ciclo_tiempo > tiempo_estándar × 1.2 → ALERTA (máquina lenta)
- Si ciclo_tiempo < tiempo_estándar × 0.8 → ALERTA (posible error de registro)

### 3.5 Control de Calidad y Defectos

**Inspector de Calidad** registra:
- Cantidad de piezas inspeccionadas
- Cantidad de piezas defectuosas
- Tipo de defecto (grieta, deformación, peso, medida)
- Severidad (menor, mayor, crítica)
- Fotografía del defecto

**Alertas automáticas**:
- Si % defectos > 5% → ALERTA NORMAL
- Si % defectos > 10% → ALERTA CRÍTICA (detener producción)

### 3.6 Reportes Automáticos vs Manuales

**AUTOMÁTICOS** (se generan sin intervención):
- Reporte diario de producción (ciclos, kg, piezas)
- Reporte de defectos por lote
- Reporte de máquinas lentas
- Reporte OEE (eficiencia general)
- Predicción de fallos próximos (IA)

**MANUALES** (Inspector decide cuándo):
- Reporte especial de incidencia (si algo anormal ocurre)
- Reporte de cambio de molde
- Reporte de mantenimiento realizado
- Nota de observaciones

### 3.7 Perfiles de Usuario y Preferencias

**Datos de Perfil**:
- Nombre completo
- Fotografía
- Cargo/Rol
- Departamento
- Email

**Preferencias Personales**:
- Tema (Claro/Oscuro)
- Idioma (Español/Inglés)
- Notificaciones (Push, SMS, Email)
- Horario de notificaciones

---

## 🤖 4. INTELIGENCIA ARTIFICIAL (IA) - FUNCIONALIDADES

### 4.1 Predicción de Tiempo de Ciclo
**¿Qué hace?**: Predice cuánto tardará el próximo ciclo basándose en histórico.

**Datos usados**:
- Tipo de resina
- Temperatura de proceso
- Máquina específica
- Molde usado
- Histórico de los últimos 50 ciclos

**Uso práctico**:
- Si predicción > tiempo_estándar × 1.1 → Alertar a operario para revisar máquina
- Permite planificar despachos con mayor precisión

### 4.2 Predicción de Defectos en Lote
**¿Qué hace?**: Predice posibles defectos antes de que ocurran.

**Datos usados**:
- Temperatura del molde
- Velocidad de inyección
- Presión de proceso
- Historial de defectos de la resina
- Máquina específica

**Uso práctico**:
- Alerta preventiva para ajustar parámetros ANTES de producir defectos
- Reduce desperdicios

### 4.3 Detección de Anomalías en Máquinas
**¿Qué hace?**: Detecta comportamientos anormales que indican falla próxima.

**Señales monitoreadas**:
- Variación en tiempo de ciclo
- Variación en peso de pieza
- Aumento de defectos
- Patrones de temperatura anormal

**Uso práctico**:
- Programa mantenimiento preventivo antes de que máquina falle
- Evita paros de emergencia costosos

### 4.4 Análisis de Rendimiento y Recomendaciones
**¿Qué hace?**: Analiza datos y genera insights para mejorar ganancias.

**Ejemplos**:
- "Máquina 5 está 15% más lenta últimos 3 días → necesita mantenimiento"
- "Resina proveedor X genera 8% más defectos → cambiar proveedor"
- "Operario Juan tiene 2% menos defectos que promedio → mejor capacitación"
- "Lunes tienes 20% más defectos → considerar turnos más cortos"

**Uso práctico**:
- Gerente recibe recomendación específica
- Toma acción → aumenta ganancias

### 4.5 Chat/Chatbot Cognitivo (Fase 2)
*Para versión futura*: Operario pregunta "¿por qué máquina 2 está lenta?" y recibe análisis automático.

---

## 🔐 5. SEGURIDAD IMPLEMENTADA

### 5.1 Autenticación
- ✅ Login usuario/contraseña
- ✅ MFA (Multi-Factor Authentication) opcional para Admin
- ✅ Sesiones con timeout (30 minutos de inactividad = logout)
- ✅ Recuperación de contraseña segura (token por email)

### 5.2 Encriptación
- ✅ HTTPS/TLS 1.3 (todas las comunicaciones)
- ✅ Contraseñas hasheadas con bcrypt (no se guardan en texto)
- ✅ Datos sensibles encriptados en base de datos (AES-256)

### 5.3 Control de Acceso
- ✅ RBAC estricto (solo ve lo que puede hacer)
- ✅ Validación en servidor (no confiar en cliente)
- ✅ Tokens JWT con expiración

### 5.4 Auditoría
- ✅ Registro inmutable (Audit Log) de:
  - Quién accedió
  - Cuándo
  - Qué datos vió/modificó
  - IP origen
  - Dispositivo
- ✅ No se puede borrar audit log (solo Admin ve, no modifica)

### 5.5 Backup y Recuperación
- ✅ Backups automáticos diarios
- ✅ Guardados en servidor local (on-premise) del cliente
- ✅ Opción de vincular Google Drive/OneDrive/Dropbox para respaldo adicional
- ✅ Recuperación de datos en caso de fallo

### 5.6 Exportación Segura
- ✅ Admin puede exportar datos a .CSV, .XLSX, .PDF
- ✅ Descarga genera link único (caduca en 10 minutos)
- ✅ Descarga se registra en audit log
- ✅ Datos sensibles se pueden ocultar en exportación (opción)

---

## 📱 6. TECNOLOGÍA Y ARQUITECTURA

### Stack Seleccionado

| **Componente** | **Tecnología** | **Razón** |
|---|---|---|
| **Frontend Mobile** | React Native | Instala en Android/iOS, corre en tablets, fácil despliegue |
| **Frontend Web** | React.js | Dashboard en navegador (computadora en oficina) |
| **Backend** | Python FastAPI | Rápido, seguro, fácil de mantener, integración IA perfecta |
| **Base de Datos** | PostgreSQL | Robusta, maneja relaciones complejas, escalable |
| **Análisis IA** | Python (scikit-learn, TensorFlow) | Modelos predictivos, análisis datos |
| **Autenticación** | JWT + bcrypt | Estándar seguro |
| **Hosting** | Servidor on-premise cliente | Control total, datos locales |
| **Backups** | Almacenamiento local + Cloud opcional | Redundancia |

### Requisitos Mínimos de Hardware Cliente
- **Servidor**: CPU dual-core, 8GB RAM, 500GB disco (mínimo)
- **Tablets**: Android 10+ (recomendado 12+)
- **Computadora**: Windows 10+ o macOS 10.15+
- **Conexión**: Internet estable (LAN recomendado en planta)

---

## 📊 7. PLAN DE DESARROLLO (FASES)

### Fase 1: MVP (2-3 meses)
**Lanzamiento inicial al cliente para prueba**

✅ Login con roles (Admin, Producción, Calidad, Logística)
✅ Registro de ciclos (cada 2 horas) + pesos
✅ Alertas básicas (peso anormal, ciclo lento)
✅ Reportes automáticos (producción diaria)
✅ Exportación de datos (CSV, XLSX)
✅ Auditoría de accesos
✅ App móvil Android basic + web dashboard
✅ Seguridad básica (HTTPS, contraseñas, MFA Admin)

**No incluye** (para Fase 2):
- IA predictiva compleja
- Integración máquinas IoT
- Chat inteligente
- Dashboards avanzados

### Fase 2: IA Predictiva (2 meses después)
**Cuando cliente confirma ROI de MVP**

✅ Predicción de tiempo de ciclo
✅ Predicción de defectos
✅ Detección de anomalías máquinas
✅ Recomendaciones de optimización
✅ Dashboards analíticos avanzados

### Fase 3: Automatización Avanzada (3 meses después)
**Integración con máquinas reales**

✅ Conectores IoT (sensores, PLC)
✅ Monitoreo automático (sin registro manual cada 2h)
✅ Control automático de máquinas
✅ Predicciones en tiempo real ultra-precisas

---

## 💰 8. MODELO DE NEGOCIO Y PRICING

### Opción A: Venta de Licencia Única
- **Precio**: $8,000 - $15,000 USD (depende de customización)
- **Qué incluye**: Instalación, capacitación 1 mes, soporte 3 meses

### Opción B: SaaS (Modelo Suscripción)
- **Precio**: $500 - $2,000/mes (depende de usuarios y plantas)
- **Qué incluye**: Alojamiento cloud, actualizaciones, soporte 24/7

### Opción C: Modelo Híbrido (Recomendado)
- **Licencia inicial**: $5,000 USD
- **Suscripción IA**: $300/mes (acceso a predicciones avanzadas)
- **Soporte premium**: $100/mes

---

## ✅ 9. CASOS DE USO DETALLADOS (FLUJOS)

### Caso 1: Inspector Registra Ciclo Cada 2 Horas

```
Inspector llega a máquina → Abre app móvil
↓
Selecciona máquina (ej: "Sopladora 5")
↓
Ingresa datos:
  - Ciclo número (auto-incrementado)
  - Peso lote (en kg)
  - Cantidad de piezas
  - Observaciones (opcional)
↓
App valida datos:
  ✓ Peso dentro de rango (peso_estándar ±10%)
  ✓ Cantidad coherente
  ✓ Timestamp registrado
↓
Sistema guarda en BD:
  - Datos del ciclo
  - IP/dispositivo Inspector
  - Timestamp exacto
↓
Sistema genera alertas si hay anomalía:
  ✗ Peso muy bajo/alto → "⚠️ Revisar piezas"
  ✗ Ciclo tardío → "⚠️ Máquina lenta"
↓
Inspector recibe notificación (push, vibración)
↓
Dashboard actualiza en tiempo real
```

### Caso 2: Sistema Genera Reporte Automático

```
Cada día a las 23:59 → Servidor ejecuta script
↓
Recolecta datos del día:
  - 12 registros de ciclos (2h × 6 máquinas)
  - Cantidad de defectos por máquina
  - Tiempo máquina parada
  - Cambios de molde
↓
Calcula métricas:
  - Total kg producido
  - Total piezas
  - OEE (eficiencia)
  - % defectos
↓
Sistema genera PDF + enviación por email:
  A: Jefe Producción
  A: Jefe Calidad
  A: Gerente General
↓
Datos también se guardan en histórico
↓
IA analiza: "Máquina X está 10% más lenta" → registra insight
```

### Caso 3: Admin Exporta Datos para Auditoría

```
Admin ingresa a "Centro de Datos"
↓
Selecciona opciones:
  - Rango de fechas
  - Máquinas a incluir
  - Qué datos (ciclos, defectos, alertas)
  - Formato (CSV, XLSX, PDF)
↓
Sistema prepara archivo:
  - Datos extraídos de BD
  - Auditoría registrada: "Admin Juan, 14:30, exportó ciclos ene-feb"
  - Link descarga único generado (caduca 10 min)
↓
Admin recibe notificación con link
↓
Download registrado en audit log
↓
Archivo contiene data limpia, sin errores
```

---

## 🎯 10. CRITERIOS DE ÉXITO

**Métricas a medir post-implementación**:

1. ✅ **Reducción de defectos**: -20% en primeros 3 meses
2. ✅ **Reducción de paros máquinas**: -15% (detección preventiva)
3. ✅ **Aumento OEE**: +10% (mejor planificación)
4. ✅ **Reducción tiempo reportes**: De 2 horas manual a 5 minutos automático
5. ✅ **Adopción por usuarios**: >80% usando app diariamente
6. ✅ **Tiempo respuesta a alertas**: <15 minutos
7. ✅ **ROI**: Retorno de inversión en <6 meses

---

## 📞 11. SOPORTE Y MANTENIMIENTO

### Incluido en Contrato
- Soporte técnico por email/whatsapp (24h respuesta)
- Bug fixes críticos (48h)
- Capacitación inicial (2 sesiones de 4h c/u)
- Documentación completa en español

### Adicional (Opcional)
- Soporte 24/7 on-site
- Nuevas funcionalidades custom
- Integración con sistemas existentes cliente

---

## 📌 CONCLUSIÓN

Esta plataforma **resuelve el problema real** de dispersión de datos en plantas de fabricación, proporcionando:
- ✅ **Visibilidad** total del proceso
- ✅ **Automatización** que ahorra tiempo
- ✅ **Inteligencia** que mejora ganancias
- ✅ **Seguridad** que protege datos
- ✅ **Escalabilidad** para crecer

**Próximo paso**: Presentar MVP funcional en 2 meses. Cliente valida, y expandimos con IA predictiva.

---

**Preparado por**: Equipo Técnico  
**Para presentación a**: Cliente Fábrica de Plásticos  
**Fecha**: Abril 2026
