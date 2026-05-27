#!/bin/bash
# start.sh — Run on Hostinger server
# Used by Hostinger's Node.js manager to start the app.
# For Git deployments, run build-and-restart.sh after pulling.
export PATH="/opt/alt/alt-nodejs22/root/usr/bin:$PATH"
export LD_LIBRARY_PATH="/opt/alt/alt-nodejs22/root/usr/lib64:$LD_LIBRARY_PATH"
export NODE_ENV=production
cd ~/domains/bowdot.online/smps-app

# Load .env variables from Hostinger environment (set via hPanel)
# dotenv in the app will also load .env.production if it exists
node server.cjs >> console.log 2>&1
