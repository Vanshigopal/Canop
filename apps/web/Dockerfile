# ───── Stage 1: Build ─────
FROM node:20-alpine AS builder
WORKDIR /app

RUN corepack enable && corepack prepare pnpm@9 --activate

COPY pnpm-workspace.yaml pnpm-lock.yaml package.json turbo.json ./
COPY packages/ui/package.json packages/ui/
COPY packages/types/package.json packages/types/
COPY packages/sdk/package.json packages/sdk/
COPY packages/config/package.json packages/config/
COPY packages/db/package.json packages/db/
COPY apps/web/package.json apps/web/

RUN pnpm install --frozen-lockfile --prod=false --ignore-scripts

COPY packages/ packages/
COPY apps/web/ apps/web/

ARG VITE_API_URL
ARG VITE_SENTRY_DSN
ARG VITE_APP_VERSION=0.1.0
ENV VITE_API_URL=${VITE_API_URL}
ENV VITE_SENTRY_DSN=${VITE_SENTRY_DSN}
ENV VITE_APP_VERSION=${VITE_APP_VERSION}

RUN pnpm --filter @canop/web build

# ───── Stage 2: Nginx ─────
FROM nginx:1.27-alpine AS production

RUN addgroup -g 1001 -S canop && \
    adduser -S canop -u 1001 -G canop

COPY --from=builder /app/apps/web/dist /usr/share/nginx/html
COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf

# Allow non-root nginx to bind to 80 not needed — use port 8080 or drop privileges via config.
# For Railway (which expects a single listening port), we stay on 80 here.

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD wget -q --spider http://localhost:80/ || exit 1
