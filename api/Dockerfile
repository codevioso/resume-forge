# syntax=docker/dockerfile:1
#
# The API: accounts (Better Auth) and saved resumes, on MySQL.

FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY tsconfig.json ./
COPY src ./src
RUN npx tsc -p tsconfig.json


FROM node:22-alpine
ENV NODE_ENV=production PORT=3050
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY --from=build /app/dist ./dist

# The image's unprivileged user; with a read-only root filesystem in compose.
USER node
EXPOSE 3050

# Liveness only. Migrations run before the server listens, so "answering"
# also means "schema is current".
HEALTHCHECK --interval=10s --timeout=5s --start-period=60s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3050/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "dist/server.js"]
