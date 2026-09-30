import { readFile, readdir } from "node:fs/promises";
import { resolve } from "node:path";
import { runInNewContext } from "node:vm";
import * as crypto from "node:crypto";

import { PGlite } from "@electric-sql/pglite";
import { pgcrypto } from "@electric-sql/pglite/contrib/pgcrypto";
import { expect, test } from "@playwright/test";
import ts from "typescript";

import type { PendingPostback, PostbackOutcome } from "../lib/server/attribution-db";

import { parseAttributionReceipt } from "../lib/server/attribution-validation";
import type { AttributionReceipt, CanonicalConversionInput, CanonicalLeadInput } from "../lib/attribution-contract";

type Statement = { query: string; values: unknown[] };
function statement(strings: TemplateStringsArray, ...values: unknown[]): Statement {
  return { query: strings.reduce((query, part, index) => query + (index ? `$${index}` : "") + part, ""), values };
}

// Execute the real server functions with a parameterized, transactional Neon adapter.
// Only credentials and provider configuration are synthetic; no network is used.
async function fixture(withIntegrity = true) {
  const db = await PGlite.create({ extensions: { pgcrypto } });
  const directory = resolve("db/migrations");
  for (const name of (await readdir(directory)).filter((name) => /^\d+_.+\.sql$/u.test(name)).sort()) {
    if (withIntegrity || name.startsWith("001_")) await db.exec(await readFile(resolve(directory, name), "utf8"));
  }
  const sql = Object.assign(async (strings: TemplateStringsArray, ...values: unknown[]) => {
    const query = statement(strings, ...values);
    return (await db.query<Record<string, unknown>>(query.query, query.values)).rows;
  }, {
    transaction: async (producer: (tx: typeof statement) => Statement[]) => db.transaction(async (tx) => {
      const results = [];
      for (const query of producer(statement)) results.push((await tx.query<Record<string, unknown>>(query.query, query.values)).rows);
      return results;
    }),
  });
  const sourceModule = { exports: {} };
  const source = await readFile(resolve("lib/server/attribution-db.ts"), "utf8");
  const javascript = ts.transpileModule(source, {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
  }).outputText;
  runInNewContext(javascript, {
    module: sourceModule, exports: sourceModule.exports, process: { env: { DATABASE_URL: "in-memory-test-only" } },
    require: (name: string) => {
      if (name === "node:crypto") return crypto;
      if (name === "@neondatabase/serverless") return { neon: () => sql };
      if (name === "@/lib/server/postback-config") return {
        configuredPostbackPlatforms: (milestone: string) => milestone === "enrolled" ? ["meta"] : ["google"],
        validateOnlyMode: () => false,
      };
      throw new Error(`Unexpected database module dependency: ${name}`);
    },
  });
  return { db, api: sourceModule.exports as {
    upsertAttributionReceipt: (receipt: AttributionReceipt, requestUserAgent?: string) => Promise<void>;
    upsertCanonicalLeads: (rows: CanonicalLeadInput[]) => Promise<void>;
    upsertCanonicalConversions: (rows: CanonicalConversionInput[]) => Promise<void>;
    claimPendingPostbacks: (limit?: number, excludedJobKeys?: readonly string[]) => Promise<PendingPostback[]>;
    updatePostbackStatus: (job: PendingPostback, result: PostbackOutcome) => Promise<void>;
  } };
}

const lead: CanonicalLeadInput = {
  contactKey: "fixture_contact", formId: "xzdkgaeg", submissionId: "fixture_submission",
  leadId: "xzdkgaeg:fixture_submission", leadEventId: "fixture_event_a",
  submittedAt: "2026-09-01T00:00:00.000Z",
};
const conversion: CanonicalConversionInput = {
  contactKey: lead.contactKey, eventId: "fixture_conversion", eventType: "enrolled",
  leadId: lead.leadId, matchConfidence: "high", matchMethod: "reviewed",
  occurredAt: "2026-09-03T00:00:00.000Z", sourceRecordId: "fixture_enrollment",
};

test("canonical retries preserve identity and reject conflicting browser receipts transactionally", async () => {
  const { db, api } = await fixture();
  try {
    await api.upsertCanonicalLeads([lead]);
    await api.upsertCanonicalLeads([lead]);
    await db.exec(`INSERT INTO attribution_receipts (lead_event_id, form_id, accepted_at, schema_version)
      VALUES ('fixture_event_b', 'xzdkgaeg', '2026-09-01T00:00:00Z', 1);`);
    await expect(api.upsertCanonicalLeads([
      { ...lead, leadId: "xzdkgaeg:batch_lead", submissionId: "batch_lead", leadEventId: undefined },
      { ...lead, leadEventId: "fixture_event_b", emailSha256: "a".repeat(64) },
    ])).rejects.toThrow(/canonical lead identity is immutable/);
    expect((await db.query<Record<string, unknown>>("SELECT lead_event_id FROM lead_inquiries")).rows).toEqual([{ lead_event_id: lead.leadEventId }]);
    expect((await db.query<Record<string, unknown>>("SELECT verification_status, canonical_lead_id FROM attribution_receipts")).rows)
      .toEqual([{ verification_status: "pending", canonical_lead_id: null }]);
    expect((await db.query<Record<string, unknown>>("SELECT email_sha256 FROM contacts_private")).rows).toEqual([{ email_sha256: null }]);
    await expect(db.exec(`UPDATE attribution_receipts SET verification_status = 'verified',
      canonical_lead_id = 'xzdkgaeg:fixture_submission', verified_at = now()
      WHERE lead_event_id = 'fixture_event_b'`)).rejects.toThrow(/verified receipt must match its canonical lead identity/);
    await expect(api.upsertCanonicalLeads([{ ...lead, contactKey: "reassigned_contact" }]))
      .rejects.toThrow(/canonical lead identity is immutable/);
    expect((await db.query<Record<string, unknown>>("SELECT contact_key FROM contacts_private")).rows).toEqual([{ contact_key: lead.contactKey }]);
  } finally { await db.close(); }
});

test("a legacy canonical lead can receive its first browser event and exact retries verify only that event", async () => {
  const { db, api } = await fixture();
  try {
    await api.upsertCanonicalLeads([{ ...lead, leadEventId: undefined }]);
    await db.exec(`INSERT INTO attribution_receipts (lead_event_id, form_id, accepted_at, schema_version)
      VALUES ('fixture_event_a', 'xzdkgaeg', '2026-09-01T00:00:00Z', 1);`);
    await api.upsertCanonicalLeads([lead]);
    await api.upsertCanonicalLeads([lead]);
    expect((await db.query<Record<string, unknown>>("SELECT verification_status, canonical_lead_id FROM attribution_receipts")).rows)
      .toEqual([{ verification_status: "verified", canonical_lead_id: lead.leadId }]);
  } finally { await db.close(); }
});

test("conversion replay conflicts roll back before relinking, retention changes, or provider enqueueing", async () => {
  const { db, api } = await fixture();
  try {
    const otherLead = { ...lead, leadId: "xzdkgaeg:other_submission", submissionId: "other_submission", leadEventId: undefined };
    await api.upsertCanonicalLeads([lead, otherLead]);
    await api.upsertCanonicalConversions([conversion]);
    await api.upsertCanonicalConversions([conversion]);
    const retentionBefore = (await db.query<Record<string, unknown>>("SELECT retention_expires_at FROM contacts_private")).rows;

    for (const change of [
      { eventType: "class_started" as const }, { occurredAt: "2026-09-04T00:00:00.000Z" },
      { sourceRecordId: "changed_source" }, { occurredAt: "2026-08-01T00:00:00.000Z" },
    ]) {
      await expect(api.upsertCanonicalConversions([
        { ...conversion, eventId: "batch_conversion", sourceRecordId: "batch_source" },
        { ...conversion, ...change, leadId: otherLead.leadId },
      ])).rejects.toThrow(/canonical conversion event is immutable/);
    }
    expect((await db.query<Record<string, unknown>>("SELECT retention_expires_at FROM contacts_private")).rows).toEqual(retentionBefore);
    await expect(api.upsertCanonicalConversions([{ ...conversion, eventId: "early_conversion",
      sourceRecordId: "early_source", occurredAt: "2026-08-01T00:00:00.000Z" }]))
      .rejects.toThrow(/conversion cannot occur before its linked inquiry/);
    expect((await db.query<Record<string, unknown>>("SELECT event_type, source_record_id FROM conversion_events")).rows)
      .toEqual([{ event_type: conversion.eventType, source_record_id: conversion.sourceRecordId }]);
    expect((await db.query<Record<string, unknown>>("SELECT lead_id FROM lead_conversion_links")).rows).toEqual([{ lead_id: lead.leadId }]);
    expect((await db.query<Record<string, unknown>>("SELECT platform FROM platform_postbacks")).rows).toEqual([{ platform: "meta" }]);
  } finally { await db.close(); }
});

async function trackedLead(db: PGlite, dimensions: Record<string, string>, marketingConsent = true) {
  await db.exec(`INSERT INTO contacts_private (contact_key) VALUES ('funnel_contact');
    INSERT INTO attribution_receipts (lead_event_id, form_id, accepted_at, schema_version)
      VALUES ('funnel_event', 'xzdkgaeg', now() - interval '1 hour', 1);`);
  await db.query<Record<string, unknown>>(`INSERT INTO ad_touchpoints (touch_id, lead_event_id, touch_type, captured_at,
    anonymous_id, session_id, landing_page, utm, click_ids, ad_dimensions, analytics_consent,
    marketing_consent, consent_policy_version, consent_recorded_at)
    VALUES ('funnel_touch', 'funnel_event', 'conversion', now() - interval '2 hours',
      '', '', '/', '{}'::jsonb, '{}'::jsonb, $1::jsonb, false, $2, 'fixture', now() - interval '2 hours')`,
  [JSON.stringify(dimensions), marketingConsent]);
  await db.exec(`INSERT INTO lead_inquiries (lead_id, form_id, submission_id, lead_event_id, contact_key, submitted_at)
    VALUES ('xzdkgaeg:funnel_submission', 'xzdkgaeg', 'funnel_submission', 'funnel_event',
      'funnel_contact', now() - interval '1 hour');
    UPDATE attribution_receipts SET canonical_lead_id = 'xzdkgaeg:funnel_submission',
      verification_status = 'verified', verified_at = now() WHERE lead_event_id = 'funnel_event';`);
}

async function delivery(db: PGlite, account: string, adset = "fixture_adset", campaign = "fixture_campaign") {
  await db.query<Record<string, unknown>>(`INSERT INTO daily_ad_delivery (delivery_date, platform, account_id, campaign_id,
    ad_set_id, ad_id, spend, impressions, clicks) VALUES (current_date, 'meta', $1, $2, $3, 'fixture_ad', 5, 100, 2)`,
  [account, campaign, adset]);
}

test("an exact unambiguous imported ad fills missing dimensions and joins spend without upgrading evidence", async () => {
  const { db } = await fixture();
  try {
    await trackedLead(db, { platform: "facebook", campaign_id: "fixture_campaign", ad_id: "fixture_ad" });
    await delivery(db, "fixture_account");
    await db.exec(`INSERT INTO conversion_events (event_id, event_type, occurred_at, source_record_id, contact_key)
      VALUES ('funnel_student', 'enrolled', now(), 'funnel_source', 'funnel_contact');
      INSERT INTO lead_conversion_links (conversion_event_id, lead_id, contact_key, match_method, match_confidence)
      VALUES ('funnel_student', 'xzdkgaeg:funnel_submission', 'funnel_contact', 'reviewed', 'high');`);
    const { rows } = await db.query<Record<string, unknown>>("SELECT * FROM attribution_observed_funnel_v1");
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ account_id: "fixture_account", ad_set_id: "fixture_adset", leads: 1,
      enrolled_students: 1, evidence_tier: "B", leads_tier_a: 0 });
    expect(Number(rows[0].spend)).toBe(5);
    const touch = await db.query<Record<string, unknown>>("SELECT ad_dimensions FROM ad_touchpoints");
    expect(touch.rows[0].ad_dimensions).toEqual({ platform: "facebook", campaign_id: "fixture_campaign", ad_id: "fixture_ad" });
  } finally { await db.close(); }
});

test("ambiguous or conflicting imported ad identities never fan out leads or duplicate spend", async () => {
  for (const captured of [{}, { account_id: "conflicting_account" }] as Record<string, string>[]) {
    const { db } = await fixture();
    try {
      await trackedLead(db, { platform: "meta", campaign_id: "fixture_campaign", ad_id: "fixture_ad", ...captured });
      await delivery(db, "account_a");
      await delivery(db, "account_b");
      const { rows } = await db.query<Record<string, unknown>>("SELECT * FROM attribution_observed_funnel_v1");
      expect(rows).toHaveLength(3);
      expect(rows.reduce((sum, row) => sum + Number(row.spend), 0)).toBe(10);
      expect(rows.reduce((sum, row) => sum + Number(row.leads), 0)).toBe(1);
      expect(rows.find((row) => row.leads === 1)).toMatchObject({ spend: "0", ad_set_id: "" });
    } finally { await db.close(); }
  }
});

test("a known captured account resolves repeated ad IDs while denied consent stays unattributed", async () => {
  const { db } = await fixture();
  try {
    await trackedLead(db, { platform: "meta", account_id: "account_a", campaign_id: "fixture_campaign", ad_id: "fixture_ad" });
    await delivery(db, "account_a");
    await delivery(db, "account_b");
    expect((await db.query<Record<string, unknown>>("SELECT * FROM attribution_observed_funnel_v1")).rows).toHaveLength(2);
  } finally { await db.close(); }
  const denied = await fixture();
  try {
    await trackedLead(denied.db, {}, false);
    await delivery(denied.db, "account_a");
    const { rows } = await denied.db.query<Record<string, unknown>>("SELECT * FROM attribution_observed_funnel_v1");
    expect(rows.find((row) => row.leads === 1)).toMatchObject({ account_id: "", ad_id: "", spend: "0", evidence_tier: "E" });
    expect(rows.reduce((sum, row) => sum + Number(row.leads), 0)).toBe(1);
  } finally { await denied.db.close(); }
});


test("the follow-up migration upgrades populated 001 databases and is safe to rerun", async () => {
  const { db } = await fixture(false);
  try {
    await trackedLead(db, { platform: "meta", campaign_id: "fixture_campaign", ad_id: "fixture_ad" });
    await delivery(db, "fixture_account");
    expect((await db.query<Record<string, unknown>>("SELECT * FROM attribution_observed_funnel_v1")).rows).toHaveLength(2);
    const migration = await readFile(resolve("db/migrations/002_attribution_integrity.sql"), "utf8");
    await db.exec(migration);
    await db.exec(migration);
    const { rows } = await db.query<Record<string, unknown>>("SELECT * FROM attribution_observed_funnel_v1");
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ leads: 1, account_id: "fixture_account", ad_set_id: "fixture_adset" });
    expect(Number(rows[0].spend)).toBe(5);
    expect((await db.query<Record<string, unknown>>("SELECT verification_status FROM attribution_receipts")).rows)
      .toEqual([{ verification_status: "verified" }]);
    await db.exec(`INSERT INTO conversion_events (event_id, event_type, occurred_at, source_record_id, contact_key)
      VALUES ('upgrade_conversion', 'enrolled', now(), 'upgrade_source', 'funnel_contact');`);
    await expect(db.exec("UPDATE conversion_events SET event_type = 'class_started' WHERE event_id = 'upgrade_conversion'"))
      .rejects.toThrow(/canonical conversion event is immutable/);
  } finally { await db.close(); }
});


test("one worker run excludes an exact retried job while other queued jobs remain claimable", async () => {
  const { db, api } = await fixture();
  try {
    await trackedLead(db, { platform: "meta", campaign_id: "fixture_campaign", ad_id: "fixture_ad" });
    await db.exec(`INSERT INTO conversion_events (event_id, event_type, occurred_at, source_record_id, contact_key)
      VALUES ('worker_conversion:first', 'enrolled', now(), 'worker_source_first', 'funnel_contact'),
        ('worker_conversion:second', 'enrolled', now(), 'worker_source_second', 'funnel_contact');
      INSERT INTO lead_conversion_links (conversion_event_id, lead_id, contact_key, match_method, match_confidence)
        VALUES ('worker_conversion:first', 'xzdkgaeg:funnel_submission', 'funnel_contact', 'reviewed', 'high'),
          ('worker_conversion:second', 'xzdkgaeg:funnel_submission', 'funnel_contact', 'reviewed', 'high');
      INSERT INTO platform_postbacks (platform, conversion_event_id, created_at)
        VALUES ('meta', 'worker_conversion:first', now() - interval '2 minutes'),
          ('meta', 'worker_conversion:second', now() - interval '1 minute');`);
    // A partial key must not act as a prefix/wildcard exclusion.
    const first = (await api.claimPendingPostbacks(1, ["meta:worker_conversion"]))[0];
    expect(first.conversionEventId).toBe("worker_conversion:first");
    await api.updatePostbackStatus(first, { status: "retry", retryable: true });
    const firstKey = `${first.platform}:${first.conversionEventId}`;
    const second = (await api.claimPendingPostbacks(1, [firstKey]))[0];
    expect(second.conversionEventId).toBe("worker_conversion:second");
    await api.updatePostbackStatus(second, { status: "retry", retryable: true });
    const secondKey = `${second.platform}:${second.conversionEventId}`;
    expect(await api.claimPendingPostbacks(1, [firstKey, secondKey])).toEqual([]);
    const attempts = await db.query<Record<string, unknown>>("SELECT attempt_count FROM platform_postbacks ORDER BY conversion_event_id");
    expect(attempts.rows).toEqual([{ attempt_count: 1 }, { attempt_count: 1 }]);
    // Exclusion lasts only this run; a later scheduled run may retry the job.
    expect((await api.claimPendingPostbacks(1))[0].conversionEventId).toBe("worker_conversion:first");
  } finally { await db.close(); }
});


test("receipt ingestion stores bounded request UA only with conversion marketing consent and retains immutability", async () => {
  const { db, api } = await fixture();
  try {
    const acceptedAt = new Date().toISOString();
    const receiptFor = (event: string, marketing: boolean) => {
      const touch = (type: string) => ({
        type, touchId: `${event}_${type}`, capturedAt: acceptedAt,
        anonymousId: "", sessionId: "", landingPage: "/sealants", referrer: "",
        utm: {}, clickIds: {}, dimensions: {}, gaClientId: "", gaSessionId: "",
        consent: { analytics: false, marketing, policyVersion: "fixture", recordedAt: acceptedAt },
      });
      return parseAttributionReceipt({ schemaVersion: 1, leadEventId: event, formId: "xzdkgaeg",
        formKey: "fixture", acceptedAt, firstTouch: touch("first"), conversionTouch: touch("conversion") });
    };
    const eligible = receiptFor("5f9df3ab-8ee8-4d84-a807-2968db138875", true);
    const denied = receiptFor("6f9df3ab-8ee8-4d84-a807-2968db138875", false);
    expect(eligible).not.toBeNull();
    expect(denied).not.toBeNull();
    const header = `  SyntheticBrowser/1.0 ${"x".repeat(600)}  `;
    await api.upsertAttributionReceipt(eligible!, header);
    await api.upsertAttributionReceipt(denied!, "SyntheticDeniedBrowser/1.0");
    const { rows } = await db.query<Record<string, unknown>>(`SELECT lead_event_id, touch_type,
      client_user_agent, marketing_consent FROM ad_touchpoints ORDER BY lead_event_id, touch_type`);
    const conversionTouch = rows.find((row) => row.lead_event_id === eligible!.leadEventId && row.touch_type === "conversion")!;
    expect(conversionTouch.client_user_agent).toBe(header.trim().slice(0, 512));
    expect(rows.filter((row) => row !== conversionTouch).every((row) => row.client_user_agent === null)).toBe(true);
    await expect(db.query(`UPDATE ad_touchpoints SET client_user_agent = 'forbidden'
      WHERE lead_event_id = $1 AND touch_type = 'conversion'`, [denied!.leadEventId]))
      .rejects.toThrow(/touch_client_user_agent_consent/);
    await api.upsertCanonicalLeads([{ ...lead, leadEventId: eligible!.leadEventId, submittedAt: acceptedAt }]);
    // Receipt JSON idempotency does not depend on a stable transport header.
    await api.upsertAttributionReceipt(eligible!);
    await api.upsertAttributionReceipt(eligible!, "UpdatedBrowser/2.0");
    expect((await db.query<Record<string, unknown>>(`SELECT client_user_agent FROM ad_touchpoints
      WHERE lead_event_id = $1 AND touch_type = 'conversion'`, [eligible!.leadEventId])).rows[0].client_user_agent)
      .toBe(header.trim().slice(0, 512));
    const legacy = receiptFor("7f9df3ab-8ee8-4d84-a807-2968db138875", true)!;
    await api.upsertAttributionReceipt(legacy);
    await api.upsertCanonicalLeads([{ ...lead, leadId: "xzdkgaeg:ua_legacy", submissionId: "ua_legacy",
      leadEventId: legacy.leadEventId, submittedAt: acceptedAt }]);
    await api.upsertAttributionReceipt(legacy, "LaterBrowser/3.0");
    expect((await db.query<Record<string, unknown>>(`SELECT client_user_agent FROM ad_touchpoints
      WHERE lead_event_id = $1 AND touch_type = 'conversion'`, [legacy.leadEventId])).rows[0].client_user_agent)
      .toBeNull();
    await expect(db.query(`UPDATE ad_touchpoints SET client_user_agent = 'changed'
      WHERE lead_event_id = $1 AND touch_type = 'conversion'`, [eligible!.leadEventId]))
      .rejects.toThrow(/browser user agent for verified receipt is immutable/);
    // Retention uses the original touch timestamp, not the later verification time.
    const expiration = await db.query<Record<string, unknown>>(`SELECT
      extract(epoch FROM retention_expires_at - captured_at)::text AS retained_seconds
      FROM ad_touchpoints WHERE lead_event_id = $1 AND touch_type = 'conversion'`, [eligible!.leadEventId]);
    expect(Number(expiration.rows[0].retained_seconds)).toBe(180 * 24 * 60 * 60);
    await db.exec(`INSERT INTO conversion_events (event_id, event_type, occurred_at, source_record_id, contact_key)
      VALUES ('ua_conversion', 'enrolled', now(), 'ua_source', 'fixture_contact');
      INSERT INTO lead_conversion_links (conversion_event_id, lead_id, contact_key, match_method, match_confidence)
      VALUES ('ua_conversion', 'xzdkgaeg:fixture_submission', 'fixture_contact', 'reviewed', 'high');
      INSERT INTO platform_postbacks (platform, conversion_event_id) VALUES ('meta', 'ua_conversion');`);
    const job = (await api.claimPendingPostbacks(1))[0];
    expect(job.touch.client_user_agent).toBe(header.trim().slice(0, 512));
  } finally { await db.close(); }
});
