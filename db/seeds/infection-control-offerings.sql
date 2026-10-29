-- Reviewed Infection Control inventory for student checkout.
-- Not applied by the filename-order migrator. Apply only to the verified RDA
-- database after reading docs/student-payments.md. Offerings stay disabled;
-- live payments and live email remain off until their separate flags are set.
-- Dates/price/capacity checked Oct 21 2026: Nov 14 and Dec 5, 12 each, $395.
-- Offline counts remain UNKNOWN (owner confirmation Oct 28). external_seats=0
-- below is an initial disabled-seed placeholder, NOT evidence of zero enrollment.
-- Keep both live offerings disabled until each date's actual offline count and
-- seat-occupying online rows are reconciled, with a current review reference.
--
-- policy_hash must remain the SHA-256 of policy_text (the approved paragraphs
-- joined by two newlines). Recompute the hash if academy-policies.ts changes.
--
-- Guard: SET application_name = 'rda-student-offering-seed' first. ON CONFLICT
-- DO NOTHING keeps unexpected existing rows, so the verify block below must pass.
-- The whole file runs in one transaction so a failed verify rolls back any
-- newly inserted date (including Dec 5).

BEGIN;

DO $guard$
BEGIN
  IF current_setting('application_name', true) IS DISTINCT FROM 'rda-student-offering-seed' THEN
    RAISE EXCEPTION 'Refusing to seed student offerings. SET application_name = ''rda-student-offering-seed'' only on an isolated reviewed database. Never run this file against production casually.';
  END IF;
END
$guard$;

INSERT INTO student_enrollment_offerings (
  id,
  mode,
  course_id,
  course_date,
  amount,
  currency,
  capacity,
  external_seats,
  policy_version,
  policy_hash,
  policy_text,
  reviewed_at,
  review_reference,
  enabled
) VALUES
  (
    'a1111111-1111-4111-8111-202611140001',
    'live',
    'infection-control',
    '2026-11-14',
    39500,
    'usd',
    12,
    0,
    '2026-09-30',
    'af24daa14cf51c382bcdc9cb567f2b4de29886ccd4d980d62ca1a46ee7fd53ae',
    $policy$All course fees are non-refundable once payment has been made, except if Roseville Dental Academy cancels the course as described below.

No refunds will be issued for cancellations, withdrawals, missed classes, failure to attend, scheduling conflicts, or failure to complete course requirements. If the student is unable to attend, their seat goes unused and their enrollment cannot be moved to another course date.

Course fees may not be transferred to another individual without prior written approval from Roseville Dental Academy.

If Roseville Dental Academy cancels a course, students will be offered the option to transfer to another available course date or receive a refund of the course fees paid.

By submitting payment, the student confirms that they have read, understood, and accepted this Cancellation and Refund Policy.$policy$,
    timestamptz '2026-10-21 00:00:00-07',
    'Dates/price/capacity checked Oct 21 2026; offline enrollment UNKNOWN: zero is a disabled-seed placeholder; inventory review required before activation',
    false
  ),
  (
    'a2222222-2222-4222-8222-202612050001',
    'live',
    'infection-control',
    '2026-12-05',
    39500,
    'usd',
    12,
    0,
    '2026-09-30',
    'af24daa14cf51c382bcdc9cb567f2b4de29886ccd4d980d62ca1a46ee7fd53ae',
    $policy$All course fees are non-refundable once payment has been made, except if Roseville Dental Academy cancels the course as described below.

No refunds will be issued for cancellations, withdrawals, missed classes, failure to attend, scheduling conflicts, or failure to complete course requirements. If the student is unable to attend, their seat goes unused and their enrollment cannot be moved to another course date.

Course fees may not be transferred to another individual without prior written approval from Roseville Dental Academy.

If Roseville Dental Academy cancels a course, students will be offered the option to transfer to another available course date or receive a refund of the course fees paid.

By submitting payment, the student confirms that they have read, understood, and accepted this Cancellation and Refund Policy.$policy$,
    timestamptz '2026-10-21 00:00:00-07',
    'Dates/price/capacity checked Oct 21 2026; offline enrollment UNKNOWN: zero is a disabled-seed placeholder; inventory review required before activation',
    false
  )
ON CONFLICT (mode, course_id, course_date) DO NOTHING;

DO $verify$
DECLARE n integer;
BEGIN
  SELECT count(*) INTO n FROM student_enrollment_offerings
    WHERE mode='live' AND course_id='infection-control';
  IF n <> 2 THEN
    RAISE EXCEPTION 'Live offering seed verify failed: expected 2 rows, found %', n;
  END IF;
  IF EXISTS (
    SELECT 1 FROM student_enrollment_offerings
    WHERE mode='live' AND course_id='infection-control'
      AND NOT (
        (course_date = DATE '2026-11-14' AND amount=39500 AND capacity=12 AND external_seats=0 AND enabled=false
          AND policy_hash='af24daa14cf51c382bcdc9cb567f2b4de29886ccd4d980d62ca1a46ee7fd53ae')
        OR (course_date = DATE '2026-12-05' AND amount=39500 AND capacity=12 AND external_seats=0 AND enabled=false
          AND policy_hash='af24daa14cf51c382bcdc9cb567f2b4de29886ccd4d980d62ca1a46ee7fd53ae')
      )
  ) THEN
    RAISE EXCEPTION 'Live offering seed verify failed: stale or unexpected rows remain';
  END IF;
END
$verify$;

COMMIT;
