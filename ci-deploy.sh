#!/bin/bash
# ci-deploy.sh — Run on Hostinger server after files are uploaded
# Sets correct PATH for Hostinger Node.js, installs deps, restarts Passenger

set -e

export PATH="/opt/alt/alt-nodejs22/root/usr/bin:/usr/local/bin:/usr/bin:/bin:$PATH"
export LD_LIBRARY_PATH="/opt/alt/alt-nodejs22/root/usr/lib64:$LD_LIBRARY_PATH"
export NODE_ENV=production

APP_DIR=~/domains/bowdot.online/smps-app
cd "$APP_DIR"

echo "=== CI Deploy Starting ==="
echo "Working directory: $(pwd)"
echo "Node version: $(node --version)"
echo "npm version: $(npm --version)"

# Install production dependencies (non-fatal if it fails)
echo "Installing production dependencies..."
npm install --omit=dev --ignore-scripts 2>&1 | tail -5 || echo "⚠️ npm install had warnings"

# Restart Passenger by touching restart.txt
echo "Restarting Passenger..."
mkdir -p tmp
touch tmp/restart.txt

echo "✅ Deploy complete — Passenger will restart on next request"
