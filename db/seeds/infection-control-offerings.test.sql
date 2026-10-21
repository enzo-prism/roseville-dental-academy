-- Isolated TEST-mode Infection Control inventory for student checkout.
-- NEVER apply this file to production or any live database without the
-- explicit live-data opt-in. Use only on an isolated preview/test database
-- after reading docs/student-payments.md. Live payments and live email remain
-- off until their separate flags are set. Production uses
-- db/seeds/infection-control-offerings.sql (mode=live, enabled=false).
-- Confirmed Oct 21 2026: Nov 14 and Dec 5, 12 seats each, 0 offline, $395.
--
-- policy_hash must remain the SHA-256 of policy_text (the approved paragraphs
-- joined by two newlines). Recompute the hash if academy-policies.ts changes.
--
-- Guard: SET application_name = 'rda-student-offering-seed-isolated' first.
-- That name is distinct from the live seed on purpose. If this database
-- already has mode='live' offerings or enrollments, also require the
-- explicit opt-in application_name = 'rda-student-offering-seed-on-live-data'.
-- Never apply this file to production without that opt-in.
-- ON CONFLICT DO NOTHING keeps unexpected existing rows, so the verify
-- block below must pass. The whole file runs in one transaction so a
-- failed verify rolls back any newly inserted date (including Dec 5).

BEGIN;

DO $guard$
BEGIN
  IF current_setting('application_name', true) NOT IN (
    'rda-student-offering-seed-isolated',
    'rda-student-offering-seed-on-live-data'
  ) THEN
    RAISE EXCEPTION 'Refusing to seed TEST student offerings. SET application_name = ''rda-student-offering-seed-isolated'' only on an isolated preview/test database. The live-seed name is not enough. To run against a database that already has live data, SET application_name = ''rda-student-offering-seed-on-live-data'' as an explicit opt-in. Never production.';
  END IF;
  IF EXISTS (SELECT 1 FROM student_enrollment_offerings WHERE mode='live')
    OR EXISTS (
      SELECT 1 FROM student_enrollments e
      JOIN student_enrollment_offerings o ON o.id=e.offering_id
      WHERE o.mode='live'
    )
  THEN
    IF current_setting('application_name', true) IS DISTINCT FROM 'rda-student-offering-seed-on-live-data' THEN
      RAISE EXCEPTION 'Refusing to seed TEST student offerings against live/prod data. SET application_name = ''rda-student-offering-seed-on-live-data'' only as an explicit opt-in.';
    END IF;
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
    'b1111111-1111-4111-8111-202611140001',
    'test',
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
    'TEST only, isolated preview/test database. Confirmed Oct 21 2026: November 14 and December 5, 12 seats each, 0 offline, 39500 USD. Never production.',
    true
  ),
  (
    'b2222222-2222-4222-8222-202612050001',
    'test',
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
    'TEST only, isolated preview/test database. Confirmed Oct 21 2026: November 14 and December 5, 12 seats each, 0 offline, 39500 USD. Never production.',
    true
  )
ON CONFLICT (mode, course_id, course_date) DO NOTHING;

DO $verify$
DECLARE n integer;
BEGIN
  SELECT count(*) INTO n FROM student_enrollment_offerings
    WHERE mode='test' AND course_id='infection-control'
      AND course_date IN (DATE '2026-11-14', DATE '2026-12-05');
  IF n <> 2 THEN
    RAISE EXCEPTION 'TEST offering seed verify failed: expected the two confirmed dates, found %', n;
  END IF;
  IF EXISTS (
    SELECT 1 FROM student_enrollment_offerings
    WHERE mode='test' AND course_id='infection-control'
      AND course_date IN (DATE '2026-11-14', DATE '2026-12-05')
      AND NOT (
        amount=39500 AND capacity=12 AND external_seats=0 AND enabled=true
        AND policy_hash='af24daa14cf51c382bcdc9cb567f2b4de29886ccd4d980d62ca1a46ee7fd53ae'
      )
  ) THEN
    RAISE EXCEPTION 'TEST offering seed verify failed: stale or unexpected rows remain';
  END IF;
END
$verify$;

COMMIT;
