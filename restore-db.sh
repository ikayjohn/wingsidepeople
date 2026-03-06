#!/bin/bash

# Database restore script for Wingside Portal
# Usage: ./restore-db.sh backup_file.sql.gz

if [ -z "$1" ]; then
  echo "Usage: $0 <backup_file.sql.gz>"
  echo "Example: $0 backups/wingside_portal_20241227_120000.sql.gz"
  exit 1
fi

BACKUP_FILE=$1
DB_CONTAINER="wingside-postgres"
DB_USER="wingside_user"
DB_NAME="wingside_portal"

# Check if backup file exists
if [ ! -f "$BACKUP_FILE" ]; then
  echo "Error: Backup file not found: $BACKUP_FILE"
  exit 1
fi

echo "WARNING: This will replace the current database!"
read -p "Are you sure? (yes/no): " confirm

if [ "$confirm" != "yes" ]; then
  echo "Restore cancelled."
  exit 0
fi

echo "Restoring database from: $BACKUP_FILE"
gunzip < $BACKUP_FILE | docker exec -i $DB_CONTAINER psql -U $DB_USER -d $DB_NAME

if [ $? -eq 0 ]; then
  echo "Database restored successfully!"
else
  echo "Restore failed!"
  exit 1
fi
