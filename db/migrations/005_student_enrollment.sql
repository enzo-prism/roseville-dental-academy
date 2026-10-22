-- Separate from the staff pilot. This schema migration seeds no offerings.
-- Confirmed Infection Control dates/seats/price live in
-- lib/student-enrollment-offerings.ts and db/seeds/infection-control-offerings.sql.
CREATE TABLE IF NOT EXISTS student_enrollment_offerings (
  id uuid PRIMARY KEY,
  mode text NOT NULL CHECK (mode IN ('test','live')),
  course_id text NOT NULL CHECK (course_id = 'infection-control'),
  course_date date NOT NULL,
  amount integer NOT NULL CHECK (amount = 39500),
  currency text NOT NULL DEFAULT 'usd' CHECK (currency = 'usd'),
  capacity integer NOT NULL DEFAULT 12 CHECK (capacity = 12),
  external_seats integer NOT NULL CHECK (external_seats BETWEEN 0 AND 12),
  policy_version text NOT NULL,
  policy_hash text NOT NULL CHECK (policy_hash ~ '^[a-f0-9]{64}$'),
  policy_text text NOT NULL CHECK (encode(sha256(convert_to(policy_text,'UTF8')),'hex')=policy_hash),
  reviewed_at timestamptz NOT NULL,
  review_reference text NOT NULL CHECK (length(review_reference) > 0),
  enabled boolean NOT NULL DEFAULT false,
  UNIQUE(mode, course_id, course_date)
);
CREATE TABLE IF NOT EXISTS student_enrollments (
  id uuid PRIMARY KEY,
  offering_id uuid NOT NULL REFERENCES student_enrollment_offerings(id),
  course_date date NOT NULL,
  owner_hash text NOT NULL CHECK (owner_hash ~ '^[a-f0-9]{64}$'),
  student_name text NOT NULL CHECK (length(student_name) BETWEEN 2 AND 100),
  email text NOT NULL CHECK (length(email) BETWEEN 3 AND 254),
  phone text NOT NULL CHECK (length(phone) BETWEEN 7 AND 30),
  adult_attested boolean NOT NULL CHECK (adult_attested),
  policy_version text NOT NULL,
  policy_hash text NOT NULL,
  policy_text text NOT NULL CHECK (encode(sha256(convert_to(policy_text,'UTF8')),'hex')=policy_hash),
  policy_accepted_at timestamptz NOT NULL DEFAULT now(),
  amount integer NOT NULL CHECK (amount > 0),
  currency text NOT NULL CHECK (currency = 'usd'),
  refunded_amount integer NOT NULL DEFAULT 0 CHECK (refunded_amount >= 0 AND refunded_amount <= amount),
  status text NOT NULL DEFAULT 'reserved' CHECK (status IN ('reserved','paid','expired','refunded')),
  stripe_session_id text UNIQUE,
  stripe_payment_intent text UNIQUE,
  stripe_expires_at bigint NOT NULL DEFAULT floor(extract(epoch FROM now()))::bigint + 3600,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS student_enrollment_inventory ON student_enrollments(offering_id,status);
CREATE UNIQUE INDEX IF NOT EXISTS student_enrollment_duplicate ON student_enrollments(offering_id,lower(email)) WHERE status IN ('reserved','paid','refunded');
CREATE TABLE IF NOT EXISTS student_enrollment_events (
  event_id text PRIMARY KEY,
  enrollment_id uuid NOT NULL REFERENCES student_enrollments(id),
  session_id text NOT NULL,
  outcome text NOT NULL CHECK (outcome IN ('paid','expired','refunded','released','enrolled','dismissed')),
  actor text,
  received_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE student_enrollments ADD COLUMN IF NOT EXISTS inventory_released_at timestamptz;
ALTER TABLE student_enrollments ADD COLUMN IF NOT EXISTS inventory_released_by text;
ALTER TABLE student_enrollment_events ADD COLUMN IF NOT EXISTS actor text;
DROP INDEX IF EXISTS student_enrollment_duplicate;
CREATE UNIQUE INDEX student_enrollment_duplicate ON student_enrollments(offering_id,lower(email))
  WHERE status IN ('reserved','paid') OR (status='refunded' AND inventory_released_at IS NULL);
DO $events_outcome$
BEGIN
  ALTER TABLE student_enrollment_events DROP CONSTRAINT IF EXISTS student_enrollment_events_outcome_check;
  ALTER TABLE student_enrollment_events
    ADD CONSTRAINT student_enrollment_events_outcome_check
    CHECK (outcome IN ('paid','expired','refunded','released','enrolled','dismissed'));
END
$events_outcome$;
CREATE OR REPLACE FUNCTION student_enrollment_occupies_seat(p_status text, p_released timestamptz)
RETURNS boolean LANGUAGE sql IMMUTABLE AS $$
  SELECT p_status IN ('reserved','paid') OR (p_status='refunded' AND p_released IS NULL);
$$;
CREATE TABLE IF NOT EXISTS student_enrollment_mail (
  enrollment_id uuid PRIMARY KEY REFERENCES student_enrollments(id),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','sending','sent','captured','review')),
  started_at timestamptz,
  attempted_at timestamptz,
  provider_id text,
  delivered_at timestamptz,
  captured_body text
);
-- Existing private test databases may have the earlier draft schema. Missing
-- snapshots fail closed; never backfill historical consent with today's policy.
ALTER TABLE student_enrollment_offerings ADD COLUMN IF NOT EXISTS policy_text text;
ALTER TABLE student_enrollments ADD COLUMN IF NOT EXISTS policy_text text;
ALTER TABLE student_enrollment_mail ADD COLUMN IF NOT EXISTS payload jsonb;
ALTER TABLE student_enrollment_mail ADD COLUMN IF NOT EXISTS template_version text;
ALTER TABLE student_enrollment_mail ADD COLUMN IF NOT EXISTS payload_created_at timestamptz;
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
    OR encode(sha256(convert_to(offer.policy_text,'UTF8')),'hex')<>p_hash
    OR (p_mode='live' AND offer.course_date NOT IN (DATE '2026-11-14', DATE '2026-12-05')) THEN RAISE EXCEPTION 'Offering unavailable'; END IF;
  IF (SELECT count(*) FROM student_enrollments WHERE owner_hash=p_owner AND status='reserved')>=2 THEN RETURN; END IF;
  -- Refunded seats stay counted until release_refunded_student_seat records an actor.
  IF offer.external_seats+(SELECT count(*) FROM student_enrollments WHERE offering_id=p_offering AND student_enrollment_occupies_seat(status,inventory_released_at))>=offer.capacity THEN RETURN; END IF;
  RETURN QUERY INSERT INTO student_enrollments(id,offering_id,course_date,owner_hash,student_name,email,phone,adult_attested,policy_version,policy_hash,policy_text,amount,currency)
    VALUES(p_id,p_offering,offer.course_date,p_owner,p_name,p_email,p_phone,true,p_policy,p_hash,offer.policy_text,offer.amount,offer.currency) RETURNING *;
END;
$$;
CREATE OR REPLACE FUNCTION apply_student_enrollment_event(p_event text,p_id uuid,p_session text,p_intent text,p_outcome text)
RETURNS boolean LANGUAGE plpgsql AS $$
DECLARE held student_enrollments; recorded student_enrollment_events; is_new boolean;
BEGIN
  SELECT * INTO held FROM student_enrollments WHERE id=p_id FOR UPDATE;
  IF NOT FOUND OR held.stripe_session_id IS DISTINCT FROM p_session THEN RAISE EXCEPTION 'Unbound session'; END IF;
  SELECT * INTO recorded FROM student_enrollment_events WHERE event_id=p_event;
  is_new:=NOT FOUND;
  IF FOUND THEN
    IF recorded.enrollment_id<>p_id OR recorded.session_id<>p_session THEN RAISE EXCEPTION 'Event identity conflict'; END IF;
    -- A receipt identifies its resource, not the provider's mutable current state.
    -- Preserve its first observed outcome while allowing verified paid/refunded
    -- reconciliation after a duplicate or reordered delivery.
    IF recorded.outcome<>p_outcome AND NOT (recorded.outcome IN ('paid','refunded') AND p_outcome IN ('paid','refunded')) THEN RAISE EXCEPTION 'Event identity conflict'; END IF;
  END IF;
  IF p_outcome NOT IN ('paid','expired','refunded') THEN RAISE EXCEPTION 'Invalid outcome'; END IF;
  IF p_outcome IN ('paid','refunded') AND (p_intent IS NULL OR p_intent !~ '^pi_[A-Za-z0-9]+$') THEN RAISE EXCEPTION 'Invalid payment intent'; END IF;
  IF held.stripe_payment_intent IS NOT NULL AND held.stripe_payment_intent IS DISTINCT FROM p_intent THEN RAISE EXCEPTION 'Payment identity conflict'; END IF;
  IF held.status='refunded' AND p_outcome='paid' THEN
    IF is_new THEN INSERT INTO student_enrollment_events(event_id,enrollment_id,session_id,outcome) VALUES(p_event,p_id,p_session,p_outcome); END IF;
    RETURN false;
  END IF;
  IF held.status<>p_outcome AND NOT (held.status='reserved' AND p_outcome IN ('paid','expired','refunded')) AND NOT (held.status='paid' AND p_outcome='refunded') THEN RAISE EXCEPTION 'Conflicting terminal state'; END IF;
  IF is_new THEN INSERT INTO student_enrollment_events(event_id,enrollment_id,session_id,outcome) VALUES(p_event,p_id,p_session,p_outcome); END IF;
  UPDATE student_enrollments SET status=p_outcome,stripe_payment_intent=p_intent,updated_at=now() WHERE id=p_id;
  IF p_outcome='paid' THEN INSERT INTO student_enrollment_mail(enrollment_id) VALUES(p_id) ON CONFLICT DO NOTHING; END IF;
  IF p_outcome='refunded' THEN UPDATE student_enrollment_mail SET status='review' WHERE enrollment_id=p_id AND status IN ('pending','sending'); END IF;
  RETURN is_new OR held.status<>p_outcome;
END;
$$;
-- Prevent price/date/policy edits from changing already-issued Checkout bodies.
CREATE OR REPLACE FUNCTION protect_student_offering() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF EXISTS(SELECT 1 FROM student_enrollments WHERE offering_id=OLD.id) AND
    (NEW.mode,NEW.course_id,NEW.course_date,NEW.amount,NEW.currency,NEW.policy_version,NEW.policy_hash,NEW.policy_text)
    IS DISTINCT FROM (OLD.mode,OLD.course_id,OLD.course_date,OLD.amount,OLD.currency,OLD.policy_version,OLD.policy_hash,OLD.policy_text) THEN RAISE EXCEPTION 'Offering already has enrollments'; END IF;
  IF NEW.external_seats+(SELECT count(*) FROM student_enrollments WHERE offering_id=OLD.id AND student_enrollment_occupies_seat(status,inventory_released_at))>NEW.capacity THEN RAISE EXCEPTION 'Inventory exceeds capacity'; END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS student_offering_immutable ON student_enrollment_offerings;
CREATE TRIGGER student_offering_immutable BEFORE UPDATE ON student_enrollment_offerings FOR EACH ROW EXECUTE FUNCTION protect_student_offering();
CREATE OR REPLACE FUNCTION protect_student_mail_payload() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.payload IS NOT NULL AND (NEW.payload,NEW.template_version,NEW.payload_created_at)
    IS DISTINCT FROM (OLD.payload,OLD.template_version,OLD.payload_created_at) THEN RAISE EXCEPTION 'Confirmation payload is immutable'; END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS student_mail_payload_immutable ON student_enrollment_mail;
CREATE TRIGGER student_mail_payload_immutable BEFORE UPDATE ON student_enrollment_mail FOR EACH ROW EXECUTE FUNCTION protect_student_mail_payload();
CREATE OR REPLACE FUNCTION release_sessionless_student_enrollment(p_id uuid)
RETURNS SETOF student_enrollments LANGUAGE plpgsql AS $$
DECLARE held student_enrollments;
BEGIN
  SELECT * INTO held FROM student_enrollments WHERE id=p_id FOR UPDATE;
  IF NOT FOUND THEN RETURN; END IF;
  IF held.status<>'reserved' OR held.stripe_session_id IS NOT NULL THEN
    RETURN NEXT held; RETURN;
  END IF;
  UPDATE student_enrollments SET status='expired',updated_at=now() WHERE id=p_id RETURNING * INTO held;
  RETURN NEXT held;
END;
$$;
DROP VIEW IF EXISTS student_enrollment_roster;
DROP VIEW IF EXISTS student_enrollment_roster_test;
CREATE OR REPLACE VIEW student_enrollment_roster AS
  SELECT e.id,e.student_name,e.email,e.phone,e.status,e.amount,e.currency,e.refunded_amount,e.policy_accepted_at,e.policy_version,
    e.stripe_session_id,e.stripe_payment_intent,e.inventory_released_at,e.inventory_released_by,o.mode,o.course_id,o.course_date
  FROM student_enrollments e JOIN student_enrollment_offerings o ON o.id=e.offering_id WHERE e.status IN ('paid','refunded') AND o.mode='live';
CREATE OR REPLACE VIEW student_enrollment_roster_test AS
  SELECT e.id,e.student_name,e.email,e.phone,e.status,e.amount,e.currency,e.refunded_amount,e.policy_accepted_at,e.policy_version,
    e.stripe_session_id,e.stripe_payment_intent,e.inventory_released_at,e.inventory_released_by,o.mode,o.course_id,o.course_date
  FROM student_enrollments e JOIN student_enrollment_offerings o ON o.id=e.offering_id WHERE e.status IN ('paid','refunded') AND o.mode='test';

CREATE TABLE IF NOT EXISTS student_enrollment_attempts (
  bucket text NOT NULL, window_start timestamptz NOT NULL, attempts integer NOT NULL, PRIMARY KEY(bucket,window_start)
);
CREATE OR REPLACE FUNCTION student_enrollment_allowance(p_bucket text) RETURNS boolean LANGUAGE plpgsql AS $$
DECLARE window_time timestamptz; hits integer;
BEGIN
  window_time:=to_timestamp(floor(extract(epoch FROM now())/900)*900);
  INSERT INTO student_enrollment_attempts VALUES(p_bucket,window_time,1) ON CONFLICT(bucket,window_start)
    DO UPDATE SET attempts=student_enrollment_attempts.attempts+1 RETURNING attempts INTO hits;
  DELETE FROM student_enrollment_attempts WHERE window_start<now()-interval '1 day';
  RETURN hits<=20;
END;
$$;
-- Orphan Checkout payments against released/expired rows need staff review.
-- Re-applying this file is required so production picks up new functions/views.
CREATE TABLE IF NOT EXISTS student_enrollment_reviews (
  enrollment_id uuid NOT NULL REFERENCES student_enrollments(id),
  session_id text NOT NULL,
  reason text NOT NULL CHECK (reason IN ('paid_after_release','session_mismatch')),
  created_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz,
  resolution text CHECK (resolution IS NULL OR resolution IN ('enrolled','dismissed','refunded')),
  PRIMARY KEY (enrollment_id, session_id)
);
ALTER TABLE student_enrollment_reviews ADD COLUMN IF NOT EXISTS resolved_at timestamptz;
ALTER TABLE student_enrollment_reviews ADD COLUMN IF NOT EXISTS resolution text;
DO $reviews_pk$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid='student_enrollment_reviews'::regclass
      AND conname='student_enrollment_reviews_pkey'
      AND array_length(conkey, 1) = 1
  ) THEN
    ALTER TABLE student_enrollment_reviews DROP CONSTRAINT student_enrollment_reviews_pkey;
    ALTER TABLE student_enrollment_reviews ADD PRIMARY KEY (enrollment_id, session_id);
  END IF;
END
$reviews_pk$;
DO $reviews_resolution$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid='student_enrollment_reviews'::regclass
      AND pg_get_constraintdef(oid) ILIKE '%resolution%enrolled%dismissed%refunded%'
  ) THEN
    ALTER TABLE student_enrollment_reviews
      ADD CONSTRAINT student_enrollment_reviews_resolution_check
      CHECK (resolution IS NULL OR resolution IN ('enrolled','dismissed','refunded'));
  END IF;
END
$reviews_resolution$;
DO $reviews_reason$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT conname FROM pg_constraint
    WHERE conrelid='student_enrollment_reviews'::regclass
      AND contype='c'
      AND pg_get_constraintdef(oid) ILIKE '%reason%'
      AND pg_get_constraintdef(oid) NOT ILIKE '%session_mismatch%'
  LOOP
    EXECUTE format('ALTER TABLE student_enrollment_reviews DROP CONSTRAINT %I', r.conname);
  END LOOP;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid='student_enrollment_reviews'::regclass
      AND pg_get_constraintdef(oid) ILIKE '%session_mismatch%'
  ) THEN
    ALTER TABLE student_enrollment_reviews
      ADD CONSTRAINT student_enrollment_reviews_reason_check
      CHECK (reason IN ('paid_after_release','session_mismatch'));
  END IF;
END
$reviews_reason$;
CREATE OR REPLACE FUNCTION flag_student_enrollment_review(p_id uuid,p_session text,p_reason text)
RETURNS boolean LANGUAGE plpgsql AS $$
DECLARE held student_enrollments;
BEGIN
  IF p_reason NOT IN ('paid_after_release','session_mismatch') THEN RAISE EXCEPTION 'Invalid review reason'; END IF;
  SELECT * INTO held FROM student_enrollments WHERE id=p_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Unknown enrollment'; END IF;
  IF p_reason='paid_after_release' AND held.status <> 'expired' THEN RAISE EXCEPTION 'Review flag requires an expired enrollment'; END IF;
  IF p_reason='session_mismatch' AND held.status NOT IN ('reserved','paid') THEN RAISE EXCEPTION 'Session mismatch review requires a reserved or paid enrollment'; END IF;
  INSERT INTO student_enrollment_reviews(enrollment_id,session_id,reason)
    VALUES(p_id,p_session,p_reason)
    ON CONFLICT (enrollment_id, session_id) DO NOTHING;
  RETURN true;
END;
$$;
ALTER TABLE student_enrollment_reviews ADD COLUMN IF NOT EXISTS resolved_by text;
DROP FUNCTION IF EXISTS resolve_student_enrollment_review(uuid, text, text);
-- Staff-only: never UPDATE student_enrollments.status='paid' by hand. This
-- function refuses 'enrolled' when reserved+paid+unreleased-refunded already
-- fill capacity. Actor is required and written onto the review and events row.
CREATE OR REPLACE FUNCTION resolve_student_enrollment_review(p_id uuid,p_session text,p_resolution text,p_actor text)
RETURNS boolean LANGUAGE plpgsql AS $$
DECLARE held student_enrollments; offer student_enrollment_offerings; review student_enrollment_reviews;
BEGIN
  IF p_actor IS NULL OR length(btrim(p_actor))<3 THEN RAISE EXCEPTION 'Actor required'; END IF;
  IF p_resolution NOT IN ('enrolled','dismissed','refunded') THEN RAISE EXCEPTION 'Invalid review resolution'; END IF;
  SELECT * INTO review FROM student_enrollment_reviews WHERE enrollment_id=p_id AND session_id=p_session FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Unknown review'; END IF;
  IF review.resolved_at IS NOT NULL THEN
    IF review.resolution IS DISTINCT FROM p_resolution THEN RAISE EXCEPTION 'Review already resolved'; END IF;
    RETURN false;
  END IF;
  SELECT * INTO held FROM student_enrollments WHERE id=p_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Unknown enrollment'; END IF;
  IF p_resolution='enrolled' THEN
    IF review.reason='session_mismatch' THEN
      IF held.status NOT IN ('reserved','expired') THEN RAISE EXCEPTION 'Review enroll requires a reserved or expired enrollment'; END IF;
    ELSIF held.status<>'expired' THEN RAISE EXCEPTION 'Review enroll requires an expired enrollment'; END IF;
    SELECT * INTO offer FROM student_enrollment_offerings WHERE id=held.offering_id FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Unknown offering'; END IF;
    IF offer.external_seats+(SELECT count(*) FROM student_enrollments WHERE offering_id=held.offering_id AND id<>p_id AND student_enrollment_occupies_seat(status,inventory_released_at))>=offer.capacity THEN
      RAISE EXCEPTION 'Class is full';
    END IF;
    -- Bind the Checkout session that actually paid, including mismatch and
    -- paid-after-release orphans. Never keep a stale reserved binding.
    UPDATE student_enrollments SET status='paid',stripe_session_id=p_session,updated_at=now() WHERE id=p_id;
    INSERT INTO student_enrollment_mail(enrollment_id) VALUES(p_id) ON CONFLICT DO NOTHING;
  END IF;
  UPDATE student_enrollment_reviews SET resolved_at=now(),resolution=p_resolution,resolved_by=btrim(p_actor) WHERE enrollment_id=p_id AND session_id=p_session;
  INSERT INTO student_enrollment_events(event_id,enrollment_id,session_id,outcome,actor)
    VALUES('resolve:'||p_id::text||':'||p_session||':'||p_resolution,p_id,p_session,p_resolution,btrim(p_actor))
    ON CONFLICT (event_id) DO NOTHING;
  RETURN true;
END;
$$;
-- Staff-only path that frees a refunded verification (or academy-cancelled) seat.
-- Refunded rows keep occupying inventory until this records an actor and event.
CREATE OR REPLACE FUNCTION release_refunded_student_seat(p_id uuid,p_actor text)
RETURNS boolean LANGUAGE plpgsql AS $$
DECLARE held student_enrollments;
BEGIN
  IF p_actor IS NULL OR length(btrim(p_actor))<3 THEN RAISE EXCEPTION 'Actor required'; END IF;
  SELECT * INTO held FROM student_enrollments WHERE id=p_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Unknown enrollment'; END IF;
  IF held.status<>'refunded' THEN RAISE EXCEPTION 'Seat release requires a refunded enrollment'; END IF;
  IF held.inventory_released_at IS NOT NULL THEN RETURN false; END IF;
  UPDATE student_enrollments
    SET inventory_released_at=now(),inventory_released_by=btrim(p_actor),updated_at=now()
    WHERE id=p_id;
  INSERT INTO student_enrollment_events(event_id,enrollment_id,session_id,outcome,actor)
    VALUES('release:'||p_id::text,p_id,COALESCE(held.stripe_session_id,'staff'),'released',btrim(p_actor));
  RETURN true;
END;
$$;
-- CREATE TABLE IF NOT EXISTS will not add CHECKs to an older offerings table.
DO $amount_check$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid='student_enrollment_offerings'::regclass
      AND contype='c'
      AND pg_get_constraintdef(oid) ILIKE '%amount%39500%'
  ) THEN
    ALTER TABLE student_enrollment_offerings
      ADD CONSTRAINT student_enrollment_offerings_amount_39500 CHECK (amount=39500);
  END IF;
END
$amount_check$;
