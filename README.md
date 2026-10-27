# Resume Forge

A resume builder for the web: fill in your details, pick one of 20 templates,
and download a PDF that matches the preview exactly, across as many A4 pages as
the resume needs.

## How it fits together

| Path | What it is |
| --- | --- |
| `src/` | The web app: React 19, Vite, TypeScript, Tailwind. |
| `src/templates/` | The 20 resume templates. Read `paging.ts` before touching one. |
| `pdf-service/` | Node service that turns a resume into a PDF by printing the app's `/print` page in headless Chromium. |
| `docker/`, `docker-compose.yml` | Production stack: Caddy edge with automatic HTTPS, the static app, the PDF service. |
| `e2e/` | Playwright tests, including pagination of every template. |
| `docs/DEPLOY.md` | **Deployment guide** — fresh VPS to live site, updates, operations, troubleshooting. |
| `mobile/` | The separate Flutter app (Resume Studio). Not part of the web deployment. |

The PDF is printed from the same page the user previews, so preview and PDF
cannot drift: same components, same CSS, same bundled fonts.

## Develop

```bash
npm install
npm run dev                    # http://localhost:5173
```

For PDF export, run the service alongside (second terminal):

```bash
cd pdf-service
npm install
RENDER_ORIGIN=http://localhost:5173 npm start
```

The dev server proxies `/api/pdf` to it. No env file is needed.

## Test

```bash
npx tsc --noEmit -p .          # typecheck
cd pdf-service && npm test     # service tests (no browser)
npx playwright test            # e2e: every template, long and short resume, real PDFs
```

## Deploy

```bash
cp .env.example .env           # set DOMAIN and ACME_EMAIL
docker compose up -d --build
```

Full walkthrough, including server preparation and DNS: [docs/DEPLOY.md](docs/DEPLOY.md).
