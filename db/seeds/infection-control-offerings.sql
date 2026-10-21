-- Reviewed Infection Control inventory for student checkout.
-- Not applied by the filename-order migrator. Apply only to the verified RDA
-- database after reading docs/student-payments.md. Offerings stay disabled;
-- live payments and live email remain off until their separate flags are set.
-- Confirmed Oct 21 2026: Nov 14 and Dec 5, 12 seats each, 0 offline, $395.
--
-- policy_hash must remain the SHA-256 of policy_text (the approved paragraphs
-- joined by two newlines). Recompute the hash if academy-policies.ts changes.

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
    'Confirmed Oct 21 2026: November 14 and December 5, 12 seats each, 0 offline, 39500 USD',
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
    'Confirmed Oct 21 2026: November 14 and December 5, 12 seats each, 0 offline, 39500 USD',
    false
  )
ON CONFLICT (mode, course_id, course_date) DO NOTHING;
