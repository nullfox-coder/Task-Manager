#!/bin/sh

# Set backup directory
BACKUP_DIR="/backups"
DATE=$(date +"%Y-%m-%d-%H%M")

# Ensure backup directory exists
mkdir -p $BACKUP_DIR

# Log function
log_message() {
  echo "[$(date +"%Y-%m-%d %H:%M:%S")] $1" >> $BACKUP_DIR/backup.log
  echo "[$(date +"%Y-%m-%d %H:%M:%S")] $1"
}

log_message "Starting backup process"

# Backup logs volume
log_message "Backing up logs volume..."
tar -czf $BACKUP_DIR/logs-$DATE.tar.gz /data/logs
if [ $? -eq 0 ]; then
  log_message "Logs backup completed successfully"
else
  log_message "Error: Logs backup failed"
fi

# Backup cache volume
log_message "Backing up cache volume..."
tar -czf $BACKUP_DIR/cache-$DATE.tar.gz /data/cache
if [ $? -eq 0 ]; then
  log_message "Cache backup completed successfully"
else
  log_message "Error: Cache backup failed"
fi

# Backup Prometheus data
log_message "Backing up Prometheus data..."
tar -czf $BACKUP_DIR/prometheus-$DATE.tar.gz /data/prometheus
if [ $? -eq 0 ]; then
  log_message "Prometheus backup completed successfully"
else
  log_message "Error: Prometheus backup failed"
fi

# Backup Grafana data
log_message "Backing up Grafana data..."
tar -czf $BACKUP_DIR/grafana-$DATE.tar.gz /data/grafana
if [ $? -eq 0 ]; then
  log_message "Grafana backup completed successfully"
else
  log_message "Error: Grafana backup failed"
fi

# Cleanup old backups (keep last 7 days)
log_message "Cleaning up old backups..."
find $BACKUP_DIR -name "*.tar.gz" -type f -mtime +7 -delete
if [ $? -eq 0 ]; then
  log_message "Old backups cleaned up successfully"
else
  log_message "Error: Failed to clean up old backups"
fi

# Summary
TOTAL_SIZE=$(du -sh $BACKUP_DIR | cut -f1)
log_message "Backup completed. Total backup size: $TOTAL_SIZE"
log_message "Backups stored in: $BACKUP_DIR" 