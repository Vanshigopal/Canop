# ───── Stage 1: Build ─────
FROM node:20-alpine AS builder
WORKDIR /app

RUN apk add --no-cache openssl libc6-compat
RUN corepack enable && corepack prepare pnpm@9 --activate

COPY pnpm-workspace.yaml pnpm-lock.yaml package.json turbo.json ./
COPY packages/db/package.json packages/db/
COPY packages/types/package.json packages/types/
COPY packages/ui/package.json packages/ui/
COPY packages/config/package.json packages/config/
COPY packages/sdk/package.json packages/sdk/
COPY apps/api/package.json apps/api/

RUN pnpm install --frozen-lockfile --prod=false --ignore-scripts

COPY packages/ packages/
COPY apps/api/ apps/api/

RUN pnpm --filter @raquel/db db:generate
RUN pnpm --filter @raquel/api build

# ───── Stage 2: Production ─────
FROM node:20-alpine AS production
WORKDIR /app

RUN apk add --no-cache openssl libc6-compat wget dumb-init
RUN corepack enable && corepack prepare pnpm@9 --activate

# Create non-root user
RUN addgroup -g 1001 -S raquel && \
    adduser -S raquel -u 1001 -G raquel

COPY --from=builder /app/pnpm-workspace.yaml /app/pnpm-lock.yaml /app/package.json ./
COPY --from=builder /app/packages/db/package.json packages/db/
COPY --from=builder /app/packages/types/package.json packages/types/
COPY --from=builder /app/apps/api/package.json apps/api/

RUN pnpm install --frozen-lockfile --prod --ignore-scripts

COPY --from=builder /app/apps/api/dist apps/api/dist/
COPY --from=builder /app/packages/db/prisma packages/db/prisma/
COPY --from=builder /app/packages/db/src packages/db/src/
COPY --from=builder /app/node_modules/.prisma node_modules/.prisma/
COPY --from=builder /app/node_modules/@prisma node_modules/@prisma/

# Own the app files
RUN chown -R raquel:raquel /app

USER raquel

ENV NODE_ENV=production
ENV PORT=3001
EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget -q --spider http://localhost:3001/healthz || exit 1

ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "apps/api/dist/index.js"]
