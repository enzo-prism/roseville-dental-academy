-- TEST reservations are entirely separate from real admissions and attribution.
CREATE TABLE IF NOT EXISTS enrollment_test_dates (
  course_date date PRIMARY KEY,
  capacity integer NOT NULL DEFAULT 12 CHECK (capacity = 12)
);
CREATE TABLE IF NOT EXISTS enrollment_test_holds (
  hold_id uuid PRIMARY KEY,
  course_date date NOT NULL REFERENCES enrollment_test_dates(course_date),
  owner_hash text NOT NULL CHECK (owner_hash ~ '^[a-f0-9]{64}$'),
  policy_version text NOT NULL,
  status text NOT NULL DEFAULT 'reserved' CHECK (status IN ('reserved', 'paid', 'expired')),
  stripe_session_id text UNIQUE CHECK (stripe_session_id ~ '^cs_test_'),
  amount integer NOT NULL DEFAULT 39500 CHECK (amount = 39500),
  currency text NOT NULL DEFAULT 'usd' CHECK (currency = 'usd'),
  created_at timestamptz NOT NULL DEFAULT now(),
  stripe_expires_at bigint NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS enrollment_test_holds_date ON enrollment_test_holds(course_date, status);
CREATE TABLE IF NOT EXISTS enrollment_test_events (
  event_id text PRIMARY KEY,
  hold_id uuid NOT NULL REFERENCES enrollment_test_holds(hold_id),
  session_id text NOT NULL CHECK (session_id ~ '^cs_test_'),
  outcome text NOT NULL CHECK (outcome IN ('paid', 'expired')),
  received_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS enrollment_test_login_attempts (
  bucket text NOT NULL,
  window_start timestamptz NOT NULL,
  attempts integer NOT NULL,
  PRIMARY KEY(bucket,window_start)
);
CREATE OR REPLACE FUNCTION enrollment_test_login_allowance(p_bucket text)
RETURNS boolean LANGUAGE plpgsql AS $$
DECLARE window_time timestamptz; global_count integer; local_count integer;
BEGIN
  window_time := to_timestamp(floor(extract(epoch FROM now()) / 900) * 900);
  INSERT INTO enrollment_test_login_attempts(bucket,window_start,attempts) VALUES('global',window_time,1)
    ON CONFLICT(bucket,window_start) DO UPDATE SET attempts=enrollment_test_login_attempts.attempts+1 RETURNING attempts INTO global_count;
  INSERT INTO enrollment_test_login_attempts(bucket,window_start,attempts) VALUES(p_bucket,window_time,1)
    ON CONFLICT(bucket,window_start) DO UPDATE SET attempts=enrollment_test_login_attempts.attempts+1 RETURNING attempts INTO local_count;
  DELETE FROM enrollment_test_login_attempts WHERE window_start < now() - interval '1 day';
  RETURN global_count <= 30 AND local_count <= 8;
END;
$$;
CREATE OR REPLACE FUNCTION reserve_enrollment_test_hold(p_id uuid, p_date date, p_owner text, p_policy text)
RETURNS SETOF enrollment_test_holds LANGUAGE plpgsql AS $$
DECLARE existing enrollment_test_holds;
BEGIN
  INSERT INTO enrollment_test_dates(course_date) VALUES(p_date) ON CONFLICT DO NOTHING;
  PERFORM 1 FROM enrollment_test_dates WHERE course_date = p_date FOR UPDATE;
  SELECT * INTO existing FROM enrollment_test_holds WHERE hold_id = p_id;
  IF FOUND THEN
    IF existing.course_date <> p_date OR existing.owner_hash <> p_owner OR existing.policy_version <> p_policy THEN
      RAISE EXCEPTION 'Hold identity conflict';
    END IF;
    RETURN NEXT existing; RETURN;
  END IF;
  IF (SELECT count(*) FROM enrollment_test_holds WHERE course_date = p_date AND status IN ('reserved','paid')) >= 12 THEN
    RETURN;
  END IF;
  RETURN QUERY INSERT INTO enrollment_test_holds(hold_id, course_date, owner_hash, policy_version, stripe_expires_at)
    VALUES(p_id, p_date, p_owner, p_policy, floor(extract(epoch FROM now()))::bigint + 3600) RETURNING *;
END;
$$;
CREATE OR REPLACE FUNCTION apply_enrollment_test_event(p_event text, p_id uuid, p_session text, p_outcome text)
RETURNS boolean LANGUAGE plpgsql AS $$
DECLARE held enrollment_test_holds; recorded enrollment_test_events;
BEGIN
  SELECT * INTO held FROM enrollment_test_holds WHERE hold_id = p_id FOR UPDATE;
  IF NOT FOUND OR held.stripe_session_id IS DISTINCT FROM p_session THEN RAISE EXCEPTION 'Unbound session'; END IF;
  SELECT * INTO recorded FROM enrollment_test_events WHERE event_id = p_event;
  IF FOUND THEN
    IF recorded.hold_id <> p_id OR recorded.session_id <> p_session OR recorded.outcome <> p_outcome THEN
      RAISE EXCEPTION 'Event identity conflict';
    END IF;
    RETURN false;
  END IF;
  IF p_outcome NOT IN ('paid','expired') THEN RAISE EXCEPTION 'Invalid outcome'; END IF;
  IF held.status <> 'reserved' AND held.status <> p_outcome THEN RAISE EXCEPTION 'Conflicting terminal state'; END IF;
  INSERT INTO enrollment_test_events(event_id, hold_id, session_id, outcome) VALUES(p_event,p_id,p_session,p_outcome);
  UPDATE enrollment_test_holds SET status=p_outcome, updated_at=now() WHERE hold_id=p_id;
  RETURN true;
END;
$$;
