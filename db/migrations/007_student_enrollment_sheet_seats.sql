-- Additive. Safe on a database that already applied 005 then 006.
-- Stores the raw seats-sheet count next to the clamped external_seats copy
-- so an older lower read is compared against the sheet, not the clamp.
-- Nullable on existing rows; checkout writes it on the next sheet copy.
-- Losing reads use COALESCE(sheet_seats, external_seats).
SET lock_timeout = '5s';
BEGIN;
ALTER TABLE student_enrollment_offerings
  ADD COLUMN IF NOT EXISTS sheet_seats integer;
DO $sheet_seats_check$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'student_enrollment_offerings'::regclass
      AND conname = 'student_enrollment_offerings_sheet_seats_check'
  ) THEN
    ALTER TABLE student_enrollment_offerings
      ADD CONSTRAINT student_enrollment_offerings_sheet_seats_check
      CHECK (sheet_seats IS NULL OR sheet_seats BETWEEN 0 AND 12);
  END IF;
END
$sheet_seats_check$;
COMMIT;
