"""
MODELOS DE BASE DE DATOS
========================

Archivo: models/__init__.py + models/base.py (combinado para simplicidad)

Define TODAS las tablas usando SQLAlchemy ORM.
Cada clase = Una tabla en PostgreSQL.

Temas cubiertos:
- Usuarios con roles
- Máquinas
- Ciclos de producción
- Defectos
- Alertas
- Audit Log (inmutable)
"""

from sqlalchemy import (
    Column, Integer, String, Float, DateTime, Boolean, 
    ForeignKey, Enum, Text, JSON
)
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship
from datetime import datetime

# Base para todos los modelos
Base = declarative_base()


# ============================================================================
# TABLA 1: USUARIOS
# ============================================================================

class Usuario(Base):
    """
    Tabla: usuarios
    Almacena información de todos los usuarios del sistema.
    
    Cada usuario tiene:
    - Email único (para login)
    - Contraseña hasheada (nunca en texto plano)
    - Rol que define permisos
    - Departamento
    """
    __tablename__ = "usuarios"
    
    id = Column(Integer, primary_key=True, index=True)
    
    # Credenciales
    email = Column(String(100), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)  # Bcrypt hash
    
    # Información personal
    nombre_completo = Column(String(150), nullable=False)
    departamento = Column(String(100), nullable=False)  # "Producción", "Calidad", etc
    
    # Rol (define permisos)
    rol = Column(String(50), nullable=False)  # "admin", "inspector_produccion", etc
    
    # Estado
    activo = Column(Boolean, default=True)  # false = usuario bloqueado
    
    # Timestamps
    fecha_creacion = Column(DateTime, default=datetime.utcnow)
    ultima_conexion = Column(DateTime, nullable=True)
    
    # Relaciones con otras tablas
    ciclos = relationship("Ciclo", back_populates="inspector")
    audit_logs = relationship("AuditLog", back_populates="usuario")


# ============================================================================
# TABLA 2: MÁQUINAS
# ============================================================================

class Maquina(Base):
    """
    Tabla: maquinas
    Almacena información de máquinas de la planta.
    
    Máquinas disponibles:
    - Sopladoras: 2, 4, 5, 6, 7, 8, 9, 10, 11
    - Inyectoras: 1, 2, 3, 4
    """
    __tablename__ = "maquinas"
    
    id = Column(Integer, primary_key=True, index=True)
    
    # Identificación
    nombre = Column(String(100), unique=True, nullable=False)  # "Sopladora 5"
    tipo = Column(String(50), nullable=False)  # "Sopladora" o "Inyectora"
    
    # Especificaciones
    estado = Column(String(50), default="operativa")  # operativa, mantenimiento, falla
    tiempo_ciclo_estandar = Column(Float, nullable=False)  # segundos
    
    # Histórico
    ciclos_totales = Column(Integer, default=0)
    ultima_calibracion = Column(DateTime, nullable=True)
    fecha_creacion = Column(DateTime, default=datetime.utcnow)
    
    # Relaciones
    ciclos = relationship("Ciclo", back_populates="maquina")
    alertas = relationship("Alerta", back_populates="maquina")


# ============================================================================
# TABLA 3: CICLOS (Centro del sistema)
# ============================================================================

class Ciclo(Base):
    """
    Tabla: ciclos
    TABLA CRÍTICA: Registra CADA ciclo de producción.
    
    Un ciclo = Un lote producido en 1 máquina en ~45 segundos.
    Se registra cada 2 horas (12 ciclos/día/máquina).
    
    Datos registrados por: Inspector de Producción
    """
    __tablename__ = "ciclos"
    
    id = Column(Integer, primary_key=True, index=True)
    
    # Referencia a máquina
    maquina_id = Column(Integer, ForeignKey("maquinas.id"), nullable=False)
    
    # Identificación del ciclo
    numero_ciclo = Column(Integer, nullable=False)  # Secuencial por máquina
    
    # Datos medidos
    peso_kg = Column(Float, nullable=False)  # Peso total del lote en kg
    cantidad_piezas = Column(Integer, nullable=False)  # Cantidad de piezas producidas
    temperatura_proceso = Column(Float, nullable=True)  # Temperatura en °C
    tiempo_ciclo_segundos = Column(Float, nullable=True)  # Tiempo real del ciclo
    
    # Quién registró
    inspector_id = Column(Integer, ForeignKey("usuarios.id"), nullable=False)
    
    # Tipo de orden
    modo_prueba = Column(Boolean, default=False)  # true = orden de prueba, no afecta métricas
    
    # Metadatos
    observaciones = Column(String(500), nullable=True)
    timestamp = Column(DateTime, default=datetime.utcnow, index=True)
    
    # Relaciones
    maquina = relationship("Maquina", back_populates="ciclos")
    inspector = relationship("Usuario", back_populates="ciclos")
    defectos = relationship("Defecto", back_populates="ciclo", cascade="all, delete-orphan")


# ============================================================================
# TABLA 4: DEFECTOS
# ============================================================================

class Defecto(Base):
    """
    Tabla: defectos
    Registra defectos encontrados en ciclos.
    
    Registrado por: Inspector de Calidad
    
    Tipos de defecto:
    - grieta: Fisura en pieza
    - deformacion: Forma anormal
    - peso: Peso fuera de rango
    - medida: Medidas incorrectas
    - otro: Otros defectos
    
    Severidad:
    - menor: No afecta uso
    - mayor: Afecta función
    - crítica: Pieza no usable (alerta CRÍTICA)
    """
    __tablename__ = "defectos"
    
    id = Column(Integer, primary_key=True, index=True)
    
    # Referencia a ciclo donde ocurrió
    ciclo_id = Column(Integer, ForeignKey("ciclos.id"), nullable=False)
    
    # Clasificación
    tipo = Column(String(50), nullable=False)  # grieta, deformacion, peso, medida, otro
    severidad = Column(String(50), nullable=False)  # menor, mayor, critica
    
    # Cantidad de piezas defectuosas
    cantidad = Column(Integer, default=1)
    
    # Detalles
    observaciones = Column(String(500), nullable=True)
    foto_url = Column(String(255), nullable=True)  # URL de foto del defecto (evidencia)
    
    # Auditoría
    inspeccionado_por = Column(Integer, ForeignKey("usuarios.id"), nullable=False)
    fecha = Column(DateTime, default=datetime.utcnow, index=True)
    
    # Relación
    ciclo = relationship("Ciclo", back_populates="defectos")


# ============================================================================
# TABLA 5: ALERTAS (Automáticas del sistema)
# ============================================================================

class Alerta(Base):
    """
    Tabla: alertas
    TABLA CRÍTICA: Alertas generadas AUTOMÁTICAMENTE por el sistema.
    
    Alertas pueden ser:
    1. Peso anómalo: peso_kg está ±10% del promedio
    2. Ciclo lento: tiempo > tiempo_estándar × 1.2
    3. Defecto alto: % defectos > 5%
    4. Máquina falla próxima: detectada por IA (FASE 2)
    
    Niveles:
    - info: Solo informativo
    - warning: Revisar/ajustar
    - critical: PARAR PRODUCCIÓN (>10% defectos)
    
    Workflow:
    1. Sistema genera alerta
    2. Envía notificación push a usuarios relevantes
    3. Aparece en dashboard
    4. Jefe Producción marca como "resuelta"
    5. Se registra en audit log
    """
    __tablename__ = "alertas"
    
    id = Column(Integer, primary_key=True, index=True)
    
    # Clasificación
    nivel = Column(String(50), nullable=False)  # info, warning, critical
    tipo = Column(String(100), nullable=False)  # peso_anómalo, ciclo_lento, defecto_alto, etc
    descripcion = Column(String(500), nullable=False)  # Texto amigable para usuario
    
    # Referencias
    maquina_id = Column(Integer, ForeignKey("maquinas.id"), nullable=True)
    ciclo_id = Column(Integer, ForeignKey("ciclos.id"), nullable=True)
    
    # Estado
    resuelta = Column(Boolean, default=False)
    quien_resolvio = Column(Integer, ForeignKey("usuarios.id"), nullable=True)
    
    # Timestamps
    fecha_generacion = Column(DateTime, default=datetime.utcnow, index=True)
    fecha_resolucion = Column(DateTime, nullable=True)
    
    # Relaciones
    maquina = relationship("Maquina", back_populates="alertas")


# ============================================================================
# TABLA 6: AUDIT LOG (Inmutable - registra TODO)
# ============================================================================

class AuditLog(Base):
    """
    Tabla: audit_log
    TABLA CRÍTICA Y INMUTABLE: Registra cada acción en el sistema.
    
    No permitir DELETE en esta tabla.
    Solo SELECT (lectura) para Admin.
    
    Qué se registra:
    - Login/Logout
    - Registro de ciclos
    - Generación de alertas
    - Descarga de reportes/datos
    - Cambios de usuario
    - Cualquier acción importante
    
    Permite responder:
    - ¿Quién hizo qué?
    - ¿Cuándo?
    - ¿Desde dónde?
    - ¿En qué dispositivo?
    
    Importante para compliance y seguridad.
    """
    __tablename__ = "audit_log"
    
    id = Column(Integer, primary_key=True, index=True)
    
    # Quién hizo la acción
    usuario_id = Column(Integer, ForeignKey("usuarios.id"), nullable=True)
    
    # Qué se hizo
    accion = Column(String(100), nullable=False)  # login, registró_ciclo, exportó_datos, etc
    recurso = Column(String(200), nullable=False)  # usuario_42, ciclo_1001, etc
    
    # Cuándo y dónde
    timestamp = Column(DateTime, default=datetime.utcnow, index=True)
    ip_origen = Column(String(50), nullable=True)
    dispositivo = Column(String(200), nullable=True)  # "iPhone 13", "Tablet Samsung", etc
    
    # Detalles adicionales (JSON como string)
    detalles = Column(String(1000), nullable=True)
    
    # Relación
    usuario = relationship("Usuario", back_populates="audit_logs")
    
    # NOTA: No agregar índices de delete
    # Esta tabla es WRITE-ONLY después de creada


# ============================================================================
# TABLA 7: PREDICCIONES IA (FASE 2 - Pero estructura ahora)
# ============================================================================

class PrediccionIA(Base):
    """
    Tabla: predicciones_ia
    Guarda resultados de predicciones para análisis.
    
    Se usa en FASE 2 para:
    - Predicción de tiempo de ciclo
    - Predicción de defectos
    - Detección de anomalías
    - Recomendaciones de optimización
    
    Por ahora es placeholder, se completa en Fase 2.
    """
    __tablename__ = "predicciones_ia"
    
    id = Column(Integer, primary_key=True, index=True)
    
    # Referencia
    ciclo_id = Column(Integer, ForeignKey("ciclos.id"), nullable=True)
    
    # Qué se predijo
    tipo_prediccion = Column(String(100), nullable=False)  # tiempo_ciclo, defectos, falla_proxima
    valor_predicho = Column(Float, nullable=False)  # Valor de la predicción
    confianza = Column(Float, nullable=False)  # 0.0-1.0 (qué tan seguro está)
    
    # Información del modelo
    modelo_usado = Column(String(100), nullable=False)  # random_forest_v2, etc
    
    # Feedback (se completa cuando ciclo actual termina)
    valor_real = Column(Float, nullable=True)
    error = Column(Float, nullable=True)  # Diferencia entre predicho y real
    
    # Timestamps
    timestamp = Column(DateTime, default=datetime.utcnow)
    fecha_validacion = Column(DateTime, nullable=True)


# ============================================================================
# TABLA 8: REPORTES GENERADOS
# ============================================================================

class Reporte(Base):
    """
    Tabla: reportes
    Almacena información de reportes generados.
    
    Tipos:
    - produccion_diaria: Cada día 23:59
    - defectos: Análisis de defectos
    - oee: Eficiencia general
    - manual: Creado manualmente por inspector
    
    Útil para auditoría y análisis histórico.
    """
    __tablename__ = "reportes"
    
    id = Column(Integer, primary_key=True, index=True)
    
    # Identificación
    fecha = Column(DateTime, nullable=False, index=True)
    tipo = Column(String(50), nullable=False)  # produccion_diaria, defectos, oee, manual
    
    # Archivos generados
    archivo_pdf_url = Column(String(255), nullable=True)
    archivo_xlsx_url = Column(String(255), nullable=True)
    
    # Datos del reporte (JSON guardado como string)
    metricas_json = Column(Text, nullable=True)  # { produccion: 1000, defectos: 5, etc }
    
    # Auditoría
    generado_por = Column(String(100), nullable=False)  # "SISTEMA" o usuario_id
    timestamp = Column(DateTime, default=datetime.utcnow)


# ============================================================================
# EXPORTS
# ============================================================================

# Lista de todos los modelos (útil para crear tablas)
all_models = [
    Usuario,
    Maquina,
    Ciclo,
    Defecto,
    Alerta,
    AuditLog,
    PrediccionIA,
    Reporte
]

"""
CÓMO USAR ESTOS MODELOS:

1. En main.py:
   from models import Base
   Base.metadata.create_all(bind=engine)
   
   Esto crea TODAS las tablas en PostgreSQL.

2. En endpoints:
   from models import Ciclo, Usuario, Alerta
   
   def registrar_ciclo(data, db: Session):
       ciclo = Ciclo(
           maquina_id=data.maquina_id,
           numero_ciclo=data.numero_ciclo,
           peso_kg=data.peso_kg,
           cantidad_piezas=data.cantidad_piezas,
           inspector_id=usuario_id
       )
       db.add(ciclo)
       db.commit()

3. Relaciones automáticas:
   ciclo.maquina      # Acceso a máquina del ciclo
   ciclo.inspector    # Acceso a usuario que registró
   ciclo.defectos     # Lista de defectos de este ciclo
   usuario.ciclos     # Todos los ciclos de un usuario
"""
