# api

Accounts and saved resumes for Paperplane: Express 5 + TypeScript, sign-in by
[Better Auth](https://www.better-auth.com/), MySQL 8 through Kysely.
Deployment: [../docs/DEPLOY.md](../docs/DEPLOY.md).

Everything is served under `/api` on the site's own origin (the edge proxy in
production, Vite's proxy in development), so the session is a first-party
httpOnly cookie and there is no CORS.

## Endpoints

### Sign-in — `/api/auth/*`

Better Auth's standard routes, used through `src/lib/authClient.ts` in the web
app: email-and-password sign-up (the address must be confirmed before the
first sign-in), sign-in, password reset, emailed sign-in links, Google
sign-in, sessions, sign-out, change password, and account deletion (which
deletes the account's resumes with it).

Rate-limited per IP: sign-in 10/min, sign-up 5/min, password reset, sign-in
links and verification emails 3/min.

### `GET /api/auth-methods`

Which sign-in methods this server can complete:
`{ emailPassword, magicLink, google }`. Email methods need `SMTP_URL` +
`EMAIL_FROM`; Google needs `GOOGLE_CLIENT_ID` + `GOOGLE_CLIENT_SECRET`.

### Saved resumes — `/api/resumes` (signed in)

| Method | Path | Body | Result |
| --- | --- | --- | --- |
| GET | `/api/resumes` | — | `{ resumes, limit }`, newest first |
| POST | `/api/resumes` | `{ templateId, data?, title? }` | `201 { resume }` |
| GET | `/api/resumes/:id` | — | `{ resume }` |
| PATCH | `/api/resumes/:id` | `{ version, title?, templateId?, data? }` | `{ resume }`, or `409 { error, resume }` |
| POST | `/api/resumes/:id/duplicate` | — | `201 { resume }` |
| DELETE | `/api/resumes/:id` | — | `204` |

- **Ownership.** Every query is scoped by the owner in its `WHERE` clause;
  another user's resume is a plain 404.
- **Conflicts.** Each save sends the `version` the client last saw; a save from
  a device holding an older copy gets `409` and the current copy instead of
  overwriting what another device wrote.
- **Validation.** `src/resumes/schema.ts` mirrors the web app's resume type and
  the PDF service's limits; unknown fields are dropped, photos must be inline
  `data:` images.
- **Limits.** `MAX_RESUMES_PER_USER` (default 50) per account; 3 MB per request.
- Writes announcing a foreign `Origin` are refused (403), on top of the
  `SameSite=Lax` session cookie.

### `GET /api/health`

`{ ok: true }` once migrations have run and the server is listening.

## Configuration

See `.env.example` (development) and the configuration reference in
`docs/DEPLOY.md` (production). Invalid values stop the process at start with
a message naming the variable.

## Database

Migrations run at start-up, before the server listens: Better Auth's tables
(`user`, `session`, `account`, `verification`) first, then the app's numbered
migrations in `src/migrate.ts` (`resume`). Never edit a migration that has
shipped; add the next number.

## Run and test

```bash
npm install
cp .env.example .env     # set AUTH_SECRET
npm run dev              # :3050, restarts on change
npm test                 # end-to-end against MySQL database paperplane_test (wiped each run)
npm run build && npm start
```

Tests use a real MySQL (`TEST_DATABASE_URL`, default
`mysql://root@127.0.0.1:3306/paperplane_test`) and an in-memory mailer, and
follow the emailed links the way a user would.
