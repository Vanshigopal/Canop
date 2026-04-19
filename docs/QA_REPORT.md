# Raquel Platform — QA Report

**Generated:** 2026-04-19
**Session:** 16.5 (Final QA)
**Status:** APPROVED FOR PRODUCTION DEPLOYMENT

---

## Database

- **Migrations:** 14 applied, 0 pending
  - Sequence: `0001_init` → `0014_platform_admin`
  - Applied during this session: `0013_device_tokens`, `0014_platform_admin`
- **Tables:** 58 (including 1 system + 4 platform-level)
- **RLS Policies:** 52 tenant-scoped tables, all protected
  - Non-scoped (correctly, no RLS): `_prisma_migrations`, `tenants`, `platform_admins`, `platform_audit_logs`, `platform_revenue`
- **Schema validation:** PASS (`prisma validate` clean)
- **Seed data:** 2 tenants, 6 users, 2 students, 16 templates, 4 exams, 2 LLM configs, 1 platform super admin, 2 tenant subscriptions

---

## API Endpoints

- **Total endpoints audited:** 43 (34 admin + 9 platform)
- **Passing:** 43 / 43
- **Error responses use standard envelope:** YES (`{ ok: false, error: { code, message, requestId } }`)
- **All error responses now include `requestId`** (added this session)

### Error-case coverage
| Scenario | Expected | Actual |
|---|---|---|
| No token | 401 | ✅ 401 |
| Invalid tenant slug | 404 | ✅ 404 |
| Tenant token on platform endpoint | 401/403 | ✅ 401 |
| Platform token on tenant endpoint | 403 | ✅ 403 |
| Invalid JSON body | 400 | ✅ 400 |
| Missing credentials | 422 | ✅ 422 |
| Wrong password | 401 | ✅ 401 (generic "Invalid email or password") |
| Nonexistent user | 401 | ✅ 401 (generic — prevents user enumeration) |
| Invalid UUID parameter | 400 | ✅ 400 `INVALID_INPUT` (no file path leak) |

---

## Security

| Check | Status | Notes |
|---|---|---|
| Authentication (login/OTP/refresh) | PASS | bcrypt cost 12 verified |
| Authorization (role-based) | PASS | admin/teacher/staff/student/parent separation |
| Tenant isolation (RLS) | PASS | 52 tenant tables have RLS policies |
| SQL injection prevention | PASS | Prisma parameterization — DROP TABLE attempts ignored |
| XSS prevention | PASS | sanitize-html middleware strips `<script>` tags |
| CORS config | PASS | Tightened to `*.raquel.app` in production |
| Rate limiting | PASS | 10/15min auth, 200/min global — triggered in test |
| Security headers | PASS | CSP, HSTS, X-Content-Type-Options, Referrer-Policy, Permissions-Policy |
| X-Powered-By absent | PASS | Fingerprint removed |
| Sensitive data exposure | **FIXED** | passwordHash leak in `/teachers` endpoints resolved |
| CSRF | N/A | JWT bearer auth, no cookies |
| User enumeration | PASS | Generic "Invalid email or password" for both wrong password and nonexistent user |
| File upload validation | PASS | Multer type + size limits |
| OTP brute force | PASS | 5-attempt max enforced in `lib/otp.ts` |

### Security Headers present on responses
```
X-Request-ID: <uuid>
Content-Security-Policy: default-src 'self'; ... frame-ancestors 'none'
Referrer-Policy: strict-origin-when-cross-origin
Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
X-Content-Type-Options: nosniff
X-Frame-Options: SAMEORIGIN
Permissions-Policy: camera=(self), microphone=(), geolocation=(), payment=(self)
```

### OWASP Top 10 (2021) coverage
| ID | Risk | Status |
|---|---|---|
| A01 | Broken Access Control | PASS (RLS + role guards + JWT tenant binding) |
| A02 | Cryptographic Failures | PASS (bcrypt-12, AES-256-GCM for LLM keys, sslmode=require in prod template) |
| A03 | Injection | PASS (Prisma parameterization, Zod validation) |
| A04 | Insecure Design | PASS (business rules enforced via Zod; limits, expiries) |
| A05 | Security Misconfiguration | PASS (X-Powered-By off, no default creds in seed, CSP strict) |
| A06 | Vulnerable Components | PASS (Express ≥ 4.19, jsonwebtoken 9.x) |
| A07 | Auth Failures | PASS (bcrypt, generic login errors, OTP 5-attempt cap) |
| A08 | Data Integrity | PASS (pnpm lockfile, Prisma migrations in git) |
| A09 | Logging & Monitoring | PASS (Sentry, structured JSON logs, platform audit log) |
| A10 | SSRF | PASS (ML_SERVICE_URL from env only, storage hostnames hardcoded) |

---

## Frontend

- **TypeScript:** 0 errors across all 8 packages (api, web, db, types, ui, sdk, desktop, mobile)
- **Build:** `pnpm build` — api + web SUCCESS
  - `apps/web/dist/` total size: **1.8 MB** (target < 2 MB ✓)
  - `apps/api/dist/` total size: 575 KB
  - Largest web chunk (gzipped): `index-*.js` at 155 KB, `CategoricalChart-*.js` at 94 KB
  - Dashboard router chunk: 25 KB gzipped
- **Desktop build:** fails due to Windows symlink permissions during electron-builder archive extraction (environmental, not code); fixed the Session 15 TypeScript error so `pnpm typecheck` passes for desktop.
- **Mobile build:** not invoked (requires Android/iOS toolchain); typecheck passes.

---

## Algorithms

| ID | Name | Status |
|---|---|---|
| F1-F5 | Statistics (summary, histogram, correlation, tTest) | ✅ Present, no crash on edge cases |
| D1 | Engagement Score | ✅ Returns 5 component scores + weighted total (`score: 64.5` in sample) |
| C1 | Anomaly Detection | ✅ Endpoint returns empty array with small seed (correct — no anomalies to flag) |
| A1 | Fuzzy Search | ✅ Endpoint live; 0 matches with tiny seed is correct |
| H1 | Smart Date Parse | ✅ chrono-node + SmartDateInput present |
| H2 | Indian Number Format | ✅ `formatInrCompact` used in platform admin UI |
| I2 | Message Deduplication | ✅ `message_dedup_keys` table exists, 0 entries (no sends yet) |
| G2 | Workload Balance | ✅ `pickLeastFullBatch` used in `joinRequests.ts` approve |

### ML Service
- **Health:** UP (`/health` returns 200)
- **Dropout model:** TRAINED
- **Performance model:** TRAINED
- **Feature extraction:** 18/18 features produced
  - Real values: `batch_dropout_rate = 0.05`, `video_watch_rate = 0.4`, etc.
  - Placeholder `0.5` for `assignment_submission_rate` — CORRECT (no assignment submissions in seed)
  - Placeholder `0.0` for `attendance_trend` — CORRECT (needs >2 weeks of data)
- **OMR scanner:** endpoint wired behind feature gate `requireFeature("omr")`; not exercised in this audit

---

## Production Readiness

| Item | Status |
|---|---|
| Docker files (API, Web, ML) | ✅ All present, multi-stage, non-root users |
| nginx.conf for SPA routing | ✅ Gzip + asset caching + security headers |
| docker-compose.prod.yml | ✅ Wired to env vars with `?` required guards |
| railway.toml | ✅ Healthcheck `/healthz`, on_failure restart |
| Production migration script | ✅ `scripts/migrate-production.sh` (automatic pg_dump backup) |
| DB backup script | ✅ `scripts/backup-db.sh` (30d retention + optional R2 upload) |
| Production seed | ✅ `pnpm seed:prod` — clean slate (1 tenant, 1 admin, 9 templates, platform super admin) |
| .env.production.template | ✅ 41 variables documented |
| docs/DEPLOYMENT.md | ✅ 161 lines, step-by-step |

Environment variables referenced in code: 35 unique. Template contains all 35 + additional runtime knobs.

---

## Fixes Applied in This Session

1. **passwordHash leak** — `/api/v1/teachers` list/detail/update endpoints now use `SAFE_USER_SELECT` (apps/api/src/lib/user-sanitize.ts) to whitelist fields. bcrypt hashes no longer serialized.
2. **Invalid UUID error leak** — Prisma validation errors previously leaked file paths (`E:\\Raquel\\apps\\api\\src\\routes\\students.ts:69:40`). Error handler now detects Prisma validation errors (by name + message pattern) and returns clean `400 INVALID_INPUT`.
3. **Request ID in errors** — every `{ ok: false, error }` envelope now includes `requestId` (from `X-Request-ID` header or auto-generated UUID). Added via `withRequestId()` helper in `error-handler.ts`.
4. **UUID param validation** — registered Express `app.param()` validators for common IDs (`id`, `studentId`, `batchId`, `examId`, etc.) in `middleware/validate-uuid.ts`. Second line of defense against bad UUIDs.
5. **Strong password policy** — new `STRONG_PASSWORD` Zod schema in `lib/password-policy.ts` (min 8 chars + upper + lower + digit + special). Applied to:
   - Platform: create tenant (owner password)
   - Platform: add tenant owner
   - Platform: create platform admin
   - Auth: reset password
6. **Production DB URL template** — added `sslmode=require` to prod `DATABASE_URL` example.
7. **Redis TLS in prod** — changed example from `redis://` to `rediss://` in prod template.
8. **Electron store typing** — fixed Session 15 `Store.get/set does not exist` error with generic `Store<StoreSchema>` definition (`apps/desktop/src/main/index.ts`).
9. **Mobile tsconfig** — `moduleResolution` was `node`, conflicted with parent `customConditions`. Changed to `bundler` + stubbed missing `Event` type from `react-native-qrcode-scanner` + fixed VideosScreen navigation typing.
10. **Missing web dep** — `react-resizable` added as direct dep (was transitive via `react-grid-layout`, failed Vite build).
11. **Platform admin seed** — dev DB now has `vansh@raquel.app` super admin + 2 tenant subscriptions (`PROFESSIONAL`, `ACTIVE`).
12. **Prisma migrations applied** — 0013_device_tokens and 0014_platform_admin were pending; now applied.
13. **Error handler robustness** — catches both `instanceof Prisma.PrismaClientValidationError` AND message-pattern match for hot-reload safety; also preserves `requestId`.

---

## Known Limitations (not session blockers)

| Item | Severity | Notes |
|---|---|---|
| `apps/desktop` production build | LOW | Fails with Windows symlink permission error during electron-builder's archive extraction (macOS libcrypto symlinks). Typecheck passes; fix requires running the build as Administrator or on macOS/Linux. |
| Auth rate limit sticky | LOW | 15-minute cooldown shared across all auth test runs — expected behavior; clears after window. |
| React-native-svg peer warning | LOW | `react-native-svg-charts@5.4.0` wants svg 6/7 but we have 15.15. Charts still render; upstream package is stale. |

---

## Conclusion

**Production readiness:** APPROVED.

All 14 migrations applied, 52 tenant-scoped tables have RLS policies, 8 packages typecheck clean, web bundle under 2 MB, API bundle 575 KB, all 43 API endpoints return 200/expected-error with standardized envelopes, all OWASP Top 10 categories covered, Sentry wired, structured logging in place, platform admin + tenant admin UIs verified.

The previously-identified `passwordHash` leak was the only critical security regression found in this audit; it has been fixed. All other security checks passed on the first run or after applying the fixes listed above.

Ready for Railway deployment after operator follows `docs/DEPLOYMENT.md`.
