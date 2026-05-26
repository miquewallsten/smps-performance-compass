#!/bin/bash
# Deploy SMPS Performance Compass to Hostinger
set -e

SSH_HOST="u906489923@82.29.157.108"
SSH_PORT="65002"
SSH_PASS="M130130w!"
REMOTE_PATH="~/domains/bowdot.online/nodejs"
SSH_CMD="sshpass -p '$SSH_PASS' ssh -p $SSH_PORT -o StrictHostKeyChecking=no $SSH_HOST"
SCP_CMD="sshpass -p '$SSH_PASS' scp -P $SSH_PORT -o StrictHostKeyChecking=no"

echo "🚀 Deploying SMPS Performance Compass..."

echo "📦 Building locally..."
npm run build

echo "📤 Uploading built files to Hostinger..."
eval $SCP_CMD server.cjs $SSH_HOST:$REMOTE_PATH/server.cjs
eval $SCP_CMD dist/index.html $SSH_HOST:$REMOTE_PATH/dist/index.html

# Upload whatever asset files exist (filames include content hashes)
for f in dist/assets/*; do
  echo "  → $(basename $f)"
  eval $SCP_CMD "$f" "$SSH_HOST:$REMOTE_PATH/dist/assets/"
done

echo "📤 Syncing source files..."
eval $SCP_CMD -r server/ $SSH_HOST:$REMOTE_PATH/server/
eval $SCP_CMD -r src/ $SSH_HOST:$REMOTE_PATH/src/

echo "🔄 Restarting server..."
eval $SSH_CMD "pkill -f 'node.*server' 2>/dev/null; sleep 2; cd $REMOTE_PATH && nohup bash start.sh > console.log 2>&1 &"
sleep 4

echo "✅ Checking health..."
HEALTH=$(curl -s https://bowdot.online/api/health)
echo "Health: $HEALTH"

echo "🎉 Deploy complete!"
