# Requisitos del Sandbox - Agente

Este documento detalla todos los requisitos para que el sandbox funcione al 100%.

## 📋 Requisitos del Sistema

### Herramientas Obligatorias

| Herramienta | Versión Mínima | Propósito | Instalación |
|---|---|---|---|
| **Node.js** | 18.0.0 | Runtime de JavaScript | `curl -fsSL https://deb.nodesource.com/setup_20.x \| sudo -E bash - && sudo apt-get install -y nodejs` |
| **npm** | 9.0.0 | Gestor de paquetes | Se instala con Node.js |
| **Python 3** | 3.8.0 | Ejecución de código Python | `sudo apt-get install -y python3 python3-pip` |
| **Git** | 2.30.0 | Control de versiones | `sudo apt-get install -y git` |
| **Docker** | 20.10.0 | Contenedores (opcional pero recomendado) | `sudo apt-get install -y docker.io` |
| **curl** | 7.60.0 | Descargas HTTP | `sudo apt-get install -y curl` |

### Herramientas Recomendadas

| Herramienta | Propósito |
|---|---|
| **jq** | Procesamiento de JSON |
| **wget** | Descargas alternativas |
| **netcat** | Verificación de puertos |
| **Playwright** | Automatización de navegador |

## 🔧 Configuración del Entorno

### 1. Variables de Entorno Requeridas

```bash
# Copiar archivo de ejemplo
cp .env.example .env.local

# Editar con tus valores
nano .env.local
```

**Variables Críticas:**

- `OPENAI_API_KEY` - API key de OpenAI (obligatoria para generación de contenido)
- `DATABASE_URL` - Conexión a PostgreSQL (obligatoria para persistencia)
- `NEXTAUTH_SECRET` - Secreto para autenticación (generar con: `openssl rand -base64 32`)

### 2. Base de Datos

#### PostgreSQL

```bash
# Instalar PostgreSQL
sudo apt-get install -y postgresql postgresql-contrib

# Iniciar servicio
sudo service postgresql start

# Crear base de datos
sudo -u postgres createdb agente_db

# Crear usuario
sudo -u postgres createuser agente_user
sudo -u postgres psql -c "ALTER USER agente_user WITH PASSWORD 'password';"

# Dar permisos
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE agente_db TO agente_user;"

# Actualizar DATABASE_URL en .env.local
DATABASE_URL="postgresql://agente_user:password@localhost:5432/agente_db"
```

#### Prisma

```bash
# Generar cliente
npx prisma generate

# Ejecutar migraciones
npx prisma db push

# (Opcional) Crear datos de prueba
npx prisma db seed
```

### 3. Dependencias de Node.js

```bash
# Instalar dependencias
npm install --legacy-peer-deps

# Verificar instalación
npm list
```

**Dependencias Críticas:**

- `next` - Framework web
- `typescript` - Lenguaje de programación
- `prisma` - ORM de base de datos
- `playwright` - Automatización de navegador
- `react` - Librería de UI

## 🚀 Instalación Rápida

### Script Automatizado

```bash
# Hacer ejecutable
chmod +x scripts/setup-sandbox.sh

# Ejecutar
bash scripts/setup-sandbox.sh
```

### Instalación Manual

```bash
# 1. Actualizar sistema
sudo apt-get update && sudo apt-get upgrade -y

# 2. Instalar herramientas
sudo apt-get install -y nodejs npm python3 python3-pip git curl wget jq netcat

# 3. Instalar dependencias del proyecto
npm install --legacy-peer-deps

# 4. Configurar base de datos
cp .env.example .env.local
# Editar .env.local con tus valores

# 5. Configurar Prisma
npx prisma generate
npx prisma db push

# 6. Compilar
npm run build

# 7. Validar
bash scripts/validate-sandbox.sh
```

## ✅ Validación

### Ejecutar Validación

```bash
# Hacer ejecutable
chmod +x scripts/validate-sandbox.sh

# Ejecutar
bash scripts/validate-sandbox.sh
```

**Salida esperada:**

```
✓ Node.js instalado
✓ npm instalado
✓ Python 3 instalado
✓ Git instalado
✓ package.json existe
✓ node_modules existe
✓ NODE_ENV=development
✓ OPENAI_API_KEY configurada
✓ DATABASE_URL configurada
✓ Sandbox validado correctamente
```

## 🔌 Conectores Externos

### Gmail

```bash
# 1. Ir a: https://console.cloud.google.com
# 2. Crear proyecto
# 3. Habilitar Gmail API
# 4. Crear credenciales OAuth 2.0
# 5. Copiar Client ID y Client Secret a .env.local

GMAIL_CLIENT_ID=your-client-id
GMAIL_CLIENT_SECRET=your-client-secret
```

### Slack

```bash
# 1. Ir a: https://api.slack.com/apps
# 2. Crear nueva app
# 3. Habilitar Bot Token Scopes
# 4. Instalar app en workspace
# 5. Copiar tokens a .env.local

SLACK_BOT_TOKEN=xoxb-your-token
SLACK_SIGNING_SECRET=your-secret
```

### Discord

```bash
# 1. Ir a: https://discord.com/developers/applications
# 2. Crear nueva aplicación
# 3. Crear bot
# 4. Copiar token a .env.local

DISCORD_BOT_TOKEN=your-bot-token
```

## 🧪 Pruebas

### Ejecutar Suite de Pruebas

```bash
# Todas las pruebas
npm run test

# Pruebas en modo watch
npm run test:watch

# Cobertura de código
npm run test:coverage
```

### Pruebas Manuales

```bash
# Iniciar servidor de desarrollo
npm run dev

# Abrir en navegador
# http://localhost:3000

# Verificar API
curl http://localhost:3000/api/health

# Verificar base de datos
npx prisma studio
```

## 🐛 Solución de Problemas

### Error: "OPENAI_API_KEY not found"

**Solución:**
```bash
# Verificar que .env.local existe
ls -la .env.local

# Verificar que tiene el valor
grep OPENAI_API_KEY .env.local

# Si no existe, crear:
cp .env.example .env.local
# Editar con tu API key
```

### Error: "Database connection failed"

**Solución:**
```bash
# Verificar que PostgreSQL está corriendo
sudo service postgresql status

# Iniciar si no está corriendo
sudo service postgresql start

# Verificar DATABASE_URL
grep DATABASE_URL .env.local

# Probar conexión
psql postgresql://user:password@localhost:5432/agente_db
```

### Error: "Module not found"

**Solución:**
```bash
# Reinstalar dependencias
rm -rf node_modules package-lock.json
npm install --legacy-peer-deps

# Generar cliente de Prisma
npx prisma generate
```

### Error: "Port 3000 already in use"

**Solución:**
```bash
# Encontrar proceso en puerto 3000
lsof -i :3000

# Matar proceso
kill -9 <PID>

# O usar puerto diferente
npm run dev -- -p 3001
```

## 📊 Monitoreo

### Logs

```bash
# Ver logs en tiempo real
tail -f dev.log

# Buscar errores
grep ERROR dev.log

# Buscar warnings
grep WARN dev.log
```

### Métricas

```bash
# Uso de memoria
free -h

# Uso de CPU
top -b -n 1

# Uso de disco
df -h
```

## 🔐 Seguridad

### Checklist de Seguridad

- [ ] `NEXTAUTH_SECRET` es una cadena aleatoria fuerte
- [ ] `OPENAI_API_KEY` no está en control de versiones
- [ ] `.env.local` está en `.gitignore`
- [ ] Contraseña de base de datos es fuerte
- [ ] SSL/TLS configurado en producción
- [ ] Validación de entrada en todas las APIs
- [ ] Rate limiting habilitado

## 📚 Recursos Adicionales

- [Documentación de Next.js](https://nextjs.org/docs)
- [Documentación de Prisma](https://www.prisma.io/docs)
- [Documentación de Playwright](https://playwright.dev)
- [Documentación de OpenAI API](https://platform.openai.com/docs)

## 📞 Soporte

Si encuentras problemas:

1. Ejecuta `bash scripts/validate-sandbox.sh` para diagnóstico
2. Revisa los logs en `dev.log`
3. Consulta la sección de "Solución de Problemas"
4. Abre un issue en GitHub
