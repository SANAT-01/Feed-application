# syntax=docker/dockerfile:1
#
# Multi-stage build: compiled JS at runtime (no tsx/typescript in the final
# image), pruned to production dependencies only, run as a non-root user.
# Build context must be the repo root (npm workspaces) — see docker-compose.yml.

FROM node:20-alpine AS deps
WORKDIR /repo
COPY package.json package-lock.json tsconfig.base.json ./
COPY backend/shared/package.json backend/shared/package.json
COPY backend/api/package.json backend/api/package.json
# --ignore-scripts: shared's postinstall build can't run yet, its source
# isn't copied into this stage — the build stage below does that explicitly.
RUN npm ci --ignore-scripts

FROM deps AS build
COPY backend/shared backend/shared
COPY backend/api backend/api
RUN npm run build --workspace=@feed/shared \
 && npm run build --workspace=@feed/api \
 && npm prune --omit=dev

FROM node:20-alpine AS runtime
RUN addgroup -g 1001 nodejs && adduser -D -u 1001 -G nodejs nodejs
WORKDIR /repo
COPY --from=build --chown=nodejs:nodejs /repo /repo
WORKDIR /repo/backend/api
USER nodejs
ENV NODE_ENV=production
EXPOSE 8000
HEALTHCHECK --interval=15s --timeout=3s --start-period=10s --retries=3 \
  CMD node -e "require('http').get('http://127.0.0.1:8000/health',r=>{process.exit(r.statusCode===200?0:1)}).on('error',()=>process.exit(1))"
CMD ["node", "dist/index.js"]
