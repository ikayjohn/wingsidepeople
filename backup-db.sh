#!/bin/bash

# Database backup script for Wingside Portal
# Run this manually or set up as a cron job

# Configuration
BACKUP_DIR="./backups"
DB_CONTAINER="wingside-postgres"
DB_USER="wingside_user"
DB_NAME="wingside_portal"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/wingside_portal_$TIMESTAMP.sql.gz"

# Create backup directory if it doesn't exist
mkdir -p $BACKUP_DIR

echo "Starting database backup..."
docker exec $DB_CONTAINER pg_dump -U $DB_USER $DB_NAME | gzip > $BACKUP_FILE

if [ $? -eq 0 ]; then
  echo "Backup completed successfully: $BACKUP_FILE"
  
  # Keep only the last 30 backups
  cd $BACKUP_DIR
  ls -t wingside_portal_*.sql.gz | tail -n +31 | xargs rm --
  echo "Old backups cleaned up (keeping last 30)"
else
  echo "Backup failed!"
  exit 1
fi
