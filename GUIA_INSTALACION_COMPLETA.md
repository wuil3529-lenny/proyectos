# GUÍA DE INSTALACIÓN Y CONFIGURACIÓN
# ===================================

Versión: 1.0.0  
Fecha: Abril 2026  
Plataforma: Plataforma Industrial - Gestión de Producción  

---

## 📌 ÍNDICE

1. [Requisitos Previos](#requisitos-previos)
2. [Instalación en Desarrollo](#instalación-en-desarrollo)
3. [Instalación en Producción (Cliente)](#instalación-en-producción)
4. [Crear Base de Datos](#crear-base-de-datos)
5. [Primeros Pasos](#primeros-pasos)
6. [Solución de Problemas](#solución-de-problemas)

---

## ⚙️ REQUISITOS PREVIOS

### Software Necesario

```
✓ Python 3.10 o superior
✓ PostgreSQL 12 o superior
✓ Git (opcional pero recomendado)
✓ Node.js 18+ (para frontend React/React Native)
```

### Instalación de Requisitos

**En Windows:**
```powershell
# Descargar e instalar desde:
# Python: https://www.python.org/downloads/
# PostgreSQL: https://www.postgresql.org/download/windows/
# Git: https://git-scm.com/download/win

# Verificar instalación
python --version
psql --version
```

**En Linux (Ubuntu/Debian):**
```bash
# Actualizar sistema
sudo apt update
sudo apt upgrade -y

# Instalar Python y dependencias
sudo apt install -y python3 python3-venv python3-pip
sudo apt install -y postgresql postgresql-contrib

# Verificar
python3 --version
psql --version
```

**En macOS:**
```bash
# Con Homebrew
brew install python@3.11
brew install postgresql

# Verificar
python3 --version
psql --version
```

---

## 🚀 INSTALACIÓN EN DESARROLLO

### Paso 1: Clonar Repositorio (si usas Git)

```bash
# Crear carpeta del proyecto
mkdir fabrica_app
cd fabrica_app

# Clonar desde repositorio (si está disponible)
git clone https://tu_repositorio.com/fabrica_app .

# O descargar archivos manualmente
# Asegúrate de que tienes:
# - main.py
# - requirements.txt
# - .env.example
```

### Paso 2: Crear Ambiente Virtual Python

El ambiente virtual aísla las dependencias del proyecto.

**En Windows (PowerShell):**
```powershell
# Crear ambiente
python -m venv venv

# Activar
.\venv\Scripts\Activate.ps1

# Si da error de permisos:
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

**En Linux/macOS:**
```bash
# Crear ambiente
python3 -m venv venv

# Activar
source venv/bin/activate

# Deberías ver (venv) al inicio de la línea
```

### Paso 3: Instalar Dependencias Python

```bash
# Asegúrate que venv está activado (deberías ver "(venv)" en consola)

# Actualizar pip (gestor de paquetes)
pip install --upgrade pip

# Instalar dependencias del proyecto
pip install -r requirements.txt

# Verificar instalación
pip list
```

### Paso 4: Configurar Variables de Entorno

```bash
# Copiar archivo de ejemplo
cp .env.example .env

# O en Windows:
copy .env.example .env

# Editar .env con tu editor favorito
# Cambiar:
# - DATABASE_URL (ver paso 5)
# - SECRET_KEY (generar nueva)
# - EMAIL_FROM, EMAIL_PASSWORD (opcional en desarrollo)
```

**Generar SECRET_KEY seguro:**
```bash
# En Linux/macOS:
python -c 'import secrets; print(secrets.token_urlsafe(32))'

# En Windows:
python -c "import secrets; print(secrets.token_urlsafe(32))"

# Copiar el resultado al archivo .env en SECRET_KEY=
```

### Paso 5: Crear Base de Datos PostgreSQL

**Opción A: Usar pgAdmin (GUI)**
1. Abrir pgAdmin (viene con PostgreSQL)
2. Conectar al servidor local
3. Crear nueva BD: nombre "fabrica_produccion"
4. Crear usuario: nombre "fabrica_user", contraseña segura
5. Asignar permisos al usuario
6. Obtener credenciales para .env

**Opción B: Línea de comandos**

```bash
# Conectar a PostgreSQL como superusuario
psql -U postgres

# En la consola psql, ejecutar:
-- Crear base de datos
CREATE DATABASE fabrica_produccion;

-- Crear usuario
CREATE USER fabrica_user WITH PASSWORD 'contraseña_segura_aqui';

-- Otorgar permisos
ALTER ROLE fabrica_user SET client_encoding TO 'utf8';
ALTER ROLE fabrica_user SET default_transaction_isolation TO 'read committed';
ALTER ROLE fabrica_user SET default_transaction_deferrable TO on;
ALTER ROLE fabrica_user SET default_transaction_deferrable TO off;
GRANT ALL PRIVILEGES ON DATABASE fabrica_produccion TO fabrica_user;

-- Salir
\q
```

**Actualizar .env con credenciales:**
```
DATABASE_URL=postgresql://fabrica_user:contraseña_segura_aqui@localhost:5432/fabrica_produccion
```

### Paso 6: Inicializar Base de Datos

```bash
# Activar ambiente virtual (si no está activado)
source venv/bin/activate  # Linux/macOS
# o
.\venv\Scripts\Activate.ps1  # Windows

# Ejecutar servidor (crea tablas automáticamente)
uvicorn main:app --reload

# Deberías ver:
# ✅ Iniciando servidor...
# 🔧 Creando tablas en base de datos...
# ✅ Servidor listo. Accede a http://localhost:8000/docs
```

### Paso 7: Verificar Instalación

1. Abrir navegador: http://localhost:8000
   - Deberías ver mensaje de bienvenida

2. Documentación interactiva: http://localhost:8000/docs
   - Aquí puedes probar los endpoints

3. Health check: http://localhost:8000/api/health
   - Verifica que BD está conectada

---

## 🏭 INSTALACIÓN EN PRODUCCIÓN (Servidor del Cliente)

Este es el servidor on-premise que instalarás en la planta del cliente.

### Requisitos de Hardware

```
Mínimo:
- CPU: Dual-core
- RAM: 8GB
- Almacenamiento: 500GB (SSD recomendado)
- Conectividad: Conexión estable a LAN

Recomendado:
- CPU: Quad-core
- RAM: 16GB
- Almacenamiento: 1TB SSD
- Redundancia de red
```

### Paso 1: Preparar Servidor

```bash
# Actualizar sistema
sudo apt update && sudo apt upgrade -y

# Instalar dependencias básicas
sudo apt install -y build-essential python3-dev
sudo apt install -y postgresql postgresql-contrib
sudo apt install -y nginx  # Reverse proxy
sudo apt install -y supervisor  # Gestor de procesos
```

### Paso 2: Crear Usuario del Sistema para la Aplicación

```bash
# Crear usuario dedicado
sudo useradd -m -s /bin/bash fabrica_app

# Dar permisos de sudo (si es necesario)
sudo visudo
# Agregar línea: fabrica_app ALL=(ALL) NOPASSWD: /usr/bin/systemctl

# Cambiar al usuario
sudo su - fabrica_app
```

### Paso 3: Clonar Código y Configurar

```bash
# Como usuario fabrica_app
cd /home/fabrica_app

# Descargar código (Git o descarga manual)
git clone https://tu_repositorio.com/fabrica_app .

# Crear ambiente virtual
python3 -m venv venv
source venv/bin/activate

# Instalar dependencias
pip install --upgrade pip
pip install -r requirements.txt

# Copiar archivo .env
cp .env.example .env

# Editar .env con datos reales del cliente
nano .env
# Cambiar DATABASE_URL, SECRET_KEY, EMAIL, etc.
```

### Paso 4: Crear Base de Datos en Producción

```bash
# Como usuario postgres (o root)
sudo -u postgres psql

-- Crear BD para producción
CREATE DATABASE fabrica_produccion;

-- Crear usuario con permisos limitados
CREATE USER fabrica_user WITH PASSWORD 'contraseña_MUY_segura_prod';

-- Asignar permisos
GRANT CONNECT ON DATABASE fabrica_produccion TO fabrica_user;
GRANT USAGE ON SCHEMA public TO fabrica_user;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO fabrica_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO fabrica_user;

\q
```

### Paso 5: Configurar Nginx (Reverse Proxy)

Nginx actúa como intermediario entre clientes y API FastAPI.

```bash
# Crear archivo de configuración de Nginx
sudo nano /etc/nginx/sites-available/fabrica_app

# Pegar contenido:
server {
    listen 443 ssl http2;
    server_name app.fabrica.local;  # O IP del servidor
    
    # Certificados SSL (autofirmados o Let's Encrypt)
    ssl_certificate /etc/nginx/certs/cert.pem;
    ssl_certificate_key /etc/nginx/certs/key.pem;
    
    client_max_body_size 50M;
    
    location / {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # WebSocket support (para notificaciones en tiempo real)
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        
        # Timeouts más altos para operaciones largas
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
}

# Habilitar configuración
sudo ln -s /etc/nginx/sites-available/fabrica_app /etc/nginx/sites-enabled/

# Verificar sintaxis
sudo nginx -t

# Reiniciar Nginx
sudo systemctl restart nginx
```

### Paso 6: Configurar Supervisor (Auto-restart del servidor)

Supervisor asegura que la aplicación siga funcionando si falla.

```bash
# Crear archivo de configuración
sudo nano /etc/supervisor/conf.d/fabrica_app.conf

# Pegar contenido:
[program:fabrica_app]
directory=/home/fabrica_app
command=/home/fabrica_app/venv/bin/uvicorn main:app --host 127.0.0.1 --port 8000
user=fabrica_app
autostart=true
autorestart=true
startretries=3
redirect_stderr=true
stdout_logfile=/home/fabrica_app/logs/supervisor.log
environment=DATABASE_URL=postgresql://...

# Actualizar supervisor
sudo supervisorctl reread
sudo supervisorctl update
sudo supervisorctl start fabrica_app

# Verificar estado
sudo supervisorctl status fabrica_app
```

### Paso 7: Configurar Backup Automático

```bash
# Crear script de backup
sudo nano /home/fabrica_app/backup.sh

#!/bin/bash
BACKUP_DIR="/home/fabrica_app/backups"
DATE=$(date +%Y-%m-%d_%H-%M-%S)

# Crear directorio si no existe
mkdir -p $BACKUP_DIR

# Backup de BD PostgreSQL
pg_dump -U fabrica_user fabrica_produccion | gzip > $BACKUP_DIR/fabrica_$DATE.sql.gz

# Mantener solo últimos 30 días
find $BACKUP_DIR -name "fabrica_*.sql.gz" -mtime +30 -delete

# Dar permisos
chmod +x /home/fabrica_app/backup.sh

# Crear cron job (backup diario a las 3 AM)
sudo crontab -e

# Agregar línea:
0 3 * * * /home/fabrica_app/backup.sh
```

### Paso 8: Crear Certificado SSL Auto-firmado

Para HTTPS (importante para seguridad):

```bash
# Generar certificado auto-firmado (válido 365 días)
sudo openssl req -x509 -newkey rsa:4096 -keyout /etc/nginx/certs/key.pem -out /etc/nginx/certs/cert.pem -days 365 -nodes

# Para producción real, usar Let's Encrypt (gratuito)
sudo apt install certbot python3-certbot-nginx
sudo certbot certonly --standalone -d app.fabrica.com
```

---

## 📝 CREAR BASE DE DATOS MANUALMENTE

Si prefieres usar GUI:

### PgAdmin (Recomendado para principiantes)

1. Abrir pgAdmin (generalmente http://localhost:5050)
2. Login con credenciales postgre
3. Expandir "Servers" → Conectar a servidor local
4. Clic derecho en "Databases" → Create → Database
   - Name: fabrica_produccion
   - Owner: (dejar blank por ahora)
5. Click Save
6. Crear usuario:
   - Clic derecho en "Login/Group Roles" → Create → Login/Group Role
   - General:
     - Name: fabrica_user
   - Definition:
     - Password: contraseña_segura
   - Privileges:
     - Can login?: Yes
7. Otorgar permisos:
   - Seleccionar "fabrica_produccion" BD
   - Properties → Security → Grant Wizard
   - Asignar todos los permisos a fabrica_user

### DBeaver (Alternativa moderna)

1. Descargar DBeaver Community (gratuito)
2. File → New Database Connection
3. Seleccionar PostgreSQL
4. Llenar credenciales del servidor local
5. Test Connection
6. Navegar y crear BD "fabrica_produccion"

---

## 🎯 PRIMEROS PASOS

### 1. Probar la API

Abrir en navegador: http://localhost:8000/docs

Esto abre Swagger UI (documentación interactiva).

### 2. Crear Usuario Administrador

En Swagger UI (http://localhost:8000/docs):

1. Buscar endpoint "POST /api/auth/registrar"
2. Click "Try it out"
3. Llenar datos:
```json
{
  "email": "admin@fabrica.com",
  "password": "Admin@12345",
  "nombre_completo": "Administrador",
  "rol": "admin",
  "departamento": "Dirección"
}
```
4. Click "Execute"
5. Copiar el ID retornado

### 3. Hacer Login

1. Endpoint "POST /api/auth/login"
2. Click "Try it out"
3. Datos:
```json
{
  "email": "admin@fabrica.com",
  "password": "Admin@12345"
}
```
4. Click "Execute"
5. Copiar el "access_token" (lo usarás para otros endpoints)

### 4. Crear Máquinas de Prueba

Endpoint "POST /api/maquinas/crear" (necesitas token)

1. En Swagger, encontrar formulario de autorización (arriba a la derecha)
2. Click en "Authorize"
3. Pegar el token: "Bearer {token_copiado}"
4. Crear máquinas:
```json
{
  "nombre": "Sopladora 5",
  "tipo": "Sopladora",
  "estado": "operativa",
  "tiempo_ciclo_estandar": 45.0
}
```

### 5. Registrar Ciclos de Prueba

Endpoint "POST /api/ciclos/registrar"

```json
{
  "maquina_id": 1,
  "numero_ciclo": 1,
  "peso_kg": 50.5,
  "cantidad_piezas": 320,
  "temperatura_proceso": 245.0,
  "observaciones": "Ciclo de prueba"
}
```

---

## 🐛 SOLUCIÓN DE PROBLEMAS

### Problema: "ModuleNotFoundError: No module named 'fastapi'"

**Solución**: Ambiente virtual no activado

```bash
# Activar ambiente
source venv/bin/activate  # Linux/macOS
.\venv\Scripts\Activate.ps1  # Windows

# Instalar de nuevo
pip install -r requirements.txt
```

### Problema: "psycopg2: cannot import name 'compat'"

**Solución**: Versión incompatible de psycopg2

```bash
pip uninstall psycopg2 psycopg2-binary -y
pip install psycopg2-binary==2.9.9
```

### Problema: "PostgreSQL: FATAL: Ident authentication failed"

**Solución**: Configurar autenticación en PostgreSQL

```bash
# Editar archivo pg_hba.conf (ubicación varía)
# Linux: /etc/postgresql/XX/main/pg_hba.conf
# Windows: C:\Program Files\PostgreSQL\XX\data\pg_hba.conf

# Cambiar "ident" por "md5" o "scram-sha-256" en la línea local
local   all             all                                     md5

# Reiniciar PostgreSQL
sudo systemctl restart postgresql  # Linux
# O desde pgAdmin en Windows
```

### Problema: "Port 8000 already in use"

**Solución**: Usar otro puerto

```bash
uvicorn main:app --reload --port 8001
```

O encontrar y matar el proceso:

```bash
# Linux/macOS
lsof -i :8000
kill -9 <PID>

# Windows (PowerShell)
netstat -ano | findstr :8000
taskkill /PID <PID> /F
```

### Problema: "CORS error - No 'Access-Control-Allow-Origin' header"

**Solución**: Verificar CORS_ORIGINS en .env

```
CORS_ORIGINS=*  # Para desarrollo
# O específicamente:
CORS_ORIGINS=http://localhost:3000,http://localhost:3001
```

### Problema: "JWT Token expired"

**Normal**: Los tokens expiran cada 30 minutos.

**Solución**: Login nuevamente para obtener token nuevo.

---

## 📊 MONITOREO EN PRODUCCIÓN

### Verificar logs

```bash
# Logs de la aplicación
tail -f /home/fabrica_app/logs/app.log

# Logs de Nginx
tail -f /var/log/nginx/error.log
tail -f /var/log/nginx/access.log

# Logs de Supervisor
tail -f /home/fabrica_app/logs/supervisor.log

# Logs de PostgreSQL
sudo tail -f /var/log/postgresql/postgresql-13-main.log
```

### Monitoreo de recursos

```bash
# CPU y memoria en tiempo real
top

# O más amigable:
htop

# Espacio en disco
df -h

# Uso de BD
psql -U fabrica_user -d fabrica_produccion -c "SELECT pg_size_pretty(pg_database_size('fabrica_produccion'));"
```

---

## 🔐 CHECKLIST DE SEGURIDAD ANTES DE PRODUCCIÓN

- [ ] Cambiar SECRET_KEY a uno seguro
- [ ] Cambiar contraseña de DB a algo fuerte
- [ ] Configurar SSL/HTTPS (certificados reales)
- [ ] Cambiar DEBUG_MODE=False en .env
- [ ] Configurar backups automáticos
- [ ] Crear usuario admin con contraseña fuerte
- [ ] Restringir CORS_ORIGINS a dominios reales
- [ ] Revisar y actualizar dependencias (pip install --upgrade -r requirements.txt)
- [ ] Configurar firewall del servidor
- [ ] Habilitar MFA para admin
- [ ] Revisar audit logs regularmente

---

¿Preguntas? Documenta el error exacto y revisamos juntos.
