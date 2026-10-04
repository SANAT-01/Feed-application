# syntax=docker/dockerfile:1
# Build context must be the repo root (npm workspaces) — see docker-compose.yml.

FROM node:20-alpine AS deps
WORKDIR /repo
COPY package.json package-lock.json ./
COPY frontend/package.json frontend/package.json
RUN npm ci --ignore-scripts

FROM deps AS build
COPY frontend frontend
WORKDIR /repo/frontend
RUN npm run build

FROM node:20-alpine AS runtime
RUN addgroup -g 1001 nodejs && adduser -D -u 1001 -G nodejs nodejs
WORKDIR /app
# Next traced from the monorepo root (where next is hoisted to node_modules),
# so standalone output nests under frontend/ — see next.config.mjs.
COPY --from=build --chown=nodejs:nodejs /repo/frontend/.next/standalone ./
COPY --from=build --chown=nodejs:nodejs /repo/frontend/.next/static ./frontend/.next/static
COPY --from=build --chown=nodejs:nodejs /repo/frontend/public ./frontend/public
USER nodejs
ENV NODE_ENV=production
ENV PORT=3000
# Next's standalone server.js binds to process.env.HOSTNAME, and Docker sets
# HOSTNAME to the container ID by default — without this override it binds
# to an unreachable address instead of all interfaces.
ENV HOSTNAME=0.0.0.0
EXPOSE 3000
HEALTHCHECK --interval=15s --timeout=3s --start-period=10s --retries=3 \
  CMD node -e "require('http').get('http://127.0.0.1:3000/',r=>{process.exit(r.statusCode<500?0:1)}).on('error',()=>process.exit(1))"
CMD ["node", "frontend/server.js"]
