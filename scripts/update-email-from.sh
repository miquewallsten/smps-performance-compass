#!/bin/bash
# Update SMTP_FROM on production server
# Run this after connecting via SSH

echo "📧 Updating email sender to notificaciones@bowdot.online..."

# Path to .env.production (adjust if different)
ENV_FILE="$HOME/domains/bowdot.online/nodejs/.env.production"

# Update or add SMTP_FROM
if grep -q "^SMTP_FROM=" "$ENV_FILE"; then
  sed -i 's/^SMTP_FROM=.*/SMTP_FROM="SMPS Performance <notificaciones@bowdot.online>"/' "$ENV_FILE"
  echo "✅ Updated SMTP_FROM in $ENV_FILE"
else
  echo 'SMTP_FROM="SMPS Performance <notificaciones@bowdot.online>"' >> "$ENV_FILE"
  echo "✅ Added SMTP_FROM to $ENV_FILE"
fi

# Restart Passenger
echo "🔄 Restarting Passenger..."
touch tmp/restart.txt

echo "✅ Done! Emails will now be sent from notificaciones@bowdot.online"
echo "   Check ~/backups/smps/backup.log for backup status"
