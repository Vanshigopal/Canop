# Raquel — Production Deployment Checklist

This guide walks through a full production deployment of Raquel on Railway
(or any Docker host). Follow each section top-to-bottom.

## 1. Prerequisites

### External accounts
- [ ] Domain registered: `raquel.app`
- [ ] Cloudflare account (for wildcard DNS + SSL)
- [ ] Railway account (or equivalent Docker host)
- [ ] Razorpay merchant account (KYC complete, live keys)
- [ ] Gupshup WhatsApp Business API approved
- [ ] DLT (Distributed Ledger Technology) registration for SMS in India
- [ ] Bunny Stream video library
- [ ] Cloudflare R2 bucket (or S3-compatible storage)
- [ ] Anthropic API account (optional — per-tenant BYOK works too)
- [ ] Resend transactional email account
- [ ] Sentry project
- [ ] Google Play developer account (if shipping Android app)

### Generate secrets

```bash
# JWT secret (64 hex chars)
openssl rand -hex 64

# LLM encryption key (32 hex chars)
openssl rand -hex 32

# ML service internal API key
openssl rand -hex 24

# Strong database password
openssl rand -base64 32
```

## 2. Railway setup

1. Create new Railway project: `raquel-production`.
2. Add **PostgreSQL** plugin → copy `DATABASE_URL` to env vars.
3. Add **Redis** plugin → copy `REDIS_URL` to env vars.
4. Create three services in the same project:
   - `api` — Dockerfile `apps/api/Dockerfile`, healthcheck `/healthz`
   - `web` — Dockerfile `apps/web/Dockerfile`, healthcheck `/`
   - `ml-service` — Dockerfile `services/ml-service/Dockerfile`, healthcheck `/health`
5. Set env vars for each service using `infra/env/.env.production.template`.
6. Push `main` branch → Railway builds and deploys.

## 3. Database setup

```bash
# From your local machine (with production DATABASE_URL exported)
export DATABASE_URL="postgresql://..."
./scripts/migrate-production.sh

# Seed production data (first tenant + platform admin)
ADMIN_EMAIL="owner@institute.com" \
ADMIN_PASSWORD="FirstLoginPassword123!" \
TENANT_NAME="ABC Coaching" \
TENANT_SLUG="abc-coaching" \
PLATFORM_ADMIN_EMAIL="vansh@raquel.app" \
PLATFORM_ADMIN_PASSWORD="YourStrongPassword123!" \
pnpm --filter @raquel/db tsx prisma/seed-production.ts
```

## 4. ML service bootstrap

Models train from whatever historical data the first tenant has.

```bash
curl -X POST https://ml.raquel.app/training/dropout/bootstrap \
  -H "x-api-key: $ML_SERVICE_API_KEY"

curl -X POST https://ml.raquel.app/training/performance/bootstrap \
  -H "x-api-key: $ML_SERVICE_API_KEY"
```

## 5. DNS configuration (Cloudflare)

| Type  | Name             | Content                  | Proxy |
|-------|------------------|--------------------------|-------|
| A     | raquel.app       | Railway IP               | Yes   |
| CNAME | *.raquel.app     | raquel.app               | Yes   |
| CNAME | api.raquel.app   | Railway API target       | Yes   |
| CNAME | ml.raquel.app    | Railway ML target        | Yes   |
| CNAME | admin.raquel.app | raquel.app (same as web) | Yes   |

SSL is handled automatically by Railway (Let's Encrypt) and Cloudflare.
Set Cloudflare SSL mode to **Full (strict)**.

## 6. Post-deploy verification

```bash
# Liveness
curl https://api.raquel.app/healthz

# Deep health
curl https://api.raquel.app/health

# Tenant login (after seed)
curl -X POST https://api.raquel.app/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -H "X-Tenant-Slug: abc-coaching" \
  -d '{"email":"owner@institute.com","password":"FirstLoginPassword123!"}'

# Platform admin login
curl -X POST https://api.raquel.app/api/v1/platform/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"vansh@raquel.app","password":"YourStrongPassword123!"}'
```

## 7. First-login workflow

1. Browse to `https://abc-coaching.raquel.app`
2. Log in with seed credentials
3. **Immediately change the admin password**
4. Settings → add classes and subjects
5. Create first batch
6. Generate invite link for first student

## 8. Platform admin access

1. Browse to `https://admin.raquel.app/platform-admin/login`
   (or `https://raquel.app/platform-admin/login`)
2. Log in as `vansh@raquel.app`
3. Create additional tenants, manage subscriptions, view platform analytics.

## 9. Monitoring

- **Sentry** — error tracking (auto-captures unhandled errors)
- **Railway logs** — structured JSON log stream
- **UptimeRobot / BetterStack** — ping `/healthz` every minute
- **`/health` endpoint** — returns DB + Redis + ML status

## 10. Backups

- Railway Postgres: automatic daily backups retained 7 days
- Additional off-site backup: `scripts/backup-db.sh` via cron on any box
- Test restore quarterly

## 11. Rollback

```bash
# Railway: redeploy previous commit from dashboard
# Database: restore latest pg_dump from backup
gunzip -c backup_YYYYMMDD_HHMMSS.sql.gz | psql "$DATABASE_URL"
```

## 12. Security checklist

- [ ] All secrets are in Railway env vars, NOT in git
- [ ] `.env.production` is gitignored
- [ ] CORS restricted to `*.raquel.app`
- [ ] Helmet + CSP active
- [ ] Rate limits active (check `X-RateLimit-*` headers)
- [ ] HTTPS enforced (Cloudflare HSTS)
- [ ] Database has RLS enabled (Session 2 migration)
- [ ] JWT secret is production-strength (64 hex chars)
- [ ] Admin password changed from default
- [ ] Sentry PII scrubbing active (no `authorization` headers captured)
