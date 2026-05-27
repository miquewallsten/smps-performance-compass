# 🚀 SMPS Performance Compass — Deployment Guide

## Architecture Overview

- **Frontend**: React + Vite → builds to `dist/` (committed to git)
- **Backend**: Express.js bundled into `server.cjs` (committed to git)
- **Database**: MySQL (Hostinger)
- **Entry Point**: `server.js` → dynamically imports `server.cjs`
- **CI**: GitHub Actions (build + test + commit artifacts + notify server)
- **CD**: PHP Webhook on server triggers `git pull` + restart

---

## How It Works

```
You push code to GitHub (main branch)
        ↓
GitHub Actions runs CI (build + test)
        ↓
GitHub Actions commits built artifacts (dist/, server.cjs)
        ↓
GitHub Actions triggers webhook on server
        ↓
Server: git pull → npm install --omit=dev → Passenger restart
        ↓
✅ Live at smps.bowdot.online!
```

---

## Key Components

| Component | Purpose |
|-----------|---------|
| `.github/workflows/deploy.yml` | CI: build, test, commit artifacts, notify webhook |
| `deploy-webhook.php` | Server endpoint that triggers git pull + restart |
| `build-and-restart.sh` | Server-side: verify build, install deps, restart Passenger |
| `.htaccess` | Passenger config + environment variables |

---

## Deploying

### Automatic (recommended)
Just push to `main`:
```bash
git push origin main
```
GitHub Actions builds, commits artifacts, and triggers the webhook automatically.

### Manual (if needed)
SSH into the server and run:
```bash
ssh -p 65002 u906489923@82.29.157.108
cd ~/domains/bowdot.online/smps-app
git pull
bash build-and-restart.sh
```

### Manual webhook trigger
```bash
curl -X POST https://smps.bowdot.online/deploy-webhook.php \
  -H "Content-Type: application/json" \
  -H "X-Hub-Signature-256: sha256=$(echo -n '{"ref":"refs/heads/main","head_commit":{"id":"manual","message":"manual deploy"}}' | openssl dgst -sha256 -hmac 'smps-deploy-webhook-2025' | awk '{print $NF}')" \
  -d '{"ref":"refs/heads/main","head_commit":{"id":"manual","message":"manual deploy"}}'
```

---

## Environment Variables

Set in **hPanel → Advanced → Node.js → Environment Variables** OR in `.env.production` on the server:

| Variable | Value |
|----------|-------|
| `MYSQL_HOST` | `127.0.0.1` |
| `MYSQL_PORT` | `3306` |
| `MYSQL_USER` | `u906489923_u906489923_smp` |
| `MYSQL_PASSWORD` | *(your MySQL password)* |
| `MYSQL_DATABASE` | `u906489923_u906489923_smp` |
| `JWT_SECRET` | `791794abc...` |
| `PORT` | `3000` |
| `NODE_ENV` | `production` |
| `OLLAMA_API_KEY` | *(your key)* |
| `OLLAMA_BASE_URL` | `https://ollama.com/v1` |
| `OLLAMA_MODEL` | `qwen3.5:397b` |

---

## GitHub Secrets (for CI only)

| Secret | Purpose |
|--------|---------|
| Webhook secret | `smps-deploy-webhook-2025` |
| Others | Stored for reference; not used for SSH deployment |

---

## 📋 Quick Reference

| Item | Value |
|------|-------|
| **Live URL** | https://smps.bowdot.online |
| **Health check** | https://smps.bowdot.online/api/health |
| **SuperAdmin** | lab@bowdot.com / 3791 |
| **CI pipeline** | GitHub Actions (build + test) |
| **Deployment** | Webhook → git pull → restart |
| **Webhook URL** | https://smps.bowdot.online/deploy-webhook.php |
