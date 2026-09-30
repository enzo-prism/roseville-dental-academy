BEGIN;

-- Follow-up migration for already-provisioned databases. No browser evidence is rewritten.
ALTER TABLE ad_touchpoints ADD COLUMN IF NOT EXISTS client_user_agent text;
ALTER TABLE ad_touchpoints DROP CONSTRAINT IF EXISTS touch_client_user_agent_consent;
ALTER TABLE ad_touchpoints ADD CONSTRAINT touch_client_user_agent_consent CHECK (
  client_user_agent IS NULL OR (touch_type = 'conversion' AND marketing_consent
    AND char_length(client_user_agent) BETWEEN 1 AND 512)
);

CREATE OR REPLACE FUNCTION enforce_touch_user_agent_immutability()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.client_user_agent IS DISTINCT FROM OLD.client_user_agent AND EXISTS (
    SELECT 1 FROM attribution_receipts WHERE lead_event_id = OLD.lead_event_id
      AND verification_status = 'verified'
  ) THEN
    RAISE EXCEPTION 'browser user agent for verified receipt is immutable';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS immutable_verified_touch_user_agent ON ad_touchpoints;
CREATE TRIGGER immutable_verified_touch_user_agent BEFORE UPDATE ON ad_touchpoints
FOR EACH ROW EXECUTE FUNCTION enforce_touch_user_agent_immutability();

CREATE OR REPLACE FUNCTION enforce_lead_identity_immutability()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.lead_id IS DISTINCT FROM OLD.lead_id OR NEW.form_id IS DISTINCT FROM OLD.form_id
    OR NEW.submission_id IS DISTINCT FROM OLD.submission_id
    OR NEW.contact_key IS DISTINCT FROM OLD.contact_key
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

CREATE OR REPLACE FUNCTION enforce_receipt_canonical_identity()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.verification_status = 'verified' AND NOT EXISTS (
    SELECT 1 FROM lead_inquiries l WHERE l.lead_id = NEW.canonical_lead_id
      AND l.form_id = NEW.form_id AND l.lead_event_id = NEW.lead_event_id
  ) THEN
    RAISE EXCEPTION 'verified receipt must match its canonical lead identity';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS valid_receipt_canonical_identity ON attribution_receipts;
CREATE TRIGGER valid_receipt_canonical_identity BEFORE INSERT OR UPDATE ON attribution_receipts
FOR EACH ROW EXECUTE FUNCTION enforce_receipt_canonical_identity();

CREATE OR REPLACE FUNCTION enforce_conversion_event_immutability()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.event_id IS DISTINCT FROM OLD.event_id
    OR NEW.event_type IS DISTINCT FROM OLD.event_type
    OR NEW.occurred_at IS DISTINCT FROM OLD.occurred_at
    OR NEW.source_record_id IS DISTINCT FROM OLD.source_record_id
    OR NEW.contact_key IS DISTINCT FROM OLD.contact_key THEN
    RAISE EXCEPTION 'canonical conversion event is immutable';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS immutable_canonical_conversion_event ON conversion_events;
CREATE TRIGGER immutable_canonical_conversion_event BEFORE UPDATE ON conversion_events
FOR EACH ROW EXECUTE FUNCTION enforce_conversion_event_immutability();

CREATE INDEX IF NOT EXISTS delivery_exact_ad_identity_idx
  ON daily_ad_delivery(platform, ad_id, campaign_id, account_id, ad_set_id) WHERE ad_id <> '';

CREATE OR REPLACE VIEW attribution_observed_funnel_v1 AS
WITH delivery_identities AS (
  SELECT DISTINCT canonical_attribution_platform(platform) AS platform,
    account_id, campaign_id, ad_set_id, ad_id
  FROM daily_ad_delivery WHERE ad_id <> ''
), captured_lead_rows AS (
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
), lead_rows AS (
  -- Enrich dimensions only from one exact ad identity in the trusted delivery import.
  -- Conflicting or ambiguous identities retain captured dimensions; they never fan out.
  SELECT lr.lead_id, lr.platform,
    COALESCE(NULLIF(lr.account_id, ''), identity.account_id, '') AS account_id,
    COALESCE(NULLIF(lr.campaign_id, ''), identity.campaign_id, '') AS campaign_id,
    lr.campaign_name,
    COALESCE(NULLIF(lr.ad_set_id, ''), identity.ad_set_id, '') AS ad_set_id,
    lr.ad_id, lr.ad_name, lr.evidence_tier
  FROM captured_lead_rows lr
  LEFT JOIN LATERAL (
    SELECT min(d.account_id) AS account_id, min(d.campaign_id) AS campaign_id,
      min(d.ad_set_id) AS ad_set_id
    FROM delivery_identities d
    WHERE lr.ad_id <> '' AND d.platform = lr.platform AND d.ad_id = lr.ad_id
      AND (lr.account_id = '' OR d.account_id = lr.account_id)
      AND (lr.campaign_id = '' OR d.campaign_id = lr.campaign_id)
      AND (lr.ad_set_id = '' OR d.ad_set_id = lr.ad_set_id)
    HAVING count(*) = 1
  ) identity ON true
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
