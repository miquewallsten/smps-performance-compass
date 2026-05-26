#!/bin/bash
# Deploy SMPS Performance Compass to Hostinger
# Usage: ./deploy.sh [local|remote]
#   local  = build locally and upload (default)
#   remote = just pull from GitHub and restart on server

set -e

SSH_HOST="u906489923@82.29.157.108"
SSH_PORT="65002"
SSH_PASS="M130130w!"
REMOTE_PATH="~/domains/bowdot.online/nodejs"
SSH_CMD="sshpass -p '$SSH_PASS' ssh -p $SSH_PORT -o StrictHostKeyChecking=no $SSH_HOST"
SCP_CMD="sshpass -p '$SSH_PASS' scp -P $SSH_PORT -o StrictHostKeyChecking=no"

MODE="${1:-local}"

echo "🚀 Deploying SMPS Performance Compass ($MODE mode)..."

# Step 1: Build locally
if [ "$MODE" = "local" ]; then
  echo "📦 Building locally..."
  npm run build

  echo "📤 Uploading built files to Hostinger..."
  eval $SCP_CMD server.cjs $SSH_HOST:$REMOTE_PATH/server.cjs
  eval $SCP_CMD dist/index.html $SSH_HOST:$REMOTE_PATH/dist/index.html
  eval $SCP_CMD dist/assets/index-y0lqwjRy.js $SSH_HOST:$REMOTE_PATH/dist/assets/
  eval $SCP_CMD dist/assets/index-UEfECWUo.css $SSH_HOST:$REMOTE_PATH/dist/assets/
  eval $SCP_CMD dist/assets/xlsx-B6sNpj_1.js $SSH_HOST:$REMOTE_PATH/dist/assets/
fi

# Step 2: Sync source files
echo "📤 Syncing source files..."
eval $SCP_CMD -r server/ $SSH_HOST:$REMOTE_PATH/server/
eval $SCP_CMD -r src/ $SSH_HOST:$REMOTE_PATH/src/

# Step 3: Restart server
echo "🔄 Restarting server..."
eval $SSH_CMD "pkill -f 'node.*server' 2>/dev/null; sleep 2; cd $REMOTE_PATH && nohup bash start.sh > console.log 2>&1 &"
sleep 3

# Step 4: Verify
echo "✅ Checking health..."
HEALTH=$(curl -s https://bowdot.online/api/health)
echo "Health: $HEALTH"

echo "🎉 Deploy complete!"
DEPLOY_EOF
chmod +x deploy.sh