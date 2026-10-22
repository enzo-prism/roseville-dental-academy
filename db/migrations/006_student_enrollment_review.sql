-- Upgrade for a database that already applied the shipped 005 (Oct 21 2026
-- preview included). Safe to re-run. CREATE OR REPLACE / IF NOT EXISTS only.
-- Widens review reasons, flags reserved/paid session mismatches, binds the
-- paying Checkout session on enroll, and excludes the reviewed row from the
-- capacity count. Stripe refunds against an already-resolved review return
-- false instead of raising so webhooks can ACK.
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
ALTER TABLE student_enrollment_reviews ADD COLUMN IF NOT EXISTS resolved_by text;
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
    IF btrim(p_actor)='stripe-charge-refunded' THEN RETURN false; END IF;
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
