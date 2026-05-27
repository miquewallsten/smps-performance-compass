#!/bin/bash
set -e
export PATH="/opt/alt/alt-nodejs22/root/usr/bin:/usr/local/bin:/usr/bin:/bin:$PATH"
export PATH="$HOME/domains/bowdot.online/nodejs/node_modules/.bin:$PATH"
export LD_LIBRARY_PATH="/opt/alt/alt-nodejs22/root/usr/lib64:$LD_LIBRARY_PATH"
cd ~/domains/bowdot.online/nodejs

echo "=== Post-deploy build starting ==="
echo "Working directory: $(pwd)"

# Install ALL dependencies
echo "Installing dependencies..."
npm install 2>&1 | tail -5

# Build
echo "Building application..."
npm run build 2>&1

# Verify build
if [ -f dist/index.html ] && [ -f server.cjs ]; then
  echo "Build successful!"
else
  echo "Build FAILED"
  exit 1
fi

# Prune dev deps
echo "Pruning dev dependencies..."
npm prune --omit=dev 2>&1 | tail -3

# Restart Passenger
echo "Restarting Passenger..."
mkdir -p tmp
touch tmp/restart.txt

echo "=== Post-deploy complete! ==="
