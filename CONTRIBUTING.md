# SMPS Performance Compass — Guía de Colaboración

## 🏗️ Arquitectura

```
GitHub (dev branch)     →  Código en desarrollo
GitHub (main branch)    →  Producción (deploy automático a Hostinger)
Hostinger (bowdot.online) →  App en vivo (MySQL, Node.js)
```

## 📋 Reglas

1. **NUNCA** trabajar directamente en `main` — siempre en `dev` o una rama feature
2. **Merge a `main` = deploy automático a producción** — asegúrate que todo funcione antes
3. **Siempre** haz pull antes de empezar a trabajar

## 🚀 Setup Inicial (una sola vez)

### Opción A: Codex (IA)
No necesitas setup. Solo dale acceso al repo y prompt directamente.

### Opción B: Codespaces (en el navegador)
1. Ve a https://github.com/miquewallsten/smps-performance-compass
2. Click en **Code** → **Codespaces** → **Create codespace on dev**
3. Espera a que cargue (1-2 min)
4. Ejecuta: `npm install && npm run dev`
5. Abre el puerto 5173 en el panel de puertos

### Opción C: Local (tu máquina)
```bash
# 1. Clona el repo
git clone https://github.com/miquewallsten/smps-performance-compass.git
cd smps-performance-compass

# 2. Cámbiate a la rama dev
git checkout dev

# 3. Instala dependencias
npm install

# 4. Crea archivo .env (desarrollo local)
cat > .env << 'EOF'
MYSQL_HOST=localhost
MYSQL_PORT=3306
MYSQL_USER=root
MYSQL_PASSWORD=
MYSQL_DATABASE=smps_dev
JWT_SECRET=dev-secret-change-in-production-use-random-64-chars
NODE_ENV=development
PORT=3000
OLLAMA_API_KEY=tu-api-key-aqui
OLLAMA_BASE_URL=https://ollama.com/v1
OLLAMA_MODEL=qwen3:235b
EOF

# 5. Inicia el servidor de desarrollo
npm run dev
```

> **Nota:** Para desarrollo local necesitas MySQL instalado. Si no tienes MySQL, puedes usar SQLite cambiando temporalmente la conexión, o usar Codespaces/Codex.

## 🔄 Flujo de Trabajo Diario

```bash
# 1. Siempre empieza con lo más reciente
git checkout dev
git pull origin dev

# 2. Crea una rama para tu tarea
git checkout -b feature/mi-tarea

# 3. Haz tus cambios, prueba, y commitea
git add .
git commit -m "feat: descripción corta del cambio"

# 4. Sube tu rama y crea un Pull Request a dev
git push origin feature/mi-tarea
# → Ve a GitHub y crea un PR hacia la rama `dev`

# 5. Cuando `dev` esté probado y listo para producción:
# → Crea un PR de `dev` hacia `main`
# → Al mergear a `main`, se despliega automáticamente a Hostinger
```

## 🚀 Deploy a Producción

El deploy es **automático** cuando se mergea a `main`:

```
Merge a main → GitHub Actions ejecuta:
  1. npm ci
  2. npm run build  
  3. Sube server.cjs + dist/ a Hostinger via SSH
  4. Reinicia el servidor
  5. Verifica health check
```

También puedes hacer deploy manual desde GitHub:
→ **Actions** → **Deploy to Production** → **Run workflow**

## 📁 Estructura del Proyecto

```
├── server/              # Backend (Express + MySQL)
│   ├── routes/          # API endpoints
│   ├── db/              # Conexión MySQL, migraciones, seeds
│   ├── auth/            # JWT, seguridad
│   ├── middleware/       # Auth, RBAC
│   └── utils/           # Visibilidad, helpers
├── src/                 # Frontend (React + Vite + TypeScript)
│   ├── pages/           # Páginas de la app
│   ├── api/             # Cliente API + queries
│   ├── lib/             # Utilidades (visibility, etc.)
│   ├── contexts/        # Auth, App context
│   └── data/            # Preguntas, pesos, catálogos
├── dist/                # Build del frontend (no editar, generado)
├── server.cjs           # Build del backend (no editar, generado)
└── start.sh             # Script de inicio en Hostinger
```

## 🔑 Variables de Entorno

| Variable | Desarrollo | Producción |
|----------|-----------|------------|
| MYSQL_HOST | localhost | 127.0.0.1 |
| MYSQL_USER | root | u906489923_u906489923_smp |
| MYSQL_PASSWORD | (vacío) | (en Hostinger) |
| MYSQL_DATABASE | smps_dev | u906489923_u906489923_smp |
| NODE_ENV | development | production |

## 🛡️ Roles del Sistema

| Rol | Límite | Quién puede asignar |
|-----|---------|-------------------|
| Super Usuario | 1 | Solo otro Super Usuario |
| Socio Administrador | 1 | Super Usuario |
| Usuario Administrador | Máximo 2 | Super Usuario, Socio Adm., otro Admin |

## ⚠️ No Hacer

- ❌ NO trabajar directamente en `main`
- ❌ NO editar `server.cjs` o `dist/` directamente (se generan con `npm run build`)
- ❌ NO commitear `.env` con contraseñas reales
- ❌ NO hacer force push a `main`
