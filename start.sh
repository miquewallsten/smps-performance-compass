#!/bin/bash
export PATH="/opt/alt/alt-nodejs22/root/usr/bin:$PATH"
export NODE_ENV=production
cd ~/domains/bowdot.online/nodejs

# Load .env variables explicitly
set -a
source .env 2>/dev/null
set +a

node server.cjs >> console.log 2>&1
