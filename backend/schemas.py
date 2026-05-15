"""
schemas.py - Schemas Pydantic para validación de requests/responses
"""

from pydantic import BaseModel, EmailStr, Field, field_validator
from typing import Optional, List
from datetime import datetime, date


# ──────────────────────────────────────────────────────────────────
# USUARIOS
# ──────────────────────────────────────────────────────────────────

ROLES_VALIDOS = [
    "admin", "jefe_ventas", "vendedor", "jefe_produccion",
    "inspector_produccion", "molinero", "jefe_calidad",
    "inspector_calidad", "jefe_tecnico", "tecnico",
    "jefe_logistica", "operario_logistica",
]


class UsuarioCreate(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=8)
    nombre_completo: str = Field(..., min_length=3, max_length=150)
    rol: str
    departamento: str

    @field_validator("rol")
    @classmethod
    def validar_rol(cls, v):
        if v not in ROLES_VALIDOS:
            raise ValueError(f"Rol debe ser uno de: {ROLES_VALIDOS}")
        return v


class UsuarioResponse(BaseModel):
    id: int
    email: str
    nombre_completo: str
    rol: str
    departamento: str
    activo: bool
    fecha_creacion: datetime
    model_config = {"from_attributes": True}


class UsuarioUpdate(BaseModel):
    nombre_completo: Optional[str] = None
    departamento: Optional[str] = None
    rol: Optional[str] = None
    activo: Optional[bool] = None


class PasswordResetBody(BaseModel):
    nueva_password: str = Field(..., min_length=8)


# ──────────────────────────────────────────────────────────────────
# AUTENTICACIÓN
# ──────────────────────────────────────────────────────────────────

class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=1)


class LoginResponse(BaseModel):
    access_token: str
    token_type: str
    usuario: UsuarioResponse


# ──────────────────────────────────────────────────────────────────
# MÁQUINAS
# ──────────────────────────────────────────────────────────────────

class MaquinaCreate(BaseModel):
    nombre: str = Field(..., min_length=3, max_length=100)
    tipo: str
    tiempo_ciclo_estandar: float = Field(..., gt=0)

    @field_validator("tipo")
    @classmethod
    def validar_tipo(cls, v):
        if v not in ["Sopladora", "Inyectora"]:
            raise ValueError('Tipo debe ser "Sopladora" o "Inyectora"')
        return v


class MaquinaResponse(BaseModel):
    id: int
    nombre: str
    tipo: str
    estado: str
    tiempo_ciclo_estandar: float
    ciclos_totales: int
    ultima_calibracion: Optional[datetime]
    fecha_creacion: datetime
    model_config = {"from_attributes": True}


class MaquinaUpdate(BaseModel):
    estado: Optional[str] = None
    tiempo_ciclo_estandar: Optional[float] = None
    ultima_calibracion: Optional[datetime] = None


# ──────────────────────────────────────────────────────────────────
# CICLOS
# ──────────────────────────────────────────────────────────────────

class CicloCreate(BaseModel):
    maquina_id: int = Field(..., gt=0)
    numero_ciclo: int = Field(..., gt=0)
    peso_kg: float = Field(..., gt=0, le=500)
    cantidad_piezas: int = Field(..., gt=0, le=10000)
    temperatura_proceso: Optional[float] = None
    observaciones: Optional[str] = Field(None, max_length=500)
    modo_prueba: bool = False


class CicloResponse(BaseModel):
    id: int
    maquina_id: int
    numero_ciclo: int
    peso_kg: float
    cantidad_piezas: int
    temperatura_proceso: Optional[float]
    tiempo_ciclo_segundos: Optional[float]
    inspector_id: int
    modo_prueba: bool
    timestamp: datetime
    observaciones: Optional[str]
    model_config = {"from_attributes": True}


# ──────────────────────────────────────────────────────────────────
# DEFECTOS
# ──────────────────────────────────────────────────────────────────

TIPOS_DEFECTO = ["grieta", "deformacion", "peso", "medida", "otro"]
SEVERIDADES = ["menor", "mayor", "critica"]


class DefectoCreate(BaseModel):
    ciclo_id: int = Field(..., gt=0)
    tipo: str
    severidad: str
    cantidad: int = Field(1, gt=0, le=10000)
    observaciones: Optional[str] = Field(None, max_length=500)
    foto_url: Optional[str] = None

    @field_validator("tipo")
    @classmethod
    def validar_tipo(cls, v):
        if v not in TIPOS_DEFECTO:
            raise ValueError(f"Tipo debe ser uno de: {TIPOS_DEFECTO}")
        return v

    @field_validator("severidad")
    @classmethod
    def validar_severidad(cls, v):
        if v not in SEVERIDADES:
            raise ValueError(f"Severidad debe ser: {SEVERIDADES}")
        return v


class DefectoResponse(BaseModel):
    id: int
    ciclo_id: int
    tipo: str
    severidad: str
    cantidad: int
    observaciones: Optional[str]
    foto_url: Optional[str]
    inspeccionado_por: int
    fecha: datetime
    model_config = {"from_attributes": True}


# ──────────────────────────────────────────────────────────────────
# ALERTAS
# ──────────────────────────────────────────────────────────────────

class AlertaCreate(BaseModel):
    nivel: str
    tipo: Optional[str] = "general"
    descripcion: str = Field(..., min_length=5, max_length=500)
    maquina_id: Optional[int] = None
    tipo_rechazo: Optional[str] = Field(None, max_length=200)
    tiempo_estimado_horas: Optional[int] = Field(None, gt=0)


class AlertaResolverBody(BaseModel):
    notas_resolucion: Optional[str] = None


class AlertaResponse(BaseModel):
    id: int
    nivel: str
    tipo: str
    descripcion: str
    maquina_id: Optional[int]
    ciclo_id: Optional[int]
    tipo_rechazo: Optional[str]
    tiempo_estimado_horas: Optional[int]
    resuelta: bool
    quien_resolvio: Optional[int]
    nombre_resolvio: Optional[str] = None
    notas_resolucion: Optional[str] = None
    fecha_generacion: datetime
    fecha_resolucion: Optional[datetime]
    model_config = {"from_attributes": True}


# ──────────────────────────────────────────────────────────────────
# INSPECTOR DE PRODUCCIÓN
# ──────────────────────────────────────────────────────────────────

class DefectoItem(BaseModel):
    tipo: str
    cantidad: int = Field(..., ge=0)

class ParadaItem(BaseModel):
    hora_inicio: str   # "HH:MM"
    hora_fin: str      # "HH:MM"
    motivo: str

class CierreTurnoCreate(BaseModel):
    maquina_id: int
    plan_id: Optional[int] = None
    turno: str
    fecha_turno: str                    # "2026-04-17"
    operador_nombre: str = Field(..., min_length=2, max_length=150)
    envases_buenos: int = Field(..., ge=0)
    defectos: Optional[List[DefectoItem]] = []
    paradas: Optional[List[ParadaItem]] = []
    notas: Optional[str] = None

class CierreTurnoResponse(BaseModel):
    id: int
    maquina_id: int
    plan_id: Optional[int]
    turno: str
    fecha_turno: str
    operador_nombre: str
    envases_buenos: int
    defectos: Optional[str]
    paradas: Optional[str]
    notas: Optional[str]
    inspector_id: int
    inspector_nombre: Optional[str] = None
    maquina_nombre: Optional[str] = None
    fecha_registro: datetime
    model_config = {"from_attributes": True}

class MedicionCreate(BaseModel):
    maquina_id: int
    plan_id: Optional[int] = None
    tipo: str = "medicion"
    tiempo_ciclo_seg: Optional[float] = Field(None, gt=0)
    peso_gramos: Optional[float] = Field(None, gt=0)
    temperatura: Optional[float] = Field(None, gt=0)
    peso_neto_gramos: Optional[float] = Field(None, gt=0)
    peso_bruto_gramos: Optional[float] = Field(None, gt=0)
    cavidades: Optional[int] = Field(None, gt=0)
    defectos: Optional[List[DefectoItem]] = []

class MedicionResponse(BaseModel):
    id: int
    maquina_id: int
    plan_id: Optional[int]
    tipo: Optional[str] = "medicion"
    tiempo_ciclo_seg: Optional[float]
    peso_gramos: Optional[float]
    temperatura: Optional[float] = None
    peso_neto_gramos: Optional[float] = None
    peso_bruto_gramos: Optional[float] = None
    defectos: Optional[str] = None
    inspector_id: int
    inspector_nombre: Optional[str] = None
    maquina_nombre: Optional[str] = None
    fecha_registro: datetime
    # Campos calculados
    cavidades: Optional[int] = None
    piezas_por_hora: Optional[float] = None
    faltante: Optional[int] = None
    tiempo_restante_min: Optional[float] = None
    model_config = {"from_attributes": True}


# ──────────────────────────────────────────────────────────────────
# REPORTES
# ──────────────────────────────────────────────────────────────────

class ReporteRequest(BaseModel):
    fecha_inicio: datetime
    fecha_fin: datetime
    tipo: str = "produccion_diaria"
    formato: str = "json"

    @field_validator("tipo")
    @classmethod
    def validar_tipo(cls, v):
        if v not in ["produccion_diaria", "defectos", "oee", "manual"]:
            raise ValueError("Tipo de reporte inválido")
        return v

    @field_validator("formato")
    @classmethod
    def validar_formato(cls, v):
        if v not in ["pdf", "excel", "json"]:
            raise ValueError("Formato debe ser: pdf, excel o json")
        return v


class ReporteResponse(BaseModel):
    id: int
    fecha: datetime
    tipo: str
    archivo_pdf_url: Optional[str]
    archivo_xlsx_url: Optional[str]
    generado_por: str
    timestamp: datetime
    model_config = {"from_attributes": True}


class MetricasProduccion(BaseModel):
    fecha_inicio: datetime
    fecha_fin: datetime
    total_kg_producido: float
    total_piezas: int
    total_ciclos: int
    total_defectos: int
    porcentaje_defectos: float
    oee: float
    alertas_activas: int
    maquinas_lentas: List[dict]


# ──────────────────────────────────────────────────────────────────
# AUDIT LOG
# ──────────────────────────────────────────────────────────────────

class AuditLogResponse(BaseModel):
    id: int
    usuario_id: Optional[int]
    accion: str
    recurso: str
    timestamp: datetime
    ip_origen: Optional[str]
    dispositivo: Optional[str]
    detalles: Optional[str]
    model_config = {"from_attributes": True}


# ──────────────────────────────────────────────────────────────────
# GENÉRICOS
# ──────────────────────────────────────────────────────────────────

class MessageResponse(BaseModel):
    mensaje: str
    codigo: Optional[str] = None


class PaginationParams(BaseModel):
    skip: int = 0
    limit: int = Field(50, le=1000)


# ──────────────────────────────────────────────────────────────────
# PRODUCTOS
# ──────────────────────────────────────────────────────────────────

class ProductoCreate(BaseModel):
    nombre: str = Field(..., min_length=2, max_length=150)
    cliente: str = Field(..., min_length=2, max_length=150)
    molde: str = Field(..., min_length=1, max_length=100)
    cavidades: int = Field(..., gt=0)
    peso_env_min: float = Field(..., gt=0)
    peso_env_max: float = Field(..., gt=0)
    peso_bruto_min: float = Field(..., gt=0)
    peso_bruto_max: float = Field(..., gt=0)
    temp_min: float = Field(..., gt=0)
    temp_max: float = Field(..., gt=0)
    tipo: str = "generico"
    resina: Optional[str] = Field(None, max_length=150)
    colorante: Optional[str] = Field(None, max_length=150)


class ProductoUpdate(BaseModel):
    nombre: Optional[str] = None
    cliente: Optional[str] = None
    molde: Optional[str] = None
    cavidades: Optional[int] = None
    peso_env_min: Optional[float] = None
    peso_env_max: Optional[float] = None
    peso_bruto_min: Optional[float] = None
    peso_bruto_max: Optional[float] = None
    temp_min: Optional[float] = None
    temp_max: Optional[float] = None
    tipo: Optional[str] = None
    resina: Optional[str] = None
    colorante: Optional[str] = None


class ProductoResponse(BaseModel):
    id: int
    nombre: str
    cliente: str
    molde: str
    cavidades: int
    peso_env_min: float
    peso_env_max: float
    peso_bruto_min: float
    peso_bruto_max: float
    temp_min: float
    temp_max: float
    tipo: str
    resina: Optional[str]
    colorante: Optional[str]
    fecha_creacion: datetime
    model_config = {"from_attributes": True}


# ──────────────────────────────────────────────────────────────────
# MATERIALES (logística)
# ──────────────────────────────────────────────────────────────────

class MaterialCreate(BaseModel):
    nombre: str = Field(..., min_length=2, max_length=150)
    categoria: Optional[str] = Field(None, max_length=100)
    proveedor: Optional[str] = Field(None, max_length=150)
    stock_inicial: Optional[float] = Field(None, ge=0)
    unidad: Optional[str] = Field(None, max_length=30)
    fecha_ingreso: Optional[str] = None
    numero_lote: Optional[str] = Field(None, max_length=100)


class MaterialUpdate(BaseModel):
    nombre: Optional[str] = None
    categoria: Optional[str] = None
    proveedor: Optional[str] = None
    stock_inicial: Optional[float] = None
    stock_disponible: Optional[float] = None
    unidad: Optional[str] = None
    fecha_ingreso: Optional[str] = None
    numero_lote: Optional[str] = None
    activo: Optional[bool] = None


class MaterialConsumir(BaseModel):
    cantidad: float = Field(..., gt=0)


class MaterialResponse(BaseModel):
    id: int
    nombre: str
    categoria: Optional[str]
    proveedor: Optional[str]
    stock_inicial: Optional[float]
    stock_disponible: Optional[float]
    unidad: Optional[str]
    fecha_ingreso: Optional[str]
    numero_lote: Optional[str]
    activo: bool
    registrado_por: Optional[int]
    fecha_creacion: datetime
    model_config = {"from_attributes": True}


# ──────────────────────────────────────────────────────────────────
# PLAN DE PRODUCCIÓN
# ──────────────────────────────────────────────────────────────────

class PlanCreate(BaseModel):
    pedido_id: int
    maquina_id: int
    orden: Optional[int] = 0
    material_id: Optional[int] = None
    resina_asignada: Optional[str] = Field(None, max_length=150)
    colorante_asignado: Optional[str] = Field(None, max_length=150)
    fecha_programada: Optional[date] = None
    hora_programada: Optional[str] = Field(None, max_length=5)
    notas: Optional[str] = Field(None, max_length=500)
    cavidades_arranque: Optional[int] = None
    peso_bruto_arranque: Optional[float] = None
    temperatura_referencia: Optional[float] = None


class PlanUpdate(BaseModel):
    maquina_id: Optional[int] = None
    orden: Optional[int] = None
    estado: Optional[str] = None
    material_id: Optional[int] = None
    resina_asignada: Optional[str] = None
    colorante_asignado: Optional[str] = None
    fecha_programada: Optional[date] = None
    hora_programada: Optional[str] = None
    hora_arranque: Optional[datetime] = None
    cavidades_arranque: Optional[int] = None
    peso_bruto_arranque: Optional[float] = None
    notas: Optional[str] = None
    # Cierre
    envases_producidos: Optional[int] = None
    kg_consumidos: Optional[float] = None
    indice_rechazo: Optional[float] = None
    inspector_produccion_id: Optional[int] = None
    inspector_calidad_id: Optional[int] = None
    personal_adicional: Optional[str] = None
    hora_finalizacion: Optional[datetime] = None


class PlanResponse(BaseModel):
    id: int
    pedido_id: int
    maquina_id: int
    orden: int
    estado: str
    material_id: Optional[int] = None
    resina_asignada: Optional[str] = None
    colorante_asignado: Optional[str] = None
    fecha_programada: Optional[datetime] = None
    hora_programada: Optional[str] = None
    hora_arranque: Optional[datetime] = None
    cavidades_arranque: Optional[int] = None
    peso_bruto_arranque: Optional[float] = None
    notas: Optional[str] = None
    envases_producidos: Optional[int] = None
    kg_consumidos: Optional[float] = None
    indice_rechazo: Optional[float] = None
    inspector_produccion_id: Optional[int] = None
    inspector_calidad_id: Optional[int] = None
    personal_adicional: Optional[str] = None
    hora_finalizacion: Optional[datetime] = None
    creado_por: Optional[int] = None
    fecha_creacion: datetime
    model_config = {"from_attributes": True}


# ──────────────────────────────────────────────────────────────────
# PEDIDOS
# ──────────────────────────────────────────────────────────────────

class PedidoCreate(BaseModel):
    numero_pedido: Optional[str] = None
    cliente: str = Field(..., min_length=2, max_length=150)
    producto: str = Field(..., min_length=2, max_length=150)
    producto_id: Optional[int] = None
    cantidad_unidades: Optional[int] = Field(None, gt=0)
    cantidad_kg: float = Field(..., gt=0)
    fecha_entrega: datetime
    observaciones: Optional[str] = Field(None, max_length=500)
    prioridad: str = "normal"
    estado: str = "pendiente"


class PedidoUpdate(BaseModel):
    cliente: Optional[str] = None
    producto: Optional[str] = None
    producto_id: Optional[int] = None
    cantidad_unidades: Optional[int] = None
    cantidad_kg: Optional[float] = None
    fecha_entrega: Optional[datetime] = None
    observaciones: Optional[str] = None
    prioridad: Optional[str] = None
    estado: Optional[str] = None


class PedidoResponse(BaseModel):
    id: int
    numero_pedido: Optional[str]
    cliente: str
    producto: str
    producto_id: Optional[int]
    cantidad_unidades: Optional[int]
    cantidad_kg: float
    fecha_entrega: datetime
    observaciones: Optional[str]
    prioridad: str
    estado: str
    creado_por: Optional[int]
    fecha_creacion: datetime
    model_config = {"from_attributes": True}
