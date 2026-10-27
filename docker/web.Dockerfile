# syntax=docker/dockerfile:1
#
# The web app: built with Vite, served as static files.
#
# Build context is the repository root. Only what the build needs is copied,
# so the Flutter app in mobile/, the docs and the e2e suite never enter the
# image.

FROM node:22-alpine AS build
WORKDIR /app
# @playwright/test is a devDependency for the e2e suite; it must not try to
# fetch a browser during an image build.
ENV PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1

COPY package.json package-lock.json ./
RUN npm ci

COPY index.html tsconfig.json vite.config.ts ./
COPY public ./public
COPY src ./src

# The PDF API lives on the same origin under /api/pdf (see docker/Caddyfile),
# which is the default the app uses when this is unset. Override only to point
# a build at a PDF service on another origin.
ARG VITE_PDF_SERVICE_URL=
ENV VITE_PDF_SERVICE_URL=${VITE_PDF_SERVICE_URL}

# Typecheck before building: a type error should fail the image, not ship.
RUN npx tsc --noEmit -p . && npm run build


FROM caddy:2.10-alpine
COPY docker/web.Caddyfile /etc/caddy/Caddyfile
COPY --from=build /app/dist /srv
EXPOSE 8080
HEALTHCHECK --interval=10s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -q --spider http://127.0.0.1:8080/ || exit 1
