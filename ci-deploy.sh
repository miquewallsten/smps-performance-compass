#!/bin/bash
# ci-deploy.sh — Run on Hostinger server after files are uploaded
# Called by GitHub Actions via SSH after SCP upload is complete.

set -e

export PATH="/opt/alt/alt-nodejs22/root/usr/bin:$PATH"
export LD_LIBRARY_PATH="/opt/alt/alt-nodejs22/root/usr/lib64:$LD_LIBRARY_PATH"
export NODE_ENV=production

APP_DIR=~/domains/bowdot.online/nodejs
cd "$APP_DIR"

echo "=== CI Deploy Starting ==="
echo "Working directory: $(pwd)"

# Stop existing server gracefully
echo "Stopping existing server..."
pkill -f "node.*server" 2>/dev/null || true
sleep 2

# Install production dependencies
echo "Installing production dependencies..."
npm install --omit=dev --ignore-scripts 2>&1 | tail -5

# Start the server
echo "Starting server..."
nohup node server.cjs >> console.log 2>&1 &

# Wait and verify health
echo "Waiting for server to be healthy..."
for i in $(seq 1 15); do
  sleep 3
  if curl -s http://localhost:3000/api/health 2>/dev/null | grep -q '"ok"'; then
    echo "✅ Server is healthy and running!"
    exit 0
  fi
  echo "  Attempt $i/15: waiting..."
done

echo "❌ Server failed to start within 45 seconds"
echo "Last 20 lines of log:"
tail -20 console.log
exit 1
