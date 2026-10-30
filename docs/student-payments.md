# Infection Control student payments — development release

Live payments are **disabled by default**. This release adds a separate student enrollment
path at `/enroll`; it does not turn the staff-only pilot into a live ledger. No Stripe
credential or email sender is created by the schema migration. The public Infection Control
page adds an enrollment link only when valid live configuration, the explicit live flag,
and the separate public CTA flag are all present. `/enroll` itself is reachable by URL
whenever Checkout is configured; the CTA flag does not hide that route. Existing inquiry
forms remain available.

## Course dates prepared for review

The dates, price, and class capacity below were checked October 21, 2026 against
the live `/infection-control` page. They do not establish current seat availability.
The owner reported the offline enrollment counts as unknown on October 28; keep
both live offerings disabled until the academy confirms each date's current count.

| Course date | ISO date | Price | Capacity | Offline seats already taken |
| --- | --- | --- | --- | --- |
| November 14, 2026 | `2026-11-14` | $395 (39500 cents, USD) | 12 | Unknown — keep disabled |
| December 5, 2026 | `2026-12-05` | $395 (39500 cents, USD) | 12 | Unknown — keep disabled |

Payment is in full. Only these two Infection Control dates are configured for future
checkout; neither is sellable until its inventory is reviewed and explicitly enabled.
November 7 was removed from the public schedule earlier and must not be seeded or
offered at checkout.

Canonical config: `lib/student-enrollment-offerings.ts`.
Reviewed insert (disabled live offerings only): `db/seeds/infection-control-offerings.sql`.
Isolated TEST-mode insert (enabled offerings): `db/seeds/infection-control-offerings.test.sql`.
Schema: `db/migrations/005_student_enrollment.sql` (shipped) plus
`db/migrations/006_student_enrollment_review.sql` (review-function upgrade).
Schema migrations create zero offerings.

`db/seeds/infection-control-offerings.test.sql` is **only** for an isolated preview or
test database. It inserts the same two dates as `mode='test'`, `enabled=true`,
`amount=39500`, `capacity=12`, `external_seats=0`, and the same policy text/hash as
the reviewed live seed. Never apply it to production or any live database. Production
uses the live seed (`mode='live'`, `enabled=false`) after review.

The live seed refuses to run unless the session first sets
`application_name = 'rda-student-offering-seed'`. The TEST seed uses a **different**
name, `rda-student-offering-seed-isolated`, so applying the live-seed guard cannot
accidentally insert TEST rows. If the database already has `mode='live'` offerings
or enrollments, the TEST seed also refuses unless the session sets
`application_name = 'rda-student-offering-seed-on-live-data'` as an explicit
opt-in. Do not use that opt-in on production. `ON CONFLICT DO NOTHING` will not
overwrite a stale row with the same `(mode, course_id, course_date)`, so each file
verifies the post-state and raises if the two confirmed dates, amount, seats, hash,
or enabled flag do not match.

## October 21 2026 preview exception

By Enzo's decision on October 21, 2026, the Vercel preview for this branch used the
production database. That preview applied the then-current `005_student_enrollment.sql`
and `db/seeds/infection-control-offerings.test.sql` to the production database.
That contradicts the isolated-database rule above. Go-live applies
`006_student_enrollment_review.sql` on that same database (the filename-order
migrator re-applies `005` then `006`; `006` is idempotent on a DB that already
has the shipped `005`). Test-mode queries stay filtered by
`mode='test'`, but ad-hoc SQL against `student_enrollment_roster` is live-only; use
`student_enrollment_roster_test` for TEST paid rows. Do not repeat the preview
exception. After preview sign-off, clean TEST rows with the SQL below —
**do not run it from this task**.

```sql
-- TEST-mode-only cleanup. Never delete mode='live' rows.
-- Review the counts, then COMMIT or ROLLBACK.
BEGIN;
SELECT count(*) AS test_offerings FROM student_enrollment_offerings WHERE mode = 'test';
SELECT count(*) AS test_enrollments
  FROM student_enrollments e
  JOIN student_enrollment_offerings o ON o.id = e.offering_id
  WHERE o.mode = 'test';
DELETE FROM student_enrollment_reviews
 WHERE enrollment_id IN (
   SELECT e.id FROM student_enrollments e
   JOIN student_enrollment_offerings o ON o.id = e.offering_id
   WHERE o.mode = 'test'
 );
DELETE FROM student_enrollment_events
 WHERE enrollment_id IN (
   SELECT e.id FROM student_enrollments e
   JOIN student_enrollment_offerings o ON o.id = e.offering_id
   WHERE o.mode = 'test'
 );
DELETE FROM student_enrollment_mail
 WHERE enrollment_id IN (
   SELECT e.id FROM student_enrollments e
   JOIN student_enrollment_offerings o ON o.id = e.offering_id
   WHERE o.mode = 'test'
 );
DELETE FROM student_enrollments
 WHERE offering_id IN (SELECT id FROM student_enrollment_offerings WHERE mode = 'test');
DELETE FROM student_enrollment_offerings WHERE mode = 'test';
-- COMMIT;
```

Checkout always shows the live-site policy wording:

> Payment in full required. Course fees are non-refundable and student enrollment cannot be moved to another date. If Roseville Dental Academy cancels, students may choose another available course date or a refund.

That line is `INFECTION_CONTROL_CHECKOUT_POLICY` in `lib/academy-policies.ts` (payment note plus
the cancellation summary). The full approved paragraphs are shown on `/enroll` and snapshotted
onto each reservation.

## Business sources and activation review

`lib/live-course-content.ts`, `lib/academy-catalog.ts`, and `lib/site-data.ts` show $395.
The committed schedule lists November 14 and December 5 as the open Infection Control dates.
The public [course page](https://www.rosevilledentalacademy.com/infection-control) and
[policy page](https://www.rosevilledentalacademy.com/cancellation-policy) show the same price,
dates, full-payment requirement, and policy. The course page still says dates may change and
admissions must confirm availability.
`lib/academy-policies.ts` records the September 30 policy approval, full payment, and the
12-student cap. The policy has no discretionary student rescheduling; only academy cancellation
gives the stated transfer/refund options.

Each offering needs a review timestamp, a nonempty review reference, the current policy version
and SHA-256 of the exact policy paragraphs joined by two newlines, and those exact paragraphs
in `policy_text`. Each reservation copies that accepted policy snapshot. The reviewed seed
inserts both dates with `external_seats=0`, `amount=39500`, `capacity=12`, and `enabled=false`.
That zero is a placeholder required by the initial disabled seed, not a confirmed offline
enrollment count or permission to sell 12 seats. Before enabling either date, record its
verified offline count in `external_seats` and its inventory review timestamp and source
in `reviewed_at` / `review_reference`. Reconcile existing online reservations and payments
as well. If the count is unknown, leave that offering disabled. The seed's initial-state
verification does not approve inventory for sale; do not reapply it over later reviewed
inventory. No application API creates or enables offerings.
Apply migrations using the filename-order migrator only against the verified RDA
database after review. `005_student_enrollment.sql` is the shipped schema (repeatable,
zero offerings). Production already has that October 21 copy from the preview.
Go-live applies `006_student_enrollment_review.sql`, which is idempotent
(`CREATE OR REPLACE` / `IF NOT EXISTS`) on a database that already has `005`.
The migrator re-applies every `NNN_*.sql` file in order, so a single run upgrades
`005` then `006`. Then apply
`db/seeds/infection-control-offerings.sql` to insert the two disabled live offerings. Enable
an offering only after the go-live checklist below. On an isolated preview or test database
only, `db/seeds/infection-control-offerings.test.sql` can insert the same two dates as
enabled TEST-mode offerings after
`SET application_name = 'rda-student-offering-seed-isolated'`. Never apply that file to
production. The live-seed `application_name` is not an opt-in for the TEST file.

## Flow and integrity

The student selects an explicitly configured offering, enters name/email/phone, attests to
being at least 18, and accepts the displayed policy. The database saves those details,
the policy hash/version and acceptance time, an opaque browser-owner hash, server price,
date, and Stripe expiry before requesting Checkout. Do not use this adult-only flow for minors.
Card details go directly to hosted Stripe Checkout. No advertising or lead-form conversion
is fired on the enrollment routes. No PII goes into redirect URLs or browser storage.

PostgreSQL locks the offering during allocation. For each date, available seats are
`capacity - external_seats - seat-occupying online enrollments`. The database helper
`student_enrollment_occupies_seat` counts reserved and paid rows, plus refunded rows
whose `inventory_released_at` is still null. A refund alone does not free inventory.
These counts together cannot exceed the 12-student capacity. Duplicate active email enrollments are
blocked. Price, policy and date cannot change after an offering has enrollments. Unknown
provider failures preserve seats; a local clock never frees them. Session idempotency uses
the persisted enrollment ID and an identical body. Lost responses can be recovered by a
bounded provider search, then explicitly expired or verified paid. Missing/ambiguous
provider evidence requires operator reconciliation, never deleting a hold to free capacity.
Delayed payment failures remain held until an operator verifies final closure; this is
deliberately conservative. Review pending holds daily before opening further inventory.
`bindStudentSession` writes a Checkout id only onto `status='reserved'` rows. After a
409 `idempotency_key_in_use` race, checkout does not release the seat just because
recovery is empty. Only Stripe HTTP 409 responses whose error `code` is
`idempotency_key_in_use` count as that conflict. A payment that arrives for an expired
or released row (including an orphan session paid after a timeout) is inserted into
`student_enrollment_reviews` for staff and the webhook acknowledges successfully
instead of returning 503. A second paid orphan session for the same enrollment records
its own review row and still returns 200. A later full refund on that orphan resolves
the matching review as `refunded`.

Signed webhooks retrieve current Stripe truth and validate the merchant, environment,
amount, currency, client reference, expiry, and all binding metadata. Paid outcomes insert
the roster and confirmation outbox atomically; success-page navigation does not fulfill.
The confirmation page requires the original HTTP-only browser cookie and a durable paid
record. It never confirms a payment just because an opaque ID appears in a URL.
Event receipts retain their first observed outcome and bind permanently to the same
enrollment/session. Verified current payment state reconciles monotonically under the
database lock: refunds may advance a paid enrollment; stale paid reads never reverse a
refund. A paid event replayed after refund is acknowledged without another confirmation.

## Secure configuration

Set server-side secrets through the verified RDA deployment's sensitive configuration.
Do not put values in source, command history, screenshots, logs, or public environment variables.
Use separate isolated test and live database/deployment environments. Restricted Stripe keys
are preferred, with only account-read and Checkout create/read/list/expire permissions.

- `DATABASE_URL`: verified environment-specific RDA database.
- `RDA_STUDENT_PAYMENTS_MODE`: unset (disabled), `test`, or `live`.
- `RDA_STUDENT_PAYMENTS_ORIGIN`: exact HTTPS origin; loopback HTTP is accepted for test fixtures only.
- `RDA_STUDENT_STRIPE_ACCOUNT_ID`: verified account ID. Live accepts only `acct_1UJHgLCOhHjREvRz`.
- `RDA_STUDENT_STRIPE_TEST_KEY`, `RDA_STUDENT_STRIPE_TEST_WEBHOOK_SECRET`: test/sandbox configuration.
- `RDA_STUDENT_STRIPE_LIVE_KEY`, `RDA_STUDENT_STRIPE_LIVE_WEBHOOK_SECRET`: live configuration, only after separate approval.
- `RDA_STUDENT_PAYMENTS_LIVE_ENABLED`: defaults off; only exact `true` permits live Checkout.
- `RDA_STUDENT_PAYMENTS_ACCESS`: defaults to `staff`; only exact `public` permits
  anonymous live checkout. In `staff` mode the enrollment page, browser-session
  endpoint and checkout endpoint require the existing valid staff pilot session,
  with the staff origin matching `RDA_STUDENT_PAYMENTS_ORIGIN`. Invalid values fail
  closed. Isolated `test` mode retains its captured, synthetic checkout behavior.
- `RDA_STUDENT_PAYMENTS_PUBLIC_CTA`: defaults off; only exact `true` shows the public
  "Enroll and pay in full" CTA on `/infection-control`, and only when access is
  explicitly `public`. This presentation flag alone does not authorize checkout.
- `RDA_STUDENT_EMAIL_LIVE_ENABLED`: separate default-off outbound-email flag.
- `RDA_STUDENT_EMAIL_API_KEY`, `RDA_STUDENT_EMAIL_FROM`: Resend credential and verified academy sender, only after separate approval.

Stripe account-read verification runs before issuing sessions and accepting payment events.
The Mac mini Chrome dashboard was observed signed in as Roseville Dental Academy at the
expected merchant on October 18. No keys were opened or created. The connected Stripe
plugin's Prism account must not be substituted for RDA.
The existing RDA sandbox was independently verified as `acct_1UJHgaCCgcgk1x8Q`, linked
in Stripe's switcher to the RDA live account. No sandbox webhook destination or product
was configured when inspected. Inline Checkout pricing does not require a catalog product.

Register `/api/student-enrollment/webhook` for `checkout.session.completed`,
`checkout.session.expired`, `checkout.session.async_payment_succeeded`,
`checkout.session.async_payment_failed`, and `charge.refunded` in the matching environment.
Webhook signing secrets and key creation/configuration require the authorized secure handoff.

## Confirmations, roster, refunds, and operations

Test-mode confirmations are captured exclusively in `student_enrollment_mail.captured_body`.
The test branch never calls an email provider, including when a real address is entered.
Live delivery needs both the email flag and the verified sender configuration. Webhook
retries reuse the single outbox row and provider idempotency key. An ambiguous send older
than 12 hours changes to `review` rather than risking a duplicate after the provider's
24-hour deduplication window. The staff roster shows queued/delivery state; `sent` means
provider acceptance, not inbox delivery. Monitor delivery/bounces in the approved mail provider.
Before its first attempt, each outbox row persists the complete sender, recipient, subject,
text and template version. Every attempt sends that stored JSON, including the first.
New live payloads use template version `rda-student-confirmation-v2` and set Resend's
`reply_to` to the academy's public mailbox from `siteContact.email` (currently
`rosevilledentalacademy@gmail.com`). The verified sending domain remains the `from`
address; it does not need to receive replies. Existing stored payloads, including v1
payloads without a reply-to, are never changed or enriched during retries. Test-mode
captures retain v1 and do not add live reply routing.
The database rejects later payload edits; later policy/template/sender changes cannot
silently change a queued confirmation or the bytes sent with its idempotency key. The
text uses the policy accepted by that enrollment rather than the current site's policy.
If an older private test database has no accepted-policy snapshot, do not invent it from
today's text: rebuild the disposable fixture database or reconcile its original acceptance
evidence before attempting delivery. The October 21 preview applied the then-current
`005` to the production database; go-live applies `006` on that same database.

`/enrollment-pilot/roster` requires the existing separate staff password/session configuration.
It shows verified paid/refunded students only, with no public roster API. Staff can retry
a pending confirmation with authenticated same-origin JSON POST `{ "id": "<enrollment UUID>" }`
to `/api/student-enrollment/retry-confirmation`. To drain every paid `pending`/`sending`
outbox row, POST `{ "drain": true }` to the same route. That drain is idempotent and
uses webhook configuration, so it still works while live payments are off. Enable live
email before draining or the rows stay queued. A `review` send requires comparing provider
logs before any deliberate resend; do not reset its status blindly. Keep the pilot staff
origin aligned with the deployed enrollment origin.

The production Vercel cron also calls `GET /api/student-enrollment/confirmation-drain`
every five minutes, authenticated with the existing `CRON_SECRET` bearer token. It
only processes live paid `pending`/`sending` confirmations while live email is enabled;
it keeps working when new payments are disabled. Each run uses the same immutable
payloads, provider idempotency keys, send leases, 12-hour review cutoff, and bounded
100-row / 20-second drain as the staff retry. It never retries `review` rows or sends
test-mode mail. Responses contain counts only; a processing error returns 503 and
eligible rows remain available for the next scheduled run. Check cron failures and
the staff roster for mail requiring review. This five-minute schedule requires the
existing Vercel Pro plan; daily scheduling would exceed the ambiguity review window.

Preparing a verified sender and storing its restricted API key does not require turning
on `RDA_STUDENT_EMAIL_LIVE_ENABLED`. Keep that flag off while the communication hold
applies. Before any future authorized email test, inspect the current live outbox counts,
statuses and stored sender/template information without copying student contact details.
Do not assume historical counts prove the queue is empty. Turning the flag on can send
every eligible paid `pending` / `sending` confirmation on the next cron run, even while
new checkout is off. Do not enable it merely to validate credentials, invoke a retry/drain,
rewrite immutable payloads, or reset `review` rows during a no-email preparation task.

Do not resolve an orphan review by running
`UPDATE student_enrollments SET status='paid'`. That bypasses the seat cap and can
push a class to 13/12. Use the capacity-capped function, which refuses `enrolled`
when reserved + paid + unreleased refunded already fill the offering:

```sql
-- Review the class first, then choose enrolled, dismissed, or refunded.
SELECT o.course_date, o.capacity, o.external_seats,
  (SELECT count(*) FROM student_enrollments e
    WHERE e.offering_id=o.id AND student_enrollment_occupies_seat(e.status,e.inventory_released_at)) AS counted
FROM student_enrollment_offerings o
JOIN student_enrollments e ON e.offering_id=o.id
WHERE e.id = '<enrollment uuid>';
SELECT resolve_student_enrollment_review(
  '<enrollment uuid>'::uuid,
  '<cs_... session id>',
  'enrolled',  -- or 'dismissed' or 'refunded'
  'staff@rosevilledentalacademy.com'
);
```

`enrolled` converts that expired row to paid only when a seat remains. A full class
raises `Class is full` and leaves the review open. Refund the charge or dismiss after
staff review instead. `refunded` and `dismissed` only close the review; they do not
change inventory. The fourth argument is the staff actor and is written onto the
review and a `student_enrollment_events` row.

Refunded enrollments still occupy a seat until staff run the audited release:

```sql
SELECT release_refunded_student_seat(
  '<enrollment uuid>'::uuid,
  'staff@rosevilledentalacademy.com'
);
```

That function refuses non-refunded rows, records the actor on the enrollment, and
inserts a `released` event. Do not `UPDATE` inventory by hand.

This code never initiates a refund or accepts a refund request. Follow the approved policy:
student cancellations remain non-refundable, with no discretionary date transfer. For an
academy-cancelled course, obtain the student's choice and operator authorization before
performing any refund through the verified merchant dashboard. Retrieved charge evidence
records full and partial refunded amounts; a full refund changes the roster to `refunded`.
Refunds do not automatically release or resell seats. Staff must reconcile the offering
and existing enrollments explicitly. There is no transfer endpoint.

Treat roster/contact data as private student records: limit database and staff-password
access, rotate access on staff changes, use the academy's approved retention schedule,
and handle correction/deletion requests through the academy. Browser access lasts seven
days; loss of the cookie requires staff assistance using the enrollment reference.

## Reproducible local proof and preview

Use Node 24 and pnpm 10.34.5. Build with `pnpm build` (or `pnpm build --webpack` on hosts
that block Turbopack worker ports), then run `pnpm test:student-enrollment`.
CI also runs `pnpm test:student-enrollment-locks` against a `postgres:17` service so a
missing `FOR UPDATE` or dropped `refunded` inventory count fails; PGlite cannot see that
race. Restore the source pins for `AND mode=p_mode FOR UPDATE` and
`charge.refunded === true && charge.amount_refunded === held.amount` if that job is skipped.
The runner sanitizes inherited payment variables, starts real Next handlers with isolated
PGlite and mocked Stripe HTTP, permits loopback only, and blocks all other server egress.
The fixtures seed fictional adult enrollments against the confirmed November 14 and
December 5, 2026 inventory (12 seats, 0 offline, 39500 USD). They never enable live
payments or outbound email.
It runs both the existing pilot and new student suites. Evidence is saved under
`dogfood-output/student-enrollment/` and responsive screenshots under `test-results/`.
`pnpm preview:student-enrollment` serves the synthetic UI at `http://127.0.0.1:3117/enroll`.
These two commands must only run locally, never as a deployed start command.
The mail transport suite also exercises the live-delivery code path inside a hermetic
test process with fake configuration, an isolated PostgreSQL engine, and a fetch handler
that blocks every non-fixture request. It simulates provider acceptance followed by a
timeout, temporary errors, concurrent claims, retry leases and the manual-review cutoff.
It never uses real mail credentials, sends external email, or enables a deployment flag.

Fixture proof is not an actual Stripe test-mode transaction.

## Go-live checklist

Complete these steps in order. Live payments and live email stay off until their flags
are set after the test-mode purchase. Do not put keys in chat, tickets, screenshots, or
the repository.

This is a future execution checklist, not permission to perform its charges, refunds or
email sends. The October 29 preparation task prohibits all charges, emails and texts,
including test messages. Sender/DNS verification, secure credential configuration and
isolated capture-only checks can be prepared while all live gates stay off. Obtain the
owner's separate authorization for the actual live payment and email test before the
activation steps below.

1. Collect test-mode Stripe keys and the webhook signing secret through the academy's
   secure form. Configure them only on the isolated test deployment and test database.
2. Apply `005_student_enrollment.sql` then `006_student_enrollment_review.sql`
   on the isolated test database (or run the filename-order migrator). Then set
   `application_name = 'rda-student-offering-seed-isolated'` and apply
   `db/seeds/infection-control-offerings.test.sql` (mode=`test`, `enabled=true`).
   Confirm the two dates, `amount=39500`, `capacity=12`, `external_seats=0`. Never
   apply that TEST seed to production. The live-seed name
   `rda-student-offering-seed` is not accepted by the TEST file.
3. Activate test mode (`RDA_STUDENT_PAYMENTS_MODE=test` plus matching test origin,
   account, key, and webhook secret). Leave
   `RDA_STUDENT_PAYMENTS_LIVE_ENABLED` and `RDA_STUDENT_EMAIL_LIVE_ENABLED` unset.
4. Complete a Stripe test-card purchase (`4242 4242 4242 4242`, any future expiry and
   CVC) for one date. Confirm the paid roster row, captured confirmation, and $395 charge
   in the RDA test merchant.
5. Abandon a second checkout and reconcile it. The unpaid seat must return to inventory
   only after Stripe reports expired + unpaid.
6. Seat-cap test: hold or pay 12 seats on one date and confirm the 13th is blocked. The
   other date must remain purchasable.
7. After test-mode sign-off, configure live keys through the same secure form on the
   live environment. Do not reuse test secrets.
8. **Run the migrator** on production with live payments off
   (`RDA_STUDENT_PAYMENTS_LIVE_ENABLED` unset). The October 21
   preview already applied the then-current `005` to the production database.
   The filename-order migrator re-applies every `NNN_*.sql` in one transaction,
   including idempotent `006` (`CREATE OR REPLACE` / `IF NOT EXISTS`) on that
   schema: it widens review reasons, replaces `flag_student_enrollment_review` /
   `resolve_student_enrollment_review`, binds the paying Checkout session on
   enroll, and excludes the reviewed row from the capacity count. Then set
   `application_name = 'rda-student-offering-seed'` and apply
   `db/seeds/infection-control-offerings.sql` (`mode=live`, `enabled=false`). The
   post-seed verify must succeed. Keep both offerings disabled while offline counts are
   unknown. Obtain a current academy-confirmed offline count for each date and record
   the count, review timestamp and evidence reference. Account for every seat-occupying
   online row before enabling a date; `external_seats=0` in the disabled seed is not
   evidence of zero offline enrollment.
9. **Only for a separately authorized live payment/email test**, confirm the verified
   sender and restricted email key are configured and audit the current outbox first,
   including any paid `pending` / `sending` rows that the cron could send. Resolve any
   delivery requiring review from provider evidence before enabling email; never reset
   or rewrite an old payload blindly. Then set live mode and
   `RDA_STUDENT_PAYMENTS_LIVE_ENABLED=true` on the live environment so `/enroll` can
   take a charge. Enable only an offering whose offline count and total inventory were
   just verified. **Before the authorized live purchase**, enable
   `RDA_STUDENT_EMAIL_LIVE_ENABLED=true`. A paid live webhook
   still records the seat if mail is off or the provider fails; confirmation stays
   queued. Drain those rows with staff POST `{ "drain": true }` to
   `/api/student-enrollment/retry-confirmation` after email is enabled. The drain
   works while live payments are off.
   **Keep `RDA_STUDENT_PAYMENTS_ACCESS=staff` and leave
   `RDA_STUDENT_PAYMENTS_PUBLIC_CTA` unset.** Sign in through the existing
   `/enrollment-pilot` staff login, then visit `/enroll` in that browser. Verify the
   configured staff origin matches the live origin. Anonymous browsers must see
   closed enrollment, and both session creation and checkout must reject them.
   The authorized staff browser shows `STAFF VERIFICATION · REAL PAYMENT`.
   This access gate does not authorize any payment or email by itself: the owner's
   separate test permission, reviewed inventory and email-queue review still apply.
10. Make one **$395** verification purchase on `/enroll` using a **staff-owned**
    email address (not a student). Confirm the paid roster row and confirmation
    email, then refund that charge from the verified merchant dashboard. Refunded
    rows still occupy a seat. Reconcile inventory only with:

    ```sql
    SELECT release_refunded_student_seat(
      '<verification enrollment uuid>'::uuid,
      'staff@rosevilledentalacademy.com'
    );
    ```

    Confirm the sellable count equals that date's reviewed capacity minus confirmed
    offline seats and all remaining seat-occupying online enrollments. Do not assume
    12 seats remain. Confirm the verification enrollment no longer occupies a seat.
    Keep access restricted to staff throughout this test. Expired or invalid staff
    sessions cannot start a new checkout. Existing signed webhook reconciliation
    and the student's browser-owned confirmation remain separate from this gate.
11. Only after that verification purchase is refunded and
    `release_refunded_student_seat` has recorded the actor and `released` event,
    set `RDA_STUDENT_PAYMENTS_ACCESS=public` and
    `RDA_STUDENT_PAYMENTS_PUBLIC_CTA=true`, then redeploy so public checkout and
    the Enroll CTA on `/infection-control` open together. Read back the live
    deployment and its inventory; neither setting alone replaces launch approval.
12. If an orphan `paid_after_release` review needs to become a paid seat, use
    `resolve_student_enrollment_review(..., 'enrolled', '<staff actor>')`. Do not
    raw-`UPDATE` the enrollment to `paid`. The function refuses when the class is
    already full and writes the actor onto the review and events row.

## Rollback

If live Checkout must be taken down after step 9 and before or after the
verification purchase:

1. Set `RDA_STUDENT_PAYMENTS_ACCESS=staff` and unset
   `RDA_STUDENT_PAYMENTS_PUBLIC_CTA` so anonymous session/checkout requests stop
   and the public CTA stays hidden, then redeploy. This does not cancel an already
   issued Stripe session; reconcile existing sessions and payments normally.
2. Refund any verification charge from the merchant dashboard first, then run
   `release_refunded_student_seat` so the seat is sellable again. Never
   `DELETE` from `student_enrollments` to free capacity. Do this before the
   live-payments kill switch so the refund webhook can land while Checkout is
   still configured. If the kill switch was already flipped, the webhook still
   records a paid `checkout.session.completed` or `async_payment_succeeded` for
   a row already bound to that session, still accepts `charge.refunded` (and a
   fully refunded Checkout session), and still queues paid confirmations even
   when live email is off. Unbound or unverifiable paid completions return 503
   so Stripe retries; never ACK those as ignored.
3. Leave `RDA_STUDENT_EMAIL_LIVE_ENABLED` on until every paid confirmation has
   left `pending`/`sending`, then unset it. Later webhooks still record refunds
   and other state changes while mail is disabled; they queue the outbox
   instead of returning 503. If email was already off, turn it back on and POST
   `{ "drain": true }` to `/api/student-enrollment/retry-confirmation` (staff
   session, same origin). The drain works while live payments are off and is
   safe to repeat.
4. Set `RDA_STUDENT_PAYMENTS_LIVE_ENABLED` back to anything except `true` and
   disable the two live offerings (`enabled=false`). `/enroll` then fail-closes.
   New Checkout sessions stop. Do not delete offerings that already have
   enrollments.
5. Check Stripe Dashboard → Developers → Webhooks → the student enrollment
   endpoint → failed deliveries. Unbound or expired-unbound paid completions
   while payments are off return 503 so Stripe retries for about three days.
   Dashboard resend only works within 15 days of event creation (Stripe CLI:
   30 days). After that window the event is unrecoverable from Stripe; look
   the charge up in the merchant dashboard and reconcile from the staff
   roster, or run `resolve_student_enrollment_review` for a flagged row. Do
   not copy event payloads or customer data into tickets.
6. Do not drop `005` or `006` objects from production as a rollback. Re-apply
   both files (or run the migrator) after review if functions are missing. The
   staff roster uses webhook
   configuration, so `session_mismatch` and `paid_after_release` reviews stay
   visible while live payments are off. Do not treat them as verified seats.
   `resolve_student_enrollment_review(..., 'enrolled', ...)` binds the
   Checkout session that actually paid before a later refund can land.

Launch remains blocked until that checklist is finished. No real charges, refunds, student
emails, bank changes, or credential creation are part of this development release. This
branch does not replace the separate staff pilot documented in `docs/enrollment-pilot.md`.
