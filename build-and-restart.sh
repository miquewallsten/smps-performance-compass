#!/bin/bash
set -e

# Post-deployment script for Hostinger
# Built artifacts come from git (committed by GitHub Actions)
# This script only installs prod deps and restarts Passenger.

export HOME="/home/u906489923"
export PATH="/home/u906489923/domains/bowdot.online/smps-app/node_modules/.bin:/opt/alt/alt-nodejs22/root/usr/bin:/usr/local/bin:/usr/bin:/bin"
export LD_LIBRARY_PATH="/opt/alt/alt-nodejs22/root/usr/lib64"

cd /home/u906489923/domains/bowdot.online/smps-app

echo "=== Post-deploy starting ==="
echo "Working directory: $(pwd)"

# Verify built files exist (they come from git now)
if [ ! -f dist/index.html ] || [ ! -f server.cjs ]; then
  echo "ERROR: Built files missing! dist/index.html or server.cjs not found."
  echo "The GitHub Actions CI should have committed these files."
  exit 1
fi

echo "Built files verified:"
ls -la dist/index.html server.cjs

# Install production dependencies only
echo "Installing production dependencies..."
npm install --omit=dev --ignore-scripts 2>&1 | tail -5

# Restart Passenger
echo "Restarting Passenger..."
mkdir -p tmp
touch tmp/restart.txt

echo "=== Post-deploy complete! ==="
