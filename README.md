# Canop

**The AI brain your institute runs on.**

Multi-tenant AI-powered institutional ERP platform. Built for coaching institutes, private academies, and training centers.

## Quick start

```bash
pnpm install
pnpm db:up         # Start Postgres + Redis in Docker
pnpm dev           # Start web + api dev servers
```

Open [http://demo.lvh.me:5173](http://demo.lvh.me:5173)

## Monorepo

- `apps/web` — React + Vite frontend (primary UI)
- `apps/api` — Express + TypeScript backend
- `packages/ui` — Nordic Glass design tokens + primitives
- `packages/types` — Shared zod schemas + domain types
- `packages/sdk` — Typed API client
- `packages/config` — Shared tsconfig + biome config
- `infra/docker` — Local dev services (Postgres, Redis, pgAdmin)

## Design system

Nordic Glass — locked. See `packages/ui/src/tokens/`. Light mode, warm cream, pastel aurora, glassmorphic surfaces. Fraunces + Manrope + JetBrains Mono.

## Session roadmap

| # | Name | Status |
|---|---|---|
| 1 | Foundation | <- current |
| 2 | Database & Multi-tenancy | pending |
| 3 | Auth & Identity | pending |
| 4 | App Shell & Routing | pending |
| 5 | Core Domain | pending |
| ... | ... | ... |
