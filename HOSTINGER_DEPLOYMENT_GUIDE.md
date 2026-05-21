# 🚀 SMPS Performance Compass — Hostinger Deployment Guide

## Prerequisites

- **Hostinger plan**: Business Web Hosting with Node.js support
- **Node.js**: v18+ (configure in Hostinger panel)
- **Your project files** (zipped or via Git)
- **Groq API Key** (for Copilot AI feature) — optional but recommended

---

## STEP 1: Prepare the Project Locally

Before uploading, make sure the project builds cleanly on your machine:

```bash
cd smps-performance-compass-main

# 1a. Install dependencies (if not already)
npm install

# 1b. Build the frontend
npm run build
# This creates the dist/ folder that the Express server serves in production

# 1c. Verify build succeeded
ls dist/
# You should see: index.html, favicon.ico, assets/, placeholder.svg, robots.txt
```

---

## STEP 2: Create the Deployment ZIP

Create a ZIP file with everything Hostinger needs. **Exclude** `node_modules` and the SQLite `.db` files (they'll be regenerated on the server):

```bash
cd smps-performance-compass-main

# Create zip excluding node_modules, db files, and dev files
zip -r ../smps-deploy.zip . \
  -x "node_modules/*" \
  -x "server/db/*.db" \
  -x "server/db/*.db-shm" \
  -x "server/db/*.db-wal" \
  -x "server/dist-server/*" \
  -x ".env" \
  -x "*.log" \
  -x ".DS_Store" \
  -x "src/App.css"
```

> **Important**: We include `dist/` (the built frontend) but exclude `node_modules` (too large, will install on server). We exclude `.env` (dev config) but include `.env.production` (production config).

---

## STEP 3: Upload to Hostinger

### 3a. Access Hostinger File Manager

1. Log into **Hostinger hPanel** → https://hpanel.hostinger.com
2. Go to **Websites** → your domain → **File Manager**
3. Navigate to your Node.js application root directory
   - Typically: `/home/u123456789/domains/yourdomain.com/public_html/`
   - Or the custom Node.js app directory if you set one up

### 3b. Upload and Extract

1. Upload `smps-deploy.zip` to the Node.js app root
2. Right-click → **Extract** the ZIP
3. Verify the folder structure looks like:
   ```
   public_html/
   ├── dist/                    ← Built frontend
   │   ├── index.html
   │   ├── favicon.ico
   │   └── assets/
   ├── server/
   │   ├── index.ts
   │   ├── auth/
   │   ├── db/
   │   │   ├── connection.ts
   │   │   ├── migrate.ts
   │   │   ├── seed-users.ts
   │   │   └── schema.ts
   │   ├── middleware/
   │   ├── routes/
   │   │   ├── auth.ts
   │   │   ├── users.ts
   │   │   ├── evaluations.ts
   │   │   ├── copilot.ts
   │   │   └── ... (12 more)
   │   └── data/
   ├── src/                     ← Source (not needed for runtime, but keep for tsx)
   ├── package.json
   ├── .env.production          ← Production environment variables
   ├── tsconfig.json
   ├── vite.config.ts
   └── public/
   ```

---

## STEP 4: Configure Node.js in Hostinger

### 4a. Set Up Node.js

1. In Hostinger hPanel → **Advanced** → **Node.js**
2. Click **Create Node.js Application**
3. Configure:
   - **Node.js version**: 18.x or 20.x (latest LTS)
   - **Application root**: `/domains/yourdomain.com/public_html`
   - **Application URL**: your domain
   - **Application startup file**: `server/index.ts`
   - **Application mode**: Production

### 4b. Set Environment Variables

In the Node.js panel, add these **Environment Variables**:

| Variable | Value |
|----------|-------|
| `NODE_ENV` | `production` |
| `PORT` | `3000` (or the port Hostinger assigns) |
| `DATABASE_URL` | `./server/db/smps.db` |
| `JWT_SECRET` | `791794abc42eb8c7eeae01385d9b45943ded236691169c081f86970f64dc08e289d99a6becbc7ec6b25047e124f5053a3dc39d41af3ea5ae02e8c53840d17cca` |
| `GROQ_API_KEY` | `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` |

> ⚠️ **Security**: Change `JWT_SECRET` to a new random value for production. Generate one with:
> ```bash
> node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
> ```

---

## STEP 5: Install Dependencies on the Server

Open **SSH Terminal** in Hostinger (hPanel → Advanced → SSH Terminal) or use your own SSH client:

```bash
# Navigate to your project directory
cd ~/domains/yourdomain.com/public_html

# Install all npm dependencies
npm install

# CRITICAL: Rebuild native module for Linux x86_64
# (better-sqlite3 was compiled on macOS ARM - must rebuild for server's OS)
npm rebuild better-sqlite3
```

> **If `npm rebuild` fails**, try:
> ```bash
> npm install better-sqlite3 --build-from-source
> ```
> This requires `python3` and `make`/`gcc` on the server. Hostinger Business plans typically have these.

---

## STEP 6: Create the Database

Run the migration script to create all SQLite tables (25 tables including Copilot tables):

```bash
npx tsx server/db/migrate.ts
```

You should see output like:
```
Migration completed successfully.
Tables created:
  - users
  - sessions
  - custom_positions
  - period_configs
  - supervisor_assignments
  - evaluations
  - evaluation_responses
  - evaluation_na_approvals
  - announcements
  - announcement_reads
  - action_plans
  - smart_action_items
  - personal_objectives
  - legal_objectives
  - admin_objectives
  - library_questions
  - seed_question_overrides
  - custom_eval_questions
  - vacation_requests
  - vacation_approvals
  - vacation_config
  - extra_vacation_days
  - module_config
  - system_status
  - activation_history
  - copilot_conversations
  - copilot_messages
  - copilot_config
```

---

## STEP 7: Seed the Database

### 7a. Seed 17 Users + Assignments

```bash
npx tsx server/db/seed-users.ts
```

This creates:
- **17 regular users** (all with password `1234`, forced change on first login)
- **1 SuperAdmin** (`lab@bowdot.com` / `3791` — already created during system init)
- **22 supervisor assignments** (20 for 2026-H1, 2 for 2025-H2)
- **Security question** for all users: "¿Cuál es su correo electrónico?" (answer = their email)

### 7b. Verify the Database

```bash
# Check user count
npx tsx -e "
import Database from 'better-sqlite3';
const db = new Database('./server/db/smps.db');
const count = db.prepare('SELECT COUNT(*) as c FROM users').get();
console.log('Users:', count.c);
const assignments = db.prepare('SELECT COUNT(*) as c FROM supervisor_assignments').get();
console.log('Assignments:', assignments.c);
db.close();
"
```

Expected output:
```
Users: 18
Assignments: 22
```

---

## STEP 8: Start the Server

### Option A: Using Hostinger Node.js Panel (Recommended)

1. In Hostinger hPanel → **Node.js** → your application
2. Set **Start Command** to: `npx tsx server/index.ts`
3. Click **Start** or **Restart**

### Option B: Using SSH Terminal

```bash
# Start the server in production mode
npx tsx server/index.ts
```

### Option C: Using PM2 (for auto-restart)

If Hostinger supports PM2:
```bash
npx pm2 start "npx tsx server/index.ts" --name smps
npx pm2 save
npx pm2 startup
```

---

## STEP 9: Verify Everything Works

### 9a. Health Check

```bash
curl http://localhost:3000/api/health
# Expected: {"status":"ok","timestamp":"..."}
```

### 9b. Test Login

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"lab@bowdot.com","password":"3791"}'
# Expected: {"token":"eyJ...","user":{...}}
```

### 9c. Test in Browser

1. Open `https://yourdomain.com` in your browser
2. You should see the **SMPS** login screen
3. Login with `lab@bowdot.com` / `3791`
4. You should see the **Dashboard** with the yellow **SUPERUSER** badge

---

## STEP 10: Post-Deployment Checklist

- [ ] **Change JWT_SECRET** — Generate a new one, don't use the one from this guide
- [ ] **HTTPS** — Enable SSL in Hostinger (free Let's Encrypt)
- [ ] **Test all logins** — Try logging in as regular user (e.g., `cmendoza@smps.com` / `1234`)
- [ ] **Test forced password change** — Regular users should see the change password screen
- [ ] **Test Copilot** — Go to the Copilot chat page (requires GROQ_API_KEY)
- [ ] **Test Access Control** — As SuperUser, go to `/access` and verify you can toggle modules
- [ ] **Test User Management** — As SuperUser/Admin, go to `/users` and verify role toggles work
- [ ] **Backup the database** — After seeding, make a copy of `server/db/smps.db`
  ```bash
  cp server/db/smps.db server/db/smps.db.backup
  ```

---

## 🔧 Troubleshooting

### "Cannot find module" errors
```bash
# Reinstall dependencies
rm -rf node_modules
npm install
npm rebuild better-sqlite3
```

### Blank screen / 500 error
```bash
# Check server logs
cat nohup.out   # If started with nohup
# Or check Hostinger Node.js logs in the panel

# Verify dist/ folder exists
ls dist/index.html
```

### better-sqlite3 native module error
```bash
# Full rebuild
npm install better-sqlite3 --build-from-source

# If missing build tools, install them
npm install -g node-gyp
# May need: apt-get install python3 make gcc (if you have root access)
```

### Database locked errors
```bash
# Kill any stale processes using the DB
fuser server/db/smps.db
# Restart the server
```

### Port already in use
```bash
# Find what's using port 3000
lsof -i :3000
# Kill it
kill -9 <PID>
# Change PORT in environment variables if needed
```

### Copilot not working
```bash
# Verify GROQ_API_KEY is set
echo $GROQ_API_KEY

# Test the API directly
curl -X POST https://api.groq.com/openai/v1/chat/completions \
  -H "Authorization: Bearer $GROQ_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"model":"llama-3.3-70b-versatile","messages":[{"role":"user","content":"Hello"}]}'
```

---

## 📋 Quick Reference

| Item | Value |
|------|-------|
| **SuperAdmin email** | `lab@bowdot.com` |
| **SuperAdmin password** | `3791` |
| **Regular user password** | `1234` (forced change on first login) |
| **Security question** | ¿Cuál es su correo electrónico? |
| **Security answer** | The user's email address |
| **Database location** | `server/db/smps.db` |
| **Server port** | 3000 (or Hostinger-assigned) |
| **Copilot model** | llama-3.3-70b-versatile (via Groq) |

---

## 📁 Files to Keep Private (NEVER upload)

- `.env` — Contains dev JWT secret
- `server/db/*.db` — Database (regenerated on server)
- `node_modules/` — Too large, installed on server
- `server/dist-server/` — Build artifacts
