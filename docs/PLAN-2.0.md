# Paperplane 2.0 — AI features, credits and payments

Status: **plan, agreed in principle** (2026-10-29). Phases ship one at a time;
each ends with tests, a deploy and a short review before the next starts.

---

## 1. What 2.0 adds

1. **Import an old resume** — upload a PDF or Word (.docx) file; the AI reads
   it into a Paperplane resume the user reviews before keeping.
2. **AI writing help** in the editor — improve a bullet point, write the
   summary, tailor the resume to a pasted job advert.
3. **Connect GitHub and GitLab** (public data by default; private
   repositories only if the user chooses them, read-only) — suggested
   Projects entries and skills.
4. **Links section** — portfolio, GitHub, Behance, personal site… printed by
   every template.
5. **LinkedIn data import** — from LinkedIn's own data download (see §8).
6. **Credits** — every AI action costs credits; 300 free trial credits; paid
   packs through **SSLCommerz** (bKash, Nagad, Rocket, cards).

Out of scope for 2.0: the phone app (gets AI in 2.1, same API), images and
scanned resumes (text-only, see §3), Bangla content (English only).

## 2. Principles

- **The AI suggests; the user decides.** Nothing the AI produces is written
  into a resume until the user accepts it, piece by piece.
- **No invented facts.** Prompts forbid adding employers, dates, numbers or
  skills that are not in the input. Where a number would strengthen a bullet,
  the AI leaves a visible placeholder (`[X%]`) for the user to fill.
- **Text only, cheapest capable model.** Files are turned into text on our
  server; only text goes to the AI (§3).
- **Pay for success only.** Credits are held when an action starts and
  refunded automatically if it fails.
- **Privacy is explicit.** A one-time consent before the first AI action;
  uploaded files are never stored; AI requests are logged without content.

## 3. Model and cost

| | |
| --- | --- |
| Model | **Claude Haiku 5.5** (`claude-haiku-5-5`), Anthropic's cheapest current model |
| Price | $0.10 per million input tokens (≈ ৳12), $0.50 per million output tokens (≈ ৳62), for requests under 100K tokens (ours are a few thousand) |
| Thinking | Off — billed as output, not needed for these tasks |
| Output | Structured outputs (a JSON schema generated from our zod schemas), validated again on our side |
| Input | Text only. PDFs → text with pdf.js (already in the project); .docx → text with mammoth. Scanned PDFs (no text layer) and images are refused with a clear message; old `.doc` files: "save as .docx or PDF". |

Exchange rate used: ≈ ৳123 per US dollar (mid-2026); figures are estimates
until measured on real traffic.

| Action | Credits | Typical size (tokens in / out) | Our AI cost |
| --- | --- | --- | --- |
| Import a resume file | **100** | 3,500 / 2,500 | ≈ ৳0.20 |
| Read GitHub / GitLab projects | **50** | 4,000 / 800 | ≈ ৳0.10 |
| Tailor to a job advert | **40** | 3,000 / 1,500 | ≈ ৳0.13 |
| Write the summary | **10** | 1,500 / 200 | ≈ ৳0.03 |
| Improve one bullet | **5** | 500 / 150 | ≈ ৳0.02 |
| LinkedIn data import | **free** | no AI (§8) | ৳0 |

Each action has a hard cap on input size and `max_tokens`, so no request can
cost more than about twice its typical figure.

**Unit economics.** One credit costs us ≈ ৳0.002–0.003 in AI. A 1,000-credit
pack (≈ ৳2.5 of AI if fully used) sells for ৳50–80; SSLCommerz's fee is a few
percent of the price (check your contract). The 300-credit trial costs ≈ ৳1
per user who uses it all. *Tax/VAT on sales: confirm with your accountant.*

## 4. Credits

### 4.1 Rules

- **Trial:** 300 credits, **valid 15 days**, granted once per account when the
  email is confirmed (or on first Google sign-in). Never granted twice to the
  same account.
- **Packs** (initial list; editable without code changes):

  | Credits | Valid for | Price |
  | --- | --- | --- |
  | 1,000 | 30 days | ৳50 |
  | 1,000 | 90 days | ৳70 |
  | 1,000 | 180 days | ৳80 |

- Every grant is its own **batch** with its own expiry date. Spending always
  draws from the batch that **expires soonest**, so nothing is wasted that
  didn't have to be.
- **Balance** = the remaining credits in batches that have not expired.
- **Failed actions are refunded** to the batches they came from (if such a
  batch has expired in the meantime, the refund becomes a new 7-day batch).
  Successful actions are not refunded because the user disliked the result.
- **Expiry reminder** email 3 days before a batch with credits left expires.

### 4.2 Data model (MySQL, new migrations)

- `credit_batch` — `id, user_id, source (trial|purchase|grant|refund),
  amount, remaining, expires_at, payment_id?, note, created_at`.
  Index `(user_id, expires_at)`.
- `credit_entry` (the ledger; append-only) — `id, user_id, batch_id,
  kind (grant|hold|spend|release|expire), amount (signed), ai_request_id?,
  payment_id?, created_at`. Every change to a batch writes an entry, so the
  history always explains the balance.
- `ai_request` — `id, user_id, action, status (held|succeeded|failed),
  credits, model, input_tokens, output_tokens, cost_micro_usd, latency_ms,
  error_code, created_at`. **No resume content.**
- `credit_pack` — `id, credits, validity_days, price_bdt, active`.

**Concurrency:** a hold runs in one transaction that locks the user's
non-expired batches (`SELECT … FOR UPDATE`, soonest expiry first), takes what
it needs and records `hold` entries. Two actions started at once can never
overdraw. A test fires parallel actions at an exact balance to prove it.

### 4.3 API and app

- `GET /api/credits` — balance, batches with expiry dates, recent history.
- `GET /api/credits/packs` — the active packs.
- Every AI button shows its price ("Improve · 5 credits"); the header and
  Account page show the balance and the soonest expiry ("120 credits ·
  40 expire 3 Nov"). At zero: a sheet offering packs.
- Guests see the AI buttons too; using one asks them to create a free account
  ("300 free credits").
- **Server command for support and testing** (no admin panel needed):
  `npm run credits:grant -- someone@example.com 1000 --days 30 --note "beta tester"`
  and `npm run credits:show -- someone@example.com`.

## 5. AI service (API side)

New module `api/src/ai/` using the official Anthropic TypeScript SDK
(`@anthropic-ai/sdk`).

Every AI endpoint runs the same pipeline:

1. Signed in, email confirmed, AI consent recorded (else 403 with a reason
   the app turns into the consent dialog).
2. Limits: 10 AI actions per minute and 100 per day per user (configurable).
3. Validate and cap the input (zod; character caps per action).
4. **Hold** the action's credits (§4.2). Not enough → 402 with the balance.
5. Call Haiku 5.5: fixed system prompt per action, the user's text as data,
   structured output schema, timeout 60 s.
6. Validate the output with zod. Refusal, timeout, invalid output →
   **release** the hold (refund) and return a friendly error.
7. **Spend** the hold; record tokens and cost in `ai_request`.
8. Return the suggestion. The resume itself is never modified by the server.

Configuration: `ANTHROPIC_API_KEY`, `AI_MODEL` (default `claude-haiku-5-5`),
`AI_ENABLED`, `AI_RATE_PER_MINUTE`, `AI_DAILY_LIMIT`. In tests and
development a fake model client returns fixed answers, so tests cost nothing.

Endpoints:

| Endpoint | Credits | Input → output |
| --- | --- | --- |
| `POST /api/ai/import` | 100 | file (multipart, ≤ 5 MB, PDF/.docx) → extracted resume (all sections) |
| `POST /api/ai/summary` | 10 | resume, optional target role → summary text |
| `POST /api/ai/bullet` | 5 | one entry (role, company, text) → improved text |
| `POST /api/ai/tailor` | 40 | resume + job advert (≤ 8,000 chars) → keyword match, missing keywords, suggested edits per field with reasons |
| `POST /api/ai/projects` | 50 | selected repositories (§7) → Projects entries + skill suggestions |
| `POST /api/import/linkedin` | free | LinkedIn export .zip → resume sections (no AI) |

## 6. Import an old resume (phase 2)

- Upload → text extraction on the server (file kept in memory only, then
  discarded) → refuse if there is no text ("This looks like a scan or a
  photo; upload the original PDF or Word file").
- Text capped at ~20,000 characters (far beyond any real resume).
- The AI maps it to our resume structure: personal details, experience,
  education, skills, projects, and anything else (certifications, awards,
  languages, volunteering) into custom sections. Dates are kept as written.
- **Review screen**: what was found, section by section, each with a
  checkbox; choose **"Create a new resume"** (signed in: a new saved resume)
  or **"Add to this resume"** (merge into the open one). Nothing is applied
  until the user confirms.
- Copy explains the LinkedIn route: on a LinkedIn profile, *More → Save to
  PDF*, then import that PDF here.
- Accuracy is measured before launch on a set of ~15 sample resumes (varied
  layouts, PDF and .docx) with expected results; costs a few taka to run.

## 7. Connect GitHub and GitLab (phase 4)

**Public by default, private only by choice, always read-only, nothing kept.**

- **GitHub — public:** sign in with GitHub requesting no extra permissions;
  read the profile and public repositories (name, description, topics,
  languages, stars, last activity, README excerpt).
- **GitHub — private (optional):** a **GitHub App** with *read-only*
  "Metadata" and "Contents" permissions. The user installs it on **only the
  repositories they pick**, in GitHub's own screen, and can remove it at any
  time. (A normal GitHub sign-in can only ask for full read/write access to
  private code; the GitHub App is how read-only and per-repository access is
  possible.)
- **GitLab:** gitlab.com OAuth with `read_user` and `read_api` (read-only).
  Private projects appear in the list only if the user ticks "include
  private projects".
- The user ticks up to 10 repositories → `POST /api/ai/projects` (50
  credits) → suggested Projects entries and skills → accept/reject each.
- **Tokens are not stored.** The access token is used during the import
  session (kept encrypted, deleted after 15 minutes at most), then discarded.
  Reconnecting is one click next time.

## 8. Links section and LinkedIn data import (phase 4)

- **Links**: a new list of `{ label, url }` in the resume (Portfolio, GitHub,
  Behance, Dribbble, website…). THE FIELD RULE applies: all 20 templates print
  them, clickable in the PDF; `e2e/fields.spec.ts`, the API schema and the PDF
  service's validator are updated with it.
- **LinkedIn data import (free):** LinkedIn → Settings → Data privacy → *Get a
  copy of your data*. The .zip contains Profile, Positions, Education and
  Skills files that we read directly — no AI, so no credits — then the same
  review screen as §6.
- LinkedIn's API is not used: it gives ordinary apps only name, email and
  photo; work history requires LinkedIn partner approval, and copying profile
  pages breaks LinkedIn's terms.

## 9. Writing assistant (phase 3)

- **Improve** (5 credits) beside every description: rewrites one entry with
  strong verbs and results, same facts, `[X]` placeholders for missing
  numbers. Shows the suggestion next to the original: *Use it* / *Discard*.
- **Write summary** (10): from the whole resume and an optional target role.
- **Tailor to a job** (40): paste a job advert → a match overview, keywords the
  resume is missing (only ones the user can honestly add), and suggested edits
  per field, each accepted or skipped individually.
- On phones these open as bottom sheets; on desktop as a side panel.

## 10. Payments — SSLCommerz (phase 5)

1. `POST /api/payments/checkout { packId }` → create a `payment` row with a
   unique transaction id → SSLCommerz session API → redirect the user to its
   payment page (bKash, Nagad, Rocket, cards).
2. SSLCommerz returns the user to our success/fail/cancel pages **and** calls
   our IPN (server-to-server) address.
3. **Never trust the redirect.** Credits are granted only after our server
   confirms the payment with SSLCommerz's validation API: correct transaction,
   amount and currency match the pack, status valid, risk level acceptable.
4. Granting is **idempotent** (one batch per payment, enforced by a unique
   key), so a redirect and an IPN arriving together grant once.
5. Account → **Purchase history** with receipts.

`payment` table: `id, user_id, pack_id, amount_bdt, status
(initiated|paid|failed|cancelled|refunded), tran_id (unique), val_id,
bank_tran_id, method, created_at, paid_at` — no card data ever reaches us.

Developed and tested against the **SSLCommerz sandbox**; switched to live with
your merchant credentials (`SSLCOMMERZ_STORE_ID`, `SSLCOMMERZ_STORE_PASSWORD`,
`SSLCOMMERZ_LIVE=true`).

## 11. Legal pages, privacy and consent

SSLCommerz requires these on the website before approving a merchant, so they
come **first** (phase 1) and you can apply while the rest is built:

- **Terms of Service** (accounts, credits, validity, acceptable use)
- **Privacy Policy** (what is stored for guests vs accounts; AI processing by
  Anthropic; files not kept; deletion)
- **Refund & Cancellation Policy** (credits, failed actions, expiry)
- **Contact / About** (business name, address, email, phone)

Plus the **AI consent dialog** on first use (stored as `ai_consent_at`), and
the deploy guide's "what the server stores" updated. Anthropic's current terms
on retention and training of API data are checked and quoted accurately in
the privacy policy before launch. *Drafts are written by us; have them
reviewed before going live.*

## 12. Phases

| Phase | Contents | Depends on you for |
| --- | --- | --- |
| **1. Foundation** | Credits (batches, ledger, trial on confirmation, balance UI, grant command), AI service with fake client, consent dialog, rate limits, legal pages | Business details for the legal pages |
| **2. Import** | PDF/.docx upload, extraction, AI import, review screen, accuracy set | Anthropic API key |
| **3. Writing help** | Improve bullet, write summary, tailor to job | — |
| **4. Connections** | Links section (all 20 templates), GitHub public + optional private (GitHub App), GitLab, LinkedIn data import | GitHub App, GitLab application |
| **5. Payments** | SSLCommerz checkout, validation, IPN, purchase history, expiry reminder emails | SSLCommerz sandbox, then live merchant account |

Every phase: API tests (credits concurrency, expiry with a controllable
clock, refund on failure, fake-model AI paths, payment validation with
recorded SSLCommerz responses), end-to-end tests with the fake model, a small
live check with the real model, and docs/DEPLOY.md updated.

## 13. What I need from you

- [ ] **Anthropic API key** — console.anthropic.com → API keys; add prepaid
      credit (USD, card with international payments) and set a **monthly
      spend limit**. Needed from phase 2.
- [ ] **Business details** for the legal pages — business/trade name,
      address, support email and phone. Needed in phase 1.
- [ ] **SSLCommerz** — sandbox account (developer.sslcommerz.com) for phase
      5 testing; apply for the live merchant account once the legal pages are
      online.
- [ ] **GitHub App** and **GitLab application** — I'll give exact settings
      (names, permissions, callback URLs) at phase 4.
- [ ] Final pack list and prices if they change (editable at any time).

## 14. Monitoring cost

- `ai_request` records tokens and cost of every action;
  `npm run ai:report` shows spend per day and per action.
- Anthropic's console spend limit is the hard ceiling.
- If real costs differ from §3, credit prices per action are configuration,
  not code.
