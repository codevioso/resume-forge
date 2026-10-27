# syntax=docker/dockerfile:1
#
# PDF renderer: headless Chromium driving the web app's /print route.
#
# The base image tag MUST equal the `playwright` version in package.json.
# Playwright finds its browser by version; a mismatch fails at launch with
# "Executable doesn't exist". The image ships that exact Chromium plus every
# system library it needs, which is the whole reason to use it rather than
# installing Chromium by hand.
FROM mcr.microsoft.com/playwright:v1.59.1-noble

ENV NODE_ENV=production \
    # The browser is already in the image; do not download it again.
    PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1 \
    PORT=3040

WORKDIR /app

# Dependencies first, so editing server code does not reinstall them.
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY server.mjs ./
COPY lib ./lib

# Non-root. Playwright launches Chromium without its own sandbox, so the
# container is the isolation boundary: unprivileged user, read-only root
# filesystem, no capabilities, no route to the internet (see compose).
USER pwuser

EXPOSE 3040

# Liveness only — the process answers. Deliberately not tied to Chromium: the
# renderer relaunches a crashed browser by itself, and restarting the whole
# container for that would drop every queued export.
HEALTHCHECK --interval=10s --timeout=5s --start-period=30s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3040/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "server.mjs"]
