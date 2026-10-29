# api

Accounts, saved resumes, credits and (from 2.0) AI features for Paperplane:
Express 5 + TypeScript, sign-in by [Better Auth](https://www.better-auth.com/),
MySQL 8 through Kysely. The 2.0 plan: [../docs/PLAN-2.0.md](../docs/PLAN-2.0.md).
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
deletes the account's resumes, credits and AI log with it).

Confirming an email (or signing up through Google or a sign-in link, which
confirms it) grants the free trial: `TRIAL_CREDITS` (300) valid `TRIAL_DAYS`
(15), once per account.

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

### Credits — `/api/credits` (signed in)

| Method | Path | Result |
| --- | --- | --- |
| GET | `/api/credits` | `{ balance, batches, history, prices, trial, aiConsentAt }` |
| GET | `/api/credits/packs` | `{ packs: [{ id, credits, validityDays, priceBdt }], purchasable }` |

- **Batches.** Every grant (trial, purchase, support grant, refund) is a batch
  with its own expiry; `batches` lists the live ones, soonest expiry first.
  `balance` is what they hold.
- **History.** The latest ledger entries: `grant` (+), `hold` (− an AI
  action's price) and `release` (+ the price back when the action failed),
  each with its `action` where there is one, plus `expire` (− what a batch
  still held when it expired; derived from the batch, so its `id` is
  negative), newest first.
- Reading the summary also grants a missed trial to a confirmed account.
- `purchasable` stays `false` until payments arrive (phase 5).

### AI consent — `/api/ai/consent` (signed in)

`GET` → `{ consented, at }`; `POST` records consent, `DELETE` withdraws it.
No AI action runs without it.

### AI actions (from phase 2)

Every action goes through `AiService.run` (`src/ai/service.ts`): AI switched
on → consent → per-minute and per-day limits → hold the action's credits
(soonest-expiring first, in a locked transaction) → call the model → keep the
charge and record tokens and cost, or give the credits back if the model
failed. Prices are in `src/ai/actions.ts`. Errors are
`{ error, code, ...details }`:

| Status | `code` | When |
| --- | --- | --- |
| 503 | `ai_unavailable` | `AI_ENABLED` is not `true` |
| 403 | `consent_required` | the user hasn't agreed to AI processing |
| 429 | `rate_limited`, `daily_limit` | `AI_RATE_PER_MINUTE` / `AI_DAILY_LIMIT` reached |
| 402 | `insufficient_credits` | with `{ balance, needed }`; nothing is charged |
| 502 | `ai_failed` | the model failed; the credits are back |

`ai_request` keeps one row per attempt (action, status, credits, tokens,
cost in micro-USD, latency) and never the text.

### `GET /api/health`

`{ ok: true }` once migrations have run and the server is listening.

## Configuration

See `.env.example` (development) and the configuration reference in
`docs/DEPLOY.md` (production). Invalid values stop the process at start with
a message naming the variable.

## Database

Migrations run at start-up, before the server listens: Better Auth's tables
(`user`, `session`, `account`, `verification`) first, then the app's numbered
migrations in `src/migrate.ts` (`0001` resumes; `0002` credits: `credit_batch`,
`credit_entry`, `ai_request`, `ai_consent`, `credit_pack`). Never edit a
migration that has shipped; add the next number.

## Credits from the command line

No admin panel; support uses `src/cli/credits.ts`:

```bash
npm run credits -- grant someone@example.com 1000 --days 30 --note "beta tester"
npm run credits -- show someone@example.com
# production
docker compose exec api node dist/cli/credits.js show someone@example.com
```

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
