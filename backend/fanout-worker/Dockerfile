# syntax=docker/dockerfile:1
# Build context must be the repo root (npm workspaces) — see docker-compose.yml.

FROM node:20-alpine AS deps
WORKDIR /repo
COPY package.json package-lock.json tsconfig.base.json ./
COPY backend/shared/package.json backend/shared/package.json
COPY backend/fanout-worker/package.json backend/fanout-worker/package.json
RUN npm ci --ignore-scripts

FROM deps AS build
COPY backend/shared backend/shared
COPY backend/fanout-worker backend/fanout-worker
RUN npm run build --workspace=@feed/shared \
 && npm run build --workspace=@feed/fanout-worker \
 && npm prune --omit=dev

FROM node:20-alpine AS runtime
RUN addgroup -g 1001 nodejs && adduser -D -u 1001 -G nodejs nodejs
WORKDIR /repo
COPY --from=build --chown=nodejs:nodejs /repo /repo
WORKDIR /repo/backend/fanout-worker
USER nodejs
ENV NODE_ENV=production
HEALTHCHECK --interval=15s --timeout=3s --start-period=10s --retries=3 \
  CMD pgrep -f "node dist/index.js" > /dev/null || exit 1
CMD ["node", "dist/index.js"]
