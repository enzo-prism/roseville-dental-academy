# Infection Control student payments — development release

Live payments are **disabled by default**. This release adds a separate student enrollment
path at `/enroll`; it does not turn the staff-only pilot into a live ledger. No Stripe
credential or email sender is created by the schema migration. The public Infection Control
page adds an enrollment link only when valid live configuration and the explicit live flag
are present. Existing inquiry forms remain available.

## Confirmed sellable sessions

Confirmed October 21, 2026 against the live `/infection-control` page:

| Course date | ISO date | Price | Capacity | Offline seats already taken |
| --- | --- | --- | --- | --- |
| November 14, 2026 | `2026-11-14` | $395 (39500 cents, USD) | 12 | 0 |
| December 5, 2026 | `2026-12-05` | $395 (39500 cents, USD) | 12 | 0 |

Payment is in full. No other Infection Control date is sellable. November 7 was removed from
the public schedule earlier and must not be seeded or offered at checkout.

Canonical config: `lib/student-enrollment-offerings.ts`.
Reviewed insert (disabled offerings only): `db/seeds/infection-control-offerings.sql`.
Schema only, zero offerings: `db/migrations/005_student_enrollment.sql`.

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
No application API creates or enables offerings.
Apply migration `005_student_enrollment.sql` using the filename-order migrator only against
the verified RDA database after review. It is repeatable and seeds zero offerings. Then apply
`db/seeds/infection-control-offerings.sql` to insert the two disabled live offerings. Enable
an offering only after the go-live checklist below.

## Flow and integrity

The student selects an explicitly configured offering, enters name/email/phone, attests to
being at least 18, and accepts the displayed policy. The database saves those details,
the policy hash/version and acceptance time, an opaque browser-owner hash, server price,
date, and Stripe expiry before requesting Checkout. Do not use this adult-only flow for minors.
Card details go directly to hosted Stripe Checkout. No advertising or lead-form conversion
is fired on the enrollment routes. No PII goes into redirect URLs or browser storage.

PostgreSQL locks the offering during allocation. Existing external seats plus reserved,
paid, and refunded enrollments cannot exceed 12. Duplicate active email enrollments are
blocked. Price, policy and date cannot change after an offering has enrollments. Unknown
provider failures preserve seats; a local clock never frees them. Session idempotency uses
the persisted enrollment ID and an identical body. Lost responses can be recovered by a
bounded provider search, then explicitly expired or verified paid. Missing/ambiguous
provider evidence requires operator reconciliation, never deleting a hold to free capacity.
Delayed payment failures remain held until an operator verifies final closure; this is
deliberately conservative. Review pending holds daily before opening further inventory.

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
The database rejects later payload edits; later policy/template/sender changes cannot
silently change a queued confirmation or the bytes sent with its idempotency key. The
text uses the policy accepted by that enrollment rather than the current site's policy.
If an older private test database has no accepted-policy snapshot, do not invent it from
today's text: rebuild the disposable fixture database or reconcile its original acceptance
evidence before attempting delivery. No production database has been migrated by this task.

`/enrollment-pilot/roster` requires the existing separate staff password/session configuration.
It shows verified paid/refunded students only, with no public roster API. Staff can retry
a pending confirmation with authenticated same-origin JSON POST `{ "id": "<enrollment UUID>" }`
to `/api/student-enrollment/retry-confirmation`. A `review` send requires comparing provider
logs before any deliberate resend; do not reset its status blindly. Keep the pilot staff
origin aligned with the deployed enrollment origin.

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

1. Collect test-mode Stripe keys and the webhook signing secret through the academy's
   secure form. Configure them only on the isolated test deployment and test database.
2. Apply `005_student_enrollment.sql`, then `db/seeds/infection-control-offerings.sql`.
   Confirm the two dates, `amount=39500`, `capacity=12`, `external_seats=0`, and
   `enabled=false`.
3. Activate test mode (`RDA_STUDENT_PAYMENTS_MODE=test` plus matching test origin,
   account, key, and webhook secret). Enable the two test offerings. Leave
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
8. Make one small real purchase, confirm the roster and confirmation email, then refund
   that charge from the verified merchant dashboard and mark the seat reconciled.
9. Only then enable the public Enroll CTA by setting `RDA_STUDENT_PAYMENTS_LIVE_ENABLED=true`
   and enabling the two live offerings. Outbound student email is a separate flag.

Launch remains blocked until that checklist is finished. No real charges, refunds, student
emails, bank changes, or credential creation are part of this development release. This
branch does not replace the separate staff pilot documented in `docs/enrollment-pilot.md`.
