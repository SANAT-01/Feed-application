# syntax=docker/dockerfile:1
# Build context must be the repo root (npm workspaces) — see docker-compose.yml.

FROM node:20-alpine AS deps
WORKDIR /repo
COPY package.json package-lock.json tsconfig.base.json ./
COPY backend/shared/package.json backend/shared/package.json
COPY backend/outbox-poller/package.json backend/outbox-poller/package.json
RUN npm ci --ignore-scripts

FROM deps AS build
COPY backend/shared backend/shared
COPY backend/outbox-poller backend/outbox-poller
RUN npm run build --workspace=@feed/shared \
 && npm run build --workspace=@feed/outbox-poller \
 && npm prune --omit=dev

FROM node:20-alpine AS runtime
RUN addgroup -g 1001 nodejs && adduser -D -u 1001 -G nodejs nodejs
WORKDIR /repo
COPY --from=build --chown=nodejs:nodejs /repo /repo
WORKDIR /repo/backend/outbox-poller
USER nodejs
ENV NODE_ENV=production
# No HTTP endpoint on this worker — liveness is "the node process is running".
HEALTHCHECK --interval=15s --timeout=3s --start-period=10s --retries=3 \
  CMD pgrep -f "node dist/index.js" > /dev/null || exit 1
CMD ["node", "dist/index.js"]
