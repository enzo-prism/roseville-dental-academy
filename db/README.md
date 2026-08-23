# RDA private attribution ledger

This schema stores only pseudonymous CRM identity, cryptographic contact hashes, ad touchpoints,
reviewed lead-to-enrollment links, delivery totals, and postback state. It does not store names,
raw email/phone values, PMS chart numbers, health information, notes, or raw email-report fields.

Apply migrations only to the verified RDA database, in filename order. The first migration is
idempotent for clean provisioning. Production provisioning and migration are release actions and
must be reviewed separately from a local build.

Run `pnpm test:attribution-db` before release. It executes the full migration in an isolated
in-memory PostgreSQL runtime with pgcrypto, proves the aggregate funnel does not duplicate spend or
students, and verifies the consent, chronology, and immutable-touch triggers.

The immutable lead identity is `form_id:submission_id`. Browser `lead_event_id` receipts remain
pending until the existing authenticated Formspree/Sheet reconciliation supplies that canonical
identity through the protected sync API.

The browser first requests a ten-minute HMAC-signed receipt token bound to the Formspree form and
browser lead event. Token issuance is persisted and rate-limited in Postgres using a keyed,
non-reversible request bucket. Consumption is replay-safe only for the same normalized payload; a
changed replay fails closed. Token or ledger downtime never changes an accepted Formspree lead into
a form error.

Browser receipts and touchpoints retain attribution identifiers for 180 days. Contact hashes use a
730-day retention marker so lead-to-student reconciliation can cover the academy's longer enrollment
cycle. `purgeExpiredAttributionData` removes expired touchpoint payloads, then their receipt headers,
and clears expired contact hashes. The canonical `form_id:submission_id` lead remains the durable
idempotency identity. Operators must run the purge from the private scheduled workflow and review
aggregate counts after it completes.
When analytics consent is false, the parser strips UTMs, referrer, GA IDs, anonymous ID, and session
ID; when marketing consent is false, it strips click IDs and ad dimensions. The query-free landing
path and event-local touch ID remain as essential reconciliation metadata.

Postbacks have three independent launch gates: `RDA_PLATFORM_POSTBACKS_ENABLED=true`,
`RDA_POSTBACK_VALIDATE_ONLY=false` for real sends, and an explicit reviewed policy version in
`RDA_POSTBACK_CONSENT_POLICY_VERSIONS`. No policy version is approved by default. Provider milestone
maps fail closed; duplicate provider event names are rejected, and Google permits only one milestone
because this integration targets one conversion action. The default Meta `qualified_lead` -> `Lead`
mapping uses browser `lead_event_id` for Pixel/CAPI deduplication. Legal and platform-policy review
must choose outcome milestones and policy versions before the global gate changes.

The sync endpoints apply each request as one database transaction. A bad lead/contact/chronology link,
an identity conflict, or a validation whose SHA-256 proof does not match the verified touchpoint rolls
back the entire batch. Platform validation records include provider/export provenance and never turn an
unverified click ID into Tier A evidence.

Postback workers claim jobs with a five-minute lease. Provider HTTP success alone is not enough: Meta
and TikTok must acknowledge the event, Google must return a request ID, and Google `validateOnly`
responses remain `validated` rather than `accepted`. Requests use fixed official provider endpoints,
ten-second timeouts, and at most eight attempts. Google obtains short-lived access tokens from a durable
OAuth refresh credential; static access tokens are intentionally unsupported.

Vercel cron invokes the disabled-by-default postback worker at 16:15 UTC and retention at 16:45 UTC.
Retention is anchored to each accepted/captured timestamp (180 days), not import time; contact hashes
extend from the latest linked lead/conversion timestamp (730 days). Health output reports the
canonical source window separately from the retained-evidence window and coverage.
