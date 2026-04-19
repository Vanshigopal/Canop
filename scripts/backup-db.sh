#!/usr/bin/env bash
# ══════════════════════════════════════════════════════════
#  Raquel — Daily Database Backup
#  Run via cron: 0 2 * * * /path/to/backup-db.sh
# ══════════════════════════════════════════════════════════
set -euo pipefail

if [ -z "${DATABASE_URL:-}" ]; then
  echo "ERROR: DATABASE_URL environment variable is required" >&2
  exit 1
fi

BACKUP_DIR="${BACKUP_DIR:-/var/backups/raquel}"
RETENTION_DAYS="${RETENTION_DAYS:-30}"

mkdir -p "$BACKUP_DIR"

TIMESTAMP="$(date +%Y%m%d_%H%M%S)"
FILENAME="raquel_backup_${TIMESTAMP}.sql.gz"
FILEPATH="$BACKUP_DIR/$FILENAME"

echo "[backup] Starting: $FILENAME"
pg_dump --no-owner --no-privileges "$DATABASE_URL" | gzip -9 > "$FILEPATH"

SIZE="$(du -h "$FILEPATH" | cut -f1)"
echo "[backup] Completed: $FILEPATH ($SIZE)"

# Prune old backups
DELETED=$(find "$BACKUP_DIR" -name "raquel_backup_*.sql.gz" -mtime +"$RETENTION_DAYS" -print -delete | wc -l)
echo "[backup] Pruned $DELETED backup(s) older than $RETENTION_DAYS days"

# Optional: upload to S3/R2
if [ -n "${R2_BUCKET:-}" ] && command -v aws >/dev/null 2>&1; then
  aws s3 cp "$FILEPATH" "s3://$R2_BUCKET/backups/$FILENAME" \
    --endpoint-url "${R2_ENDPOINT:-}" \
    && echo "[backup] Uploaded to R2: s3://$R2_BUCKET/backups/$FILENAME"
fi

exit 0
