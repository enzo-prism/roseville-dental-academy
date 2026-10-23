-- Upgrade for a database that already applied the shipped 005 (Oct 21 2026
-- preview included). Safe to re-run. CREATE OR REPLACE / IF NOT EXISTS only.
-- The flag_student_enrollment_review / resolve_student_enrollment_review
-- bodies in 005 are superseded by this file. Do not edit 005; it must stay
-- byte-identical to the shipped main copy.
-- Apply with live payments off, in one transaction: run the filename-order
-- migrator (it wraps every NNN_*.sql and strips these BEGIN/COMMIT). Standalone
-- apply of this file is also one transaction.
-- Widens review reasons, flags reserved/paid/refunded session mismatches,
-- binds the paying Checkout session on enroll, copies any review
-- refunded_amount onto the enrollment (and marks refunded when it equals
-- the full amount), and excludes the reviewed row from the capacity count.
-- Stripe refunds against an already-resolved review return false instead of
-- raising so webhooks can ACK, except a refund of a session that is now
-- bound after staff enroll, which applies the copied or incoming amount.
SET lock_timeout = '5s';
BEGIN;
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
ALTER TABLE student_enrollment_reviews ADD COLUMN IF NOT EXISTS refunded_amount integer NOT NULL DEFAULT 0;
CREATE OR REPLACE FUNCTION flag_student_enrollment_review(p_id uuid,p_session text,p_reason text)
RETURNS boolean LANGUAGE plpgsql AS $$
DECLARE held student_enrollments;
BEGIN
  IF p_reason NOT IN ('paid_after_release','session_mismatch') THEN RAISE EXCEPTION 'Invalid review reason'; END IF;
  SELECT * INTO held FROM student_enrollments WHERE id=p_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Unknown enrollment'; END IF;
  IF p_reason='paid_after_release' AND held.status <> 'expired' THEN RAISE EXCEPTION 'Review flag requires an expired enrollment'; END IF;
  IF p_reason='session_mismatch' AND held.status NOT IN ('reserved','paid','refunded') THEN RAISE EXCEPTION 'Session mismatch review requires a reserved, paid, or refunded enrollment'; END IF;
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
DECLARE held student_enrollments; offer student_enrollment_offerings; review student_enrollment_reviews; applied_refund integer;
BEGIN
  IF p_actor IS NULL OR length(btrim(p_actor))<3 THEN RAISE EXCEPTION 'Actor required'; END IF;
  IF p_resolution NOT IN ('enrolled','dismissed','refunded') THEN RAISE EXCEPTION 'Invalid review resolution'; END IF;
  SELECT * INTO review FROM student_enrollment_reviews WHERE enrollment_id=p_id AND session_id=p_session FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Unknown review'; END IF;
  IF review.resolved_at IS NOT NULL THEN
    IF btrim(p_actor)='stripe-charge-refunded' THEN
      SELECT * INTO held FROM student_enrollments WHERE id=p_id FOR UPDATE;
      IF FOUND AND held.stripe_session_id=p_session AND held.status='paid' AND p_resolution='refunded' THEN
        UPDATE student_enrollments SET status='refunded',refunded_amount=GREATEST(refunded_amount,held.amount),updated_at=now() WHERE id=p_id;
        UPDATE student_enrollment_mail SET status='review' WHERE enrollment_id=p_id AND status IN ('pending','sending');
        INSERT INTO student_enrollment_events(event_id,enrollment_id,session_id,outcome,actor)
          VALUES('resolve:'||p_id::text||':'||p_session||':'||p_resolution,p_id,p_session,p_resolution,btrim(p_actor))
          ON CONFLICT (event_id) DO NOTHING;
        RETURN true;
      END IF;
      RETURN false;
    END IF;
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
    -- Copy any refund already recorded on this review (A2 / B-PARTIAL).
    applied_refund := GREATEST(held.refunded_amount, review.refunded_amount);
    UPDATE student_enrollments SET
      status=CASE WHEN applied_refund>=held.amount THEN 'refunded' ELSE 'paid' END,
      stripe_session_id=p_session,
      refunded_amount=applied_refund,
      updated_at=now()
    WHERE id=p_id;
    INSERT INTO student_enrollment_mail(enrollment_id) VALUES(p_id) ON CONFLICT DO NOTHING;
    IF applied_refund>=held.amount THEN
      UPDATE student_enrollment_mail SET status='review' WHERE enrollment_id=p_id AND status IN ('pending','sending');
    END IF;
  END IF;
  UPDATE student_enrollment_reviews SET resolved_at=now(),resolution=p_resolution,resolved_by=btrim(p_actor) WHERE enrollment_id=p_id AND session_id=p_session;
  INSERT INTO student_enrollment_events(event_id,enrollment_id,session_id,outcome,actor)
    VALUES('resolve:'||p_id::text||':'||p_session||':'||p_resolution,p_id,p_session,p_resolution,btrim(p_actor))
    ON CONFLICT (event_id) DO NOTHING;
  RETURN true;
END;
$$;
COMMIT;
