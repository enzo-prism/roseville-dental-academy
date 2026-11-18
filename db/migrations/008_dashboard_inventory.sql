BEGIN;
-- A managed class shares its offering row lock with the dashboard's Class Dates editor.
-- Existing offerings stay unmanaged until the dashboard cutover explicitly imports a cell.
ALTER TABLE student_enrollment_offerings
  ADD COLUMN IF NOT EXISTS dashboard_state text CHECK (dashboard_state IN ('counted','closed','unknown','removed')),
  ADD COLUMN IF NOT EXISTS dashboard_version uuid,
  ADD COLUMN IF NOT EXISTS dashboard_changed_at timestamptz;

CREATE TABLE IF NOT EXISTS student_dashboard_seat_edits (
  version uuid PRIMARY KEY,
  offering_id uuid NOT NULL REFERENCES student_enrollment_offerings(id),
  changed_at timestamptz NOT NULL,
  before_cell jsonb NOT NULL,
  after_cell jsonb NOT NULL
);

-- A checkout holds the offering lock while inserting (and may wait for an
-- expiring duplicate email). Expiry already holds the enrollment row. It
-- advances this separate version without having to lock the offering.
CREATE TABLE IF NOT EXISTS student_dashboard_inventory_versions (
  offering_id uuid PRIMARY KEY REFERENCES student_enrollment_offerings(id),
  version uuid NOT NULL,
  changed_at timestamptz NOT NULL
);

CREATE OR REPLACE FUNCTION record_student_dashboard_version() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO student_dashboard_inventory_versions(offering_id,version,changed_at)
    VALUES (NEW.id,NEW.dashboard_version,NEW.dashboard_changed_at)
    ON CONFLICT (offering_id) DO UPDATE SET version=EXCLUDED.version,changed_at=EXCLUDED.changed_at;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS student_dashboard_office_version ON student_enrollment_offerings;
CREATE TRIGGER student_dashboard_office_version AFTER INSERT OR UPDATE OF dashboard_version ON student_enrollment_offerings
  FOR EACH ROW WHEN (NEW.dashboard_state IS NOT NULL) EXECUTE FUNCTION record_student_dashboard_version();

INSERT INTO student_dashboard_inventory_versions(offering_id,version,changed_at)
  SELECT id,dashboard_version,dashboard_changed_at FROM student_enrollment_offerings
  WHERE dashboard_state IS NOT NULL ON CONFLICT (offering_id) DO NOTHING;

CREATE OR REPLACE VIEW student_dashboard_inventory AS
SELECT inventory.id, mode, course_id, course_date, clock.version AS dashboard_version,
  jsonb_strip_nulls(jsonb_build_object(
    'version','enrollment:' || clock.version::text,
    'updatedAt',clock.changed_at,
    'seatsLeft',CASE dashboard_state WHEN 'counted' THEN remaining WHEN 'closed' THEN 0 END,
    'status',CASE WHEN dashboard_state='removed' THEN NULL
                  WHEN dashboard_state='closed' OR (dashboard_state='counted' AND remaining=0) THEN 'full'
                  ELSE 'open' END)) AS cell
FROM (
  SELECT o.*, o.capacity-o.external_seats-(SELECT count(*) FROM student_enrollments e WHERE e.offering_id=o.id
    AND student_enrollment_occupies_seat(e.status,e.inventory_released_at)) AS remaining
  FROM student_enrollment_offerings o WHERE o.dashboard_state IS NOT NULL
) inventory JOIN student_dashboard_inventory_versions clock ON clock.offering_id=inventory.id;

CREATE OR REPLACE FUNCTION edit_student_dashboard_inventory(p_id uuid,p_version uuid,p_state text,p_left integer)
RETURNS jsonb LANGUAGE plpgsql AS $$
DECLARE offer student_enrollment_offerings; occupied integer; before_cell jsonb; after_cell jsonb;
BEGIN
  SELECT * INTO STRICT offer FROM student_enrollment_offerings WHERE id=p_id FOR UPDATE;
  IF offer.dashboard_state IS NULL THEN RETURN NULL; END IF;
  -- Once both locks are held, an occupancy transition cannot commit between
  -- comparing the editor version and computing its new absolute seat count.
  PERFORM 1 FROM student_dashboard_inventory_versions WHERE offering_id=p_id AND version=p_version FOR UPDATE;
  IF NOT FOUND THEN RETURN NULL; END IF;
  IF p_state IS NULL OR p_state NOT IN ('counted','closed','unknown','removed')
     OR (p_state='counted') IS DISTINCT FROM (p_left IS NOT NULL) THEN RAISE EXCEPTION 'Invalid inventory edit'; END IF;
  SELECT cell INTO before_cell FROM student_dashboard_inventory WHERE id=p_id;
  SELECT count(*) INTO occupied FROM student_enrollments WHERE offering_id=p_id
    AND student_enrollment_occupies_seat(status,inventory_released_at);
  IF p_left < 0 OR p_left > offer.capacity-occupied THEN RETURN NULL; END IF;
  -- Re-selecting Open on an already open cell preserves its recorded count.
  IF p_state='unknown' AND before_cell->>'status'='open' THEN
    RETURN jsonb_build_object('cell',before_cell,'publicStatusChanged',false);
  END IF;
  UPDATE student_enrollment_offerings SET dashboard_state=p_state,
    external_seats=CASE WHEN p_state='counted' THEN capacity-occupied-p_left ELSE external_seats END,
    dashboard_version=gen_random_uuid(), dashboard_changed_at=clock_timestamp(),
    reviewed_at=clock_timestamp(), review_reference='RDA Dashboard class dates'
    WHERE id=p_id RETURNING * INTO offer;
  SELECT cell INTO after_cell FROM student_dashboard_inventory WHERE id=p_id;
  INSERT INTO student_dashboard_seat_edits VALUES(offer.dashboard_version,p_id,offer.dashboard_changed_at,before_cell,after_cell);
  RETURN jsonb_build_object('cell',after_cell,'publicStatusChanged',(before_cell->>'status') IS DISTINCT FROM (after_cell->>'status'));
END;
$$;

CREATE OR REPLACE FUNCTION track_student_dashboard_inventory() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE was_occupied boolean := false; now_occupied boolean; state text;
BEGIN
  IF TG_OP='UPDATE' THEN was_occupied:=student_enrollment_occupies_seat(OLD.status,OLD.inventory_released_at); END IF;
  now_occupied:=student_enrollment_occupies_seat(NEW.status,NEW.inventory_released_at);
  IF was_occupied=now_occupied THEN RETURN NEW; END IF;
  SELECT dashboard_state INTO state FROM student_enrollment_offerings
    WHERE id=NEW.offering_id AND dashboard_state IS NOT NULL;
  IF NOT FOUND THEN RETURN NEW; END IF;
  IF now_occupied AND state<>'counted' THEN RAISE EXCEPTION 'Class availability unconfirmed or closed'; END IF;
  UPDATE student_dashboard_inventory_versions SET version=gen_random_uuid(),changed_at=clock_timestamp()
    WHERE offering_id=NEW.offering_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Class inventory version unavailable'; END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS student_dashboard_occupancy ON student_enrollments;
CREATE TRIGGER student_dashboard_occupancy AFTER INSERT OR UPDATE OF status,inventory_released_at ON student_enrollments
  FOR EACH ROW EXECUTE FUNCTION track_student_dashboard_inventory();
COMMIT;
