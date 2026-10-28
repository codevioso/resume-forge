#!/bin/sh
# Nightly MySQL backup: a compressed, consistent dump of the paperplane
# database into /backups, keeping the last BACKUP_KEEP_DAYS days.
# Runs inside the mysql image (which has mysqldump) — see docker-compose.yml.
set -eu

KEEP_DAYS="${BACKUP_KEEP_DAYS:-14}"
INTERVAL="${BACKUP_INTERVAL_SECONDS:-86400}"

backup() {
  stamp=$(date -u +%Y%m%d-%H%M%S)
  tmp="/backups/.paperplane-$stamp.sql.gz.part"
  # --single-transaction: a consistent snapshot of InnoDB tables without
  # locking the live site.
  mysqldump --host=db --user=root --single-transaction --routines --triggers \
    --default-character-set=utf8mb4 paperplane | gzip -9 > "$tmp"
  mv "$tmp" "/backups/paperplane-$stamp.sql.gz"
  find /backups -name 'paperplane-*.sql.gz' -mtime +"$KEEP_DAYS" -delete
  echo "backup: wrote paperplane-$stamp.sql.gz"
}

# Wait for the database, back up once at start, then on the interval.
until mysqladmin ping --host=db --user=root --silent; do sleep 5; done
while true; do
  backup || echo "backup: FAILED" >&2
  sleep "$INTERVAL"
done
