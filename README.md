# Paperplane

A resume builder for the web: fill in your details, pick one of 20 templates,
and download a PDF that matches the preview exactly, across as many A4 pages as
the resume needs. Every template prints every field you fill in, and email,
phone, LinkedIn, website and project links are clickable in the PDF.

No account is needed: a guest's resume is saved in their browser as they type
(localStorage) and never stored on the server. A free account (email and
password, an emailed sign-in link, or Google) adds as many saved resumes as you
like, synced across devices; deleting the account deletes them. Paperplane
installs as an app on phones and desktops (PWA), and the editor works offline;
exporting a PDF needs a connection.

## How it fits together

| Path | What it is |
| --- | --- |
| `src/` | The web app: React 19, Vite, TypeScript, Tailwind. |
| `src/templates/` | The 20 resume templates. Read `paging.ts` and `fields.tsx` before touching one. |
| `api/` | Node + TypeScript API: accounts and sign-in (Better Auth) and saved resumes, on MySQL. |
| `pdf-service/` | Node service that turns a resume into a PDF by printing the app's `/print` page in headless Chromium. |
| `docker/`, `docker-compose.yml` | Production stack: Caddy edge with automatic HTTPS, the static app, the PDF service, the API, MySQL and nightly backups. |
| `e2e/` | Playwright tests, including pagination and field coverage of every template. |
| `docs/DEPLOY.md` | **Deployment guide** — fresh VPS to live site, email and Google sign-in, backups, updates, troubleshooting. |
| `mobile/` | The Paperplane phone app (Flutter, Android and iOS). Built and released separately; not part of the web deployment. |

The PDF is printed from the same page the user previews, so preview and PDF
cannot drift: same components, same CSS, same bundled fonts.

## Develop

Needs MySQL 8 and, to read the emails the API sends, an SMTP catcher — on
Windows, Laragon has both (MySQL and Mailpit). Once:

```bash
mysql -uroot -e "CREATE DATABASE paperplane; CREATE DATABASE paperplane_test;"
cp api/.env.example api/.env        # then set AUTH_SECRET (the file says how)
```

Then three terminals:

```bash
npm install && npm run dev                                         # http://localhost:5173
cd api && npm install && npm run dev                               # API on :3050
cd pdf-service && npm install && RENDER_ORIGIN=http://localhost:5173 npm start   # PDF on :3040
```

The dev server proxies `/api/pdf` to the PDF service and the rest of `/api` to
the API, the same paths as production. Emails land in Mailpit at
http://127.0.0.1:8025.

## Test

```bash
npx tsc --noEmit -p .          # typecheck the web app
cd api && npm test             # API: accounts and resumes against MySQL (paperplane_test)
cd pdf-service && npm test     # PDF service tests (no browser)
npx playwright test            # e2e: every template's real PDF, saving, accounts
```

## Deploy

```bash
cp .env.example .env           # set DOMAIN, ACME_EMAIL, AUTH_SECRET and the database passwords
docker compose up -d --build
```

Full walkthrough, including server preparation, DNS, email and Google sign-in,
and backups: [docs/DEPLOY.md](docs/DEPLOY.md).
