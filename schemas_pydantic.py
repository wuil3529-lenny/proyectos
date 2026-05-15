"""
SCHEMAS PYDANTIC
================

Archivo: schemas/base.py (combinado para simplicidad)

Pydantic valida que los datos cumplan con el formato esperado.
Si un request no cumple, retorna error 422 Unprocessable Entity automáticamente.

Ejemplos:
- LoginRequest: Debe tener email (válido) + password (no vacío)
- CicloCreate: Debe tener maquina_id (número), peso (float), etc
- Si falta algo o tipo incorrecto → Error automático
"""

from pydantic import BaseModel, EmailStr, Field, field_validator
from typing import Optional, List
from datetime import datetime


# ============================================================================
# SCHEMAS DE USUARIOS
# ============================================================================

class UsuarioCreate(BaseModel):
    """
    Validación para CREAR nuevo usuario.
    
    Campos requeridos:
    - email: Debe ser email válido
    - password: Mínimo 8 caracteres
    - nombre_completo: No vacío
    - rol: admin, inspector_produccion, etc
    - departamento: Producción, Calidad, etc
    """
    email: EmailStr  # Valida automáticamente formato email
    password: str = Field(..., min_length=8)  # Mínimo 8 caracteres
    nombre_completo: str = Field(..., min_length=3, max_length=150)
    rol: str
    departamento: str
    
    @field_validator('rol')
    @classmethod
    def validar_rol(cls, v):
        """Validar que rol sea uno de los permitidos."""
        roles_validos = [
            "admin",
            "jefe_ventas",
            "vendedor",
            "jefe_produccion",
            "inspector_produccion",
            "molinero",
            "jefe_calidad",
            "inspector_calidad",
            "jefe_tecnico",
            "tecnico",
            "jefe_logistica",
            "operario_logistica"
        ]
        if v not in roles_validos:
            raise ValueError(f'Rol debe ser uno de: {roles_validos}')
        return v


class UsuarioResponse(BaseModel):
    """
    Respuesta cuando retornamos datos de usuario.
    NOTA: NO incluye password_hash (seguridad).
    """
    id: int
    email: str
    nombre_completo: str
    rol: str
    departamento: str
    activo: bool
    fecha_creacion: datetime
    
    # Pydantic config para convertir objetos SQLAlchemy
    model_config = {"from_attributes": True}


class UsuarioUpdate(BaseModel):
    """Validación para ACTUALIZAR usuario."""
    nombre_completo: Optional[str] = None
    departamento: Optional[str] = None
    rol: Optional[str] = None
    activo: Optional[bool] = None


# ============================================================================
# SCHEMAS DE AUTENTICACIÓN
# ============================================================================

class LoginRequest(BaseModel):
    """
    Validación para LOGIN.
    
    El usuario ingresa email + contraseña.
    Backend valida contra BD.
    """
    email: EmailStr
    password: str = Field(..., min_length=1)  # Al menos 1 carácter


class LoginResponse(BaseModel):
    """
    Respuesta después de login exitoso.
    
    Incluye:
    - JWT token (para futuros requests)
    - Tipo de token (Bearer)
    - Datos del usuario
    """
    access_token: str
    token_type: str  # Siempre "bearer"
    usuario: UsuarioResponse


class RefreshTokenRequest(BaseModel):
    """Solicitud para renovar token expirado."""
    refresh_token: str


# ============================================================================
# SCHEMAS DE MÁQUINAS
# ============================================================================

class MaquinaCreate(BaseModel):
    """Validación para CREAR máquina nueva."""
    nombre: str = Field(..., min_length=3, max_length=100)
    tipo: str  # "Sopladora" o "Inyectora"
    tiempo_ciclo_estandar: float = Field(..., gt=0)  # Mayor a 0
    
    @field_validator('tipo')
    @classmethod
    def validar_tipo(cls, v):
        """Validar que tipo sea válido."""
        if v not in ["Sopladora", "Inyectora"]:
            raise ValueError('Tipo debe ser "Sopladora" o "Inyectora"')
        return v


class MaquinaResponse(BaseModel):
    """Respuesta con datos de máquina."""
    id: int
    nombre: str
    tipo: str
    estado: str  # operativa, mantenimiento, falla
    tiempo_ciclo_estandar: float
    ciclos_totales: int
    ultima_calibracion: Optional[datetime]
    fecha_creacion: datetime
    
    model_config = {"from_attributes": True}


class MaquinaUpdate(BaseModel):
    """Validación para ACTUALIZAR máquina."""
    estado: Optional[str] = None
    tiempo_ciclo_estandar: Optional[float] = None
    ultima_calibracion: Optional[datetime] = None


# ============================================================================
# SCHEMAS DE CICLOS (Centro del sistema)
# ============================================================================

class CicloCreate(BaseModel):
    """
    Validación para REGISTRAR nuevo ciclo.
    
    Inspector de Producción envía:
    - Máquina donde se produjo
    - Número de ciclo
    - Peso total (kg)
    - Cantidad de piezas
    - Temperatura (opcional)
    - Observaciones (opcional)
    - Modo prueba (true si es orden de prueba)
    """
    maquina_id: int = Field(..., gt=0)  # ID máquina
    numero_ciclo: int = Field(..., gt=0)  # Número secuencial
    peso_kg: float = Field(..., gt=0, le=500)  # Entre 0 y 500 kg
    cantidad_piezas: int = Field(..., gt=0, le=10000)  # Entre 0 y 10000 piezas
    temperatura_proceso: Optional[float] = None  # Opcional
    observaciones: Optional[str] = Field(None, max_length=500)
    modo_prueba: bool = False  # Por defecto, es producción real
    
    @field_validator('peso_kg')
    @classmethod
    def validar_peso(cls, v):
        """Validaciones adicionales de peso."""
        if v < 1:
            raise ValueError('Peso mínimo 1 kg')
        if v > 500:
            raise ValueError('Peso máximo 500 kg')
        return v


class CicloResponse(BaseModel):
    """Respuesta con datos de ciclo registrado."""
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


class CicloConDetalles(CicloResponse):
    """Respuesta extendida con relaciones."""
    maquina: MaquinaResponse  # Datos de máquina
    inspector: UsuarioResponse  # Datos de inspector
    defectos: List['DefectoResponse'] = []  # Lista de defectos


# ============================================================================
# SCHEMAS DE DEFECTOS
# ============================================================================

class DefectoCreate(BaseModel):
    """
    Validación para REGISTRAR defecto.
    
    Inspector de Calidad registra:
    - Ciclo donde ocurrió
    - Tipo de defecto
    - Severidad
    - Cantidad de piezas defectuosas
    - Observaciones
    - Foto (URL de evidencia)
    """
    ciclo_id: int = Field(..., gt=0)
    tipo: str  # grieta, deformacion, peso, medida, otro
    severidad: str  # menor, mayor, critica
    cantidad: int = Field(1, gt=0, le=10000)
    observaciones: Optional[str] = Field(None, max_length=500)
    foto_url: Optional[str] = None
    
    @field_validator('tipo')
    @classmethod
    def validar_tipo(cls, v):
        """Validar tipos de defecto permitidos."""
        tipos_validos = ["grieta", "deformacion", "peso", "medida", "otro"]
        if v not in tipos_validos:
            raise ValueError(f'Tipo debe ser uno de: {tipos_validos}')
        return v
    
    @field_validator('severidad')
    @classmethod
    def validar_severidad(cls, v):
        """Validar severidades permitidas."""
        severidades_validas = ["menor", "mayor", "critica"]
        if v not in severidades_validas:
            raise ValueError(f'Severidad debe ser: {severidades_validas}')
        return v


class DefectoResponse(BaseModel):
    """Respuesta con datos de defecto."""
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


# ============================================================================
# SCHEMAS DE ALERTAS
# ============================================================================

class AlertaCreate(BaseModel):
    """
    Validación para CREAR alerta (uso interno del sistema).
    Los usuarios NO crean alertas manualmente.
    El sistema las genera automáticamente.
    """
    nivel: str  # info, warning, critical
    tipo: str  # peso_anómalo, ciclo_lento, defecto_alto, etc
    descripcion: str = Field(..., max_length=500)
    maquina_id: Optional[int] = None
    ciclo_id: Optional[int] = None
    
    @field_validator('nivel')
    @classmethod
    def validar_nivel(cls, v):
        """Validar niveles de alerta."""
        if v not in ["info", "warning", "critical"]:
            raise ValueError('Nivel debe ser: info, warning o critical')
        return v


class AlertaResponse(BaseModel):
    """Respuesta con datos de alerta."""
    id: int
    nivel: str
    tipo: str
    descripcion: str
    maquina_id: Optional[int]
    ciclo_id: Optional[int]
    resuelta: bool
    quien_resolvio: Optional[int]
    fecha_generacion: datetime
    fecha_resolucion: Optional[datetime]
    
    model_config = {"from_attributes": True}


class AlertaResolver(BaseModel):
    """Validación para RESOLVER alerta."""
    resuelta: bool = True
    # quien_resolvio se asigna automáticamente del usuario autenticado


# ============================================================================
# SCHEMAS DE REPORTES
# ============================================================================

class ReporteRequest(BaseModel):
    """
    Validación para SOLICITAR generación de reporte.
    
    Parámetros:
    - fecha_inicio: Desde cuándo
    - fecha_fin: Hasta cuándo
    - tipo: produccion_diaria, defectos, oee
    - formato: pdf, excel, json
    """
    fecha_inicio: datetime
    fecha_fin: datetime
    tipo: str = "produccion_diaria"
    formato: str = "pdf"  # pdf, excel, json
    
    @field_validator('tipo')
    @classmethod
    def validar_tipo(cls, v):
        """Validar tipos de reporte."""
        if v not in ["produccion_diaria", "defectos", "oee", "manual"]:
            raise ValueError('Tipo inválido')
        return v
    
    @field_validator('formato')
    @classmethod
    def validar_formato(cls, v):
        """Validar formatos de exportación."""
        if v not in ["pdf", "excel", "json"]:
            raise ValueError('Formato debe ser: pdf, excel o json')
        return v


class ReporteResponse(BaseModel):
    """Respuesta con datos de reporte."""
    id: int
    fecha: datetime
    tipo: str
    archivo_pdf_url: Optional[str]
    archivo_xlsx_url: Optional[str]
    generado_por: str
    timestamp: datetime
    
    model_config = {"from_attributes": True}


class MetricasProduccion(BaseModel):
    """
    Métricas de producción para reporte.
    
    KPIs clave:
    - Total kg producido
    - Total piezas
    - % defectos
    - OEE (eficiencia)
    - Máquinas más lentas
    """
    fecha: datetime
    total_kg_producido: float
    total_piezas: int
    total_ciclos: int
    total_defectos: int
    porcentaje_defectos: float
    oee: float  # Overall Equipment Effectiveness (0-100%)
    maquinas_lentas: List[dict]  # Máquinas con baja eficiencia
    observaciones: Optional[str]


# ============================================================================
# SCHEMAS DE AUDITORÍA
# ============================================================================

class AuditLogResponse(BaseModel):
    """Respuesta con datos de audit log."""
    id: int
    usuario_id: Optional[int]
    accion: str
    recurso: str
    timestamp: datetime
    ip_origen: Optional[str]
    dispositivo: Optional[str]
    detalles: Optional[str]
    
    model_config = {"from_attributes": True}


# ============================================================================
# SCHEMAS GENÉRICOS
# ============================================================================

class MessageResponse(BaseModel):
    """Respuesta simple con mensaje."""
    mensaje: str
    codigo: Optional[str] = None


class ErrorResponse(BaseModel):
    """Respuesta de error estándar."""
    error: str
    codigo: int
    detalles: Optional[dict] = None


class PaginationParams(BaseModel):
    """Parámetros para paginación."""
    skip: int = 0  # Número de items a saltar
    limit: int = 50  # Cantidad de items a retornar
    
    @field_validator('limit')
    @classmethod
    def validar_limit(cls, v):
        """Limitar máximo items por request."""
        if v > 1000:
            raise ValueError('Máximo 1000 items por request')
        return v


# ============================================================================
# EXPORT
# ============================================================================

"""
CÓMO USAR ESTOS SCHEMAS:

1. En routers/ciclos.py:
   
   @router.post("/registrar")
   def registrar_ciclo(
       ciclo_data: CicloCreate,  # Valida automáticamente
       db: Session = Depends(get_db)
   ):
       # Aquí ciclo_data ya está validado
       # Crear objeto en BD
       ciclo = Ciclo(**ciclo_data.dict())
       db.add(ciclo)
       db.commit()
       return CicloResponse.from_orm(ciclo)

2. Validación automática:
   - Si POST tiene email inválido → Error 422
   - Si peso_kg > 500 → Error 422
   - Si campo falta → Error 422
   
3. Documentación automática:
   - En /docs de FastAPI se ven todos los campos
   - Tipos esperados
   - Validaciones
"""
