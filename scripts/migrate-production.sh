#!/usr/bin/env bash
# ══════════════════════════════════════════════════════════
#  Raquel — Production Database Migration
#  Runs pg_dump backup then prisma migrate deploy.
#  Usage: DATABASE_URL=... ./scripts/migrate-production.sh
# ══════════════════════════════════════════════════════════
set -euo pipefail

if [ -z "${DATABASE_URL:-}" ]; then
  echo "ERROR: DATABASE_URL environment variable is required" >&2
  exit 1
fi

echo "╔══════════════════════════════════════════╗"
echo "║  Raquel — Production Database Migration  ║"
echo "╠══════════════════════════════════════════╣"

# Mask the password in output
MASKED="$(echo "$DATABASE_URL" | sed -E 's#(://[^:]+:)[^@]+@#\1*****@#')"
echo "Database: $MASKED"

# ─── Backup ───
BACKUP_DIR="${BACKUP_DIR:-./backups}"
mkdir -p "$BACKUP_DIR"
BACKUP_FILE="$BACKUP_DIR/backup_pre_migrate_$(date +%Y%m%d_%H%M%S).sql.gz"

echo
echo "→ Creating backup: $BACKUP_FILE"
if command -v pg_dump >/dev/null 2>&1; then
  pg_dump "$DATABASE_URL" | gzip > "$BACKUP_FILE"
  SIZE="$(du -h "$BACKUP_FILE" | cut -f1)"
  echo "  ✓ Backup saved ($SIZE)"
else
  echo "  ⚠ pg_dump not available — skipping backup"
fi

# ─── Migrate ───
echo
echo "→ Running prisma migrate deploy..."
cd "$(dirname "$0")/../packages/db"
npx prisma migrate deploy
echo "  ✓ Migrations applied"

# ─── Generate Prisma client ───
echo
echo "→ Generating Prisma client..."
npx prisma generate
echo "  ✓ Client generated"

echo
echo "╚══════════════════════════════════════════╝"
echo "✔ Migration successful."
[ -f "$BACKUP_FILE" ] && echo "  Pre-migration backup: $BACKUP_FILE"
