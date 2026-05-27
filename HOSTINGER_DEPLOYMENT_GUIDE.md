# 🚀 SMPS Performance Compass — Hostinger Git Deployment Guide

## Architecture Overview

- **Frontend**: React + Vite → builds to `dist/`
- **Backend**: Express.js bundled into `server.cjs` (pre-compiled via esbuild)
- **Database**: MySQL (Hostinger provides free MySQL databases)
- **Entry Point**: `server.js` → dynamically imports `server.cjs`
- **Build Command**: `npm run build` → does `vite build && node build-server.mjs`
- **Deployment**: Git-based (Hostinger pulls from GitHub automatically)

---

## How It Works

```
You push code to GitHub (main branch)
        ↓
GitHub Actions runs CI (build + test) ✅
        ↓
Hostinger auto-pulls from GitHub (or manual pull)
        ↓
Hostinger runs post-deploy script (npm install + npm run build)
        ↓
Server restarts automatically
        ↓
✅ Live!
```

---

## STEP 1: Set Up Git Deployment in Hostinger hPanel

1. Log into **Hostinger hPanel** → https://hpanel.hostinger.com
2. Go to your website → **Git** (or **Version Control**)
3. Click **Clone repository** or **Connect repository**
4. Enter your GitHub repo URL:
   ```
   https://github.com/miquewallsten/smps-performance-compass.git
   ```
5. Set **Branch**: `main`
6. Set **Application root**: the path to your Node.js app
   (e.g., `/domains/bowdot.online/nodejs`)
7. Set **Post-deployment command**:
   ```
   bash build-and-restart.sh
   ```
8. Enable **Auto-deploy** (so Hostinger pulls when you push to main)

---

## STEP 2: Set Environment Variables in Hostinger

In **hPanel** → **Advanced** → **Node.js**, add these environment variables:

| Variable | Value |
|----------|-------|
| `MYSQL_HOST` | `127.0.0.1` |
| `MYSQL_PORT` | `3306` |
| `MYSQL_USER` | `u906489923_u906489923_smp` |
| `MYSQL_PASSWORD` | *(your MySQL password)* |
| `MYSQL_DATABASE` | `u906489923_u906489923_smp` |
| `JWT_SECRET` | `791794abc42eb8c7eeae01385d9b45943ded236691169c081f86970f64dc08e289d99a6becbc7ec6b25047e124f5053a3dc39d41af3ea5ae02e8c53840d17cca` |
| `PORT` | `3000` |
| `NODE_ENV` | `production` |
| `OLLAMA_API_KEY` | `42861d8c531d4528a77137876e6e7ec3.vW97sgyFn2wAoPoeFAwhwA7f` |
| `OLLAMA_BASE_URL` | `https://ollama.com/v1` |
| `OLLAMA_MODEL` | `qwen3.5:397b` |

---

## STEP 3: Configure Node.js in Hostinger Panel

In **hPanel** → **Advanced** → **Node.js**:

| Setting | Value |
|---------|-------|
| **Node.js version** | 22.x |
| **Application root** | `/domains/bowdot.online/nodejs` |
| **Application startup file** | `server.js` |
| **Application mode** | Production |

Click **Start** or **Restart**.

---

## STEP 4: First-Time Setup

After connecting the Git repo for the first time:

1. SSH into your Hostinger server:
   ```bash
   ssh -p 65002 u906489923@82.29.157.108
   ```

2. Navigate to the app directory:
   ```bash
   cd ~/domains/bowdot.online/nodejs
   ```

3. Run the initial build:
   ```bash
   export PATH="/opt/alt/alt-nodejs22/root/usr/bin:$PATH"
   export NODE_ENV=production
   npm install
   npm run build
   ```

4. Verify the build:
   ```bash
   ls dist/index.html server.cjs
   ```

5. Restart the Node.js app from hPanel, or:
   ```bash
   pkill -f "node.*server" 2>/dev/null
   node server.js &
   ```

---

## Daily Workflow

After the initial setup, deploying is as simple as:

1. **Make code changes locally**
2. `git push origin main`
3. **That's it!** GitHub Actions verifies the build, Hostinger auto-pulls and rebuilds.

You can also manually trigger a pull in hPanel → Git → **Pull** button.

---

## Troubleshooting

### Build fails on Hostinger
```bash
ssh -p 65002 u906489923@82.29.157.108
cd ~/domains/bowdot.online/nodejs
export PATH="/opt/alt/alt-nodejs22/root/usr/bin:$PATH"
npm run build
```

### MySQL connection error
- Verify env vars are set in hPanel → Node.js → Environment Variables
- Ensure `MYSQL_HOST=127.0.0.1` (use IP, not "localhost")

### Server won't start
- Check logs in hPanel → Node.js → Logs
- Or: `tail -50 ~/domains/bowdot.online/nodejs/console.log`

### Need to force a rebuild
```bash
ssh -p 65002 u906489923@82.29.157.108
cd ~/domains/bowdot.online/nodejs
bash build-and-restart.sh
```

---

## 📋 Quick Reference

| Item | Value |
|------|-------|
| **Entry Point** | `server.js` → `server.cjs` |
| **Start Command** | `node server.js` |
| **Build Command** | `npm run build` |
| **Post-deploy script** | `bash build-and-restart.sh` |
| **CI** | GitHub Actions (build + test only) |
| **Deployment** | Hostinger Git auto-pull |
| **SuperAdmin email** | `lab@bowdot.com` |
| **SuperAdmin password** | `3791` |
| **Regular user password** | `1234` (forced change on first login) |
| **Database** | MySQL (auto-created tables + seed on startup) |
| **Server port** | 3000 |
| **Copilot model** | qwen3.5:397b (via Ollama Cloud) |

---

## GitHub Secrets (for CI only, not for deployment)

These are used by GitHub Actions for CI (build verification), not for deployment:

| Secret | Purpose |
|--------|---------|
| `HOSTINGER_SSH_KEY` | SSH key (kept for manual deploys if needed) |
| `HOSTINGER_HOST` | Server IP (kept for reference) |
| `HOSTINGER_PORT` | SSH port (kept for reference) |
| `HOSTINGER_USER` | SSH user (kept for reference) |
| `HOSTINGER_PATH` | App path on server |
| `MYSQL_*` | Database credentials (kept for reference) |
| `JWT_SECRET` | JWT secret (kept for reference) |
| `OLLAMA_*` | Ollama config (kept for reference) |
