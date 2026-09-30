# Student and alumni job board

`/student-jobs` is a server-gated, non-indexable board. No private postings are rendered in HTML or RSC without a valid session. It starts with an honest empty state: no approved jobs have been supplied.

## Deployment configuration

Set server-only variables (never prefix with `NEXT_PUBLIC_`):

- `RDA_STUDENT_JOBS_PASSWORD`: a randomly generated academy access password of at least 20 characters.
- `RDA_STUDENT_JOBS_SESSION_SECRET`: a separate random secret of at least 32 characters.
- `DATABASE_URL`: existing Neon/Postgres connection for the durable rate limiter.

Missing or invalid secrets disable access. Production login fails closed if the database/table is unavailable. HTTPS is required; cookies always use `Secure`, `HttpOnly`, `SameSite=Strict`, the `__Host-` prefix, and root path. Sessions last eight hours; changing either password or signing secret revokes all previous sessions. Give the password to approved students/alumni through the academy's established private channel. This shared-password board is not an individual student identity system.

Before enabling login, run this idempotent SQL migration with the database administrator:

```sql
CREATE TABLE IF NOT EXISTS rda_student_jobs_rate_limits (
  bucket_hash text NOT NULL,
  window_start timestamptz NOT NULL,
  request_count integer NOT NULL CHECK (request_count > 0),
  PRIMARY KEY (bucket_hash, window_start)
);
```

The atomic database limiter allows ten login attempts per trusted Vercel client IP and 100 across all clients per fixed 15-minute window. Rotating IPs cannot bypass the global budget. IPs are HMAC-hashed using the session secret; plaintext addresses/passwords are not stored. The global cap may temporarily deny legitimate users during an attack; the academy contact route remains available. Local development without a database uses a process-local limiter exclusively; it is never permitted in production. Non-Vercel hosts fall back to one shared bucket unless adapted to their trusted proxy configuration. Apply a hosting WAF rule for `/api/student-jobs/login` if heavier abuse needs to be filtered at the edge.

The daily Vercel cron calls `/api/student-jobs/retention`, authorized by the existing `CRON_SECRET` bearer token using timing-safe comparison. It performs only the following board-table cleanup, returns a row count, and does not expose database errors:

```sql
DELETE FROM rda_student_jobs_rate_limits WHERE window_start < now() - interval '1 day';
```

## Maintaining postings

Edit `data/student-jobs.json`, an array with at most 100 approved postings. Each entry requires exactly these string fields: `id` (unique lowercase letters/numbers/hyphens), `title`, `employer`, `location`, `summary`, `applyUrl`, `publishedOn`, `expiresOn`. Links must be credential-free HTTPS URLs. HTML markup/control characters are rejected; text is rendered as escaped plain text. Dates must be real `YYYY-MM-DD` calendar dates and expiry must be on/after publication.

Only postings whose publication date has arrived and whose expiry date has not passed are displayed, using the academy's America/Los_Angeles calendar day. An invalid data file displays a generic unavailable state to authenticated users, without partially publishing unvalidated entries. Expired/future jobs never appear in the page payload. Keep employer claims, contact details, and application destinations verified before publishing. No public API or download endpoint exposes the dataset.

## Verification

Run `pnpm exec playwright test tests/student-jobs.spec.ts` with the job-board server variables configured. Authenticated HTTP checks require `RDA_STUDENT_JOBS_TEST_PASSWORD` in the test process matching the server password; otherwise they skip explicitly. These tests never print passwords. Production must have the SQL migration applied. Browser checks cover mobile layout, keyboard labels, unauthorized HTML and RSC, fixed redirect, logout, cookie attributes, generic errors, signatures, expiry/revocation, and posting/link validation.
