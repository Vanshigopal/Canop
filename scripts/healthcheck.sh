#!/usr/bin/env bash
# ══════════════════════════════════════════════════════════
#  Raquel — Deployment Health Check
#  Verifies API, DB, Redis, ML service after deploy.
# ══════════════════════════════════════════════════════════
set -euo pipefail

API_URL="${API_URL:-https://api.raquel.app}"

echo "→ Checking $API_URL/healthz"
CODE=$(curl -s -o /dev/null -w "%{http_code}" "$API_URL/healthz")
if [ "$CODE" = "200" ]; then
  echo "  ✓ Liveness OK"
else
  echo "  ✗ Liveness failed (HTTP $CODE)"
  exit 1
fi

echo "→ Checking $API_URL/health"
RES=$(curl -s "$API_URL/health")
echo "$RES" | grep -q '"status":"healthy"' && echo "  ✓ Deep health OK" || {
  echo "  ⚠ Deep health not fully healthy:"
  echo "$RES"
}

echo
echo "✔ Health check complete."
