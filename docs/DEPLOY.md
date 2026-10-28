# Deploying Paperplane

Paperplane runs as six containers on one VPS — the web app, the PDF service,
the API for accounts and saved resumes, its MySQL database, a nightly backup
job and the HTTPS edge — started by one `docker compose` command. This guide takes a fresh server to a working,
HTTPS-served site, then covers updates, operations and troubleshooting.

---

## 1. What runs

```
internet ──► edge   Caddy: TLS certificates, routing, security headers   :80 :443
               ├── /api/pdf ──► pdf   Node + headless Chromium             :3040
               ├── /api/*   ──► api   Node: accounts + saved resumes       :3050 ──► db (MySQL 8.4)
               └── /*       ──► web   the built React app, static files    :8080
                                 ▲
               pdf ── /print ────┘   Chromium prints the same page the user previews

backup ──► db   nightly compressed dump into ./backups
```

| Service | Built from | Reachable from | Can reach |
| --- | --- | --- | --- |
| `edge` | `caddy:2.10-alpine` + `docker/Caddyfile` | the internet (ports 80, 443) | `web`, `pdf`, `api` |
| `web` | `docker/web.Dockerfile` | `edge` and `pdf` | nothing |
| `pdf` | `pdf-service/Dockerfile` | `edge` | `web` only |
| `api` | `api/Dockerfile` | `edge` | `db`, and the internet (to send email and talk to Google) |
| `db` | `mysql:8.4` | `api`, `backup` | nothing |
| `backup` | `mysql:8.4` + `docker/backup.sh` | — | `db` |

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

**What the server stores.**
- **Guests (no account):** nothing. Their one resume is saved in their own
  browser (localStorage) and sent to the pdf service only for the length of one
  export; neither the request nor the PDF is written to disk or logged.
- **Account holders:** their account (name, email, a scrypt hash of the
  password if they use one, sign-in sessions, linked Google identity) and their
  saved resumes, in MySQL (the `mysql_data` volume). Deleting an account in the
  app deletes its resumes with it.
- Caddy's TLS certificates (the `caddy_data` volume) and the nightly database
  backups (`./backups` on the host).

The API logs one JSON line per event and never logs resume content, passwords
or tokens.

---

## 2. Requirements

- **A VPS** running a current 64-bit Linux. Ubuntu 24.04 LTS is assumed below.
  - Recommended: 2 vCPU, 4 GB RAM. Each concurrent export needs about 250 MB;
    MySQL takes about 500 MB.
  - Minimum: 1 vCPU, 2 GB RAM, with `PDF_CONCURRENCY=1` and
    `DB_MEMORY_LIMIT=512m` in `.env`.
  - ~5 GB free disk for images (the Chromium image is the large one), plus
    room for the database and its backups.
- **A domain or subdomain** whose DNS you control, e.g. `resume.example.com`.
- **Ports 80 and 443 open** to the internet. Port 80 is required even though
  the site is served over HTTPS: Let's Encrypt validates the domain through it,
  and Caddy uses it to redirect visitors to HTTPS.
- **SSH access** as a user with `sudo`.
- **For email-and-password accounts:** an email-sending service with SMTP
  (Resend, Postmark, Mailgun, Amazon SES…). Optional — see
  [Email](#45-email-sign-up-password-reset-sign-in-links).
- **For "Sign in with Google":** a Google Cloud project. Optional — see
  [Google sign-in](#46-google-sign-in).

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
`web`, `pdf`, `api` or `db`.

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

Set the required values:

| Variable | Example | Meaning |
| --- | --- | --- |
| `DOMAIN` | `resume.example.com` | The public hostname, exactly as in DNS. No `https://`, no path. |
| `ACME_EMAIL` | `you@example.com` | Let's Encrypt writes here about certificate problems. |
| `AUTH_SECRET` | output of `openssl rand -base64 48` | Signs sign-in sessions and email links. Keep it: changing it signs everyone out. |
| `DB_PASSWORD` | output of `openssl rand -hex 24` | The app's database password. Letters and digits only (it goes into a URL). |
| `DB_ROOT_PASSWORD` | output of `openssl rand -hex 24` | MySQL's root password, used by the backup job. |

Generate the three secrets right on the server:

```bash
echo "AUTH_SECRET=$(openssl rand -base64 48)"
echo "DB_PASSWORD=$(openssl rand -hex 24)"
echo "DB_ROOT_PASSWORD=$(openssl rand -hex 24)"
```

**Set the database passwords before the first start.** MySQL creates its users
from them once, when the `mysql_data` volume is empty; changing them in `.env`
later does not change the database (see
[Troubleshooting](#api-keeps-restarting-access-denied-for-user-paperplane)).

Email and Google sign-in are optional and can be added any time (sections
[4.5](#45-email-sign-up-password-reset-sign-in-links) and
[4.6](#46-google-sign-in)). Everything else in `.env` is optional tuning; see
[Configuration reference](#7-configuration-reference). `docker compose` refuses
to start with a clear message if a required value is missing.

### 4.3 Build and start

```bash
docker compose up -d --build
```

The first build takes several minutes: it installs the web app's dependencies,
type-checks and builds it, builds the API, and pulls the ~2 GB Playwright
image that carries Chromium and the MySQL image. Later builds reuse cached
layers. On first start the API creates its database tables itself; on later
starts it applies any new ones (migrations run before it accepts requests).

Watch the edge obtain its certificate:

```bash
docker compose logs -f edge
```

Look for `certificate obtained successfully`. Press Ctrl-C to stop following
(the containers keep running).

### 4.4 Verify

1. **All containers healthy:**

   ```bash
   docker compose ps
   ```

   `web`, `pdf`, `api` and `db` must show `(healthy)`; `edge` and `backup` show
   `Up`. `db` and `api` can take up to a minute on first start.

   The API reports which sign-in methods it has switched on:

   ```bash
   docker compose logs api | grep listening
   ```

   `"email":true` means email-and-password accounts and sign-in links work;
   `"google":true` means Google sign-in works.

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

5. **Accounts:** sign up, confirm the email, and create a resume under
   **My resumes**. Open the same account in another browser: the resume is
   there. (Needs email or Google configured — sections 4.5 and 4.6.)

6. **A backup exists:** `ls -lh backups/` shows a `paperplane-…sql.gz` written
   when the backup service started.

The site is live.

### 4.5 Email: sign-up, password reset, sign-in links

Email-and-password accounts need to send email (to confirm the address, reset
a password, or send a sign-in link). Until email is configured those methods
are switched off and the sign-in page offers only Google (if set up).

1. Create an account with an email-sending service and verify your domain
   there (it will ask you to add a few DNS records — SPF/DKIM — so mail is not
   marked as spam).
2. Get its SMTP settings and put them in `.env` as one URL:

   ```bash
   # Resend
   SMTP_URL=smtp://resend:<API_KEY>@smtp.resend.com:587
   # Postmark
   SMTP_URL=smtp://<SERVER_TOKEN>:<SERVER_TOKEN>@smtp.postmarkapp.com:587
   # Generic
   SMTP_URL=smtp://<user>:<password>@<host>:587

   EMAIL_FROM=Paperplane <no-reply@resume.example.com>
   ```

   `EMAIL_FROM` must use the domain you verified. If the password contains
   `@`, `:` or `/`, URL-encode it (`@` becomes `%40`).
3. `docker compose up -d api`, then sign up with a real address to test.

### 4.6 Google sign-in

1. In [Google Cloud Console](https://console.cloud.google.com/) create (or pick)
   a project, then **APIs & Services → OAuth consent screen**: app name
   "Paperplane", your support email, your domain; publish it.
2. **Credentials → Create credentials → OAuth client ID → Web application**:
   - Authorized JavaScript origins: `https://<DOMAIN>`
   - Authorized redirect URIs: `https://<DOMAIN>/api/auth/callback/google`
3. Put the client ID and secret in `.env`:

   ```bash
   GOOGLE_CLIENT_ID=…apps.googleusercontent.com
   GOOGLE_CLIENT_SECRET=…
   ```

4. `docker compose up -d api`. The sign-in page now shows "Continue with
   Google".

A Google sign-in joins an existing Paperplane account with the same email only
if that account's email has been confirmed, so no one can pre-register
someone else's address to capture their Google sign-in.

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
serving throughout unless its own config changed. Database changes apply
themselves: the new API runs its migrations before it accepts requests.

Before an update that you know changes the database, take a backup first
(see [Backups](#backups)).

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

Migrations only ever add to the database, so an older API keeps working
against a newer schema. If an update ever needs to be undone *including* its
data changes, restore the backup taken before it (see [Backups](#backups)).

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
docker compose logs -f api          # accounts and saved resumes
docker compose logs --since 1h pdf
```

The pdf service and the API write one JSON object per line, never including
resume content, passwords or tokens:

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

Accounts and saved resumes live in MySQL, so the database is the one thing on
the server that must not be lost.

**What happens automatically.** The `backup` service writes a consistent,
compressed dump of the database to `./backups/paperplane-YYYYMMDD-HHMMSS.sql.gz`
when it starts and every 24 hours after, and deletes dumps older than
`BACKUP_KEEP_DAYS` (default 14). `docker compose logs backup` shows each run.

**What you must add: a copy off the server.** A backup on the same disk does
not survive losing the server. Copy `./backups` somewhere else daily — for
example with a cron job on another machine:

```bash
rsync -az user@your-server:/opt/paperplane/backups/ ~/paperplane-backups/
```

or with `rclone` to object storage (Backblaze B2, S3, …) from the server itself.

**Take one now** (before a risky update):

```bash
docker compose restart backup     # writes a fresh dump on start
ls -lh backups/ | tail -3
```

**Restore** (replaces the current database with the dump):

```bash
docker compose stop api
gunzip -c backups/paperplane-20261028-030000.sql.gz \
  | docker compose exec -T db sh -c 'mysql -uroot -p"$MYSQL_ROOT_PASSWORD" paperplane'
docker compose start api
```

Test a restore once on a spare machine before you need it.

**Never run `docker compose down -v`** on a live server. `-v` deletes the
volumes: the **database** (every account and resume) and the certificates
(Let's Encrypt limits re-issuing to 5 per week). `docker compose down` without
`-v` is safe.

---

## 7. Configuration reference

### `.env` (read by `docker compose`)

| Variable | Default | Meaning |
| --- | --- | --- |
| `DOMAIN` | — (required) | Public hostname. |
| `ACME_EMAIL` | — (required) | Contact for Let's Encrypt. |
| `AUTH_SECRET` | — (required) | Signs sessions and email links; 32+ characters. Changing it signs everyone out. |
| `DB_PASSWORD` | — (required) | The app's MySQL password (letters and digits). Read by MySQL only on the first start. |
| `DB_ROOT_PASSWORD` | — (required) | MySQL root password, used by the backup job. Read by MySQL only on the first start. |
| `SMTP_URL`, `EMAIL_FROM` | unset | Email delivery. Both or neither. Without them, email-and-password accounts and sign-in links are off. |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | unset | Google sign-in. Both or neither. |
| `MAX_RESUMES_PER_USER` | `50` | Saved resumes per account. |
| `BACKUP_KEEP_DAYS` | `14` | Days of nightly backups kept in `./backups`. |
| `DB_MEMORY_LIMIT` | `768m` | Hard memory cap for the database container. |
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

### API environment (set in `docker-compose.yml`)

Built from the `.env` values above; listed for reference.

| Variable | Value in compose | Meaning |
| --- | --- | --- |
| `PUBLIC_URL` | `https://<DOMAIN>` | The site's origin: links in emails and Google's redirect use it, and writes from any other origin are refused. |
| `DATABASE_URL` | `mysql://paperplane:<DB_PASSWORD>@db:3306/paperplane` | The database. |
| `TRUST_PROXY_HOPS` | `1` | Trust exactly the edge for the client IP (sign-in rate limits key on it). |
| `PORT` | `3050` | Listening port inside the container. |

Sign-in endpoints are rate-limited per IP (sign-in 10/min, sign-up 5/min,
password reset and sign-in links 3/min).

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

### Sign-up emails do not arrive

- `docker compose logs api | grep listening` must show `"email":true`;
  otherwise `SMTP_URL`/`EMAIL_FROM` are not both set.
- `docker compose logs api | grep -i error` shows SMTP failures (wrong
  credentials, blocked port 587 — some VPS providers block outbound SMTP until
  you ask them to lift it).
- Delivered but in spam: finish the domain verification (SPF/DKIM DNS records)
  at your email service, and make `EMAIL_FROM` use that domain.

### Google sign-in fails with `redirect_uri_mismatch`

The redirect URI in Google Cloud must be exactly
`https://<DOMAIN>/api/auth/callback/google` — same domain as `DOMAIN`, `https`,
no trailing slash.

### API keeps restarting: "Access denied for user 'paperplane'"

`DB_PASSWORD` in `.env` no longer matches the password MySQL was created with
(MySQL reads `DB_PASSWORD` and `DB_ROOT_PASSWORD` only when its volume is first
created). Put the original value back in `.env`, or change it inside MySQL to
the new value and restart the API:

```bash
docker compose exec db sh -c 'mysql -uroot -p"$MYSQL_ROOT_PASSWORD" -e "ALTER USER paperplane IDENTIFIED BY \"$NEW_PASSWORD\""'
docker compose up -d api
```

(run the first line with `NEW_PASSWORD` set to the value now in `.env`, e.g.
`docker compose exec -e NEW_PASSWORD=… db sh -c …`).

### API keeps restarting: "database not ready"

The API retries for about a minute while MySQL starts. If it gives up,
`docker compose logs db` shows why MySQL is not starting (often out of memory —
check `docker stats` and lower `PDF_CONCURRENCY` or raise the server's RAM).

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
caches anything under `/api`, so exports, sign-in and saved resumes always
reach the server. The PDF service
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

No Docker needed. On Windows, Laragon provides MySQL and Mailpit (an email
catcher); start them from Laragon (or use any MySQL 8 and any SMTP catcher).

Once: create the databases and the API's settings file.

```bash
mysql -uroot -e "CREATE DATABASE paperplane; CREATE DATABASE paperplane_test;"
cp api/.env.example api/.env      # then set AUTH_SECRET (the file says how)
```

Then three terminals:

```bash
npm install
npm run dev                                  # app on http://localhost:5173
```

```bash
cd api
npm install
npm run dev                                  # API on :3050, creates its tables
```

```bash
cd pdf-service
npm install
RENDER_ORIGIN=http://localhost:5173 npm start   # PDF service on :3040
```

The Vite dev server proxies `/api/pdf` to `localhost:3040` and the rest of
`/api` to `localhost:3050` (`vite.config.ts`), so the app takes the same
same-origin paths as production. Every email the API sends lands in Mailpit at
http://127.0.0.1:8025. On Windows PowerShell, set the PDF service's variable
with `$env:RENDER_ORIGIN='http://localhost:5173'; npm start`.

### Tests

```bash
cd pdf-service && npm test                    # service unit + route tests, no browser
cd api && npm test                            # API: accounts and resumes against MySQL (database paperplane_test, wiped each run)
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
