#!/bin/bash
# deploy.sh — Local manual deployment script
# For CI/CD, use GitHub Actions instead (push to main branch)
#
# Usage: ./deploy.sh [SSH_KEY_PATH]
#
# This script uses SSH key auth (no hardcoded passwords).
# Set HOSTINGER_SSH_KEY env var or pass the key path as an argument.

set -e

SSH_KEY="${1:-$HOSTINGER_SSH_KEY}"
if [ -z "$SSH_KEY" ]; then
  echo "❌ No SSH key provided. Set HOSTINGER_SSH_KEY or pass key path as argument."
  echo "   Usage: ./deploy.sh /path/to/ssh_key"
  exit 1
fi

SSH_HOST="${HOSTINGER_HOST:-82.29.157.108}"
SSH_PORT="${HOSTINGER_PORT:-65002}"
SSH_USER="${HOSTINGER_USER:-u906489923}"
REMOTE_PATH="${HOSTINGER_PATH:-~/domains/bowdot.online/nodejs}"

SSH_CMD="ssh -i $SSH_KEY -p $SSH_PORT -o StrictHostKeyChecking=no $SSH_USER@$SSH_HOST"
SCP_CMD="scp -i $SSH_KEY -P $SSH_PORT -o StrictHostKeyChecking=no"

echo "🚀 Deploying SMPS Performance Compass..."

echo "📦 Building locally..."
npm run build

echo "📤 Uploading files to Hostinger..."
$SCP_CMD server.cjs $SSH_USER@$SSH_HOST:$REMOTE_PATH/server.cjs
$SCP_CMD server.js $SSH_USER@$SSH_HOST:$REMOTE_PATH/server.js
$SCP_CMD package.json $SSH_USER@$SSH_HOST:$REMOTE_PATH/package.json
$SCP_CMD package-lock.json $SSH_USER@$SSH_HOST:$REMOTE_PATH/package-lock.json
$SCP_CMD ci-deploy.sh $SSH_USER@$SSH_HOST:$REMOTE_PATH/ci-deploy.sh
$SCP_CMD start.sh $SSH_USER@$SSH_HOST:$REMOTE_PATH/start.sh

echo "📤 Uploading frontend..."
$SSH_CMD "mkdir -p $REMOTE_PATH/dist/assets"
$SCP_CMD dist/index.html $SSH_USER@$SSH_HOST:$REMOTE_PATH/dist/index.html
$SCP_CMD dist/favicon.ico $SSH_USER@$SSH_HOST:$REMOTE_PATH/dist/favicon.ico 2>/dev/null || true
$SCP_CMD dist/robots.txt $SSH_USER@$SSH_HOST:$REMOTE_PATH/dist/robots.txt 2>/dev/null || true
$SCP_CMD dist/assets/* $SSH_USER@$SSH_HOST:$REMOTE_PATH/dist/assets/

echo "🔄 Running server-side deploy..."
$SSH_CMD "chmod +x $REMOTE_PATH/ci-deploy.sh && bash $REMOTE_PATH/ci-deploy.sh"

echo "✅ Deploy complete!"
