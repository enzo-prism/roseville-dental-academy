-- Opens the student checkout schema to every Roseville Dental Academy course.
-- Seeds no offerings. Each course keeps one fixed, reviewed price (cents, USD)
-- mirrored in lib/student-course-catalog.ts; a test there pins both copies.
-- Live offerings still need a reviewed row with enabled=true before they sell.
BEGIN;
DO $all_courses$
DECLARE c record;
BEGIN
  FOR c IN
    SELECT conname FROM pg_constraint
    WHERE conrelid='student_enrollment_offerings'::regclass AND contype='c'
      AND (pg_get_constraintdef(oid) ILIKE '%course_id = ''infection-control''::text)%'
        OR pg_get_constraintdef(oid) ~* '^CHECK \(\(amount = 39500\)\)$'
        OR pg_get_constraintdef(oid) ~* '^CHECK \(\(capacity = 12\)\)$'
        OR pg_get_constraintdef(oid) ILIKE '%external_seats >= 0%external_seats <= 12%')
      AND conname <> 'student_enrollment_offerings_course_price'
  LOOP
    EXECUTE format('ALTER TABLE student_enrollment_offerings DROP CONSTRAINT %I', c.conname);
  END LOOP;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='student_enrollment_offerings'::regclass
      AND conname='student_enrollment_offerings_course_price') THEN
    -- Literal prices on purpose: 005 re-adds amount=39500 unless a constraint
    -- containing "amount ... 39500" already exists.
    ALTER TABLE student_enrollment_offerings ADD CONSTRAINT student_enrollment_offerings_course_price CHECK (
      (course_id = 'infection-control' AND amount = 39500)
      OR (course_id = 'bls-cpr-1' AND amount = 8500)
      OR (course_id = 'radiation-safety' AND amount = 69500)
      OR (course_id = 'coronal-polish' AND amount = 50000)
      OR (course_id = 'sealants' AND amount = 55000)
      OR (course_id = 'dental-assisting-program' AND amount = 250000)
      OR (course_id = 'dental-front-desk-program' AND amount = 249500));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='student_enrollment_offerings'::regclass
      AND conname='student_enrollment_offerings_seats') THEN
    ALTER TABLE student_enrollment_offerings ADD CONSTRAINT student_enrollment_offerings_seats CHECK (
      capacity BETWEEN 1 AND 40 AND external_seats BETWEEN 0 AND capacity);
  END IF;
END
$all_courses$;

-- Same as 005 without the two-date live allowlist. A live offering sells only
-- when staff enabled its reviewed row; the price CHECK above pins its amount.
CREATE OR REPLACE FUNCTION reserve_student_enrollment(p_id uuid,p_offering uuid,p_owner text,p_name text,p_email text,p_phone text,p_policy text,p_hash text,p_mode text)
RETURNS SETOF student_enrollments LANGUAGE plpgsql AS $$
DECLARE offer student_enrollment_offerings; held student_enrollments;
BEGIN
  SELECT * INTO offer FROM student_enrollment_offerings WHERE id=p_offering AND mode=p_mode FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Unknown offering'; END IF;
  SELECT * INTO held FROM student_enrollments WHERE id=p_id;
  IF FOUND THEN
    IF held.offering_id<>p_offering OR held.owner_hash<>p_owner OR held.student_name<>p_name
      OR held.email<>p_email OR held.phone<>p_phone OR held.policy_version<>p_policy OR held.policy_hash<>p_hash THEN RAISE EXCEPTION 'Enrollment identity conflict'; END IF;
    RETURN NEXT held; RETURN;
  END IF;
  IF NOT offer.enabled OR offer.course_date <= (now() AT TIME ZONE 'America/Los_Angeles')::date
    OR offer.policy_version<>p_policy OR offer.policy_hash<>p_hash OR offer.policy_text IS NULL
    OR encode(sha256(convert_to(offer.policy_text,'UTF8')),'hex')<>p_hash THEN RAISE EXCEPTION 'Offering unavailable'; END IF;
  IF (SELECT count(*) FROM student_enrollments WHERE owner_hash=p_owner AND status='reserved')>=2 THEN RETURN; END IF;
  -- Refunded seats stay counted until release_refunded_student_seat records an actor.
  IF offer.external_seats+(SELECT count(*) FROM student_enrollments WHERE offering_id=p_offering AND student_enrollment_occupies_seat(status,inventory_released_at))>=offer.capacity THEN RETURN; END IF;
  RETURN QUERY INSERT INTO student_enrollments(id,offering_id,course_date,owner_hash,student_name,email,phone,adult_attested,policy_version,policy_hash,policy_text,amount,currency)
    VALUES(p_id,p_offering,offer.course_date,p_owner,p_name,p_email,p_phone,true,p_policy,p_hash,offer.policy_text,offer.amount,offer.currency) RETURNING *;
END;
$$;
COMMIT;
