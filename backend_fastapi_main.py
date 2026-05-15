"""
PLATAFORMA INDUSTRIAL - BACKEND FASTAPI
========================================

Archivo: main.py
Descripción: Servidor principal de la aplicación
- Autenticación JWT
- Gestión de usuarios con roles
- Registro de ciclos de producción
- Generación de alertas
- Base de datos PostgreSQL

Requiere instalar:
pip install fastapi uvicorn sqlalchemy psycopg2-binary python-jose pydantic bcrypt python-dotenv
"""

# ============================================================================
# 1. IMPORTACIONES
# ============================================================================

from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthCredentials
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import create_engine, Column, Integer, String, Float, DateTime, Boolean, ForeignKey, Enum
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session, relationship
from datetime import datetime, timedelta
from typing import Optional, List
from pydantic import BaseModel, EmailStr
from jose import JWTError, jwt
import bcrypt
import os
from dotenv import load_dotenv
import json

# Cargar variables de entorno desde archivo .env
load_dotenv()

# ============================================================================
# 2. CONFIGURACIÓN
# ============================================================================

# Información de la aplicación
APP_NAME = "Plataforma Industrial - Gestión de Producción"
APP_VERSION = "1.0.0"

# Configuración de base de datos PostgreSQL
DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql://usuario:contraseña@localhost:5432/fabrica_produccion"
)

# Configuración de seguridad JWT
SECRET_KEY = os.getenv("SECRET_KEY", "tu-clave-secreta-super-segura-cambiar-en-produccion")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30  # Token expira en 30 minutos

# Crear instancia de FastAPI
app = FastAPI(
    title=APP_NAME,
    version=APP_VERSION,
    description="Sistema de gestión integral para plantas de fabricación de plásticos"
)

# Configurar CORS (permitir conexiones desde frontend)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # En producción, especificar dominios exactos
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ============================================================================
# 3. CONFIGURACIÓN DE BASE DE DATOS
# ============================================================================

# Crear motor de conexión a PostgreSQL
engine = create_engine(
    DATABASE_URL,
    echo=True,  # Mostrar comandos SQL en consola (cambiar a False en producción)
    pool_pre_ping=True  # Verificar conexión antes de usar
)

# Crear sesión
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Base para modelos SQLAlchemy
Base = declarative_base()

# Función para obtener sesión de BD (se usa en cada endpoint)
def get_db():
    """
    Proporciona una sesión de base de datos.
    Se ejecuta automáticamente antes de cada endpoint.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# ============================================================================
# 4. MODELOS DE BASE DE DATOS (SQLAlchemy)
# ============================================================================

class Usuario(Base):
    """
    Tabla: usuarios
    Almacena información de usuarios del sistema
    """
    __tablename__ = "usuarios"
    
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(100), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)  # Hash bcrypt de contraseña
    nombre_completo = Column(String(150), nullable=False)
    rol = Column(String(50), nullable=False)  # "admin", "inspector_produccion", etc
    departamento = Column(String(100), nullable=False)
    activo = Column(Boolean, default=True)
    fecha_creacion = Column(DateTime, default=datetime.utcnow)
    ultima_conexion = Column(DateTime, nullable=True)
    
    # Relación con ciclos registrados por este usuario
    ciclos = relationship("Ciclo", back_populates="inspector")
    # Relación con audit log
    audit_logs = relationship("AuditLog", back_populates="usuario")


class Maquina(Base):
    """
    Tabla: maquinas
    Almacena información de máquinas disponibles
    """
    __tablename__ = "maquinas"
    
    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String(100), unique=True, nullable=False)  # "Sopladora 5", "Inyectora 2"
    tipo = Column(String(50), nullable=False)  # "Sopladora" o "Inyectora"
    estado = Column(String(50), default="operativa")  # "operativa", "mantenimiento", "falla"
    ultima_calibracion = Column(DateTime, nullable=True)
    ciclos_totales = Column(Integer, default=0)
    tiempo_ciclo_estandar = Column(Float, nullable=False)  # segundos
    
    # Relación con ciclos producidos en esta máquina
    ciclos = relationship("Ciclo", back_populates="maquina")
    # Relación con alertas
    alertas = relationship("Alerta", back_populates="maquina")


class Ciclo(Base):
    """
    Tabla: ciclos
    Registro de cada ciclo de producción (cada 2 horas)
    """
    __tablename__ = "ciclos"
    
    id = Column(Integer, primary_key=True, index=True)
    maquina_id = Column(Integer, ForeignKey("maquinas.id"), nullable=False)
    numero_ciclo = Column(Integer, nullable=False)
    peso_kg = Column(Float, nullable=False)  # Peso total del lote
    cantidad_piezas = Column(Integer, nullable=False)
    temperatura_proceso = Column(Float, nullable=True)
    tiempo_ciclo_segundos = Column(Float, nullable=True)
    inspector_id = Column(Integer, ForeignKey("usuarios.id"), nullable=False)
    timestamp = Column(DateTime, default=datetime.utcnow)
    modo_prueba = Column(Boolean, default=False)  # true si es orden de prueba
    observaciones = Column(String(500), nullable=True)
    
    # Relaciones
    maquina = relationship("Maquina", back_populates="ciclos")
    inspector = relationship("Usuario", back_populates="ciclos")
    defectos = relationship("Defecto", back_populates="ciclo")


class Defecto(Base):
    """
    Tabla: defectos
    Registro de defectos encontrados en ciclos
    """
    __tablename__ = "defectos"
    
    id = Column(Integer, primary_key=True, index=True)
    ciclo_id = Column(Integer, ForeignKey("ciclos.id"), nullable=False)
    tipo = Column(String(50), nullable=False)  # "grieta", "deformación", "peso", "medida"
    severidad = Column(String(50), nullable=False)  # "menor", "mayor", "crítica"
    cantidad = Column(Integer, default=1)
    observaciones = Column(String(500), nullable=True)
    foto_url = Column(String(255), nullable=True)
    inspeccionado_por = Column(Integer, ForeignKey("usuarios.id"), nullable=False)
    fecha = Column(DateTime, default=datetime.utcnow)
    
    # Relaciones
    ciclo = relationship("Ciclo", back_populates="defectos")


class Alerta(Base):
    """
    Tabla: alertas
    Alertas automáticas generadas por el sistema
    """
    __tablename__ = "alertas"
    
    id = Column(Integer, primary_key=True, index=True)
    nivel = Column(String(50), nullable=False)  # "info", "warning", "critical"
    tipo = Column(String(100), nullable=False)  # "ciclo_lento", "defecto_alto", "maquina_falla"
    descripcion = Column(String(500), nullable=False)
    maquina_id = Column(Integer, ForeignKey("maquinas.id"), nullable=True)
    ciclo_id = Column(Integer, ForeignKey("ciclos.id"), nullable=True)
    fecha_generacion = Column(DateTime, default=datetime.utcnow)
    resuelta = Column(Boolean, default=False)
    quien_resolvio = Column(Integer, ForeignKey("usuarios.id"), nullable=True)
    
    # Relaciones
    maquina = relationship("Maquina", back_populates="alertas")


class AuditLog(Base):
    """
    Tabla: audit_log
    Registro inmutable de todas las acciones en el sistema
    Importante: NO permitir DELETE en esta tabla
    """
    __tablename__ = "audit_log"
    
    id = Column(Integer, primary_key=True, index=True)
    usuario_id = Column(Integer, ForeignKey("usuarios.id"), nullable=True)
    accion = Column(String(100), nullable=False)  # "login", "registró_ciclo", "exportó_datos"
    recurso = Column(String(200), nullable=False)  # "ciclo_142", "usuario_juan"
    timestamp = Column(DateTime, default=datetime.utcnow)
    ip_origen = Column(String(50), nullable=True)
    dispositivo = Column(String(200), nullable=True)
    detalles = Column(String(1000), nullable=True)  # JSON como string
    
    # Relación
    usuario = relationship("Usuario", back_populates="audit_logs")


# ============================================================================
# 5. MODELOS PYDANTIC (para validación de requests/responses)
# ============================================================================

class UsuarioCreate(BaseModel):
    """
    Validación para crear usuario nuevo
    """
    email: EmailStr
    password: str
    nombre_completo: str
    rol: str
    departamento: str


class UsuarioResponse(BaseModel):
    """
    Respuesta cuando se retorna usuario (sin contraseña)
    """
    id: int
    email: str
    nombre_completo: str
    rol: str
    departamento: str
    activo: bool
    
    class Config:
        from_attributes = True


class LoginRequest(BaseModel):
    """
    Validación para login
    """
    email: EmailStr
    password: str


class LoginResponse(BaseModel):
    """
    Respuesta de login
    """
    access_token: str
    token_type: str
    usuario: UsuarioResponse


class CicloCreate(BaseModel):
    """
    Validación para registrar nuevo ciclo
    """
    maquina_id: int
    numero_ciclo: int
    peso_kg: float
    cantidad_piezas: int
    temperatura_proceso: Optional[float] = None
    observaciones: Optional[str] = None
    modo_prueba: bool = False


class CicloResponse(BaseModel):
    """
    Respuesta con datos del ciclo registrado
    """
    id: int
    maquina_id: int
    numero_ciclo: int
    peso_kg: float
    cantidad_piezas: int
    timestamp: datetime
    
    class Config:
        from_attributes = True


class AlertaResponse(BaseModel):
    """
    Respuesta con datos de alerta
    """
    id: int
    nivel: str
    tipo: str
    descripcion: str
    fecha_generacion: datetime
    resuelta: bool
    
    class Config:
        from_attributes = True


# ============================================================================
# 6. FUNCIONES DE SEGURIDAD
# ============================================================================

def hash_password(password: str) -> str:
    """
    Hashea una contraseña usando bcrypt.
    Nunca guardar contraseñas en texto plano.
    
    Args:
        password: Contraseña en texto plano
        
    Returns:
        Hash bcrypt de la contraseña
    """
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(password.encode('utf-8'), salt)
    return hashed.decode('utf-8')


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    Verifica que una contraseña coincida con su hash bcrypt.
    
    Args:
        plain_password: Contraseña en texto plano
        hashed_password: Hash bcrypt guardado
        
    Returns:
        True si coinciden, False en otro caso
    """
    return bcrypt.checkpw(
        plain_password.encode('utf-8'),
        hashed_password.encode('utf-8')
    )


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """
    Crea un JWT token.
    
    Args:
        data: Datos a incluir en el token (usualmente user_id, role)
        expires_delta: Tiempo de expiración (defecto 30 minutos)
        
    Returns:
        Token JWT
    """
    to_encode = data.copy()
    
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


def decode_token(token: str) -> dict:
    """
    Decodifica y valida un JWT token.
    
    Args:
        token: Token JWT
        
    Returns:
        Payload del token si es válido
        
    Raises:
        JWTError si el token es inválido o expirado
    """
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except JWTError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token inválido o expirado",
            headers={"WWW-Authenticate": "Bearer"},
        )


# ============================================================================
# 7. DEPENDENCIAS (Autenticación)
# ============================================================================

security = HTTPBearer()


async def get_current_user(
    credentials: HTTPAuthCredentials = Depends(security),
    db: Session = Depends(get_db)
) -> Usuario:
    """
    Valida el JWT token y retorna el usuario autenticado.
    Se usa como dependencia en los endpoints que requieren autenticación.
    
    Args:
        credentials: Token Bearer del header Authorization
        db: Sesión de base de datos
        
    Returns:
        Usuario autenticado
        
    Raises:
        HTTPException 401 si token es inválido
    """
    # Decodificar token
    payload = decode_token(credentials.credentials)
    user_id: int = payload.get("sub")
    
    if user_id is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token inválido"
        )
    
    # Buscar usuario en BD
    usuario = db.query(Usuario).filter(Usuario.id == user_id).first()
    
    if usuario is None or not usuario.activo:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Usuario no encontrado o inactivo"
        )
    
    return usuario


def require_role(required_role: str):
    """
    Factory para crear dependencia que valida un rol específico.
    
    Uso:
        @app.get("/admin-only")
        def admin_endpoint(usuario = Depends(require_role("admin")))
    """
    async def check_role(usuario: Usuario = Depends(get_current_user)):
        if usuario.rol != required_role and usuario.rol != "admin":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Se requiere rol: {required_role}"
            )
        return usuario
    
    return check_role


# ============================================================================
# 8. FUNCIONES AUXILIARES DE LÓGICA
# ============================================================================

def registrar_audit(
    db: Session,
    usuario_id: Optional[int],
    accion: str,
    recurso: str,
    ip_origen: str = "127.0.0.1",
    dispositivo: str = "Unknown",
    detalles: Optional[str] = None
):
    """
    Registra una acción en el audit log (inmutable).
    
    Args:
        db: Sesión de BD
        usuario_id: ID del usuario que realizó la acción
        accion: Tipo de acción ("login", "registró_ciclo", etc)
        recurso: Qué se modificó ("usuario_juan", "ciclo_142", etc)
        ip_origen: IP desde donde se realizó
        dispositivo: Nombre del dispositivo
        detalles: JSON adicional como string
    """
    log = AuditLog(
        usuario_id=usuario_id,
        accion=accion,
        recurso=recurso,
        ip_origen=ip_origen,
        dispositivo=dispositivo,
        detalles=detalles
    )
    db.add(log)
    db.commit()


def generar_alerta(
    db: Session,
    nivel: str,
    tipo: str,
    descripcion: str,
    maquina_id: Optional[int] = None,
    ciclo_id: Optional[int] = None
):
    """
    Genera una alerta en el sistema.
    
    Args:
        db: Sesión de BD
        nivel: "info", "warning" o "critical"
        tipo: "ciclo_lento", "defecto_alto", etc
        descripcion: Texto de la alerta
        maquina_id: ID de máquina asociada (opcional)
        ciclo_id: ID de ciclo asociado (opcional)
    """
    alerta = Alerta(
        nivel=nivel,
        tipo=tipo,
        descripcion=descripcion,
        maquina_id=maquina_id,
        ciclo_id=ciclo_id
    )
    db.add(alerta)
    db.commit()
    
    # Aquí se podría enviar notificación push, email, etc.
    # enviar_notificacion(alerta, nivel)


# ============================================================================
# 9. ENDPOINTS - AUTENTICACIÓN
# ============================================================================

@app.post("/api/auth/registrar", response_model=UsuarioResponse)
def registrar(usuario_data: UsuarioCreate, db: Session = Depends(get_db)):
    """
    Crea un nuevo usuario en el sistema.
    
    Verificaciones:
    - Email no debe estar duplicado
    - Contraseña se hashea con bcrypt
    - Se asigna rol
    
    Respuesta:
    - Datos del usuario creado (sin contraseña)
    """
    # Verificar que email no exista
    usuario_existente = db.query(Usuario).filter(
        Usuario.email == usuario_data.email
    ).first()
    
    if usuario_existente:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email ya registrado"
        )
    
    # Crear usuario nuevo
    usuario = Usuario(
        email=usuario_data.email,
        password_hash=hash_password(usuario_data.password),
        nombre_completo=usuario_data.nombre_completo,
        rol=usuario_data.rol,
        departamento=usuario_data.departamento,
        activo=True
    )
    
    db.add(usuario)
    db.commit()
    db.refresh(usuario)
    
    # Registrar en audit log
    registrar_audit(
        db,
        usuario_id=None,  # Sistema lo creó
        accion="crear_usuario",
        recurso=f"usuario_{usuario.id}",
        detalles=f"Email: {usuario.email}, Rol: {usuario.rol}"
    )
    
    return usuario


@app.post("/api/auth/login", response_model=LoginResponse)
def login(login_data: LoginRequest, db: Session = Depends(get_db)):
    """
    Autentica un usuario y retorna un JWT token.
    
    Validaciones:
    - Email existe
    - Contraseña es correcta
    - Usuario está activo
    
    Respuesta:
    - JWT access_token (válido por 30 minutos)
    - Datos del usuario
    """
    # Buscar usuario por email
    usuario = db.query(Usuario).filter(
        Usuario.email == login_data.email
    ).first()
    
    # Verificar que usuario existe y contraseña es correcta
    if not usuario or not verify_password(login_data.password, usuario.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email o contraseña incorrectos"
        )
    
    if not usuario.activo:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Usuario inactivo"
        )
    
    # Crear JWT token
    access_token = create_access_token(
        data={"sub": usuario.id, "role": usuario.rol}
    )
    
    # Registrar login en audit log
    registrar_audit(
        db,
        usuario_id=usuario.id,
        accion="login",
        recurso=f"usuario_{usuario.id}",
        detalles=f"Email: {usuario.email}"
    )
    
    # Actualizar última conexión
    usuario.ultima_conexion = datetime.utcnow()
    db.commit()
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "usuario": usuario
    }


@app.get("/api/auth/me", response_model=UsuarioResponse)
def get_me(usuario: Usuario = Depends(get_current_user)):
    """
    Retorna los datos del usuario autenticado.
    Requiere token JWT válido.
    """
    return usuario


# ============================================================================
# 10. ENDPOINTS - CICLOS DE PRODUCCIÓN
# ============================================================================

@app.post("/api/ciclos/registrar", response_model=CicloResponse)
def registrar_ciclo(
    ciclo_data: CicloCreate,
    usuario: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Registra un nuevo ciclo de producción.
    
    Validaciones:
    - Máquina existe
    - Usuario tiene rol "inspector_produccion" o admin
    - Peso está dentro de rango válido
    - Se genera alerta si hay anomalía
    
    Respuesta:
    - Datos del ciclo registrado
    
    Posibles alertas generadas:
    - Peso anómalo (muy alto/bajo)
    - Ciclo lento (tiempo > estándar × 1.2)
    """
    # Validar rol
    if usuario.rol not in ["inspector_produccion", "admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes permiso para registrar ciclos"
        )
    
    # Validar que máquina existe
    maquina = db.query(Maquina).filter(Maquina.id == ciclo_data.maquina_id).first()
    if not maquina:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Máquina no encontrada"
        )
    
    # Validar peso sea razonable
    if ciclo_data.peso_kg <= 0 or ciclo_data.cantidad_piezas <= 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Peso y cantidad deben ser mayor a 0"
        )
    
    # Crear ciclo
    ciclo = Ciclo(
        maquina_id=ciclo_data.maquina_id,
        numero_ciclo=ciclo_data.numero_ciclo,
        peso_kg=ciclo_data.peso_kg,
        cantidad_piezas=ciclo_data.cantidad_piezas,
        temperatura_proceso=ciclo_data.temperatura_proceso,
        inspector_id=usuario.id,
        modo_prueba=ciclo_data.modo_prueba,
        observaciones=ciclo_data.observaciones
    )
    
    db.add(ciclo)
    db.commit()
    db.refresh(ciclo)
    
    # LÓGICA DE ALERTAS
    # Calcular peso promedio por pieza
    peso_por_pieza = ciclo.peso_kg / ciclo.cantidad_piezas
    
    # Validar peso anómalo (si existe histórico)
    ultimos_ciclos = db.query(Ciclo).filter(
        Ciclo.maquina_id == maquina.id,
        Ciclo.id != ciclo.id
    ).order_by(Ciclo.timestamp.desc()).limit(10).all()
    
    if ultimos_ciclos:
        promedio_peso = sum([c.peso_kg / c.cantidad_piezas for c in ultimos_ciclos]) / len(ultimos_ciclos)
        
        # Si diferencia > 10%, generar alerta
        diferencia = abs(peso_por_pieza - promedio_peso) / promedio_peso
        if diferencia > 0.10:
            generar_alerta(
                db,
                nivel="warning",
                tipo="peso_anómalo",
                descripcion=f"Peso por pieza {diferencia*100:.1f}% fuera de rango. Esperado: {promedio_peso:.2f}g, Registrado: {peso_por_pieza:.2f}g",
                maquina_id=maquina.id,
                ciclo_id=ciclo.id
            )
    
    # Registrar en audit log
    registrar_audit(
        db,
        usuario_id=usuario.id,
        accion="registró_ciclo",
        recurso=f"ciclo_{ciclo.id}",
        detalles=f"Máquina {maquina.nombre}, {ciclo.cantidad_piezas} piezas, {ciclo.peso_kg}kg"
    )
    
    # Incrementar contador de ciclos en máquina
    maquina.ciclos_totales += 1
    db.commit()
    
    return ciclo


@app.get("/api/ciclos", response_model=List[CicloResponse])
def listar_ciclos(
    maquina_id: Optional[int] = None,
    limite: int = 50,
    usuario: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Lista ciclos registrados.
    
    Parámetros:
    - maquina_id: Filtrar por máquina (opcional)
    - limite: Cantidad máxima a retornar (defecto 50)
    
    Nota: Cada usuario solo ve ciclos relevantes a su rol
    (admin ve todos, inspector ve ciclos de su turno, etc)
    """
    query = db.query(Ciclo).order_by(Ciclo.timestamp.desc())
    
    if maquina_id:
        query = query.filter(Ciclo.maquina_id == maquina_id)
    
    query = query.limit(limite)
    
    return query.all()


# ============================================================================
# 11. ENDPOINTS - ALERTAS
# ============================================================================

@app.get("/api/alertas", response_model=List[AlertaResponse])
def listar_alertas(
    no_resueltas_solo: bool = False,
    usuario: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Lista alertas del sistema.
    
    Parámetros:
    - no_resueltas_solo: Si True, solo retorna alertas sin resolver
    
    Respuesta:
    - Lista de alertas ordenadas por fecha (más recientes primero)
    """
    query = db.query(Alerta).order_by(Alerta.fecha_generacion.desc())
    
    if no_resueltas_solo:
        query = query.filter(Alerta.resuelta == False)
    
    return query.limit(100).all()


@app.post("/api/alertas/{alerta_id}/resolver")
def resolver_alerta(
    alerta_id: int,
    usuario: Usuario = Depends(require_role("jefe_produccion")),
    db: Session = Depends(get_db)
):
    """
    Marca una alerta como resuelta.
    Solo usuarios con rol "jefe_produccion" o "admin" pueden resolver alertas.
    """
    alerta = db.query(Alerta).filter(Alerta.id == alerta_id).first()
    
    if not alerta:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Alerta no encontrada"
        )
    
    alerta.resuelta = True
    alerta.quien_resolvio = usuario.id
    db.commit()
    
    # Registrar en audit log
    registrar_audit(
        db,
        usuario_id=usuario.id,
        accion="resolvió_alerta",
        recurso=f"alerta_{alerta_id}",
        detalles=f"Tipo: {alerta.tipo}"
    )
    
    return {"mensaje": "Alerta resuelta"}


# ============================================================================
# 12. ENDPOINTS - MÁQUINAS
# ============================================================================

@app.get("/api/maquinas")
def listar_maquinas(db: Session = Depends(get_db)):
    """
    Lista todas las máquinas disponibles.
    No requiere autenticación (datos públicos).
    """
    return db.query(Maquina).all()


@app.get("/api/maquinas/{maquina_id}/ciclos", response_model=List[CicloResponse])
def ciclos_por_maquina(
    maquina_id: int,
    usuario: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Lista todos los ciclos de una máquina específica.
    """
    ciclos = db.query(Ciclo).filter(
        Ciclo.maquina_id == maquina_id
    ).order_by(Ciclo.timestamp.desc()).limit(100).all()
    
    return ciclos


# ============================================================================
# 13. ENDPOINT DE PRUEBA / HEALTH CHECK
# ============================================================================

@app.get("/")
def root():
    """Endpoint raíz - verifica que servidor está funcionando"""
    return {
        "nombre": APP_NAME,
        "version": APP_VERSION,
        "estado": "Funcionando ✓",
        "mensaje": "Usar /docs para explorar la API"
    }


@app.get("/api/health")
def health_check():
    """Health check - verifica estado del servidor y BD"""
    try:
        # Intentar conexión a BD
        db = SessionLocal()
        db.execute("SELECT 1")
        db.close()
        
        return {
            "status": "OK",
            "database": "Conectada ✓",
            "timestamp": datetime.utcnow()
        }
    except Exception as e:
        return {
            "status": "ERROR",
            "database": f"Error: {str(e)}",
            "timestamp": datetime.utcnow()
        }


# ============================================================================
# 14. INICIALIZACIÓN DE BD Y SERVIDOR
# ============================================================================

@app.on_event("startup")
def startup_event():
    """
    Se ejecuta cuando inicia el servidor.
    Crea las tablas en la BD si no existen.
    """
    print("📌 Iniciando servidor...")
    print("🔧 Creando tablas en base de datos...")
    Base.metadata.create_all(bind=engine)
    print("✅ Servidor listo. Accede a http://localhost:8000/docs")


# ============================================================================
# 15. COMO EJECUTAR
# ============================================================================

"""
INSTRUCCIONES PARA EJECUTAR:

1. Instalar dependencias:
   pip install -r requirements.txt

2. Crear archivo .env en la raíz:
   DATABASE_URL=postgresql://usuario:contraseña@localhost:5432/fabrica_produccion
   SECRET_KEY=tu-clave-super-secreta-cambiar-en-produccion

3. Ejecutar servidor:
   uvicorn main:app --reload --host 0.0.0.0 --port 8000

4. Acceder a:
   - API: http://localhost:8000
   - Documentación interactiva: http://localhost:8000/docs
   - Alternativa: http://localhost:8000/redoc

5. Para producción (sin --reload):
   uvicorn main:app --host 0.0.0.0 --port 8000

FLUJO DE USO:
1. Registrar usuario: POST /api/auth/registrar
2. Login: POST /api/auth/login
3. Copiar token retornado
4. En Header Authorization: "Bearer {token}"
5. Registrar ciclos: POST /api/ciclos/registrar
6. Ver alertas: GET /api/alertas
"""
