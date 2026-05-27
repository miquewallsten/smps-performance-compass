#!/bin/bash
# build-and-restart.sh — Post-deployment script for Hostinger Git deployments
# Run this after Hostinger pulls from GitHub.
# Set as the "Post-deployment command" in Hostinger Git settings.
set -e

export PATH="/opt/alt/alt-nodejs22/root/usr/bin:$PATH"
export LD_LIBRARY_PATH="/opt/alt/alt-nodejs22/root/usr/lib64:$LD_LIBRARY_PATH"
export NODE_ENV=production

cd ~/domains/bowdot.online/nodejs

echo "=== Post-deploy build starting ==="
echo "Working directory: $(pwd)"

# Install dependencies
echo "Installing dependencies..."
npm install --omit=dev --ignore-scripts 2>&1 | tail -5

# Build frontend and server bundle
echo "Building application..."
npm run build

echo "=== Build complete ==="

# Stop existing server (Hostinger's Node.js manager will restart it)
echo "Restarting server..."
pkill -f "node.*server" 2>/dev/null || true

echo "=== Post-deploy complete ==="
