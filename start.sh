#!/bin/bash
export PATH="/opt/alt/alt-nodejs22/root/usr/bin:$PATH"
export NODE_ENV=production
cd ~/domains/bowdot.online/nodejs
node server.cjs >> console.log 2>&1
