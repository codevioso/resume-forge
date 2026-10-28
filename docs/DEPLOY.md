# Deploying Paperplane

The web app and its PDF service run as three containers on one VPS, started by
one `docker compose` command. This guide takes a fresh server to a working,
HTTPS-served site, then covers updates, operations and troubleshooting.

---

## 1. What runs

```
internet ──► edge   Caddy: TLS certificates, routing, security headers   :80 :443
               ├── /api/pdf ──► pdf   Node + headless Chromium             :3040
               └── /*       ──► web   the built React app, static files    :8080
                                 ▲
               pdf ── /print ────┘   Chromium prints the same page the user previews
```

| Service | Built from | Reachable from |
| --- | --- | --- |
| `edge` | `caddy:2.10-alpine` + `docker/Caddyfile` | the internet (ports 80, 443) |
| `web` | `docker/web.Dockerfile` | `edge` and `pdf` only |
| `pdf` | `pdf-service/Dockerfile` | `edge` only |

**Why the PDF looks exactly like the preview.** The PDF is not a second
rendering of the resume. The pdf service opens the app's own `/print` page in
Chromium and prints it, so preview and PDF come from the same React components,
the same CSS and the same bundled fonts. A long resume flows onto as many A4
pages as it needs; every template is tested to lose nothing
(`e2e/pagination.spec.ts`).

**Why `web` and `pdf` have no internet.** They sit on an `internal` Docker
network. Chromium is a full browser; if a request could steer it to any URL, the
server could be made to fetch internal addresses and hand the result back as a
PDF. The pdf service therefore only ever opens `RENDER_ORIGIN` (fixed in
`docker-compose.yml`, never taken from a request), blocks every other request
the page makes, and in any case has no network route out.

**What the server stores.** Nothing about users. A resume is saved in the
user's own browser (localStorage), so it survives a refresh or a closed tab on
that device; it is sent to the pdf service only for the length of one export,
and neither the request nor the PDF is written to disk or logged. The only
state on the server is Caddy's TLS certificates (the `caddy_data` volume).
Clearing site data in the browser deletes the saved resume; there is no
server-side copy to recover it from.

---

## 2. Requirements

- **A VPS** running a current 64-bit Linux. Ubuntu 24.04 LTS is assumed below.
  - Recommended: 2 vCPU, 4 GB RAM. Each concurrent export needs about 250 MB.
  - Minimum: 1 vCPU, 2 GB RAM, with `PDF_CONCURRENCY=1` in `.env`.
  - ~5 GB free disk for images (the Chromium image is the large one).
- **A domain or subdomain** whose DNS you control, e.g. `resume.example.com`.
- **Ports 80 and 443 open** to the internet. Port 80 is required even though
  the site is served over HTTPS: Let's Encrypt validates the domain through it,
  and Caddy uses it to redirect visitors to HTTPS.
- **SSH access** as a user with `sudo`.

---

## 3. Prepare the server (once)

### 3.1 Install Docker

Use Docker's own packages, not the distribution's `docker.io`, which is often
too old for `docker compose` (v2):

```bash
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker "$USER"
```

Log out and back in so the group change applies, then confirm:

```bash
docker version
docker compose version
```

`docker compose version` must print v2.20 or later.

### 3.2 Firewall

```bash
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow 443/udp
sudo ufw enable
```

`443/udp` is HTTP/3; optional, harmless. Note that Docker publishes ports by
writing its own iptables rules, which `ufw` does not see. That is why only
`edge` publishes ports in `docker-compose.yml` — never add a `ports:` entry to
`web` or `pdf`.

### 3.3 DNS

Create an **A record** for your domain pointing at the server's IPv4 address,
and an **AAAA record** for its IPv6 address if it has one. Then check, from
your own machine:

```bash
dig +short resume.example.com
```

It must print the server's IP before you continue. If it does not, wait for
DNS to propagate; starting the stack early only burns Let's Encrypt attempts
(see [Troubleshooting](#certificate-not-issued)).

---

## 4. First deployment

### 4.1 Get the code

```bash
sudo mkdir -p /opt/paperplane
sudo chown "$USER" /opt/paperplane
git clone https://github.com/<you>/<repo>.git /opt/paperplane
cd /opt/paperplane
```

### 4.2 Configure

```bash
cp .env.example .env
nano .env
```

Set the two required values:

| Variable | Example | Meaning |
| --- | --- | --- |
| `DOMAIN` | `resume.example.com` | The public hostname, exactly as in DNS. No `https://`, no path. |
| `ACME_EMAIL` | `you@example.com` | Let's Encrypt writes here about certificate problems. |

Everything else in `.env` is optional tuning; see
[Configuration reference](#7-configuration-reference). `docker compose` refuses
to start with a clear message if a required value is missing.

### 4.3 Build and start

```bash
docker compose up -d --build
```

The first build takes several minutes: it installs the web app's dependencies,
type-checks and builds it, and pulls the ~2 GB Playwright image that carries
Chromium. Later builds reuse cached layers.

Watch the edge obtain its certificate:

```bash
docker compose logs -f edge
```

Look for `certificate obtained successfully`. Press Ctrl-C to stop following
(the containers keep running).

### 4.4 Verify

1. **All three containers healthy:**

   ```bash
   docker compose ps
   ```

   `web` and `pdf` must show `(healthy)`; `edge` shows `Up`. `pdf` can take up
   to 30 seconds after start to report healthy.

2. **The site loads over HTTPS:** open `https://<DOMAIN>` in a browser. The
   padlock should show a valid certificate. `http://<DOMAIN>` must redirect to
   `https://`.

3. **A PDF renders end to end**, from the server itself:

   ```bash
   curl -sS -o /tmp/smoke.pdf -D - \
     -H 'Content-Type: application/json' \
     -d '{"snapshot":{"selectedTemplate":{"id":"modern"},"resumeData":{"personalInfo":{"fullName":"Smoke Test"}}}}' \
     "https://$(grep ^DOMAIN= .env | cut -d= -f2)/api/pdf" | grep -iE '^(HTTP|content-type|x-page-count)'
   ```

   Expect `HTTP/2 200`, `content-type: application/pdf` and `x-page-count: 1`.

4. **In the browser:** open the editor, fill in a resume (or load the sample),
   and export a PDF. Try a long resume: it should come out on several pages
   with nothing missing.

The site is live.

---

## 5. Updating

```bash
cd /opt/paperplane
git pull
docker compose up -d --build
docker image prune -f
```

`up -d --build` rebuilds only what changed and replaces only the containers
whose image changed. Exports in progress get up to 45 seconds to finish
(`stop_grace_period`) before the old pdf container is stopped; the edge keeps
serving throughout unless its own config changed.

The last line removes the previous images so the disk does not fill over many
updates.

### Rolling back

Deploy the previous commit the same way:

```bash
git log --oneline -5          # find the commit to return to
git checkout <commit>
docker compose up -d --build
```

Return to normal updates afterwards with `git checkout master`.

### Changing `.env` or `docker/Caddyfile`

```bash
docker compose up -d          # picks up .env changes
docker compose restart edge   # picks up Caddyfile changes
```

---

## 6. Operating

### Logs

```bash
docker compose logs -f              # everything
docker compose logs -f pdf          # the PDF service only
docker compose logs --since 1h pdf
```

The pdf service writes one JSON object per line, never including resume
content:

```json
{"t":"2026-10-27T09:14:02.114Z","level":"info","svc":"pdf-service","msg":"rendered","templateId":"modern","pages":3,"bytes":183412,"ms":1460}
```

With `jq` installed (`sudo apt install jq`) you can, for example, list failures:

```bash
docker compose logs --no-log-prefix pdf | jq -c 'select(.level=="error")'
```

Docker rotates each container's log at 10 MB, keeping three files.

### Load and readiness

```bash
docker compose exec pdf node -e "fetch('http://127.0.0.1:3040/ready').then(r=>r.json()).then(console.log)"
```

```js
{ ok: true, browser: 'connected', inFlight: 1, waiting: 0, concurrency: 2 }
```

`inFlight` is exports rendering now, `waiting` is exports queued for a slot. If
`waiting` is regularly above zero, raise `PDF_CONCURRENCY` (if memory allows)
or give the server more CPU.

### Resource use

```bash
docker stats --no-stream
```

The pdf container is capped by `PDF_MEMORY_LIMIT` (default 1.5 GB). As a rule
of thumb, budget 250 MB per concurrent export on top of the idle browser, and
check the real figure with `docker stats` while exporting.

### Backups

There is no user data on the server to back up. If you rebuild the server,
copying the `caddy_data` volume saves re-issuing certificates; otherwise Caddy
simply issues new ones.

**Never run `docker compose down -v`** on a live server. `-v` deletes the
certificate volume, and Let's Encrypt limits how often the same certificate can
be re-issued (5 per week).

---

## 7. Configuration reference

### `.env` (read by `docker compose`)

| Variable | Default | Meaning |
| --- | --- | --- |
| `DOMAIN` | — (required) | Public hostname. |
| `ACME_EMAIL` | — (required) | Contact for Let's Encrypt. |
| `PDF_CONCURRENCY` | `2` | Exports rendered at the same time. Each needs ~250 MB RAM. |
| `PDF_RATE_LIMIT_PER_MINUTE` | `30` | Exports one IP address may request per minute. Over it, users get "Too many exports. Try again shortly." |
| `PDF_QUEUE_TIMEOUT_MS` | `20000` | How long an export waits for a free slot before the user is told the service is busy. |
| `PDF_RENDER_TIMEOUT_MS` | `30000` | Longest a single render may take. |
| `PDF_MEMORY_LIMIT` | `1536m` | Hard memory cap for the pdf container. |

### pdf service environment (set in `docker-compose.yml`)

These are fixed by the compose file and should not normally change.

| Variable | Value in compose | Meaning |
| --- | --- | --- |
| `RENDER_ORIGIN` | `http://web:8080` | The only origin Chromium may load. Required; the service refuses to start without it. |
| `TRUST_PROXY_HOPS` | `1` | Trust exactly one proxy (the edge) for the client IP. The rate limiter keys on it; trusting more would let callers pick their own IP. |
| `ALLOWED_ORIGINS` | unset | Comma-separated origins allowed to call the API cross-origin. Unset means same-origin only, which is correct when the edge serves app and API on one domain. |
| `PDF_MAX_BODY_BYTES` | `8388608` | Largest accepted request (8 MB; a photo is most of it). The edge additionally caps bodies at 10 MB. |
| `PORT` | `3040` | Listening port inside the container. |

### Web build argument

| Argument | Default | Meaning |
| --- | --- | --- |
| `VITE_PDF_SERVICE_URL` | empty → `/api/pdf` | Where the app sends exports. Leave empty: the edge routes `/api/pdf`. Set only to use a PDF service on another origin, which must then list this app's origin in `ALLOWED_ORIGINS`. |

---

## 8. Troubleshooting

### Certificate not issued

`docker compose logs edge` shows ACME errors and the browser warns about the
certificate.

- **DNS does not point here yet.** `dig +short <DOMAIN>` must return this
  server's IP. Fix DNS, then `docker compose restart edge`.
- **Port 80 is blocked** by `ufw` or the provider's cloud firewall. Let's
  Encrypt must reach `http://<DOMAIN>/.well-known/acme-challenge/` from outside.
- **Rate limited** ("too many certificates already issued"). Wait for the
  window in the message to pass. While experimenting, test against Let's
  Encrypt's staging CA by adding `acme_ca https://acme-staging-v02.api.letsencrypt.org/directory`
  inside the global `{ }` block of `docker/Caddyfile`; remove it for real
  certificates.

### `docker compose up` fails: "set DOMAIN in .env"

`.env` is missing or does not define `DOMAIN` / `ACME_EMAIL`. It must sit next
to `docker-compose.yml`.

### Export fails with "The PDF service is busy"

All render slots were taken for longer than `PDF_QUEUE_TIMEOUT_MS`. Check
`/ready` (above). Raise `PDF_CONCURRENCY` if memory allows, or move to a larger
server.

### Export fails with "Could not generate the PDF"

The user-facing message is deliberately generic; the cause is in the log:

```bash
docker compose logs --since 10m pdf | grep '"level":"error"'
```

- `print page returned 404 from http://web:8080/print`: the web container is
  not serving the app's client-side routes. Open `https://<DOMAIN>/print` in a
  browser: it should show "Missing print data…" (expected without a
  snapshot). Check `docker compose logs web`.
- `print page could not read the snapshot`: the page loaded but rejected the
  data. Usually a web build from a different version than the pdf service;
  rebuild both with `docker compose up -d --build`.
- `Timeout … exceeded` waiting for `data-print-ready`: the page never finished
  rendering, typically a JavaScript error in a template. Reproduce with the
  same resume in the editor and check the browser console.
- `Executable doesn't exist`: the Playwright version in
  `pdf-service/package.json` does not match the image tag in
  `pdf-service/Dockerfile`. They must be equal (see
  [Upgrading Playwright](#upgrading-playwright)).
- `Target closed` / `browser has been closed`: Chromium crashed, usually out of
  memory. `docker compose logs pdf` shows the relaunch; check
  `docker stats` and `dmesg | grep -i oom`. Lower `PDF_CONCURRENCY` or raise
  `PDF_MEMORY_LIMIT`.

### 502 on `/api/pdf`

The edge cannot reach the pdf container. `docker compose ps` — if `pdf` is
restarting, `docker compose logs pdf` shows why. A configuration error (for
example an invalid `PDF_CONCURRENCY`) is printed on the first line and the
process exits.

### The site shows an old version after an update

The app is installable (a PWA) and its service worker keeps a copy of the app
so it opens offline. After a deploy, the service worker fetches the new
version in the background and switches to it on the next page load, so a
user may see the old version for one more visit — that is expected. `sw.js`
and `index.html` are served with `Cache-Control: no-cache`, so the check for a
new version always reaches the server.

If a reload twice still shows the old version, confirm the new image actually
started: `docker compose ps` shows the container's age.

---

## 9. Changing the stack

### Upgrading Playwright

The Chromium that renders PDFs comes from the Playwright image. Three places
must name the same version, or rendering fails at launch:

1. `pdf-service/package.json` — `"playwright": "X.Y.Z"` (exact, no `^`)
2. `pdf-service/Dockerfile` — `FROM mcr.microsoft.com/playwright:vX.Y.Z-noble`
3. root `package.json` — `"@playwright/test": "X.Y.Z"`, so the e2e tests run
   the same Chromium as production

Then `npm install` in the repository root and in `pdf-service/`, run the tests
(below) and deploy.

### Installable app (PWA)

`vite.config.ts` configures the manifest (name, colours, icons in
`public/icons/`) and the service worker. Installing needs HTTPS, which the
edge provides. The service worker caches the app shell and fonts; it never
caches `/api/pdf`, so exports always reach the PDF service. The PDF service
blocks service workers in its own browser, so they cannot affect rendering.

To change the app icons, edit `public/favicon.svg` (the vector plane) and
re-render the PNGs in `public/icons/` at the same sizes.

### Changing the product name

The name shown in the app comes from `src/constants/brand.ts`, the logo from
`public/logo/logo.png` (`src/components/BrandMark.tsx`), and the installed
app's name from the manifest in `vite.config.ts`.

### Adding a template

Follow `src/templates/paging.ts` (THE PAGINATION RULE). The pagination test
picks up every registered template automatically; it must pass before deploy.

---

## 10. Local development

No Docker needed. Two terminals:

```bash
npm install
npm run dev                                  # app on http://localhost:5173
```

```bash
cd pdf-service
npm install
RENDER_ORIGIN=http://localhost:5173 npm start   # PDF service on :3040
```

The Vite dev server proxies `/api/pdf` to `localhost:3040`
(`vite.config.ts`), so exports take the same same-origin path as production.
On Windows PowerShell, set the variable with
`$env:RENDER_ORIGIN='http://localhost:5173'; npm start`.

### Tests

```bash
cd pdf-service && npm test                    # service unit + route tests, no browser
npx playwright install chromium               # once, in the repo root
npx playwright test                           # e2e, including pagination of every template
```

`e2e/pagination.spec.ts` renders a long and a short resume through every
template with the production PDF options and reads the text back out of the
PDF. A template fails if any entry is missing, if a long resume does not run
onto more pages, or if a short one is not exactly one page.

### Building the images locally

```bash
docker compose build
```

To run the full stack on a machine without a public domain, set
`DOMAIN=localhost` in `.env` (`ACME_EMAIL` still needs any value). Caddy then
serves `https://localhost` with a certificate from its own internal authority
instead of contacting Let's Encrypt; the browser will warn that it is not
trusted, which is expected for a local test.
