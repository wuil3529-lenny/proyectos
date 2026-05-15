"""
models.py - Modelos SQLAlchemy (tablas de PostgreSQL)
"""

from sqlalchemy import Column, Integer, String, Float, DateTime, Boolean, ForeignKey, Text
from sqlalchemy.orm import relationship
from datetime import datetime
from database import Base


class Usuario(Base):
    __tablename__ = "usuarios"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(100), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    nombre_completo = Column(String(150), nullable=False)
    departamento = Column(String(100), nullable=False)
    rol = Column(String(50), nullable=False)
    activo = Column(Boolean, default=True)
    fecha_creacion = Column(DateTime, default=datetime.utcnow)
    ultima_conexion = Column(DateTime, nullable=True)

    ciclos = relationship("Ciclo", back_populates="inspector")
    audit_logs = relationship("AuditLog", back_populates="usuario")


class Maquina(Base):
    __tablename__ = "maquinas"

    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String(100), unique=True, nullable=False)
    tipo = Column(String(50), nullable=False)          # "Sopladora" | "Inyectora"
    estado = Column(String(50), default="operativa")   # operativa | mantenimiento | falla
    tiempo_ciclo_estandar = Column(Float, nullable=False)  # segundos
    ciclos_totales = Column(Integer, default=0)
    ultima_calibracion = Column(DateTime, nullable=True)
    fecha_creacion = Column(DateTime, default=datetime.utcnow)

    ciclos = relationship("Ciclo", back_populates="maquina")
    alertas = relationship("Alerta", back_populates="maquina")


class Ciclo(Base):
    __tablename__ = "ciclos"

    id = Column(Integer, primary_key=True, index=True)
    maquina_id = Column(Integer, ForeignKey("maquinas.id"), nullable=False)
    numero_ciclo = Column(Integer, nullable=False)
    peso_kg = Column(Float, nullable=False)
    cantidad_piezas = Column(Integer, nullable=False)
    temperatura_proceso = Column(Float, nullable=True)
    tiempo_ciclo_segundos = Column(Float, nullable=True)
    inspector_id = Column(Integer, ForeignKey("usuarios.id"), nullable=False)
    modo_prueba = Column(Boolean, default=False)
    observaciones = Column(String(500), nullable=True)
    timestamp = Column(DateTime, default=datetime.utcnow, index=True)

    maquina = relationship("Maquina", back_populates="ciclos")
    inspector = relationship("Usuario", back_populates="ciclos")
    defectos = relationship("Defecto", back_populates="ciclo", cascade="all, delete-orphan")


class Defecto(Base):
    __tablename__ = "defectos"

    id = Column(Integer, primary_key=True, index=True)
    ciclo_id = Column(Integer, ForeignKey("ciclos.id"), nullable=False)
    tipo = Column(String(50), nullable=False)       # grieta | deformacion | peso | medida | otro
    severidad = Column(String(50), nullable=False)  # menor | mayor | critica
    cantidad = Column(Integer, default=1)
    observaciones = Column(String(500), nullable=True)
    foto_url = Column(String(255), nullable=True)
    inspeccionado_por = Column(Integer, ForeignKey("usuarios.id"), nullable=False)
    fecha = Column(DateTime, default=datetime.utcnow, index=True)

    ciclo = relationship("Ciclo", back_populates="defectos")


class Alerta(Base):
    __tablename__ = "alertas"

    id = Column(Integer, primary_key=True, index=True)
    nivel = Column(String(50), nullable=False)      # info | warning | critical
    tipo = Column(String(100), nullable=False)      # peso_anomalo | ciclo_lento | defecto_alto | etc
    descripcion = Column(String(500), nullable=False)
    maquina_id = Column(Integer, ForeignKey("maquinas.id"), nullable=True)
    ciclo_id = Column(Integer, ForeignKey("ciclos.id"), nullable=True)
    tipo_rechazo = Column(String(200), nullable=True)
    tiempo_estimado_horas = Column(Integer, nullable=True)
    resuelta = Column(Boolean, default=False)
    quien_resolvio = Column(Integer, ForeignKey("usuarios.id"), nullable=True)
    notas_resolucion = Column(String(500), nullable=True)
    fecha_generacion = Column(DateTime, default=datetime.utcnow, index=True)
    fecha_resolucion = Column(DateTime, nullable=True)

    maquina = relationship("Maquina", back_populates="alertas")


class AuditLog(Base):
    """Inmutable: solo INSERT, nunca DELETE."""
    __tablename__ = "audit_log"

    id = Column(Integer, primary_key=True, index=True)
    usuario_id = Column(Integer, ForeignKey("usuarios.id"), nullable=True)
    accion = Column(String(100), nullable=False)
    recurso = Column(String(200), nullable=False)
    timestamp = Column(DateTime, default=datetime.utcnow, index=True)
    ip_origen = Column(String(50), nullable=True)
    dispositivo = Column(String(200), nullable=True)
    detalles = Column(String(1000), nullable=True)

    usuario = relationship("Usuario", back_populates="audit_logs")


class CierreTurno(Base):
    __tablename__ = "cierres_turno"

    id = Column(Integer, primary_key=True, index=True)
    maquina_id = Column(Integer, ForeignKey("maquinas.id"), nullable=False)
    plan_id = Column(Integer, ForeignKey("plan_produccion.id"), nullable=True)
    turno = Column(String(20), nullable=False)       # manana | tarde | noche
    fecha_turno = Column(String(10), nullable=False) # "2026-04-17" (fecha VE)
    operador_nombre = Column(String(150), nullable=False)
    envases_buenos = Column(Integer, nullable=False, default=0)
    defectos = Column(Text, nullable=True)           # JSON: [{"tipo":"...","cantidad":N}]
    paradas = Column(Text, nullable=True)            # JSON: [{"hora_inicio":"HH:MM","hora_fin":"HH:MM","motivo":"..."}]
    notas = Column(Text, nullable=True)
    inspector_id = Column(Integer, ForeignKey("usuarios.id"), nullable=False)
    fecha_registro = Column(DateTime, default=datetime.utcnow)

    maquina = relationship("Maquina")


class MedicionProduccion(Base):
    __tablename__ = "mediciones_produccion"

    id = Column(Integer, primary_key=True, index=True)
    maquina_id = Column(Integer, ForeignKey("maquinas.id"), nullable=False)
    plan_id = Column(Integer, ForeignKey("plan_produccion.id"), nullable=True)
    tipo = Column(String(20), default="medicion")   # arranque | medicion
    tiempo_ciclo_seg = Column(Float, nullable=True)
    peso_gramos = Column(Float, nullable=True)
    temperatura = Column(Float, nullable=True)
    peso_neto_gramos = Column(Float, nullable=True)
    peso_bruto_gramos = Column(Float, nullable=True)
    defectos = Column(Text, nullable=True)           # JSON: [{"tipo":"...","cantidad":N}]
    inspector_id = Column(Integer, ForeignKey("usuarios.id"), nullable=False)
    fecha_registro = Column(DateTime, default=datetime.utcnow)

    maquina = relationship("Maquina")


class PrediccionIA(Base):
    __tablename__ = "predicciones_ia"

    id = Column(Integer, primary_key=True, index=True)
    ciclo_id = Column(Integer, ForeignKey("ciclos.id"), nullable=True)
    tipo_prediccion = Column(String(100), nullable=False)
    valor_predicho = Column(Float, nullable=False)
    confianza = Column(Float, nullable=False)
    modelo_usado = Column(String(100), nullable=False)
    valor_real = Column(Float, nullable=True)
    error = Column(Float, nullable=True)
    timestamp = Column(DateTime, default=datetime.utcnow)
    fecha_validacion = Column(DateTime, nullable=True)


class Reporte(Base):
    __tablename__ = "reportes"

    id = Column(Integer, primary_key=True, index=True)
    fecha = Column(DateTime, nullable=False, index=True)
    tipo = Column(String(50), nullable=False)
    archivo_pdf_url = Column(String(255), nullable=True)
    archivo_xlsx_url = Column(String(255), nullable=True)
    metricas_json = Column(Text, nullable=True)
    generado_por = Column(String(100), nullable=False, default="SISTEMA")
    timestamp = Column(DateTime, default=datetime.utcnow)


class Producto(Base):
    __tablename__ = "productos"

    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String(150), nullable=False)
    cliente = Column(String(150), nullable=False)
    molde = Column(String(100), nullable=False)
    cavidades = Column(Integer, nullable=False)
    peso_env_min = Column(Float, nullable=False)
    peso_env_max = Column(Float, nullable=False)
    peso_bruto_min = Column(Float, nullable=False)
    peso_bruto_max = Column(Float, nullable=False)
    temp_min = Column(Float, nullable=False)
    temp_max = Column(Float, nullable=False)
    tipo = Column(String(20), default="generico")   # generico | exclusivo
    resina = Column(String(150), nullable=True)
    colorante = Column(String(150), nullable=True)
    fecha_creacion = Column(DateTime, default=datetime.utcnow)


class Material(Base):
    __tablename__ = "materiales"

    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String(150), nullable=False)
    categoria = Column(String(100), nullable=True)
    proveedor = Column(String(150), nullable=True)
    stock_inicial = Column(Float, nullable=True)
    stock_disponible = Column(Float, nullable=True)
    unidad = Column(String(30), nullable=True)          # kg, unidades, rollos…
    fecha_ingreso = Column(String(20), nullable=True)
    numero_lote = Column(String(100), nullable=True)
    activo = Column(Boolean, default=True)
    registrado_por = Column(Integer, ForeignKey("usuarios.id"), nullable=True)
    fecha_creacion = Column(DateTime, default=datetime.utcnow)


class PlanProduccion(Base):
    __tablename__ = "plan_produccion"

    id = Column(Integer, primary_key=True, index=True)
    pedido_id = Column(Integer, ForeignKey("pedidos.id"), nullable=False)
    maquina_id = Column(Integer, ForeignKey("maquinas.id"), nullable=False)
    orden = Column(Integer, default=0)
    estado = Column(String(50), default="planificado")  # planificado | en_curso | completado
    material_id = Column(Integer, ForeignKey("materiales.id"), nullable=True)
    fecha_programada = Column(DateTime, nullable=True)
    hora_programada = Column(String(5), nullable=True)   # HH:MM estipulada al asignar
    hora_arranque = Column(DateTime, nullable=True)       # hora real al iniciar
    cavidades_arranque = Column(Integer, nullable=True)
    peso_bruto_arranque = Column(Float, nullable=True)
    temperatura_referencia = Column(Float, nullable=True)
    resina_asignada = Column(String(150), nullable=True)
    colorante_asignado = Column(String(150), nullable=True)
    notas = Column(String(500), nullable=True)
    # Cierre de producción
    envases_producidos = Column(Integer, nullable=True)
    kg_consumidos = Column(Float, nullable=True)
    indice_rechazo = Column(Float, nullable=True)       # porcentaje 0-100
    inspector_produccion_id = Column(Integer, ForeignKey("usuarios.id"), nullable=True)
    inspector_calidad_id = Column(Integer, ForeignKey("usuarios.id"), nullable=True)
    personal_adicional = Column(String(1000), nullable=True)  # JSON
    hora_finalizacion = Column(DateTime, nullable=True)
    creado_por = Column(Integer, ForeignKey("usuarios.id"), nullable=True)
    fecha_creacion = Column(DateTime, default=datetime.utcnow)


class Pedido(Base):
    __tablename__ = "pedidos"

    id = Column(Integer, primary_key=True, index=True)
    numero_pedido = Column(String(20), unique=True, nullable=True)
    cliente = Column(String(150), nullable=False)
    producto = Column(String(150), nullable=False)
    producto_id = Column(Integer, ForeignKey("productos.id"), nullable=True)
    cantidad_unidades = Column(Integer, nullable=True)
    cantidad_kg = Column(Float, nullable=False)
    fecha_entrega = Column(DateTime, nullable=False)
    observaciones = Column(String(500), nullable=True)
    prioridad = Column(String(20), default="normal")   # normal | urgente
    estado = Column(String(50), default="pendiente")  # pendiente | en_proceso | entregado | cancelado
    creado_por = Column(Integer, ForeignKey("usuarios.id"), nullable=True)
    fecha_creacion = Column(DateTime, default=datetime.utcnow)
