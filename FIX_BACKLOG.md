# Canop — Fix Backlog

Sorted by priority. Severity defined in AUDIT_REPORT.md. Effort: S (≤30min), M (≤4h), L (>4h). Risk is the chance the fix breaks something working today.

| # | Priority | Area | File:line | One-line fix | Effort | Risk |
|---|---|---|---|---|---|---|
| 1 | P0 | logging | apps/api/src/routes/auth.ts:153 | Remove `console.log` of OTP (or gate behind NODE_ENV!=='production'). | S | none |
| 2 | P0 | logging | apps/api/src/routes/auth.ts:403 | Remove `console.log` of password-reset token. | S | none |
| 3 | P0 | logging | apps/api/src/routes/teachers.ts:71 | Remove `console.log` of new teacher email/password; email the password instead. | S | low |
| 4 | P0 | payments | apps/api/src/routes/payments.ts:381-386 | In production, throw if `razorpayClient === null` instead of auto-marking verify success. | S | low |
| 5 | P0 | payments | apps/api/src/routes/webhooks.ts | Add `POST /razorpay` route that verifies `X-Razorpay-Signature` against `RAZORPAY_WEBHOOK_SECRET` and updates Payment state idempotently on `event.id`. | M | low |
| 6 | P0 | auth | apps/api/src/config/env.ts:11-13 | After `EnvSchema.parse`, throw if `NODE_ENV==='production'` and JWT_SECRET still default, or Razorpay/LLM_ENCRYPTION_KEY missing. | S | low |
| 7 | P0 | frontend auth | apps/web/src/stores/auth.ts | Wrap Zustand store in `persist({ name:'canop-auth', partialize: s => ({ refreshToken: s.refreshToken })})`; on App mount call `/auth/refresh` then `fetchMe`. | M | medium (touches login flow) |
| 8 | P0 | sockets | apps/api/src/config/socket.ts:18-21 | Replace `origin: true` with the same allowlist as `middleware/cors.ts`. | S | low (recheck mobile/desktop origins) |
| 9 | P0 | frontend | apps/web/src/app/App.tsx | Wrap `<RouterProvider>` in Sentry `<ErrorBoundary fallback={<AppErrorFallback/>}>`. | S | none |
| 10 | P1 | deps | package.json | Add `pnpm.overrides` for `axios:^1.16.1`, `undici:^5.29.0`; `pnpm up razorpay`. Re-run `pnpm audit`. | S | medium (transitive bumps) |
| 11 | P1 | IDOR | apps/api/src/routes/materials.ts:140-148 | Before `createMany`, verify `prisma.batch.findMany({ where:{ id:{in:batchIds}, tenantId } })` returns full count. | S | none |
| 12 | P1 | IDOR | apps/api/src/routes/videos.ts:159-167 | Same fix as #11. | S | none |
| 13 | P1 | crypto | apps/api/src/lib/otp.ts:35 | Replace `stored === otp` with `crypto.timingSafeEqual(Buffer.from(stored), Buffer.from(otp))`. | S | none |
| 14 | P1 | payments | apps/api/src/routes/payments.ts | Add `@unique` on `Payment.razorpayPaymentId` in schema.prisma; migrate. | S | low |
| 15 | P1 | uploads | apps/api/src/routes/materials.ts, videos.ts, omr.ts | Add `multer({ fileFilter })` MIME whitelist per route. | S | low |
| 16 | P1 | CSP | apps/api/src/middleware/security.ts:14-19 | Drop `'unsafe-inline'`; switch to nonce-based CSP via Helmet. | M | medium (may break inline styles too) |
| 17 | P1 | auth | apps/api/src/lib/jwt.ts, routes/auth.ts | Make reset tokens single-use: include `passwordChangedAt` in reset JWT; reject if user's stored `passwordChangedAt` is newer. | M | low |
| 18 | P1 | stubs | apps/api/src/index.ts startup | At boot, fail-fast in production if Razorpay/Bunny/Gupshup/Anthropic adapters are stubbed. | S | low |
| 19 | P1 | a11y / UX | apps/web/src/pages/**/*Modal.tsx | Adopt Radix UI `Dialog` (or Headless UI); migrate all 8+ modals to gain focus trap, Esc-close, scroll lock. | L | medium (visual regression risk) |
| 20 | P1 | UX | apps/web/src/pages/{students,batches,exams,videos,materials,payments}/...Page.tsx | Replace hand-rolled `useEffect/setState/load()` with `useQuery`; render `<ErrorState onRetry/>` on error, `<EmptyState/>` on empty. | L | low |
| 21 | P1 | routing | apps/web/src/app/router.tsx:609 | Replace `*` redirect with `<NotFoundPage/>`. | S | none |
| 22 | P1 | ML auth | services/ml-service/app/config.py:16 | Fail at startup if `environment=='production'` and `ml_service_api_key=='dev-internal-key'`. | S | low |
| 23 | P1 | DB | packages/db/prisma/seed.ts:3 | Either un-comment `enableRLS(prisma)` call (preferred) or remove the unused import. Fixes typecheck. | S | low (RLS in dev exposes hidden bugs — that's the point) |
| 24 | P1 | crypto | apps/api/src/lib/encryption.ts:9 | In production, refuse the JWT_SECRET fallback for `LLM_ENCRYPTION_KEY` (covered by #6). | S | none |
| 25 | P1 | validation | apps/api/src/routes/invites.ts:65, students.ts:84 | Add zod schemas to PATCH bodies. | S | none |
| 26 | P1 | login security | apps/api/src/routes/auth.ts login | Track `failedLoginCount` + `lockedUntil` on User; lock 15 min after 10 failures. | M | low |
| 27 | P2 | tenant resolution | apps/api/src/middleware/tenant.ts:67-79 | Regex-validate slug `/^[a-z0-9][a-z0-9-]{1,29}$/`; cache slug→tenant in Redis (60s TTL). | S | low |
| 28 | P2 | RLS | apps/api/src/routes/*.ts (audit) | Grep `prisma\.` outside of `withTenantTransaction`; either wrap or set Prisma middleware that calls `SET LOCAL app.current_tenant` per req. | L | medium |
| 29 | P2 | pagination | apps/api/src/routes/*.ts list endpoints | Central `parsePage(req, { maxSize: 100 })` helper; replace ad-hoc `pageSize="50"` patterns. | M | none |
| 30 | P2 | audit log | apps/api/src/routes/*.ts | Audit-log middleware on PATCH/DELETE for student/teacher/batch/exam/payment/broadcast/role. | M | low |
| 31 | P2 | logging | apps/api/src/{config,routes,services}/*.ts | Replace operational `console.log` with `req.log.*` / Pino. | M | none |
| 32 | P2 | UX | apps/web/src/hooks/useToast.ts | Extract shared `useToast` (or adopt `sonner`); remove duplicated toast useEffect in 5+ pages. | M | low |
| 33 | P2 | UX | apps/web/src/hooks/usePermissions.ts | New hook; replace 7+ `user.role === 'X'` inline checks. | M | low |
| 34 | P2 | UX/responsive | apps/web/src/pages/**/*Page.tsx tables | Wrap `<table>` in `overflow-x-auto`. | M | none |
| 35 | P2 | DB | packages/db/prisma/schema.prisma | Add `onDelete: SetNull` to nullable FKs (BatchSubject.teacher, MarkEntry.enteredBy, AttendanceRecord.markedBy, Retest.enteredById, LLMRequestLog.user). | M | low (verify intent of each) |
| 36 | P2 | DB | packages/db/prisma/schema.prisma | Add indexes on FK columns used in queries (BatchSubject.subjectId, StudentFee.planId) and on `deletedAt` for soft-delete tables. | M | low |
| 37 | P2 | cleanup jobs | packages/db / cron | Daily job to prune expired `MessageDedupKey` and `Session` rows. | M | low |
| 38 | P2 | DB | packages/db/prisma/seed.ts | Enable RLS in seed unconditionally; document `db:seed:no-rls` escape hatch. | S | medium |
| 39 | P2 | frontend | apps/web/src/layouts/platform/PlatformAdminLayout.tsx | Add explicit auth guard for platform token (separate from tenant AuthGuard). | S | low |
| 40 | P2 | UX | apps/web/src/pages/attendance/AttendanceQrModal.tsx:88 | `w-[240px]` → `w-full max-w-[240px]`. | S | none |
| 41 | P3 | DX | packages/db/prisma/schema.prisma | Standardize Decimal precision (mark columns to `Decimal(8,2)`, money to `Decimal(12,2)`). | M | medium (migration) |
| 42 | P3 | type safety | apps/web/src/pages/platform-admin/*.tsx | Replace 18 `any` types with `@canop/types` API response types. | M | none |
| 43 | P3 | dead code | apps/web/src/pages/announcements/AnnouncementsPage.tsx | Either complete the module or hide its sidebar entry behind a feature flag. | S | none |
| 44 | P3 | dead code | apps/web/src/pages/fees/FeesPage.tsx:126 | Remove `console.log`. | S | none |
| 45 | P3 | UX | apps/web/src/app/router.tsx | Restore `returnTo` after login. | S | none |
| 46 | P3 | UX | apps/web/src/pages/**/* | Consistent date/currency formatting helpers; replace direct `.toLocaleString` calls. | M | none |
| 47 | P3 | a11y | apps/web/src/pages/**/* icon-only buttons | Add `aria-label`. | M | none |
| 48 | P3 | deps | apps/mobile package.json | Replace deprecated `metro-react-native-babel-preset`. | M | medium |

---

## Counts by severity
- P0: 9 fixes
- P1: 17 fixes
- P2: 14 fixes
- P3: 8 fixes
- **Total: 48 actionable items**

## Recommended first sprint (one PR each)
1. #1, #2, #3 — strip secret-logging (single commit, 5 min, no risk).
2. #6 — env validation gate (closes #4, #22, #24 indirectly).
3. #10 — `pnpm.overrides` for axios/undici (closes most high-sev advisories).
4. #11 + #12 + #15 — multipart-upload tenant + MIME hardening (one PR).
5. #7 — frontend auth persistence (one PR; visible UX win).
6. #5 — Razorpay webhook (own PR, needs prod webhook config).
