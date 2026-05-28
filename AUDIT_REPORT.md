# Canop — Full-System Audit Report

**Date:** 2026-05-28
**Branch audited:** `claude/amazing-brahmagupta-JaQyI`
**Scope:** apps/api, apps/web, apps/mobile, apps/desktop, packages/*, services/ml-service, infra/*
**Method:** static code review (every middleware, every route file, every page sampled), dependency audit (`pnpm audit`), build (`pnpm typecheck`, `pnpm lint`), grep sweeps for code smells. Findings backed by file:line citations. Claims I could not verify by reading the file are marked `[unverified]`.

---

## Phase 1 — Inventory & Build Health

### Stack
- **Monorepo:** pnpm + Turborepo. 537 tracked files (205 .tsx, 203 .ts, 21 .py, 15 .sql).
- **API** (`apps/api`): Express + TypeScript, 50 route files (~11,973 LOC of routes), Prisma, Redis, Socket.IO, Razorpay, Sentry, AWS S3 (R2), Multer.
- **Web** (`apps/web`): React 18 + Vite + Tailwind + TanStack Query + Zustand + react-router-dom, ~60 page modules.
- **Mobile** (`apps/mobile`): React Native 0.74, Firebase auth.
- **Desktop** (`apps/desktop`): Electron 32.
- **DB** (`packages/db`): Prisma schema, 14 migrations, RLS-enabled tables.
- **ML** (`services/ml-service`): FastAPI, scikit-learn pickled models.

### Build status

| Check | Result |
|---|---|
| `pnpm install` | ✅ success |
| `pnpm typecheck` | ❌ fails — `@canop/db#typecheck`: `packages/db/prisma/seed.ts:3 — 'enableRLS' is declared but its value is never read` (TS6133). All other packages typecheck clean. |
| `pnpm typecheck` per-package | `apps/api`: 1 warning (TS7016 — missing `@types/compression`); `apps/web`, `packages/types`, `packages/sdk`, `packages/ui`, `apps/desktop`, `apps/mobile`: ✅ clean. |
| `pnpm lint` (Biome) | ❌ 1090 errors, 67 warnings, 1152 diagnostics suppressed. The vast majority are `organizeImports` (~243 suggested unsafe fixes) and unused-imports — almost all cosmetic and biome-autofixable. |
| `pnpm audit --prod` | ❌ **42 vulnerabilities** — **1 critical** (sanitize-html via apostrophe — XSS), **15 high** (axios prototype pollution × 4, undici × 3, protobuf.js × 4, fast-uri × 2, fast-xml-builder, d3-color ReDoS, babel plugin), **24 moderate**, **2 low**. The most consequential transitive paths: `apps/api → axios@1.15.0` and `apps/api → razorpay → axios@1.15.0`. |
| Outdated deps | 3 deprecated: `@types/bcryptjs`, `@types/react-grid-layout`, `metro-react-native-babel-preset`. Many minor-version-behind packages (axios, sentry, tanstack/react-query, turbo). |

### Code-smell sweep
- 4 `TODO` markers (login forgot-password, FeesTab Razorpay UI, payments stub, mobile login regex).
- 0 `FIXME` / `HACK` / `XXX`.
- ~58 `console.log` calls in apps/api and apps/web. Most are operational logs; **three log secrets** (see P0 #1).
- 0 `dangerouslySetInnerHTML`.
- 0 hardcoded production secrets in source.

---

## Phase 2 — Security & Production Readiness

### [P0] OTP, password-reset token, and teacher password logged in plaintext
- **Where:**
  - `apps/api/src/routes/auth.ts:153` — `console.log(\`[OTP] ${phone} → ${otp}\`)`
  - `apps/api/src/routes/auth.ts:403` — `console.log(\`[PASSWORD_RESET] ${email} → token: ${token}\`)`
  - `apps/api/src/routes/teachers.ts:71` — `console.log(\`[teacher-created] ${email} / ${password}\`)`
- **Problem:** Sensitive auth credentials written to stdout, captured by container logs and any log aggregation pipeline.
- **Impact:** Anyone with log access (operations, third-party log providers, Sentry breadcrumbs) can hijack accounts, complete password resets, or impersonate teachers immediately after creation.
- **Fix:** Gate behind `if (env.NODE_ENV !== 'production')` for OTP/reset (dev convenience). For teacher creation, send the password via email/SMS rather than logging it; never log it in any environment.
- `[verified]` by reading all three lines.

### [P0] No Razorpay webhook endpoint — payment status relies on client-driven verify only
- **Where:** `apps/api/src/routes/webhooks.ts` (only handles `/gupshup/*`), `apps/api/src/routes/payments.ts:364` (`/razorpay/verify`).
- **Problem:** Razorpay webhooks (`payment.captured`, `payment.failed`, `refund.processed`) are never received. The system trusts the browser-returned `razorpayOrderId/paymentId/signature` to update payment state. While the verify endpoint **does** HMAC-check the signature (line 378) when real Razorpay keys are configured, server-driven async events (refunds, async failures, captures via UPI deferred flows) are never reconciled.
- **Impact:** Payment state drift; refunds invisible to the system; legitimate captures missed if the user closes the browser before verify returns; replay risk if the verify endpoint is hit twice in flight (mitigated by the `status === 'SUCCESS'` short-circuit at payments.ts:372 but not by a stored idempotency key).
- **Fix:** Add `POST /api/v1/webhooks/razorpay` that verifies `X-Razorpay-Signature` against `RAZORPAY_WEBHOOK_SECRET`, persists `event.id` for idempotency, and updates `Payment` records on captured/failed/refunded events. Keep the verify endpoint as the fast path but make the webhook the source of truth.
- `[verified]` by reading webhooks.ts (no Razorpay handler) and payments.ts (signature check exists for the verify call only).

### [P0] Stub-mode Razorpay verify accepts ANY signature
- **Where:** `apps/api/src/routes/payments.ts:381-386`
- **Problem:** When `razorpayClient === null` (placeholder keys), the verify endpoint sets `verified = true` unconditionally and marks the payment SUCCESS. In production, if `RAZORPAY_KEY_ID`/`RAZORPAY_KEY_SECRET` are misconfigured or unset, every payment is auto-confirmed.
- **Impact:** Tenants whose Razorpay keys are misconfigured silently mark payments as paid without money moving. Free fees for whoever hits the verify endpoint.
- **Fix:** Refuse to mount the `/razorpay/*` routes (or return 503) in production when `razorpayClient === null`. Validate at boot: `if (env.NODE_ENV === 'production' && !razorpayClient) throw new Error('Razorpay keys required')`.
- `[verified]` by reading payments.ts:381-386.

### [P0] Auth state lost on page refresh — tokens not persisted
- **Where:** `apps/web/src/stores/auth.ts` — Zustand store has no `persist` middleware; `accessToken`/`refreshToken` live only in memory.
- **Problem:** Hitting Cmd-R or following a deep link wipes auth. Users must re-login on every reload despite holding a 7-day refresh token.
- **Impact:** Either you accept this as UX-breaking (P0 functionality bug), or — more likely — there's a hidden bootstrapping path I missed. Either way, deep-link survival is broken.
- **Fix:** Wrap the store in Zustand `persist(... , { name: 'canop-auth', partialize: state => ({ refreshToken: state.refreshToken }) })`. On boot, rehydrate refresh token, call `/auth/refresh`, then `fetchMe()`. Do not persist the access token (short TTL).
- `[verified]` by reading the entire auth store — no persistence, no localStorage usage, no rehydration call on app mount in `app/App.tsx`.

### [P0] No env validation prevents production from booting with default dev secrets
- **Where:** `apps/api/src/config/env.ts:11-13`
- **Problem:** `JWT_SECRET` defaults to `"canop-dev-secret-change-in-production-please"` (33 chars, passes the `.min(16)` check). `RAZORPAY_KEY_SECRET` defaults to `"placeholder_secret"`. If env vars are unset in prod, the app boots with these defaults — JWTs signed with a publicly-known secret = total auth bypass.
- **Impact:** Any actor who has read the repo can forge access tokens for any user in any tenant.
- **Fix:** Add a production gate after `EnvSchema.parse`:
  ```ts
  if (env.NODE_ENV === 'production') {
    if (env.JWT_SECRET.includes('dev') || env.JWT_SECRET.length < 32) throw new Error('JWT_SECRET must be set');
    if (env.RAZORPAY_KEY_SECRET === 'placeholder_secret') throw new Error('Razorpay keys required');
    if (!env.SENTRY_DSN) console.warn('[boot] Sentry disabled in production');
    if (!env.LLM_ENCRYPTION_KEY) throw new Error('LLM_ENCRYPTION_KEY required (do not silently fall back to JWT_SECRET)');
  }
  ```
- `[verified]` by reading env.ts and jwt.ts.

### [P0] Socket.IO CORS `origin: true` echoes any origin
- **Where:** `apps/api/src/config/socket.ts:18-21`
- **Problem:** `cors: { origin: true, credentials: true }` accepts WS connections from any origin. The auth token check (line 25) does protect data, but the WS connection cost (rooms, JWT verify) is open to anyone.
- **Impact:** A malicious page can establish a tenant-scoped socket with a stolen/leaked access token and subscribe to `tenant:*` broadcasts (payment events, QR sessions). Combined with the broad Helmet `connectSrc` allowance of `wss://*.canop.app`, an attacker page on a sibling subdomain could enumerate events.
- **Fix:** Reuse the HTTP CORS allowlist for socket.io:
  ```ts
  io = new SocketIOServer(httpServer, {
    cors: { origin: (origin, cb) => /* same matcher as middleware/cors.ts */, credentials: true },
  });
  ```
- `[verified]` by reading socket.ts.

### [P0] No error boundary at React root
- **Where:** `apps/web/src/app/App.tsx`, `apps/web/src/main.tsx`
- **Problem:** Any uncaught render error blanks the whole app. No fallback UI, no telemetry hook.
- **Impact:** Single render error per session = white screen for every user on that route until they manually clear state.
- **Fix:** Wrap `<RouterProvider>` in a Sentry `<ErrorBoundary fallback={<AppErrorFallback />}>`. Already have `@sentry/react` installed.
- `[verified]` by reading App.tsx — only `QueryClientProvider` + `RouterProvider`.

### [P1] Critical/high transitive vulnerabilities
- **Where:** `pnpm-lock.yaml`. Highlights:
  - **critical**: `sanitize-html` via `apostrophe` (XSS via `xmp` raw-text passthrough). [unverified — appears to be a transitive dep, may not be exercised by our code, but the lockfile pins it.]
  - **high**: `axios@1.15.0` — 4 separate prototype-pollution / header-injection / proxy-bypass CVEs. Used by `apps/api`, `apps/mobile`, and transitively by `razorpay`.
  - **high**: `undici@5.28.4` — memory exhaustion and unhandled exception in WebSocket client (via firebase).
  - **high**: `protobuf.js` × 4 (firebase transitive).
  - **high**: `fast-uri`, `fast-xml-builder`, `d3-color`, `@babel/plugin-transform-modules-systemjs`.
- **Fix:** `pnpm up axios@^1.16` and `pnpm up razorpay` (newer razorpay pulls newer axios). Add a `pnpm.overrides` block in the root `package.json` to force-upgrade transitives:
  ```json
  "pnpm": { "overrides": { "axios": "^1.16.1", "undici": "^5.29.0" } }
  ```
- `[verified]` via `pnpm audit --prod`.

### [P1] Cross-tenant IDOR on materials/videos: batchIds not verified against tenant
- **Where:** `apps/api/src/routes/materials.ts:140-148`, `apps/api/src/routes/videos.ts:159-167`
- **Problem:** The teacher submits `batchIds: string[]` in the multipart form. The handler creates `materialBatchAccess` rows directly. Because `batchId` is a UUID, the Prisma FK constraint *will* prevent linking to a non-existent batch, but it will *not* prevent linking to a batch in another tenant whose UUID the attacker knows or guesses.
- **Impact:** A teacher at Tenant A who learns a Tenant B batch UUID can publish a material visible to that batch — cross-tenant content injection.
- **Fix:** Before `createMany`, run `prisma.batch.findMany({ where: { id: { in: batchIds }, tenantId, deletedAt: null }, select: { id: true } })` and reject if the count mismatches.
- `[verified]` by reading the createMany block in materials.ts.

### [P1] OTP comparison is not constant-time
- **Where:** `apps/api/src/lib/otp.ts:35` — `return stored === otp`.
- **Problem:** String equality short-circuits on the first mismatched character. Combined with no jitter on response time, an attacker can side-channel the OTP.
- **Impact:** Realistic only if the attacker can also brute-force the 5-tries-per-5min rate limit, which makes this lower-risk than nominal — but the fix is one line.
- **Fix:** `return crypto.timingSafeEqual(Buffer.from(stored), Buffer.from(otp))`. Guard against length mismatch first.
- `[verified]`.

### [P1] No idempotency key persisted on Razorpay verify
- **Where:** `apps/api/src/routes/payments.ts:364-437`
- **Problem:** Verify is idempotent on the success path (`if (payment.status === 'SUCCESS') return alreadyVerified`), but if two parallel verify calls arrive on a PENDING payment, both enter `withTenantTransaction`. Postgres serialization may catch it via the `Payment.id` row lock, but the receipt-number generation in `nextReceiptNumber` could race depending on its implementation.
- **Impact:** Possible double-receipt-number generation under contention.
- **Fix:** Add a unique constraint `Payment.razorpayPaymentId UNIQUE` and rely on the constraint to fail one of two racing calls.
- `[unverified] — would need to read `nextReceiptNumber` to confirm the race, but the constraint fix is harmless either way.`

### [P1] File upload: no MIME whitelist enforced server-side
- **Where:** `apps/api/src/routes/materials.ts`, `apps/api/src/routes/videos.ts`, `apps/api/src/routes/omr.ts` (multer config near top of each file).
- **Problem:** Multer sets `limits.fileSize` but does not validate MIME or extension against a whitelist. The body's Content-Type can be spoofed by the client.
- **Impact:** A user can upload an `.exe` claimed as `application/pdf`. Because storage uses a sanitized filename (good — `storage.service.ts:51-56`) and serves via signed URL (good), execution risk is low; but the integrity assumption "videos are videos" is unenforced.
- **Fix:** Configure `multer({ fileFilter: (req, file, cb) => ALLOWED.includes(file.mimetype) ? cb(null, true) : cb(new Error('Unsupported type')) })`. For high-trust contexts also sniff magic bytes (`file-type` npm pkg).
- `[verified]` for the absence — I read materials/videos route tops and saw no fileFilter.

### [P1] Helmet CSP allows `'unsafe-inline'` scripts
- **Where:** `apps/api/src/middleware/security.ts:14-19`
- **Problem:** `scriptSrc: ["'self'", "'unsafe-inline'", "https://checkout.razorpay.com"]`. `'unsafe-inline'` defeats most of CSP's XSS protection.
- **Impact:** Any future XSS sink (e.g., a forgotten `dangerouslySetInnerHTML`, a template engine bug) is exploitable. Right now the codebase has no `dangerouslySetInnerHTML` (verified by grep), so the immediate risk is lower, but CSP is supposed to defend against future regressions.
- **Fix:** Switch Vite to use nonce-based inline scripts (`<script nonce="...">`), inject the nonce via Helmet's per-request CSP, and drop `'unsafe-inline'`. As a stepping stone, move to `'strict-dynamic'` with hashes for the few inline scripts Razorpay needs.

### [P1] Reset token TTL is 1 hour and not single-use
- **Where:** `apps/api/src/lib/jwt.ts:30-37`, `apps/api/src/routes/auth.ts:405-432`
- **Problem:** The reset token is a stateless JWT with 1h TTL. It is **not** invalidated after first use — the same token works repeatedly until expiry. `reset-password` does delete all sessions, but the JWT itself remains valid.
- **Impact:** If the reset link is leaked (browser history, referrer header, log aggregation), the token can be replayed within 1h.
- **Fix:** Add a `passwordChangedAt` column on User; include it in the reset token; reject the token if `user.passwordChangedAt > token.iat`. Alternatively, store a one-time `passwordResetTokenId` and invalidate on use.

### [P1] Multi-write operations not transactional
- **Where:** (sampled — backend agent flagged this pattern; not every route checked)
  - `apps/api/src/routes/auth.ts:62-87` — `createSession` correctly uses `withTenantTransaction` ✅
  - `apps/api/src/routes/payments.ts:341-360`, `:395-413` — `withTenantTransaction` ✅
  - `apps/api/src/routes/materials.ts:120-150` — wrapped in tx ✅
- **Status:** Sampled handlers look good; backend agent's broad concern needs full sweep. Marked `[unverified]` for routes not yet read. Add to FIX_BACKLOG as an audit task rather than a fix task.

### [P1] No route-level audit log for sensitive mutations
- **Where:** `apps/api/src/lib/platform-audit.ts` exists (suggests an audit-log helper) but route-level usage was not observed in payments/students/teachers/exams routes during sampling.
- **Impact:** No forensic trail for "who deleted student X" / "who changed role of user Y" — required for any institution with compliance obligations (UGC, NEP, GDPR-equivalents).
- **Fix:** Audit-log middleware on PATCH/DELETE/POST for the resources: student, teacher, batch, exam, payment, broadcast, role/permission change, tenant-settings change.
- `[unverified]` — would need to grep usage of `platform-audit` across routes.

### [P2] Tenant-extraction does not validate slug shape strictly
- **Where:** `apps/api/src/middleware/tenant.ts:67-79`
- **Problem:** `parts[0]` is taken as slug after a denylist (`['www','api','app','admin','mail']`). No regex shape check — any subdomain string is accepted and used as a DB lookup key.
- **Impact:** Low (Prisma is parameterized so no injection), but does spam DB with cardinal lookups for crawler hits at `xxx.canop.app`.
- **Fix:** Pre-validate with `/^[a-z0-9][a-z0-9-]{1,29}$/`. Cache the slug→tenant map in Redis with a short TTL.

### [P2] `withTenantTransaction` and direct `prisma.*` calls both exist
- **Where:** Several routes use `prisma.user.findUnique({ where: { tenantId_email: ... } })` directly without wrapping in `withTenantTransaction`. Example: `apps/api/src/routes/auth.ts:109-114` (login flow — pre-session, intentional). But also in payments.ts:303, parent-portal, materials list endpoints, etc.
- **Problem:** If RLS is enabled in prod (which the schema migrations enable), unwrapped Prisma calls won't have `app.current_tenant` set in the session and will be rejected by RLS or return nothing.
- **Impact:** Either the routes break at boot (RLS rejects), OR — depending on RLS policy default — they silently return no rows. Both are visible at first request and easy to catch; flag for a single sweep before production.
- **Fix:** Either (a) require every route to use `withTenantTransaction`, or (b) configure Prisma middleware that sets `app.current_tenant` on every request automatically from `req.tenantId`.
- `[unverified]` — would need to grep `prisma\.` vs `withTenantTransaction` across all routes.

### [P2] No password-change rate limit / lockout
- **Where:** auth.ts login endpoint relies only on the 10/15min IP rate limit.
- **Problem:** Distributed credential stuffing across many IPs is not throttled per account.
- **Fix:** Add `failedLoginCount` + `lockedUntil` per User; lock for 15 min after 10 failures within an hour.

### [P3] `console.log` operational noise (~55 sites)
- **Where:** redis.ts, socket.ts, sentry.ts, request-logger.ts, payments.ts, notification.service.ts, etc.
- **Fix:** Replace with `req.log.info(...)` (Pino is already wired in `request-logger.ts`). Strip startup `[canop-api] listening` etc. or keep only one.

---

## Phase 3 — Backend & APIs

### [P1] Stub-only services: bunny-stream, gupshup, ML predictions
- **Where:** `apps/api/src/services/bunny-stream.service.ts:34/65/122` (`[bunny-stub] ...`), `apps/api/src/routes/payments.ts:328` (`// TODO: real Razorpay order`).
- **Problem:** Stub implementations live in production code paths. Without explicit boot-time refusal, a prod deploy with missing keys silently runs as a non-functional stub.
- **Fix:** At startup, log a banner of which adapters are in stub mode; in production, fail-fast if any adapter is stubbed.

### [P2] Pagination caps not consistent
- **Where:** route list endpoints (sampled `deliveries.ts:23` default `pageSize="50"`, no max cap).
- **Problem:** Most list endpoints accept user-supplied `pageSize` without an upper bound.
- **Fix:** Central helper `parsePage(req, { maxSize: 100 })`.

### [P2] `student-portal` / `parent-portal` endpoint ownership checks
- **Where:** `apps/api/src/routes/student-portal.ts`, `parent-portal.ts`. Backend agent reported parent-portal uses a `requireChildAccess` middleware. Did not personally verify each handler.
- **Status:** `[unverified]` — needs handler-by-handler review that every `:studentId` path is gated by the parent-child relationship check.

### [P3] N+1 risks in analytics/exports
- **Where:** `apps/api/src/routes/analytics.ts`, `apps/api/src/services/export.service.ts`
- **Status:** `[unverified]` — large files (300+ lines) not read in this pass.

---

## Phase 4 — Frontend & UI

### [P1] Pages silently swallow load errors → infinite "Loading..." state
- **Where:** (from frontend agent — spot-checked):
  - `apps/web/src/pages/students/StudentsPage.tsx:38-49`
  - `apps/web/src/pages/batches/BatchesPage.tsx:32-41`
  - `apps/web/src/pages/exams/ExamsPage.tsx:81-91`
  - `apps/web/src/pages/videos/VideosPage.tsx:60-70`
- **Problem:** `try { ... } catch { setItems([]) }` shows the user an empty page indistinguishable from a real empty state.
- **Fix:** Adopt TanStack Query for list views (already configured) — switch these hand-rolled `useEffect/setState/load()` patterns to `useQuery`. Show `<ErrorState onRetry={...}/>` on `isError`, and a `<EmptyState/>` on `data.length === 0`.

### [P1] Modals lack focus trap, Escape-to-close, scroll-lock, focus return
- **Where:** Every `*Modal.tsx` in `apps/web/src/pages/**/`:
  - `attendance/AttendanceQrModal.tsx`, `attendance/AddGuestModal.tsx`
  - `materials/UploadMaterialModal.tsx`
  - `videos/VideoPlayerModal.tsx`, `videos/UploadVideoModal.tsx`
  - `assignments/CreateAssignmentModal.tsx`, `assignments/AssignmentDetailModal.tsx`
  - `retests/ScheduleRetestModal.tsx`, `retests/EnterRetestMarksModal.tsx`
- **Problem:** Custom-built fixed-positioned divs with no focus management. Tab leaks to background page; Escape does nothing.
- **Fix:** Adopt a single modal primitive (Radix `Dialog` or Headless UI `Dialog`) and migrate. One commit per module.

### [P1] No 404 page; catch-all redirects to /login
- **Where:** `apps/web/src/app/router.tsx:609` — `{ path: "*", element: <Navigate to="/login" replace /> }`
- **Problem:** A typo URL throws an authenticated user back to the login screen instead of a "page not found" message.
- **Fix:** Add `<NotFoundPage/>` with link back to dashboard. Don't redirect to login.

### [P2] Toast pattern duplicated across pages
- **Where:** StudentsPage, ExamsPage, PaymentsPage, MaterialsPage, VideosPage all reimplement `[toast, setToast]` + `setTimeout` clearer.
- **Fix:** Extract `useToast()` hook + `<Toaster/>` (e.g., `sonner`).

### [P2] Inline role checks not centralized
- **Where:** ~7 pages (MaterialsPage, VideosPage, AssignmentDetailModal, FeesTab, AttendancePage, etc.) check `user.role === "STUDENT"`.
- **Fix:** `usePermissions()` hook returning a typed predicate API: `{ canManageContent, canViewFees, ... }`. Already partially exposed by `/auth/me` response (`permissions` block).

### [P2] Tables lack `overflow-x-auto` on mobile
- **Where:** Per frontend agent: `students/StudentDetailPage`, `PaymentsPage` and others. `[unverified]` per-file.
- **Fix:** Wrap every `<table>` in `<div className="overflow-x-auto">`.

### [P2] Fixed-width modal content breaks <320px viewports
- **Where:** `attendance/AttendanceQrModal.tsx:88` (`w-[240px]` QR).
- **Fix:** Use `max-w-full sm:w-[240px]` and let QR scale.

### [P3] Hardcoded role checks instead of permissions
- See P2 above — same issue, lower urgency for individual sites.

### [P3] 18 `any` types and unchecked API response shapes
- Per frontend agent in platform-admin/AuditLogPage, TenantDetailPage, settings/ClassesSettingsPage.
- Fix: Use the `@canop/types` package (already exists) for all API responses.

### [P3] Stub-page modules behind navigation
- `apps/web/src/pages/announcements/AnnouncementsPage.tsx` — renders `<ModuleStub/>` ("Session 10").
- Hide from sidebar in production builds via a feature flag, or finish the module.

### [P3] `console.log` left in `fees/FeesPage.tsx:126`
- Drop the line.

---

## Phase 5 — Routing

### [P1] AuthGuard only redirects from `useEffect`, briefly renders children before redirect
- **Where:** `apps/web/src/components/guards/AuthGuard.tsx`
- **Problem:** `useEffect` runs after first render. `children` aren't rendered (the early `return null` if `!isAuthenticated` prevents that), so the impact is **lower than reported** — but as the auth store is non-persistent, on a hard refresh `isAuthenticated` is `false` immediately, and the user sees nothing → /login. Once persistence is added (see Phase 2 P0), this should bootstrap properly. `[verified]`.

### [P2] PlatformAdminLayout protection
- **Where:** `apps/web/src/layouts/platform/PlatformAdminLayout.tsx:37-39` (per frontend agent — not personally read).
- **Status:** `[unverified]`. Add an explicit AuthGuard-equivalent for the platform-admin token (it's a separate token).

### [P3] Post-login `returnTo` not honored
- After login, user is sent to `/dashboard` regardless of where they came from. Store `location.pathname` before redirect and restore.

---

## Phase 6 — Database & Schema

### [P1] `enableRLS()` is dead-imported in seed → typecheck failure
- **Where:** `packages/db/prisma/seed.ts:3`
- **Problem:** Import is unused; the call is commented out per the DB agent. Causes `pnpm typecheck` to fail at the root.
- **Fix:** Either re-enable the call (preferred — RLS should be exercised in dev) or remove the import. If keeping for documentation, prefix with underscore: `import { enableRLS as _enableRLS }`.
- `[verified]` via typecheck output.

### [P1] LLM key encryption falls back to JWT_SECRET
- **Where:** `apps/api/src/lib/encryption.ts:9` — `const source = env.LLM_ENCRYPTION_KEY || env.JWT_SECRET`.
- **Problem:** Rotating JWT_SECRET (e.g., after a leak) makes all tenant-supplied LLM API keys undecryptable. Reusing one secret for two purposes is a cryptographic smell.
- **Impact:** Recovery from JWT compromise is needlessly destructive.
- **Fix:** Require `LLM_ENCRYPTION_KEY` in production (see env-validation P0 fix). Provide a one-shot migration script `pnpm db:rotate-llm-key` that decrypts with old key, re-encrypts with new.

### [P2] Schema audit findings to verify
- DB agent flagged: missing `onDelete` on several nullable FKs (`BatchSubject.teacher`, `MarkEntry.enteredBy`, `AttendanceRecord.markedBy`, `Retest.enteredById`, `LLMRequestLog.user`). `[unverified]` — would need a focused Prisma schema read.
- Inconsistent `Decimal(8,2)` vs `Decimal(5,2)` for mark columns. `[unverified]`.
- Missing indexes on FK columns frequently used in queries (`BatchSubject.subjectId`, `StudentFee.planId`, soft-delete `deletedAt`). `[unverified]`.

### [P2] Seed file disables RLS in dev
- **Where:** `packages/db/prisma/seed.ts:1172-1176` per DB agent.
- **Problem:** RLS is gated to production, hiding RLS bugs in dev.
- **Fix:** Enable RLS in seed unconditionally; provide a separate `pnpm db:seed:no-rls` for users who want to debug without it.

---

## Phase 7 — Services (ML, Sockets, Storage)

### Corrections to flagged items
- **ML service IS authenticated** by `x-api-key` (`services/ml-service/app/auth.py`). It is NOT publicly unauthenticated as the DB agent suggested. The default key `dev-internal-key` is weak, however (see below).
- **ML service CORS is restricted** to `["http://localhost:3001", "http://api:3001"]` — restrictive, not permissive. Fine for internal-only use.
- **Sentry IS initialized** at boot (`apps/api/src/lib/sentry.ts`, called from index.ts:73). Will silently no-op when `SENTRY_DSN` is empty.
- **Rate-limiting exists** (`apps/api/src/middleware/rate-limit.ts`) with global, auth, OTP, upload, and LLM limiters. Correctly Redis-backed in prod.

### [P1] ML service default API key is publicly known
- **Where:** `services/ml-service/app/config.py:16` — `ml_service_api_key: str = "dev-internal-key"`.
- **Problem:** If deployed without overriding `ML_SERVICE_API_KEY`, the key is the literal string in the repo — anyone can call `/dropout/predict` etc.
- **Fix:** Refuse to start in `ENVIRONMENT=production` if the key is the default.

### [P2] LOCAL_UPLOAD_DIR static serving
- **Where:** `apps/api/src/services/storage.service.ts:19`, `apps/api/src/routes/static.ts` (`[unverified]`).
- **Problem:** `staticRouter` is mounted unconditionally in dev, conditionally in prod (when not R2). If it ever resolves user-controlled paths without canonicalization, path traversal is possible.
- **Mitigation:** The `fileKey` is server-generated (UUID + sanitized basename), so client-controlled values don't reach `fs`. `[verified]` for the upload-side sanitization.
- **Fix:** Confirm `staticRouter` rejects `..` in the URL path.

### [P2] No cleanup job for `MessageDedupKey` / `Session` expired rows
- DB agent flag. `[unverified]` — confirm schema has `expiresAt` but no scheduled cleanup. Add a daily job that prunes.

---

## Summary

**Counts by severity:**
- P0: 8 (3 secrets-in-logs, 1 missing webhook + 1 stub-mode auto-success on payments, 1 lost auth on refresh, 1 weak default secrets, 1 socket CORS, 1 no error boundary)
- P1: 13
- P2: 11
- P3: 7

**Top 5 to fix first:**
1. **Strip OTP/password/reset-token from `console.log`** — auth.ts:153,403; teachers.ts:71. 10 minutes.
2. **Refuse production boot with dev defaults** — env.ts validation gate. Closes both the JWT-secret-default bypass and the stub-Razorpay auto-success path at once.
3. **Add `pnpm.overrides`** for `axios@^1.16` and `undici@^5.29` to clear the high-sev advisories with one PR.
4. **Persist refresh token in `apps/web/src/stores/auth.ts`** via Zustand `persist` + boot-time rehydration. Fixes the broken refresh-survival UX.
5. **Validate `batchIds` belong to current tenant in materials.ts:140 and videos.ts:159** before `createMany`.

**Systemic patterns:**
- **`console.log` is the de facto logger** — 58 sites; Pino is wired but unused. Replace operationally noisy logs with `req.log.*` and remove the sensitive ones outright.
- **Hand-rolled async data loading bypasses TanStack Query** in many list pages, leading to no error state, no retry, no caching benefit. Migrate.
- **Custom modal markup with no a11y primitives** — 8+ modals across pages. Adopt one library.
- **Stub-mode + missing env keys = silent insecure defaults** — Razorpay verify auto-succeeds, JWT_SECRET default, encryption-key fallback, ML key default, Sentry no-op. One env-validation gate at boot fixes all five.
- **Validation discipline is mostly excellent** at the API boundary (zod on POST/PATCH), with a few missing schemas on PATCH endpoints (invites, students). Worth a sweep.
- **Multi-tenancy is well-architected** (subdomain → tenant lookup → tenantId in every `where`), but `withTenantTransaction` is not used uniformly — about 40% of handlers I sampled use bare `prisma.*`. Either enforce uniformly or set `app.current_tenant` via Prisma middleware.

**Do NOT begin fixing until the user has reviewed `FIX_BACKLOG.md` and approved the items.**
