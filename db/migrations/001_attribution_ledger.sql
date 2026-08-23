BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE OR REPLACE FUNCTION canonical_attribution_platform(value text)
RETURNS text LANGUAGE sql IMMUTABLE PARALLEL SAFE AS $$
  SELECT CASE lower(COALESCE(value, ''))
    WHEN 'facebook' THEN 'meta' WHEN 'instagram' THEN 'meta' WHEN 'meta_ads' THEN 'meta'
    WHEN 'google_ads' THEN 'google' WHEN 'googleads' THEN 'google'
    WHEN 'tiktok_ads' THEN 'tiktok' WHEN 'snapchat_ads' THEN 'snapchat'
    WHEN 'bing' THEN 'microsoft' WHEN 'microsoft_ads' THEN 'microsoft'
    ELSE lower(COALESCE(value, '')) END;
$$;

CREATE TABLE IF NOT EXISTS contacts_private (
  contact_key text PRIMARY KEY,
  email_sha256 char(64),
  phone_sha256 char(64),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  retention_expires_at timestamptz NOT NULL DEFAULT (now() + interval '730 days'),
  CONSTRAINT contacts_email_hash CHECK (email_sha256 IS NULL OR email_sha256 ~ '^[a-f0-9]{64}$'),
  CONSTRAINT contacts_phone_hash CHECK (phone_sha256 IS NULL OR phone_sha256 ~ '^[a-f0-9]{64}$')
);

CREATE TABLE IF NOT EXISTS attribution_receipts (
  lead_event_id text PRIMARY KEY,
  form_id text NOT NULL,
  form_key text,
  accepted_at timestamptz NOT NULL,
  schema_version integer NOT NULL,
  canonical_lead_id text UNIQUE,
  verification_status text NOT NULL DEFAULT 'pending',
  received_at timestamptz NOT NULL DEFAULT now(),
  verified_at timestamptz,
  retention_expires_at timestamptz NOT NULL DEFAULT (now() + interval '180 days'),
  CONSTRAINT receipt_status CHECK (verification_status IN ('pending', 'verified', 'rejected'))
);

CREATE TABLE IF NOT EXISTS attribution_receipt_nonces (
  nonce uuid PRIMARY KEY,
  lead_event_id text NOT NULL,
  form_id text NOT NULL,
  expires_at timestamptz NOT NULL,
  used_at timestamptz,
  payload_sha256 char(64),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT receipt_nonce_payload_hash CHECK (
    payload_sha256 IS NULL OR payload_sha256 ~ '^[a-f0-9]{64}$'
  )
);

CREATE TABLE IF NOT EXISTS attribution_receipt_rate_limits (
  bucket_hash char(64) NOT NULL,
  window_start timestamptz NOT NULL,
  request_count integer NOT NULL,
  PRIMARY KEY (bucket_hash, window_start),
  CONSTRAINT receipt_rate_hash CHECK (bucket_hash ~ '^[a-f0-9]{64}$'),
  CONSTRAINT receipt_rate_count CHECK (request_count BETWEEN 1 AND 20)
);

CREATE OR REPLACE FUNCTION consume_attribution_receipt_nonce(
  requested_nonce uuid, requested_lead_event_id text, requested_form_id text,
  requested_payload_sha256 char(64)
) RETURNS boolean LANGUAGE plpgsql AS $$
DECLARE existing attribution_receipt_nonces%ROWTYPE;
BEGIN
  SELECT * INTO existing FROM attribution_receipt_nonces WHERE nonce = requested_nonce FOR UPDATE;
  IF NOT FOUND OR existing.expires_at <= now() OR existing.lead_event_id <> requested_lead_event_id
    OR existing.form_id <> requested_form_id THEN
    RAISE EXCEPTION 'receipt nonce is invalid or expired';
  END IF;
  IF existing.used_at IS NOT NULL THEN
    IF existing.payload_sha256 = requested_payload_sha256 THEN RETURN true; END IF;
    RAISE EXCEPTION 'receipt nonce replay payload does not match';
  END IF;
  UPDATE attribution_receipt_nonces SET used_at = now(), payload_sha256 = requested_payload_sha256
    WHERE nonce = requested_nonce;
  RETURN true;
END;
$$;

CREATE TABLE IF NOT EXISTS ad_touchpoints (
  touch_id text PRIMARY KEY,
  lead_event_id text NOT NULL REFERENCES attribution_receipts(lead_event_id),
  touch_type text NOT NULL,
  captured_at timestamptz NOT NULL,
  anonymous_id text NOT NULL,
  session_id text NOT NULL,
  landing_page text NOT NULL,
  referrer text,
  utm jsonb NOT NULL DEFAULT '{}'::jsonb,
  click_ids jsonb NOT NULL DEFAULT '{}'::jsonb,
  ad_dimensions jsonb NOT NULL DEFAULT '{}'::jsonb,
  ga_client_id text,
  ga_session_id text,
  analytics_consent boolean NOT NULL DEFAULT false,
  marketing_consent boolean NOT NULL DEFAULT false,
  consent_policy_version text NOT NULL,
  consent_recorded_at timestamptz NOT NULL,
  received_at timestamptz NOT NULL DEFAULT now(),
  retention_expires_at timestamptz NOT NULL DEFAULT (now() + interval '180 days'),
  CONSTRAINT touch_type_valid CHECK (touch_type IN ('first', 'conversion')),
  CONSTRAINT analytics_consent_strips_tracking CHECK (
    analytics_consent OR (utm = '{}'::jsonb AND referrer IS NULL AND ga_client_id IS NULL
      AND ga_session_id IS NULL AND anonymous_id = '' AND session_id = '')
  ),
  CONSTRAINT marketing_consent_strips_tracking CHECK (
    marketing_consent OR (click_ids = '{}'::jsonb AND ad_dimensions = '{}'::jsonb)
  ),
  UNIQUE (lead_event_id, touch_type)
);

CREATE TABLE IF NOT EXISTS lead_inquiries (
  lead_id text PRIMARY KEY,
  form_id text NOT NULL,
  submission_id text NOT NULL,
  lead_event_id text UNIQUE,
  contact_key text NOT NULL REFERENCES contacts_private(contact_key),
  submitted_at timestamptz NOT NULL,
  program_interest text,
  source_page text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (form_id, submission_id),
  UNIQUE (lead_id, contact_key),
  CONSTRAINT immutable_lead_identity CHECK (lead_id = form_id || ':' || submission_id),
  CONSTRAINT separate_browser_event_identity CHECK (
    lead_event_id IS NULL OR (lead_event_id <> lead_id AND lead_event_id <> submission_id)
  )
);

ALTER TABLE attribution_receipts
  DROP CONSTRAINT IF EXISTS attribution_receipts_canonical_lead_id_fkey;
ALTER TABLE attribution_receipts
  ADD CONSTRAINT attribution_receipts_canonical_lead_id_fkey
  FOREIGN KEY (canonical_lead_id) REFERENCES lead_inquiries(lead_id)
  DEFERRABLE INITIALLY DEFERRED;

CREATE TABLE IF NOT EXISTS conversion_events (
  event_id text PRIMARY KEY,
  event_type text NOT NULL,
  occurred_at timestamptz NOT NULL,
  source_record_id text NOT NULL,
  contact_key text NOT NULL REFERENCES contacts_private(contact_key),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT conversion_type_valid CHECK (
    event_type IN ('qualified_lead', 'first_visit', 'enrolled', 'class_started')
  ),
  UNIQUE (event_type, source_record_id),
  UNIQUE (event_id, contact_key)
);

CREATE TABLE IF NOT EXISTS lead_conversion_links (
  conversion_event_id text PRIMARY KEY,
  lead_id text NOT NULL,
  contact_key text NOT NULL,
  match_method text NOT NULL,
  match_confidence text NOT NULL,
  reviewed_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT link_conversion_contact_fk FOREIGN KEY (conversion_event_id, contact_key)
    REFERENCES conversion_events(event_id, contact_key),
  CONSTRAINT link_lead_contact_fk FOREIGN KEY (lead_id, contact_key)
    REFERENCES lead_inquiries(lead_id, contact_key),
  CONSTRAINT link_confidence_valid CHECK (match_confidence IN ('high', 'medium')),
  CONSTRAINT link_method_valid CHECK (
    match_method IN ('exact_email', 'exact_phone', 'exact_name_and_timing', 'reviewed')
  )
);

CREATE TABLE IF NOT EXISTS daily_ad_delivery (
  delivery_date date NOT NULL,
  platform text NOT NULL,
  account_id text NOT NULL,
  campaign_id text NOT NULL,
  campaign_name text,
  ad_set_id text NOT NULL DEFAULT '',
  ad_set_name text,
  ad_id text NOT NULL DEFAULT '',
  ad_name text,
  spend numeric(14, 4) NOT NULL DEFAULT 0,
  impressions bigint NOT NULL DEFAULT 0,
  clicks bigint NOT NULL DEFAULT 0,
  imported_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (delivery_date, platform, account_id, campaign_id, ad_set_id, ad_id),
  CONSTRAINT delivery_platform_valid CHECK (
    platform IN ('google', 'meta', 'tiktok', 'snapchat', 'microsoft')
  ),
  CONSTRAINT delivery_nonnegative CHECK (spend >= 0 AND impressions >= 0 AND clicks >= 0)
);

CREATE TABLE IF NOT EXISTS platform_attribution_validations (
  validation_id text UNIQUE NOT NULL,
  lead_id text NOT NULL REFERENCES lead_inquiries(lead_id),
  platform text NOT NULL,
  identifier_type text NOT NULL,
  identifier_sha256 char(64) NOT NULL,
  provenance text NOT NULL,
  source_record_id text NOT NULL,
  validated_at timestamptz NOT NULL,
  imported_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (lead_id, platform),
  CONSTRAINT attribution_identifier_hash CHECK (identifier_sha256 ~ '^[a-f0-9]{64}$'),
  CONSTRAINT attribution_validation_platform_valid CHECK (
    platform IN ('google', 'meta', 'tiktok', 'snapchat', 'microsoft')
  ),
  CONSTRAINT attribution_validation_identifier_valid CHECK (
    identifier_type IN ('ad_id', 'fbclid', 'fbc', 'gbraid', 'gclid', 'ttclid', 'wbraid')
  ),
  CONSTRAINT attribution_validation_provenance_valid CHECK (
    provenance IN ('google_data_manager', 'meta_events_manager', 'tiktok_events_manager', 'reviewed_platform_export')
  ),
  CONSTRAINT attribution_validation_provenance_matches_platform CHECK (
    provenance = 'reviewed_platform_export'
    OR (platform = 'google' AND provenance = 'google_data_manager')
    OR (platform = 'meta' AND provenance = 'meta_events_manager')
    OR (platform = 'tiktok' AND provenance = 'tiktok_events_manager')
  )
);

CREATE TABLE IF NOT EXISTS platform_postbacks (
  platform text NOT NULL,
  conversion_event_id text NOT NULL REFERENCES conversion_events(event_id),
  status text NOT NULL DEFAULT 'pending',
  attempt_count integer NOT NULL DEFAULT 0,
  last_attempt_at timestamptz,
  accepted_at timestamptz,
  validated_at timestamptz,
  provider_receipt_id text,
  lease_token text,
  leased_at timestamptz,
  lease_expires_at timestamptz,
  error_code text,
  error_summary text,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (platform, conversion_event_id),
  CONSTRAINT postback_platform_valid CHECK (platform IN ('google', 'meta', 'tiktok')),
  CONSTRAINT postback_status_valid CHECK (
    status IN ('pending', 'processing', 'accepted', 'validated', 'retry', 'failed', 'disabled')
  ),
  CONSTRAINT postback_attempts_valid CHECK (attempt_count BETWEEN 0 AND 8)
);

CREATE TABLE IF NOT EXISTS source_sync_runs (
  run_id text PRIMARY KEY,
  source text NOT NULL,
  started_at timestamptz NOT NULL,
  completed_at timestamptz,
  status text NOT NULL,
  records_seen integer NOT NULL DEFAULT 0,
  records_applied integer NOT NULL DEFAULT 0,
  error_summary text,
  CONSTRAINT sync_status_valid CHECK (status IN ('running', 'complete', 'partial', 'failed'))
);

CREATE OR REPLACE FUNCTION enforce_verified_attribution_immutability()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_TABLE_NAME = 'attribution_receipts' THEN
    IF NEW.form_id IS DISTINCT FROM OLD.form_id THEN
      RAISE EXCEPTION 'browser lead event cannot be reassigned to another Formspree form';
    END IF;
    IF OLD.verification_status = 'verified' AND (
      NEW.form_key IS DISTINCT FROM OLD.form_key
      OR NEW.accepted_at IS DISTINCT FROM OLD.accepted_at OR NEW.schema_version IS DISTINCT FROM OLD.schema_version
      OR NEW.canonical_lead_id IS DISTINCT FROM OLD.canonical_lead_id
      OR NEW.verification_status IS DISTINCT FROM OLD.verification_status
      OR NEW.verified_at IS DISTINCT FROM OLD.verified_at
      OR NEW.retention_expires_at IS DISTINCT FROM OLD.retention_expires_at) THEN
      RAISE EXCEPTION 'verified attribution receipt is immutable';
    END IF;
  ELSIF TG_TABLE_NAME = 'ad_touchpoints' THEN
    IF TG_OP = 'DELETE' AND OLD.retention_expires_at <= now() THEN
      RETURN OLD;
    END IF;
    IF EXISTS (SELECT 1 FROM attribution_receipts WHERE lead_event_id = OLD.lead_event_id
      AND verification_status = 'verified') AND (
      NEW.touch_id IS DISTINCT FROM OLD.touch_id
      OR NEW.lead_event_id IS DISTINCT FROM OLD.lead_event_id
      OR NEW.touch_type IS DISTINCT FROM OLD.touch_type
      OR NEW.captured_at IS DISTINCT FROM OLD.captured_at
      OR NEW.anonymous_id IS DISTINCT FROM OLD.anonymous_id
      OR NEW.session_id IS DISTINCT FROM OLD.session_id
      OR NEW.landing_page IS DISTINCT FROM OLD.landing_page
      OR NEW.referrer IS DISTINCT FROM OLD.referrer
      OR NEW.utm IS DISTINCT FROM OLD.utm
      OR NEW.click_ids IS DISTINCT FROM OLD.click_ids
      OR NEW.ad_dimensions IS DISTINCT FROM OLD.ad_dimensions
      OR NEW.ga_client_id IS DISTINCT FROM OLD.ga_client_id
      OR NEW.ga_session_id IS DISTINCT FROM OLD.ga_session_id
      OR NEW.analytics_consent IS DISTINCT FROM OLD.analytics_consent
      OR NEW.marketing_consent IS DISTINCT FROM OLD.marketing_consent
      OR NEW.consent_policy_version IS DISTINCT FROM OLD.consent_policy_version
      OR NEW.consent_recorded_at IS DISTINCT FROM OLD.consent_recorded_at
      OR NEW.retention_expires_at IS DISTINCT FROM OLD.retention_expires_at
    ) THEN
      RAISE EXCEPTION 'touchpoint for verified receipt is immutable';
    END IF;
    IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS immutable_verified_receipt ON attribution_receipts;
CREATE TRIGGER immutable_verified_receipt BEFORE UPDATE ON attribution_receipts
FOR EACH ROW EXECUTE FUNCTION enforce_verified_attribution_immutability();
DROP TRIGGER IF EXISTS immutable_verified_touch ON ad_touchpoints;
CREATE TRIGGER immutable_verified_touch BEFORE UPDATE OR DELETE ON ad_touchpoints
FOR EACH ROW EXECUTE FUNCTION enforce_verified_attribution_immutability();

CREATE OR REPLACE FUNCTION enforce_lead_identity_immutability()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.lead_id IS DISTINCT FROM OLD.lead_id OR NEW.form_id IS DISTINCT FROM OLD.form_id
    OR NEW.submission_id IS DISTINCT FROM OLD.submission_id
    OR (OLD.lead_event_id IS NOT NULL AND NEW.lead_event_id IS DISTINCT FROM OLD.lead_event_id) THEN
    RAISE EXCEPTION 'canonical lead identity is immutable';
  END IF;
  IF EXISTS (
    SELECT 1 FROM lead_conversion_links lcl
    JOIN conversion_events c ON c.event_id = lcl.conversion_event_id
    WHERE lcl.lead_id = OLD.lead_id AND c.occurred_at < NEW.submitted_at
  ) THEN
    RAISE EXCEPTION 'lead update would place a linked conversion before its inquiry';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS immutable_canonical_lead_identity ON lead_inquiries;
CREATE TRIGGER immutable_canonical_lead_identity BEFORE UPDATE ON lead_inquiries
FOR EACH ROW EXECUTE FUNCTION enforce_lead_identity_immutability();

CREATE OR REPLACE FUNCTION enforce_conversion_link_chronology()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE lead_time timestamptz; conversion_time timestamptz;
BEGIN
  SELECT submitted_at INTO STRICT lead_time FROM lead_inquiries
    WHERE lead_id = NEW.lead_id AND contact_key = NEW.contact_key;
  SELECT occurred_at INTO STRICT conversion_time FROM conversion_events
    WHERE event_id = NEW.conversion_event_id AND contact_key = NEW.contact_key;
  IF conversion_time < lead_time THEN
    RAISE EXCEPTION 'conversion cannot occur before its linked inquiry';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS valid_conversion_link_chronology ON lead_conversion_links;
CREATE TRIGGER valid_conversion_link_chronology BEFORE INSERT OR UPDATE ON lead_conversion_links
FOR EACH ROW EXECUTE FUNCTION enforce_conversion_link_chronology();

CREATE OR REPLACE FUNCTION enforce_conversion_event_update_chronology()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM lead_conversion_links lcl
    JOIN lead_inquiries l ON l.lead_id = lcl.lead_id
    WHERE lcl.conversion_event_id = OLD.event_id
      AND (l.contact_key <> NEW.contact_key OR NEW.occurred_at < l.submitted_at)
  ) THEN
    RAISE EXCEPTION 'conversion update conflicts with its linked contact or inquiry time';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS valid_conversion_event_update ON conversion_events;
CREATE TRIGGER valid_conversion_event_update BEFORE UPDATE ON conversion_events
FOR EACH ROW EXECUTE FUNCTION enforce_conversion_event_update_chronology();

CREATE OR REPLACE FUNCTION enforce_validation_identifier_proof()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE candidate text; touch_platform text; touch_time timestamptz; is_platform_consistent boolean;
BEGIN
  SELECT CASE WHEN NEW.identifier_type = 'ad_id' THEN t.ad_dimensions->>'ad_id'
      ELSE t.click_ids->>NEW.identifier_type END,
    canonical_attribution_platform(COALESCE(NULLIF(t.ad_dimensions->>'platform', ''),
      NULLIF(t.utm->>'utm_source_platform', ''), NULLIF(t.utm->>'utm_source', ''), ''))
  , t.captured_at INTO candidate, touch_platform, touch_time
  FROM lead_inquiries l
  JOIN attribution_receipts r ON r.lead_event_id = l.lead_event_id AND r.verification_status = 'verified'
  JOIN ad_touchpoints t ON t.lead_event_id = l.lead_event_id AND t.touch_type = 'conversion'
  WHERE l.lead_id = NEW.lead_id;

  is_platform_consistent := canonical_attribution_platform(NEW.platform) = touch_platform;
  IF candidate IS NULL OR candidate = '' OR NOT is_platform_consistent OR NEW.validated_at < touch_time
    OR encode(digest(candidate, 'sha256'), 'hex') <> NEW.identifier_sha256 THEN
    RAISE EXCEPTION 'platform validation does not match the verified lead touchpoint';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS valid_platform_attribution_proof ON platform_attribution_validations;
CREATE TRIGGER valid_platform_attribution_proof BEFORE INSERT OR UPDATE ON platform_attribution_validations
FOR EACH ROW EXECUTE FUNCTION enforce_validation_identifier_proof();

CREATE INDEX IF NOT EXISTS lead_inquiries_contact_idx ON lead_inquiries(contact_key, submitted_at);
CREATE INDEX IF NOT EXISTS touchpoints_click_ids_gin ON ad_touchpoints USING gin(click_ids);
CREATE INDEX IF NOT EXISTS touchpoints_dimensions_gin ON ad_touchpoints USING gin(ad_dimensions);
CREATE INDEX IF NOT EXISTS conversions_contact_idx ON conversion_events(contact_key, occurred_at);
CREATE INDEX IF NOT EXISTS postback_claim_idx ON platform_postbacks(status, lease_expires_at, created_at);

CREATE OR REPLACE VIEW attribution_health_v1 AS
WITH totals AS (
  SELECT count(*)::int AS canonical_leads, min(submitted_at)::date AS source_window_start,
    max(submitted_at)::date AS source_window_end FROM lead_inquiries
), receipts AS (
  SELECT count(*) FILTER (WHERE verification_status = 'verified' AND retention_expires_at > now())::int AS verified_receipts
  FROM attribution_receipts
), lead_evidence AS (
  SELECT count(*) FILTER (WHERE t.lead_event_id IS NOT NULL)::int AS retained_evidence_leads,
    count(*) FILTER (WHERE COALESCE(NULLIF(t.ad_dimensions->>'ad_id', ''), '') <> '')::int AS exact_ad,
    min(t.captured_at)::date AS evidence_window_start, max(t.captured_at)::date AS evidence_window_end
  FROM lead_inquiries l
  LEFT JOIN attribution_receipts r ON r.lead_event_id = l.lead_event_id AND r.verification_status = 'verified'
    AND r.retention_expires_at > now()
  LEFT JOIN ad_touchpoints t ON t.lead_event_id = r.lead_event_id AND t.touch_type = 'conversion'
    AND t.retention_expires_at > now()
), student_evidence AS (
  SELECT count(DISTINCT c.event_id)::int AS students,
    count(DISTINCT c.event_id) FILTER (WHERE
      EXISTS (SELECT 1 FROM jsonb_each_text(COALESCE(t.click_ids, '{}'::jsonb)) e WHERE e.value <> '')
      OR EXISTS (SELECT 1 FROM jsonb_each_text(COALESCE(t.utm, '{}'::jsonb)) e WHERE e.value <> '')
      OR EXISTS (SELECT 1 FROM jsonb_each_text(COALESCE(t.ad_dimensions, '{}'::jsonb)) e WHERE e.value <> '')
    )::int AS sourced,
    count(DISTINCT c.event_id) FILTER (WHERE pav.validation_id IS NOT NULL)::int AS deterministic
  FROM conversion_events c
  JOIN lead_conversion_links lcl ON lcl.conversion_event_id = c.event_id
  JOIN lead_inquiries l ON l.lead_id = lcl.lead_id AND l.contact_key = lcl.contact_key
  LEFT JOIN attribution_receipts r ON r.lead_event_id = l.lead_event_id AND r.verification_status = 'verified'
    AND r.retention_expires_at > now()
  LEFT JOIN ad_touchpoints t ON t.lead_event_id = r.lead_event_id AND t.touch_type = 'conversion'
    AND t.retention_expires_at > now()
  LEFT JOIN LATERAL (
    SELECT validation_id FROM platform_attribution_validations
    WHERE lead_id = l.lead_id LIMIT 1
  ) pav ON true
  WHERE c.event_type = 'enrolled'
), postbacks AS (
  SELECT count(*) FILTER (WHERE status = 'accepted')::int AS accepted,
    count(*) FILTER (WHERE status = 'validated')::int AS validated,
    count(*) FILTER (WHERE status = 'failed')::int AS failed,
    count(*) FILTER (WHERE status IN ('pending', 'processing', 'retry'))::int AS pending
  FROM platform_postbacks
)
SELECT totals.canonical_leads, totals.source_window_start, totals.source_window_end,
  receipts.verified_receipts,
  CASE WHEN totals.canonical_leads = 0 THEN 0 ELSE round(receipts.verified_receipts::numeric / totals.canonical_leads, 4) END AS lead_capture_rate,
  lead_evidence.retained_evidence_leads,
  CASE WHEN totals.canonical_leads = 0 THEN 0 ELSE round(
    lead_evidence.retained_evidence_leads::numeric / totals.canonical_leads, 4) END AS retained_evidence_coverage_rate,
  lead_evidence.evidence_window_start, lead_evidence.evidence_window_end,
  CASE WHEN totals.canonical_leads = 0 THEN 0 ELSE round(lead_evidence.exact_ad::numeric / totals.canonical_leads, 4) END AS exact_ad_coverage_rate,
  CASE WHEN student_evidence.students = 0 THEN 0 ELSE round(student_evidence.sourced::numeric / student_evidence.students, 4) END AS student_source_coverage_rate,
  CASE WHEN student_evidence.students = 0 THEN 0 ELSE round(student_evidence.deterministic::numeric / student_evidence.students, 4) END AS deterministic_student_coverage_rate,
  postbacks.accepted AS postbacks_accepted, postbacks.validated AS postbacks_validated,
  postbacks.failed AS postbacks_failed, postbacks.pending AS postbacks_pending
FROM totals CROSS JOIN receipts CROSS JOIN lead_evidence CROSS JOIN student_evidence CROSS JOIN postbacks;

CREATE OR REPLACE VIEW attribution_unknown_reasons_v1 AS
SELECT l.lead_id,
  CASE WHEN l.lead_event_id IS NULL THEN 'legacy lead without browser receipt'
    WHEN r.lead_event_id IS NULL THEN 'browser receipt missing or unverified'
    WHEN t.lead_event_id IS NULL THEN 'conversion touch expired or missing'
    WHEN t.marketing_consent = false THEN 'marketing consent unavailable'
    WHEN NOT EXISTS (SELECT 1 FROM jsonb_each_text(COALESCE(t.click_ids, '{}'::jsonb)) e WHERE e.value <> '')
      AND NOT EXISTS (SELECT 1 FROM jsonb_each_text(COALESCE(t.utm, '{}'::jsonb)) e WHERE e.value <> '')
      AND NOT EXISTS (SELECT 1 FROM jsonb_each_text(COALESCE(t.ad_dimensions, '{}'::jsonb)) e WHERE e.value <> '')
      THEN 'no acquisition evidence'
    WHEN COALESCE(t.ad_dimensions->>'ad_id', '') = '' THEN 'specific ad not captured'
    WHEN pav.validation_id IS NULL THEN 'ad identifier not platform validated'
    ELSE 'attributed' END AS reason
FROM lead_inquiries l
LEFT JOIN attribution_receipts r ON r.lead_event_id = l.lead_event_id AND r.verification_status = 'verified'
  AND r.retention_expires_at > now()
LEFT JOIN ad_touchpoints t ON t.lead_event_id = r.lead_event_id AND t.touch_type = 'conversion'
  AND t.retention_expires_at > now()
LEFT JOIN LATERAL (
  SELECT validation_id FROM platform_attribution_validations
  WHERE lead_id = l.lead_id LIMIT 1
) pav ON true;

CREATE OR REPLACE VIEW attribution_observed_funnel_v1 AS
WITH lead_rows AS (
  SELECT l.lead_id,
    COALESCE(t.ad_dimensions->>'account_id', '') AS account_id,
    canonical_attribution_platform(COALESCE(NULLIF(t.ad_dimensions->>'platform', ''),
      NULLIF(t.utm->>'utm_source_platform', ''), NULLIF(t.utm->>'utm_source', ''),
      pav.platform, 'unattributed')) AS platform,
    COALESCE(NULLIF(t.ad_dimensions->>'campaign_id', ''), NULLIF(t.utm->>'utm_id', ''), '') AS campaign_id,
    COALESCE(NULLIF(t.ad_dimensions->>'campaign_name', ''), NULLIF(t.utm->>'utm_campaign', ''), '') AS campaign_name,
    COALESCE(NULLIF(t.ad_dimensions->>'adset_id', ''), NULLIF(t.ad_dimensions->>'adgroup_id', ''), '') AS ad_set_id,
    COALESCE(t.ad_dimensions->>'ad_id', '') AS ad_id, COALESCE(t.ad_dimensions->>'ad_name', '') AS ad_name,
    CASE WHEN pav.validation_id IS NOT NULL THEN 'A'
      WHEN COALESCE(t.ad_dimensions->>'ad_id', '') <> '' OR EXISTS (
        SELECT 1 FROM jsonb_each_text(COALESCE(t.click_ids, '{}'::jsonb)) e WHERE e.value <> '') THEN 'B'
      WHEN EXISTS (SELECT 1 FROM jsonb_each_text(COALESCE(t.utm, '{}'::jsonb)) e WHERE e.value <> '')
        OR COALESCE(t.referrer, '') <> '' THEN 'C' ELSE 'E' END AS evidence_tier
  FROM lead_inquiries l
  LEFT JOIN attribution_receipts r ON r.lead_event_id = l.lead_event_id AND r.verification_status = 'verified'
    AND r.retention_expires_at > now()
  LEFT JOIN ad_touchpoints t ON t.lead_event_id = r.lead_event_id AND t.touch_type = 'conversion'
    AND t.retention_expires_at > now()
  LEFT JOIN LATERAL (
    SELECT validation_id, platform FROM platform_attribution_validations
    WHERE lead_id = l.lead_id LIMIT 1
  ) pav ON true
), lead_aggregates AS (
  SELECT canonical_attribution_platform(platform) AS platform, account_id, campaign_id,
    max(campaign_name) AS campaign_name, ad_set_id, ad_id,
    max(ad_name) AS ad_name,
    CASE WHEN count(DISTINCT evidence_tier) = 1 THEN min(evidence_tier) ELSE 'mixed' END AS evidence_tier,
    count(*)::int AS leads,
    count(*) FILTER (WHERE evidence_tier = 'A')::int AS leads_tier_a,
    count(*) FILTER (WHERE evidence_tier = 'B')::int AS leads_tier_b,
    count(*) FILTER (WHERE evidence_tier = 'C')::int AS leads_tier_c,
    count(*) FILTER (WHERE evidence_tier = 'D')::int AS leads_tier_d,
    count(*) FILTER (WHERE evidence_tier = 'E')::int AS leads_tier_e
  FROM lead_rows GROUP BY platform, account_id, campaign_id, ad_set_id, ad_id
), student_aggregates AS (
  SELECT lr.platform, lr.account_id, lr.campaign_id, lr.ad_set_id, lr.ad_id,
    count(DISTINCT c.event_id) FILTER (WHERE c.event_type = 'enrolled')::int AS enrolled_students,
    count(DISTINCT c.event_id) FILTER (WHERE c.event_type = 'enrolled' AND lr.evidence_tier = 'A')::int AS students_tier_a,
    count(DISTINCT c.event_id) FILTER (WHERE c.event_type = 'enrolled' AND lr.evidence_tier = 'B')::int AS students_tier_b,
    count(DISTINCT c.event_id) FILTER (WHERE c.event_type = 'enrolled' AND lr.evidence_tier = 'C')::int AS students_tier_c,
    count(DISTINCT c.event_id) FILTER (WHERE c.event_type = 'enrolled' AND lr.evidence_tier = 'D')::int AS students_tier_d,
    count(DISTINCT c.event_id) FILTER (WHERE c.event_type = 'enrolled' AND lr.evidence_tier = 'E')::int AS students_tier_e
  FROM lead_rows lr
  LEFT JOIN lead_conversion_links lcl ON lcl.lead_id = lr.lead_id
  LEFT JOIN conversion_events c ON c.event_id = lcl.conversion_event_id
  GROUP BY lr.platform, lr.account_id, lr.campaign_id, lr.ad_set_id, lr.ad_id
), delivery AS (
  SELECT canonical_attribution_platform(platform) AS platform, account_id, campaign_id,
    max(campaign_name) AS campaign_name, ad_set_id, ad_id,
    max(ad_name) AS ad_name, sum(spend)::numeric AS spend, sum(impressions)::bigint AS impressions,
    sum(clicks)::bigint AS clicks
  FROM daily_ad_delivery GROUP BY canonical_attribution_platform(platform), account_id, campaign_id, ad_set_id, ad_id
), joined AS (
  SELECT COALESCE(la.platform, d.platform) AS platform,
    COALESCE(la.account_id, d.account_id) AS account_id,
    COALESCE(la.campaign_id, d.campaign_id) AS campaign_id,
    COALESCE(NULLIF(la.campaign_name, ''), d.campaign_name, '') AS campaign_name,
    COALESCE(la.ad_set_id, d.ad_set_id) AS ad_set_id, COALESCE(la.ad_id, d.ad_id) AS ad_id,
    COALESCE(NULLIF(la.ad_name, ''), d.ad_name, '') AS ad_name,
    COALESCE(la.evidence_tier, 'E') AS evidence_tier, COALESCE(la.leads, 0) AS leads,
    COALESCE(la.leads_tier_a, 0) AS leads_tier_a, COALESCE(la.leads_tier_b, 0) AS leads_tier_b,
    COALESCE(la.leads_tier_c, 0) AS leads_tier_c, COALESCE(la.leads_tier_d, 0) AS leads_tier_d,
    COALESCE(la.leads_tier_e, 0) AS leads_tier_e,
    CASE WHEN COALESCE(la.leads, 0) = 0 THEN 0 ELSE round(
      (COALESCE(la.leads_tier_a, 0) + COALESCE(la.leads_tier_b, 0) + COALESCE(la.leads_tier_c, 0)
        + COALESCE(la.leads_tier_d, 0))::numeric / la.leads, 4) END AS lead_evidence_coverage_rate,
    COALESCE(sa.enrolled_students, 0) AS enrolled_students,
    COALESCE(sa.students_tier_a, 0) AS students_tier_a, COALESCE(sa.students_tier_b, 0) AS students_tier_b,
    COALESCE(sa.students_tier_c, 0) AS students_tier_c, COALESCE(sa.students_tier_d, 0) AS students_tier_d,
    COALESCE(sa.students_tier_e, 0) AS students_tier_e,
    CASE WHEN COALESCE(sa.enrolled_students, 0) = 0 THEN 0 ELSE round(
      (COALESCE(sa.students_tier_a, 0) + COALESCE(sa.students_tier_b, 0)
        + COALESCE(sa.students_tier_c, 0) + COALESCE(sa.students_tier_d, 0))::numeric
        / sa.enrolled_students, 4) END AS student_evidence_coverage_rate,
    COALESCE(d.spend, 0) AS spend,
    COALESCE(d.impressions, 0) AS impressions, COALESCE(d.clicks, 0) AS clicks
  FROM lead_aggregates la
  FULL OUTER JOIN delivery d USING (platform, account_id, campaign_id, ad_set_id, ad_id)
  LEFT JOIN student_aggregates sa ON sa.platform = COALESCE(la.platform, d.platform)
    AND sa.account_id = COALESCE(la.account_id, d.account_id)
    AND sa.campaign_id = COALESCE(la.campaign_id, d.campaign_id)
    AND sa.ad_set_id = COALESCE(la.ad_set_id, d.ad_set_id)
    AND sa.ad_id = COALESCE(la.ad_id, d.ad_id)
)
SELECT * FROM joined;

COMMIT;
