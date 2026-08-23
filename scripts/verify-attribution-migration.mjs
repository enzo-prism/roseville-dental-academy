import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { PGlite } from "@electric-sql/pglite";
import { pgcrypto } from "@electric-sql/pglite/contrib/pgcrypto";
import { splitSqlStatements } from "./migrate-attribution.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const migration = await readFile(join(root, "db/migrations/001_attribution_ledger.sql"), "utf8");
const db = await PGlite.create({ extensions: { pgcrypto } });

async function mustReject(label, operation) {
  let rejected = false;
  try {
    await operation();
  } catch {
    rejected = true;
  }
  assert.equal(rejected, true, label);
}

try {
  const statements = splitSqlStatements(migration);
  await db.exec("BEGIN");
  try {
    for (const statement of statements) await db.exec(statement);
    await db.exec("COMMIT");
  } catch (error) {
    await db.exec("ROLLBACK");
    throw error;
  }
  await db.exec(`
    INSERT INTO contacts_private (contact_key, email_sha256)
    VALUES ('contact_fixture', repeat('a', 64));

    INSERT INTO attribution_receipts (
      lead_event_id, form_id, accepted_at, schema_version
    ) VALUES ('event_fixture', 'xzdkgaeg', '2026-08-20T18:00:00Z', 1);

    INSERT INTO ad_touchpoints (
      touch_id, lead_event_id, touch_type, captured_at, anonymous_id, session_id,
      landing_page, referrer, utm, click_ids, ad_dimensions, analytics_consent,
      marketing_consent, consent_policy_version, consent_recorded_at
    ) VALUES
      ('touch_first', 'event_fixture', 'first', '2026-08-20T17:00:00Z',
       'anonymous_fixture', 'session_fixture', '/lp/example', NULL,
       '{"utm_source":"meta","utm_campaign":"fixture"}',
       '{"fbclid":"fb_click_fixture"}',
       '{"platform":"meta_ads","account_id":"account_fixture","campaign_id":"campaign_fixture","ad_id":"ad_fixture"}',
       true, true, '2026-08-23', '2026-08-20T17:00:00Z'),
      ('touch_conversion', 'event_fixture', 'conversion', '2026-08-20T17:30:00Z',
       'anonymous_fixture', 'session_fixture', '/contact', NULL,
       '{"utm_source":"meta","utm_campaign":"fixture"}',
       '{"fbclid":"fb_click_fixture"}',
       '{"platform":"meta_ads","account_id":"account_fixture","campaign_id":"campaign_fixture","ad_id":"ad_fixture"}',
       true, true, '2026-08-23', '2026-08-20T17:30:00Z');

    INSERT INTO lead_inquiries (
      lead_id, form_id, submission_id, lead_event_id, contact_key, submitted_at
    ) VALUES (
      'xzdkgaeg:formspree_fixture', 'xzdkgaeg', 'formspree_fixture',
      'event_fixture', 'contact_fixture', '2026-08-20T18:00:00Z'
    );

    UPDATE attribution_receipts
    SET canonical_lead_id = 'xzdkgaeg:formspree_fixture',
        verification_status = 'verified', verified_at = now()
    WHERE lead_event_id = 'event_fixture';

    INSERT INTO platform_attribution_validations (
      validation_id, lead_id, platform, identifier_type, identifier_sha256,
      provenance, source_record_id, validated_at
    ) VALUES (
      'validation_fixture', 'xzdkgaeg:formspree_fixture', 'meta', 'fbclid',
      encode(digest('fb_click_fixture', 'sha256'), 'hex'),
      'meta_events_manager', 'provider_fixture', '2026-08-20T19:00:00Z'
    );

    INSERT INTO conversion_events (
      event_id, event_type, occurred_at, source_record_id, contact_key
    ) VALUES (
      'enrolled_fixture', 'enrolled', '2026-08-22T18:00:00Z',
      'pms_fixture', 'contact_fixture'
    );

    INSERT INTO lead_conversion_links (
      conversion_event_id, lead_id, contact_key, match_method, match_confidence
    ) VALUES (
      'enrolled_fixture', 'xzdkgaeg:formspree_fixture', 'contact_fixture',
      'reviewed', 'high'
    );

    INSERT INTO daily_ad_delivery (
      delivery_date, platform, account_id, campaign_id, campaign_name,
      ad_id, ad_name, spend, impressions, clicks
    ) VALUES (
      '2026-08-20', 'meta', 'account_fixture', 'campaign_fixture', 'Fixture campaign',
      'ad_fixture', 'Fixture ad', 100, 1000, 50
    );

    INSERT INTO contacts_private (contact_key) VALUES ('contact_mixed');
    INSERT INTO attribution_receipts (lead_event_id, form_id, accepted_at, schema_version)
      VALUES ('event_mixed', 'xzdkgaeg', '2026-08-21T18:00:00Z', 1);
    INSERT INTO ad_touchpoints (
      touch_id, lead_event_id, touch_type, captured_at, anonymous_id, session_id,
      landing_page, referrer, utm, click_ids, ad_dimensions, analytics_consent,
      marketing_consent, consent_policy_version, consent_recorded_at
    ) VALUES
      ('touch_mixed_first', 'event_mixed', 'first', '2026-08-21T17:00:00Z',
       'anonymous_mixed', 'session_mixed', '/lp/example', NULL, '{}',
       '{"fbclid":"fb_click_mixed"}',
       '{"platform":"facebook","account_id":"account_fixture","campaign_id":"campaign_fixture","ad_id":"ad_fixture"}',
       true, true, '2026-08-23', '2026-08-21T17:00:00Z'),
      ('touch_mixed_conversion', 'event_mixed', 'conversion', '2026-08-21T17:30:00Z',
       'anonymous_mixed', 'session_mixed', '/contact', NULL, '{}',
       '{"fbclid":"fb_click_mixed"}',
       '{"platform":"facebook","account_id":"account_fixture","campaign_id":"campaign_fixture","ad_id":"ad_fixture"}',
       true, true, '2026-08-23', '2026-08-21T17:30:00Z');
    INSERT INTO lead_inquiries (lead_id, form_id, submission_id, lead_event_id, contact_key, submitted_at)
      VALUES ('xzdkgaeg:formspree_mixed', 'xzdkgaeg', 'formspree_mixed', 'event_mixed',
        'contact_mixed', '2026-08-21T18:00:00Z');
    UPDATE attribution_receipts SET canonical_lead_id = 'xzdkgaeg:formspree_mixed',
      verification_status = 'verified', verified_at = now() WHERE lead_event_id = 'event_mixed';
  `);

  const health = await db.query("SELECT * FROM attribution_health_v1");
  assert.equal(health.rows[0].canonical_leads, 2);
  assert.equal(health.rows[0].verified_receipts, 2);
  assert.equal(Number(health.rows[0].deterministic_student_coverage_rate), 1);

  const funnel = await db.query("SELECT * FROM attribution_observed_funnel_v1");
  assert.equal(funnel.rows.length, 1, "one ad row must not duplicate spend or students");
  assert.equal(funnel.rows[0].platform, "meta", "platform aliases must join to canonical delivery");
  assert.equal(funnel.rows[0].evidence_tier, "mixed");
  assert.equal(funnel.rows[0].leads, 2);
  assert.equal(funnel.rows[0].leads_tier_a, 1);
  assert.equal(funnel.rows[0].leads_tier_b, 1);
  assert.equal(funnel.rows[0].enrolled_students, 1);
  assert.equal(Number(funnel.rows[0].spend), 100);

  await mustReject("verified touchpoints must reject replay updates", () =>
    db.exec("UPDATE ad_touchpoints SET click_ids = '{\"fbclid\":\"forged\"}' WHERE touch_id = 'touch_conversion';"),
  );
  await db.exec("UPDATE ad_touchpoints SET click_ids = click_ids WHERE touch_id = 'touch_conversion';");
  await mustReject("verified receipt conflicts must fail instead of becoming silent no-ops", () =>
    db.exec(`INSERT INTO attribution_receipts (lead_event_id, form_id, accepted_at, schema_version)
      VALUES ('event_fixture', 'mpqgyjjg', '2026-08-20T18:00:00Z', 1)
      ON CONFLICT (lead_event_id) DO UPDATE SET form_id = EXCLUDED.form_id;`),
  );
  await db.exec(`INSERT INTO attribution_receipts (lead_event_id, form_id, accepted_at, schema_version)
    VALUES ('event_consent', 'xzdkgaeg', now(), 1);`);
  await mustReject("consent checks must reject tracking without consent before uniqueness checks", () =>
    db.exec(`INSERT INTO ad_touchpoints (
      touch_id, lead_event_id, touch_type, captured_at, anonymous_id, session_id,
      landing_page, utm, click_ids, ad_dimensions, analytics_consent, marketing_consent,
      consent_policy_version, consent_recorded_at
    ) VALUES (
      'touch_forbidden', 'event_consent', 'first', now(), '', '', '/', '{}',
      '{"gclid":"forbidden"}', '{}', false, false, '2026-08-23', now()
    );`),
  );

  await db.exec(`
    INSERT INTO conversion_events (
      event_id, event_type, occurred_at, source_record_id, contact_key
    ) VALUES (
      'early_fixture', 'enrolled', '2026-08-19T18:00:00Z',
      'pms_early_fixture', 'contact_fixture'
    );
  `);
  await mustReject("conversion links must reject outcomes before the inquiry", () =>
    db.exec(`INSERT INTO lead_conversion_links (
      conversion_event_id, lead_id, contact_key, match_method, match_confidence
    ) VALUES (
      'early_fixture', 'xzdkgaeg:formspree_fixture', 'contact_fixture', 'reviewed', 'high'
    );`),
  );

  await mustReject("canonical leads must reject immutable browser-event conflicts", () =>
    db.exec("UPDATE lead_inquiries SET lead_event_id = 'event_forged' WHERE lead_id = 'xzdkgaeg:formspree_fixture';"),
  );
  await mustReject("receipt identities must reject Formspree form reassignment", () =>
    db.exec("UPDATE attribution_receipts SET form_id = 'mpqgyjjg' WHERE lead_event_id = 'event_consent';"),
  );
  await mustReject("platform validation must match the captured identifier", () =>
    db.exec(`INSERT INTO platform_attribution_validations (
      validation_id, lead_id, platform, identifier_type, identifier_sha256,
      provenance, source_record_id, validated_at
    ) VALUES ('validation_bad', 'xzdkgaeg:formspree_mixed', 'meta', 'fbclid',
      repeat('f', 64), 'meta_events_manager', 'provider_bad', '2026-08-22T19:00:00Z');`),
  );

  await db.exec(`
    INSERT INTO contacts_private (contact_key) VALUES ('contact_expired');
    INSERT INTO attribution_receipts (
      lead_event_id, form_id, accepted_at, schema_version, retention_expires_at
    ) VALUES ('event_expired', 'xzdkgaeg', '2025-01-01T18:00:00Z', 1, '2025-07-01T18:00:00Z');
    INSERT INTO ad_touchpoints (
      touch_id, lead_event_id, touch_type, captured_at, anonymous_id, session_id, landing_page,
      utm, click_ids, ad_dimensions, analytics_consent, marketing_consent,
      consent_policy_version, consent_recorded_at, retention_expires_at
    ) VALUES ('touch_expired', 'event_expired', 'conversion', '2025-01-01T17:30:00Z',
      'anonymous_expired', 'session_expired', '/', '{}', '{}', '{}', true, true,
      '2026-08-23', '2025-01-01T17:30:00Z', '2025-07-01T18:00:00Z');
    INSERT INTO lead_inquiries (lead_id, form_id, submission_id, lead_event_id, contact_key, submitted_at)
      VALUES ('xzdkgaeg:formspree_expired', 'xzdkgaeg', 'formspree_expired', 'event_expired',
        'contact_expired', '2025-01-01T18:00:00Z');
    UPDATE attribution_receipts SET canonical_lead_id = 'xzdkgaeg:formspree_expired',
      verification_status = 'verified', verified_at = now() WHERE lead_event_id = 'event_expired';
  `);
  const retainedHealth = await db.query("SELECT * FROM attribution_health_v1");
  assert.equal(retainedHealth.rows[0].canonical_leads, 3);
  assert.equal(retainedHealth.rows[0].retained_evidence_leads, 2);
  assert.equal(Number(retainedHealth.rows[0].retained_evidence_coverage_rate), 0.6667);
  await db.exec("DELETE FROM ad_touchpoints WHERE retention_expires_at <= now();");
  const expiredTouch = await db.query("SELECT touch_id FROM ad_touchpoints WHERE touch_id = 'touch_expired';");
  assert.equal(expiredTouch.rows.length, 0, "expired verified touch payloads must be purgeable");
  await db.exec("DELETE FROM attribution_receipts WHERE retention_expires_at <= now();");
  const expiredReceipt = await db.query(
    "SELECT lead_event_id FROM attribution_receipts WHERE lead_event_id = 'event_expired';",
  );
  assert.equal(expiredReceipt.rows.length, 0, "expired verified receipt headers must be purgeable");

  await db.exec(`INSERT INTO platform_postbacks (platform, conversion_event_id, status)
    VALUES ('meta', 'enrolled_fixture', 'pending');`);
  const firstLease = await db.query(`WITH candidate AS (
      SELECT platform, conversion_event_id FROM platform_postbacks WHERE status = 'pending'
      FOR UPDATE SKIP LOCKED
    ) UPDATE platform_postbacks p SET status = 'processing', lease_token = 'lease_fixture',
      leased_at = now(), lease_expires_at = now() + interval '5 minutes'
      FROM candidate c WHERE p.platform = c.platform AND p.conversion_event_id = c.conversion_event_id
      RETURNING p.conversion_event_id;`);
  assert.equal(firstLease.rows.length, 1);
  const secondLease = await db.query("SELECT * FROM platform_postbacks WHERE status = 'pending';");
  assert.equal(secondLease.rows.length, 0, "an active lease must prevent a second pending claim");

  console.log(JSON.stringify({
    aggregateRows: funnel.rows.length,
    migration: "001_attribution_ledger.sql",
    status: "passed",
    splitStatements: statements.length,
    triggerChecks: 9,
  }));
} finally {
  await db.close();
}
