# 🤖 Agent Instructions - SMPS Performance Compass

## 🚀 Development Environment Overview

This is a full-stack React + Node.js application with:
- **Frontend**: Vite + React + TypeScript
- **Backend**: Express.js + TypeScript
- **Database**: MySQL (Hostinger)
- **Deployment**: Hostinger via GitHub Actions

## 📋 Before Starting Any Work

### 1. Check Current Running Processes
```bash
# Check for running Vite/Node instances
ps aux | grep -E "(vite|node.*server|tsx)" | grep -v grep

# Check what ports are in use
lsof -i :5175  # Frontend dev server
lsof -i :3000  # Backend API server
```

### 2. Clean Up Duplicate Instances
```bash
# Stop all Vite processes
pkill -f "vite"

# Stop all server processes
pkill -f "tsx.*server"

# Stop npm-run processes
pkill -f "npm.*vite"

# Verify cleanup
ps aux | grep -E "(vite|node.*server|tsx)" | grep -v grep
```

### 3. Start Clean Development Environment
```bash
# Frontend only (port 5175)
npm run dev

# Backend only (port 3000) 
npm run dev:server

# Both frontend and backend
npm run dev:full
```

## 🛠️ Common Development Tasks

### Building for Production
```bash
# Build both frontend and backend
npm run build

# Verify build outputs exist
test -f dist/index.html && echo "✅ Frontend built"
test -f server.cjs && echo "✅ Backend built"
```

### Testing
```bash
# Run all tests
npm test

# Run specific test file
npm test -- src/test/loadingSpinner.test.ts
```

### Database Operations
```bash
# Run migrations
npm run db:migrate

# Seed database
npm run db:seed

# Seed users only
npm run db:seed-users
```

## 🚨 Troubleshooting Common Issues

### App Stuck on "Cargando SMPS…"
- **Cause**: Loading spinner not being removed after React mount
- **Fix**: Ensure `removeLoadingSpinner()` is called in `src/main.tsx`
- **Test**: Run `npm test -- src/test/loadingSpinner.test.ts`

### Port Already in Use
```bash
# Find process using port 5175
lsof -i :5175

# Kill specific process
kill <PID>

# Or kill all Vite processes
pkill -f "vite"
```

### Multiple Instances Running
```bash
# Clean all instances
pkill -f "vite"
pkill -f "tsx.*server"
pkill -f "npm.*vite"

# Start fresh
npm run dev:full
```

## 📦 Deployment Process

### Automatic Deployment (GitHub Actions)
- Push to `main` branch triggers automatic deployment
- GitHub Actions builds and deploys to Hostinger
- No manual intervention needed

### Manual Deployment (If Needed)
```bash
# SSH into Hostinger server
ssh -p 65002 u906489923@82.29.157.108

# Navigate to app directory
cd ~/domains/bowdot.online/smps-app

# Pull latest code
git pull

# Install production dependencies
npm install --omit=dev --ignore-scripts

# Restart Passenger
touch tmp/restart.txt
```

## 🔧 Environment Configuration

### Development (.env)
- Uses Vite proxy for API calls
- JWT_SECRET=dev-secret-change-in-production
- Database connections point to local/dev

### Production (Hostinger)
- API calls use same-origin or VITE_API_URL
- Proper JWT_SECRET set via Hostinger environment
- MySQL database on Hostinger

## 📝 Important Files

- `src/main.tsx` - React entry point with loading spinner logic
- `src/test/loadingSpinner.test.ts` - Tests for spinner removal
- `server.js` - Production entry point for Hostinger
- `server/index.ts` - Backend server code
- `.github/workflows/deploy.yml` - CI/CD deployment pipeline
- `HOSTINGER_DEPLOYMENT_GUIDE.md` - Full deployment guide

## ⚡ Quick Start After Clone

```bash
# Install dependencies
npm ci

# Start development environment
npm run dev:full

# Run tests
npm test

# Build for production
npm run build
```

## 🆘 Emergency Cleanup

If everything is messed up:
```bash
# Nuclear option - stop ALL Node processes
pkill -f "node"

# Remove node_modules and reinstall
rm -rf node_modules
npm ci

# Start fresh
npm run dev:full
```

---

**Remember**: Always check for duplicate instances before starting new work!

Last Updated: 2026-06-03
Maintained by: GitHub Copilot