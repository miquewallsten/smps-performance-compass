# 🚀 SMPS Performance Compass — Hostinger Deployment Guide (MySQL)

## Architecture Overview

- **Frontend**: React + Vite → builds to `dist/`
- **Backend**: Express.js bundled into `server.cjs` (pre-compiled via esbuild)
- **Database**: MySQL (Hostinger provides free MySQL databases)
- **Entry Point**: `server.js` → dynamically imports `server.cjs`
- **Build Command**: `npm run build` → does `vite build && node build-server.mjs`

---

## STEP 1: Create MySQL Database in Hostinger Panel

1. Log into **Hostinger hPanel** → https://hpanel.hostinger.com
2. Go to **Databases** → **MySQL Databases**
3. Create a new database:
   - **Database name**: `u906489923_smPS`
   - **Username**: `u906489923_smPS`
   - **Password**: (set a strong password and note it)
4. Note the **MySQL host** (usually `localhost`) and **port** (usually `3306`)

---

## STEP 2: Build and Create Deployment ZIP (Local Machine)

```bash
cd smps-performance-compass-main

# Install dependencies
npm install

# Build frontend + server bundle
npm run build

# Verify builds
ls dist/index.html
ls -la server.cjs

# Create deployment ZIP (exclude node_modules, dev config, old SQLite files)
rm -f ../smps-deploy.zip
zip -r ../smps-deploy.zip . \
  -x "node_modules/*" \
  -x "server/db/*.db" \
  -x "server/db/*.db-shm" \
  -x "server/db/*.db-wal" \
  -x "server/db/schema.ts" \
  -x "server/db/auto-init.ts" \
  -x "server/db/migrate-standalone.cjs" \
  -x "server/db/seed-users-standalone.cjs" \
  -x ".env" \
  -x "*.log" \
  -x ".DS_Store" \
  -x "src/App.css" \
  -x ".git/*"
```

---

## STEP 3: Upload and Set Up on Hostinger (via SSH)

```bash
# SSH into Hostinger
ssh -p 65002 u906489923@82.29.157.108

# Navigate to app directory
cd ~/domains/lightgoldenrodyellow-wasp-535969.hostingersite.com/nodejs/

# Upload ZIP via SCP from your local machine, then:
unzip -o ~/smps-deploy.zip

# Set up Node.js path
export PATH="/opt/alt/alt-nodejs22/root/usr/bin:$PATH"
export LD_LIBRARY_PATH="/opt/alt/alt-nodejs22/root/usr/lib64:$LD_LIBRARY_PATH"

# Install dependencies
npm install

# Edit .env.production with your MySQL credentials
nano .env.production
```

### `.env.production` content (update MYSQL_PASSWORD!):

```
MYSQL_HOST=localhost
MYSQL_PORT=3306
MYSQL_USER=u906489923_smPS
MYSQL_PASSWORD=YOUR_ACTUAL_PASSWORD_HERE
MYSQL_DATABASE=u906489923_smPS
JWT_SECRET=791794abc42eb8c7eeae01385d9b45943ded236691169c081f86970f64dc08e289d99a6becbc7ec6b25047e124f5053a3dc39d41af3ea5ae02e8c53840d17cca
PORT=3000
OLLAMA_API_KEY=42861d8c531d4528a77137876e6e7ec3.vW97sgyFn2wAoPoeFAwhwA7f
OLLAMA_BASE_URL=https://ollama.com/v1
OLLAMA_MODEL=qwen3.5:397b
NODE_ENV=production
```

---

## STEP 4: Start the Server

The server will **automatically create all database tables and seed data** on first startup.

```bash
# Start the server
pkill -f "node server" 2>/dev/null
NODE_ENV=production node server.js &

# Wait for startup, then verify
sleep 5
curl http://localhost:3000/api/health
# Expected: {"status":"ok","timestamp":"..."}

# Test login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"lab@bowdot.com","password":"3791"}'
```

---

## STEP 5: Configure Node.js in Hostinger Panel

1. In Hostinger hPanel → **Advanced** → **Node.js**
2. Set:
   - **Node.js version**: 22.x
   - **Application root**: `/domains/lightgoldenrodyellow-wasp-535969.hostingersite.com/nodejs`
   - **Application startup file**: `server.js`
   - **Application mode**: Production
3. Add **Environment Variables**:

| Variable | Value |
|----------|-------|
| `MYSQL_HOST` | `localhost` |
| `MYSQL_PORT` | `3306` |
| `MYSQL_USER` | `u906489923_smPS` |
| `MYSQL_PASSWORD` | (your MySQL password from Step 1) |
| `MYSQL_DATABASE` | `u906489923_smPS` |
| `JWT_SECRET` | `791794abc42eb8c7eeae01385d9b45943ded236691169c081f86970f64dc08e289d99a6becbc7ec6b25047e124f5053a3dc39d41af3ea5ae02e8c53840d17cca` |
| `OLLAMA_API_KEY` | `4286...wA7f` |
| `OLLAMA_BASE_URL` | `https://ollama.com/v1` |
| `OLLAMA_MODEL` | `qwen3.5:397b` |
| `NODE_ENV` | `production` |
| `PORT` | `3000` |

4. Click **Start** or **Restart**

---

## STEP 6: Verify in Browser

1. Open `https://lightgoldenrodyellow-wasp-535969.hostingersite.com` in your browser
2. You should see the **SMPS** login screen
3. Login with `lab@bowdot.com` / `3791`
4. You should see the **Dashboard** with the yellow **SUPERUSER** badge

---

## Troubleshooting

### MySQL connection error
- Verify `.env.production` has correct MySQL credentials
- Ensure the MySQL database was created in Hostinger panel
- Check that `MYSQL_HOST=localhost` (not an IP address)

### "Cannot find module" errors
```bash
rm -rf node_modules
npm install
```

### Blank screen / 500 error
```bash
ls dist/index.html
ls -la server.cjs
# Check logs in Hostinger Node.js panel
```

### Port issues
Hostinger may assign a specific port. Check the Node.js panel for the assigned port.

---

## 📋 Quick Reference

| Item | Value |
|------|-------|
| **Entry Point** | `server.js` → `server.cjs` |
| **Start Command** | `node server.js` |
| **Build Command** | `npm run build` |
| **SuperAdmin email** | `lab@bowdot.com` |
| **SuperAdmin password** | `3791` |
| **Regular user password** | `1234` (forced change on first login) |
| **Database** | MySQL (auto-created tables + seed on startup) |
| **Server port** | 3000 |
| **Copilot model** | qwen3.5:397b (via Ollama Cloud) |
