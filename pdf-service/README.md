# pdf-service

Turns a resume into a PDF by opening the web app's `/print` page in headless
Chromium and printing it. Deployment: [../docs/DEPLOY.md](../docs/DEPLOY.md).

## API

### `POST /pdf`

```json
{ "snapshot": { "selectedTemplate": { "id": "modern" }, "resumeData": { "personalInfo": { "fullName": "Ada Lovelace" } } } }
```

`resumeData` follows `src/types/resume.ts`; missing fields default to empty and
unknown fields are dropped. A photo must be a `data:image/...;base64,` URL.

| Status | Body / headers | When |
| --- | --- | --- |
| 200 | `application/pdf`, `X-Page-Count: n` | Rendered. |
| 400 | `{ "error": "..." }` | Invalid request; the message says which field. |
| 413 | `{ "error": "..." }` | Body over `PDF_MAX_BODY_BYTES`. |
| 429 | `Retry-After` | Over `PDF_RATE_LIMIT_PER_MINUTE` for this client IP. |
| 503 | `Retry-After` | Every render slot busy for `PDF_QUEUE_TIMEOUT_MS`. |
| 502/500 | `{ "error": "Could not generate the PDF." }` | Render failed. The cause is logged, never returned. |

### `GET /health`

Liveness: `{ "ok": true }` while the process answers.

### `GET /ready`

Readiness and load: `{ ok, browser, inFlight, waiting, concurrency }`. 503
until Chromium is connected.

## Configuration

| Variable | Default | |
| --- | --- | --- |
| `RENDER_ORIGIN` | — (required) | Origin serving the web app, e.g. `http://web:8080`. The only origin Chromium may load. |
| `ALLOWED_ORIGINS` | empty | Comma-separated origins allowed cross-origin. Empty = same-origin only. |
| `PDF_CONCURRENCY` | cores, max 4 | Renders at once. |
| `PDF_QUEUE_TIMEOUT_MS` | 20000 | Wait for a slot before 503. |
| `PDF_RENDER_TIMEOUT_MS` | 30000 | Limit for one render. |
| `PDF_MAX_BODY_BYTES` | 8 MB | Largest request. |
| `PDF_RATE_LIMIT_PER_MINUTE` | 30 | Per client IP. |
| `TRUST_PROXY_HOPS` | 0 | Proxies in front whose `X-Forwarded-For` is trusted. |
| `PORT` | 3040 | |

Invalid values stop the process at start with a message naming the variable.

## Design notes

- **One warm browser, a fresh context per export.** Launching Chromium costs
  about a second; a new context costs milliseconds and shares nothing (storage,
  cookies, cache) with any other export.
- **The render URL is configuration, never input.** Every request the page makes
  to anything but `RENDER_ORIGIN` (and `data:`/`blob:`) is aborted. In
  production the container also has no network route out.
- **`playwright` is pinned exactly** and must equal the Dockerfile's base image
  tag and the root `@playwright/test` version. See DEPLOY.md, "Upgrading
  Playwright".

## Run and test

```bash
npm install
RENDER_ORIGIN=http://localhost:5173 npm start
npm test        # unit + route tests with a fake renderer; no browser needed
```
