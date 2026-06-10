#!/bin/bash
# deploy.sh — Manual deployment script for SMPS to Hostinger
# Usage: ./deploy.sh
#
# This script builds locally and uploads artifacts via SSH/SCP.
# You'll be prompted for your SSH password.

set -e

SSH_HOST="u906489923@82.29.157.108"
SSH_PORT="65002"
REMOTE="~/domains/bowdot.online/nodejs"
SSH_OPTS="-p $SSH_PORT -o StrictHostKeyChecking=no -o ConnectTimeout=30 -o ServerAliveInterval=15"

echo "🔨 Building project locally..."
npm run build

echo "✅ Build complete."

echo "📦 Creating assets tarball..."
tar -czf /tmp/assets.tar.gz -C dist/assets .

echo "🔄 Deploying to Hostinger..."

# Upload files
echo "  - Uploading dist/index.html..."
scp $SSH_OPTS dist/index.html $SSH_HOST:$REMOTE/dist/index.html

echo "  - Uploading dist/favicon.ico..."
scp $SSH_OPTS dist/favicon.ico $SSH_HOST:$REMOTE/dist/favicon.ico 2>/dev/null || echo "⚠️ favicon.ico not found"

echo "  - Uploading dist/robots.txt..."
scp $SSH_OPTS dist/robots.txt $SSH_HOST:$REMOTE/dist/robots.txt 2>/dev/null || echo "⚠️ robots.txt not found"

echo "  - Uploading assets.tar.gz..."
scp $SSH_OPTS /tmp/assets.tar.gz $SSH_HOST:$REMOTE/dist/assets/assets.tar.gz

echo "  - Uploading server.cjs..."
scp $SSH_OPTS server.cjs $SSH_HOST:$REMOTE/server.cjs

echo "  - Uploading .htaccess..."
scp $SSH_OPTS .htaccess $SSH_HOST:$REMOTE/.htaccess

echo "🔧 Extracting assets and restarting on server..."
ssh $SSH_OPTS $SSH_HOST "cd $REMOTE && \
  export PATH='/opt/alt/alt-nodejs24/root/usr/bin:/usr/local/bin:/usr/bin:/bin:\$PATH' && \
  cd dist/assets && tar -xzf assets.tar.gz && rm assets.tar.gz && \
  cd $REMOTE && mkdir -p tmp && touch tmp/restart.txt && \
  echo '✅ Deploy complete!'"

echo ""
echo "🎉 Deployment finished! Visit https://smps.bowdot.online/"