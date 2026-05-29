# 🚀 SMPS Performance Compass — Deployment Guide

## Architecture Overview

- **Frontend**: React + Vite → builds to `dist/`
- **Backend**: Express.js bundled into `server.cjs`
- **Database**: MySQL (Hostinger)
- **Entry Point**: `server.js` → dynamically imports `server.cjs`
- **CI/CD**: GitHub Actions (build + test + deploy via SSH)
- **Runtime**: Phusion Passenger (Node.js)

---

## How It Works

```
You push code to GitHub (main branch)
        ↓
GitHub Actions: build + test
        ↓
GitHub Actions: SSH into Hostinger
        ↓
Server: git pull → upload artifacts → npm install → Passenger restart
        ↓
✅ Live at smps.bowdot.online!
```

---

## Deploying

### Automatic (recommended)
Just push to `main`:
```bash
git push origin main
```
GitHub Actions builds, uploads artifacts, and restarts the server automatically.

### Manual (if needed)
SSH into the server and run:
```bash
ssh -p 65002 u906489923@82.29.157.108
cd ~/domains/bowdot.online/smps-app
git pull
npm install --omit=dev --ignore-scripts
mkdir -p tmp && touch tmp/restart.txt
```

---

## Key Files

| File | Purpose |
|------|---------|
| `.github/workflows/deploy.yml` | CI/CD: build, test, deploy via SSH |
| `.github/workflows/db-migrate.yml` | Database reseed (manual trigger) |
| `start.sh` | Server-side: start Node.js app |
| `.htaccess` | Passenger config |
| `server.js` | Entry point for Passenger |

---

## Environment Variables

Set in **hPanel → Advanced → Node.js → Environment Variables**:

| Variable | Value |
|----------|-------|
| `MYSQL_HOST` | `127.0.0.1` |
| `MYSQL_PORT` | `3306` |
| `MYSQL_USER` | `u906489923_u906489923_smp` |
| `MYSQL_PASSWORD` | *(your MySQL password)* |
| `MYSQL_DATABASE` | `u906489923_u906489923_smp` |
| `JWT_SECRET` | *(your JWT secret)* |
| `PORT` | `3000` |
| `NODE_ENV` | `production` |

---

## GitHub Secrets

| Secret | Purpose |
|--------|---------|
| `HOSTINGER_SSH_KEY` | SSH private key for deployment |
| `HOSTINGER_HOST` | `82.29.157.108` |
| `HOSTINGER_PORT` | `65002` |
| `HOSTINGER_USER` | `u906489923` |
| `HOSTINGER_PATH` | `~/domains/bowdot.online/smps-app` |

---

## 📋 Quick Reference

| Item | Value |
|------|-------|
| **Live URL** | https://smps.bowdot.online |
| **Health check** | https://smps.bowdot.online/api/health |
| **SuperAdmin** | lab@bowdot.com / 3791 |
| **CI/CD** | GitHub Actions → SSH deploy |
| **App runner** | Phusion Passenger (Node.js) |
