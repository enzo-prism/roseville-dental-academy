# Private infection-control checkout pilot

The website contains a **staff-only, TEST-only** Stripe Checkout pilot at `/enrollment-pilot`.
It charges no real money, creates no genuine student enrollment, and uses a separate test ledger
that never changes real course capacity or attribution conversions. No public enrollment CTA is added.
The production course's existing inquiry flow remains the admissions path until separate launch approval.

## Required secure configuration

Use the verified RDA Neon database and apply migration `004_enrollment_test_pilot.sql` through the
existing `scripts/migrate-attribution.mjs` filename-order migrator. No extra database or payment SDK
is needed. Configure server-side variables through the verified deployment's secret manager:

- `DATABASE_URL`: verified RDA Neon connection.
- `RDA_ENROLLMENT_PILOT_PASSWORD`: a separate random staff password of at least 20 characters.
- `RDA_ENROLLMENT_PILOT_SESSION_SECRET`: random signing secret of at least 32 characters.
- `RDA_ENROLLMENT_TEST_ORIGIN`: exact HTTPS deployment origin with no trailing slash or path.
- `RDA_STRIPE_TEST_SECRET_KEY`: Stripe test secret `sk_test_…` or restricted test key `rk_test_…`.
  `rk_test_` is intentional and matches the same `^(sk|rk)_test_` guard in `lib/enrollment-contract.ts`.
- `RDA_STRIPE_TEST_WEBHOOK_SECRET`: matching test endpoint `whsec_` signing secret.

Register the test Stripe endpoint `/api/enrollment/webhook` for `checkout.session.completed`,
`checkout.session.expired`, and `checkout.session.async_payment_succeeded`. The restricted test key,
if used, needs permission to create, retrieve, list, and expire Checkout Sessions. Use fictional emails
and Stripe test card `4242 4242 4242 4242`, a future expiry, and any three-digit CVC. Do not use real cards.
The pilot refuses live API keys, live sessions, and live events. Missing configuration fails closed.
Do not place secret values in docs, public variables, screenshots, test logs, or repository files.

## Integrity and privacy

The server selects only upcoming, open Infection Control dates from the shared reviewed schedule,
using the current academy-local date. Price is fixed to $395.00 USD, full payment, one item.
The approved cancellation policy is shown verbatim; the request must accept its current version.
No browser amount, price ID, currency, arbitrary date, or redirect can override server values.

The staff gate is separate from the student job-board password. Sessions are signed, HTTP-only,
Secure, SameSite Strict, two-hour cookies and revoked by password rotation. A stable signed staff
principal preserves access to test holds after a legitimate session renewal. Login is durably limited
to eight attempts per trusted request bucket and 30 globally per 15-minute window; spoofable generic
forwarding headers are ignored. Session signing-secret rotation changes the staff principal: reconcile
existing holds before rotating that secret, or use the controlled operator recovery described below.

Both pages and APIs carry noindex/noarchive, private no-store, and no-referrer headers. The shared
analytics boundary suppresses advertising pixels, interaction analytics, attribution capture,
Vercel Analytics, and Speed Insights on the pilot. The pilot is absent from public navigation and sitemap.

Each test date is locked by PostgreSQL while allocating at most 12 reserved/paid test seats. A hold UUID,
policy version, immutable price/currency, and fixed Stripe expiry are persisted before the Stripe call.
The Stripe idempotency key is derived from that UUID. Identical retries reuse the same request body;
unknown provider failures retain the reservation. The browser persists only a hold UUID and date in
sessionStorage, restores it after navigation, and requires reconciliation before another checkout.
Definite pre-reservation rejections clear only the browser reference. Duplicate same-tick submits are blocked.

Webhook signatures cover the bounded raw request body; timestamps outside five minutes are rejected.
The server retrieves the session from Stripe and checks test mode, ID, total, currency, payment mode,
hold/date/policy metadata, client reference, expiry, and existing session binding before a durable outcome
write. Event replay is idempotent; conflicting event identities and terminal outcomes fail closed.
Confirmation URLs carry only an opaque hold UUID and cannot manufacture a successful payment.
Returning from Stripe may initially omit the Strict cookie; the page provides an ordinary same-origin
**Retry verification** link to check the original private session safely.

## Abandoned test holds

Use **Close or verify an abandoned test checkout** while signed in to staff access. The authenticated,
same-origin reconcile endpoint retrieves the known Stripe session, or recovers a lost create response
by listing test sessions in the immutable creation window and matching the exact hold metadata.
It expires an open session through Stripe, validates the returned session, and releases test capacity
only after Stripe confirms `expired` plus `unpaid`. A completed paid test remains counted.

**Local expiry never frees capacity.** If a lost response cannot be recovered, provider lookup fails,
duplicate matching sessions exist, or the bounded recovery search is exhausted, the reservation remains
held. An administrator must inspect the Stripe test dashboard and ledger for that exact UUID, establish
the correct session binding and verified terminal state, then retry authenticated reconciliation. Do not
delete or locally expire a hold just to make capacity available. If the signing secret was rotated, restore
the prior staff identity in a controlled temporary environment for reconciliation, or perform the equivalent
session retrieval/verification using the reviewed server library and original ledger identity. Never hand-edit
`paid`/`expired` status or replay an unverified browser/session URL.

## Validation

`PLAYWRIGHT_NO_WEBSERVER=1 pnpm exec playwright test tests/enrollment-contract.spec.ts tests/enrollment-ledger.spec.ts`
runs isolated HMAC/session/provider fixtures and PGlite PostgreSQL tests, including concurrent capacity
attempts, retry/replay, terminal conflicts, and durable login limits. These tests do not call live services.

`pnpm test:enrollment-pilot` is the CI readiness command: it unit-tests the activate script's live-key
guard and webhook idempotency against a mocked Stripe client, then runs `pnpm enrollment:verify`
(isolated 004 re-apply plus mocked paid / expired / 13th-seat checks). In CI the paid, expired, and
12-seat cap paths are proven at the isolated Postgres/DB level by `scripts/enrollment-pilot-verify.mjs`.
The real-route Next.js harness below is opt-in and is not the CI proof. It never uses live keys or a
network Stripe account.

`scripts/enrollment-fixture-preload.mjs` is a separate opt-in local integration harness. It refuses any
non-loopback origin, genuine database URL, or non-fixture key. In an isolated copy of the project, build
normally and start Next with the preload, fake database URL `postgres://fixture:fixture@db.fixture.neon.tech/test`,
`RDA_ENROLLMENT_FIXTURE_MODE=local-only`, fixture staff password `fixture-staff-password-long`,
fixture session secret `fixture-staff-session-secret-xxxxxxxxxxxxxxxx`, `sk_test_fixture`, `whsec_fixture`,
and a local `RDA_ENROLLMENT_FIXTURE_FILE` control JSON file. Run `tests/enrollment-api.spec.ts` against that
server with `ENROLLMENT_FIXTURE_TESTS=1`. The harness exercises the actual Next handlers with an isolated
PostgreSQL engine and mocked Stripe HTTP, including lost-response recovery, webhook tampering/replay,
forged confirmations, and browser navigation/reload. It is never imported by production application code.

Fixture success is not proof of an actual Stripe integration. Before calling the pilot payment-tested,
configure the verified RDA test account/webhook, complete a real Stripe **test-mode** transaction, verify
the resulting signed webhook and durable ledger, test an expired checkout and full capacity, and confirm
the private success page on mobile and desktop. Real payment activation remains a separate approved release.

## Switch-on recipe (the day Stripe TEST keys arrive)

Do these steps in order. Vercel already has `RDA_ENROLLMENT_PILOT_PASSWORD` and
`RDA_ENROLLMENT_PILOT_SESSION_SECRET`. The only missing production pieces are the Stripe **test**
secret key and matching webhook signing secret. Never put secret values in tickets, screenshots,
chat, git, or this document.

### 1. Set environment variable **names** in Vercel

In the verified project's sensitive/server environment (Preview and Production as needed), set:

- `DATABASE_URL` — already present; verified RDA Neon connection
- `RDA_ENROLLMENT_PILOT_PASSWORD` — already present
- `RDA_ENROLLMENT_PILOT_SESSION_SECRET` — already present
- `RDA_ENROLLMENT_TEST_ORIGIN` — exact HTTPS deployment origin, no trailing slash or path
- `RDA_STRIPE_TEST_SECRET_KEY` — Stripe test `sk_test_` or `rk_test_` only (`rk_test_` is intentional)
- `RDA_STRIPE_TEST_WEBHOOK_SECRET` — leave empty until step 4 prints it

Do not add live `sk_live_` / `rk_live_` keys. The app and the activate script both refuse them.

### 2. Redeploy

Redeploy so `RDA_ENROLLMENT_TEST_ORIGIN` and `RDA_STRIPE_TEST_SECRET_KEY` are live. The webhook secret
is still missing; the staff page will keep reporting configuration incomplete until step 4 finishes
and you redeploy once more.

### 3. Check migration 004, then apply

Against the verified Neon URL only:

```bash
DATABASE_URL=… pnpm attribution:migrate:check
DATABASE_URL=… pnpm attribution:migrate
```

`--check` only inspects whether the 004 objects exist (`to_regclass` / `to_regprocedure`) and
reports `applied: true` or `false`. It does not compare function bodies to the SQL file, so a
drifted `CREATE OR REPLACE` function still reports applied. It does not write. The apply command
is idempotent: `004` uses `IF NOT EXISTS` / `OR REPLACE` and is safe to re-run.
`pnpm attribution:migrate -- --dry-run` lists migration files without connecting.
Unknown flags (`--chek`, `--dryrun`, stray positionals) print a usage error, exit non-zero, and
make no database calls. The `--` separator that pnpm passes is ignored.

### 4. Register the test webhook (create only if missing)

```bash
RDA_STRIPE_TEST_SECRET_KEY=… RDA_ENROLLMENT_TEST_ORIGIN=https://… pnpm enrollment:activate -- --dry-run
RDA_STRIPE_TEST_SECRET_KEY=… RDA_ENROLLMENT_TEST_ORIGIN=https://… pnpm enrollment:activate
```

The script refuses live keys (`sk_live_` / `rk_live_`) and accepts only `sk_test_` or `rk_test_`
(same guard as `lib/enrollment-contract.ts`). It lists Stripe test webhook endpoints and creates
`<origin>/api/enrollment/webhook` only when that URL is absent, with exactly
`checkout.session.completed`, `checkout.session.expired`, and
`checkout.session.async_payment_succeeded`. If the endpoint already exists with those events and
is enabled, it is reused and no secret is printed. If that matching endpoint is disabled, activate
re-enables it (`disabled: false` only) rather than failing or creating a second endpoint; no
secret is printed. On create, the signing secret is written **once to stdout**.
Store it as `RDA_STRIPE_TEST_WEBHOOK_SECRET` in Vercel, then discard the terminal output. Redeploy
again so the app can verify signatures. Unknown flags (`--dryrun`, `--disabl`, stray positionals)
print a usage error, exit non-zero, and make no Stripe calls. The `--` separator that pnpm passes
is ignored.

A restricted test key needs permission to create, retrieve, list, and expire Checkout Sessions and
to list/create/update Webhook Endpoints.

### 5. Verify

Automated (mocked Stripe, no network, safe in CI):

```bash
pnpm enrollment:verify
```

That command re-applies `004` twice in isolated Postgres, then proves:

1. A signed `checkout.session.completed` event marks the hold `paid` and leaves 11 seats.
2. A signed `checkout.session.expired` event releases the hold so another reserve succeeds.
3. A 13th reserve is rejected once 12 reserved/paid seats exist.

Manual Stripe **test mode** (no real charges; fictional email; card `4242 4242 4242 4242`, a future
expiry, any three-digit CVC):

1. Successful purchase: staff login at `/enrollment-pilot`, choose an upcoming Infection Control
   date, accept the current cancellation policy, pay with `4242…`. Confirmation shows a paid test
   enrollment; that date's remaining test seats decrement by one.
2. Abandoned checkout: start a second checkout, close the Stripe tab without paying, then use
   **Close or verify an abandoned test checkout** (or wait for `checkout.session.expired`). The
   reserved seat is released.
3. Full class: after 12 reserved or paid test seats on one date, a 13th checkout is blocked.
4. Walkthrough: repeat the staff checkout at 390px wide and 1280px wide. Confirm the form, policy,
   and confirmation remain usable; do not capture secrets or personal data in screenshots.
5. Rollback: remove `RDA_STRIPE_TEST_SECRET_KEY` and `RDA_STRIPE_TEST_WEBHOOK_SECRET` from Vercel
   (and `RDA_ENROLLMENT_TEST_ORIGIN` if you want the origin cleared), redeploy, then disable the
   test endpoint:

   ```bash
   RDA_STRIPE_TEST_SECRET_KEY=… RDA_ENROLLMENT_TEST_ORIGIN=https://… pnpm enrollment:activate -- --disable
   ```

   The staff page fails closed ("awaiting secure configuration") without those variables. Do not
   drop ledger tables or hand-edit `paid`/`expired` rows. Local time never frees a hold.
   After rollback, a later `pnpm enrollment:activate` re-enables the same endpoint and prints
   **no** secret (Stripe only returns `whsec_` on create). Reveal the existing signing secret or
   roll it in the Stripe test dashboard, then store the current value as
   `RDA_STRIPE_TEST_WEBHOOK_SECRET`.

Real live-mode payment activation remains a separate approved release.
