import { expect, test } from "@playwright/test";

import { ATTRIBUTION_SCHEMA_VERSION } from "@/lib/attribution-contract";
import {
  parseAttributionReceipt,
  parseCanonicalConversion,
  parseCanonicalLead,
  canonicalAttributionPlatform,
  parseDailyAdDelivery,
  parsePlatformAttributionValidation,
} from "@/lib/server/attribution-validation";
import { sendPlatformPostback } from "@/lib/server/platform-postbacks";
import { configuredMilestoneMap } from "@/lib/server/postback-config";
import { createReceiptToken, verifyReceiptToken } from "@/lib/server/attribution-receipt-token";

const id = "5f9df3ab-8ee8-4d84-a807-2968db138875";
const capturedAt = "2026-08-23T20:00:00.000Z";

function touch(type: "first" | "conversion") {
  return {
    anonymousId: id,
    capturedAt,
    clickIds: { fbclid: "click" },
    consent: {
      analytics: true,
      marketing: true,
      policyVersion: "2026-08-23",
      recordedAt: capturedAt,
    },
    dimensions: { ad_id: "123", platform: "meta" },
    gaClientId: "",
    gaSessionId: "",
    landingPage: "/lp/dental-assisting-enroll",
    referrer: "",
    sessionId: id,
    touchId: `${type}-${id}`,
    type,
    utm: { utm_source: "facebook" },
  };
}

test("validates idempotent attribution contracts and rejects synthetic lead identity", () => {
  expect(parseAttributionReceipt({
    acceptedAt: capturedAt,
    conversionTouch: touch("conversion"),
    firstTouch: touch("first"),
    formId: "mpqgyjjg",
    formKey: "dental_assisting",
    leadEventId: id,
    schemaVersion: ATTRIBUTION_SCHEMA_VERSION,
  })).not.toBeNull();

  expect(parseCanonicalLead({
    contactKey: "contact_01",
    formId: "mpqgyjjg",
    leadId: "wrong-id",
    submissionId: "submission_01",
    submittedAt: capturedAt,
  })).toBeNull();
  expect(parseCanonicalLead({ contactKey: "contact_01", formId: "unknown_form",
    leadId: "unknown_form:submission_01", submissionId: "submission_01", submittedAt: capturedAt })).toBeNull();

  expect(parseCanonicalConversion({
    contactKey: "contact_01",
    eventId: "enrollment_01",
    eventType: "enrolled",
    leadId: "mpqgyjjg:submission_01",
    matchConfidence: "medium",
    matchMethod: "exact_name_and_timing",
    occurredAt: capturedAt,
    sourceRecordId: "private_record_01",
  })).not.toBeNull();
});

test("rejects forged touch types, unknown fields, and unsupported Formspree forms", () => {
  expect(parseAttributionReceipt({
    acceptedAt: capturedAt,
    conversionTouch: touch("first"),
    firstTouch: touch("first"),
    formId: "mpqgyjjg",
    formKey: "dental_assisting",
    leadEventId: id,
    schemaVersion: ATTRIBUTION_SCHEMA_VERSION,
  })).toBeNull();
  expect(parseAttributionReceipt({
    acceptedAt: capturedAt,
    conversionTouch: touch("conversion"),
    firstTouch: touch("first"),
    formId: "unknown_form",
    formKey: "dental_assisting",
    leadEventId: id,
    schemaVersion: ATTRIBUTION_SCHEMA_VERSION,
  })).toBeNull();
  expect(parseCanonicalLead({
    contactKey: "contact_01",
    extra: "not allowed",
    formId: "mpqgyjjg",
    leadId: "mpqgyjjg:submission_01",
    submissionId: "submission_01",
    submittedAt: capturedAt,
  })).toBeNull();
});

test("strips tracking values when consent was not granted", () => {
  const first = touch("first");
  first.consent.analytics = false;
  first.consent.marketing = false;
  const conversion = touch("conversion");
  conversion.consent.analytics = false;
  conversion.consent.marketing = false;
  const parsed = parseAttributionReceipt({ acceptedAt: capturedAt, conversionTouch: conversion,
    firstTouch: first, formId: "mpqgyjjg", formKey: "dental_assisting", leadEventId: id,
    schemaVersion: ATTRIBUTION_SCHEMA_VERSION });
  expect(parsed).not.toBeNull();
  expect(parsed?.conversionTouch.clickIds.fbclid).toBe("");
  expect(parsed?.conversionTouch.dimensions.ad_id).toBe("");
  expect(parsed?.conversionTouch.utm.utm_source).toBe("");
  expect(parsed?.conversionTouch.referrer).toBe("");
  expect(parsed?.conversionTouch.anonymousId).toBe("");
  expect(parsed?.conversionTouch.sessionId).toBe("");
});

test("requires provider-bound validation proof metadata", () => {
  const hash = "a".repeat(64);
  expect(parsePlatformAttributionValidation({ identifierSha256: hash, identifierType: "gclid",
    leadId: "mpqgyjjg:submission_01", platform: "google", provenance: "google_data_manager",
    sourceRecordId: "request_01", validatedAt: capturedAt, validationId: "validation_01" })).not.toBeNull();
  expect(parsePlatformAttributionValidation({ identifierSha256: hash, identifierType: "ttclid",
    leadId: "mpqgyjjg:submission_01", platform: "google", provenance: "google_data_manager",
    sourceRecordId: "request_01", validatedAt: capturedAt, validationId: "validation_01" })).toBeNull();
  expect(parsePlatformAttributionValidation({ identifierSha256: hash, identifierType: "gclid",
    leadId: "mpqgyjjg:submission_01", platform: "google", provenance: "meta_events_manager",
    sourceRecordId: "request_01", validatedAt: capturedAt, validationId: "validation_01" })).toBeNull();
});

test("requires integral delivery counts and bounded identifiers", () => {
  expect(canonicalAttributionPlatform("meta_ads")).toBe("meta");
  expect(canonicalAttributionPlatform("instagram")).toBe("meta");
  expect(parseDailyAdDelivery({ accountId: "acct", adId: "ad", adSetId: "set", campaignId: "campaign",
    clicks: 1.5, date: "2026-08-23", impressions: 10, platform: "meta", spend: 2 })).toBeNull();
  expect(parseDailyAdDelivery({ accountId: "acct", adId: "ad", adSetId: "set", campaignId: "campaign",
    clicks: 1, date: "2026-02-31", impressions: 10, platform: "meta", spend: 2 })).toBeNull();
});

test("receipt tokens are short-lived, identity-bound, and tamper evident", () => {
  process.env.RDA_RECEIPT_SIGNING_SECRET = "a-secure-test-secret-with-at-least-32-characters";
  const nonce = "6f9df3ab-8ee8-4d84-a807-2968db138875";
  const token = createReceiptToken({ formId: "mpqgyjjg", leadEventId: id, nonce }, new Date(capturedAt));
  expect(verifyReceiptToken(token, new Date("2026-08-23T20:05:00Z"))).toMatchObject({
    formId: "mpqgyjjg", leadEventId: id, nonce,
  });
  expect(verifyReceiptToken(`${token}tampered`, new Date("2026-08-23T20:05:00Z"))).toBeNull();
  expect(verifyReceiptToken(token, new Date("2026-08-23T20:11:00Z"))).toBeNull();
  delete process.env.RDA_RECEIPT_SIGNING_SECRET;
});

test("milestone configuration rejects duplicate provider events and multiple Google actions", () => {
  process.env.RDA_META_MILESTONE_MAP_JSON = '{"enrolled":"CompleteRegistration","class_started":"CompleteRegistration"}';
  process.env.RDA_GOOGLE_MILESTONE_MAP_JSON = '{"enrolled":"rda_enrolled","class_started":"rda_started"}';
  expect(configuredMilestoneMap("meta")).toEqual({});
  expect(configuredMilestoneMap("google")).toEqual({});
  delete process.env.RDA_META_MILESTONE_MAP_JSON;
  delete process.env.RDA_GOOGLE_MILESTONE_MAP_JSON;
});

test("Google postbacks reject static-token-only configuration", async () => {
  process.env.RDA_PLATFORM_POSTBACKS_ENABLED = "true";
  process.env.RDA_POSTBACK_CONSENT_POLICY_VERSIONS = "2026-08-23";
  process.env.RDA_GOOGLE_MILESTONE_MAP_JSON = '{"enrolled":"rda_enrolled"}';
  process.env.GOOGLE_DATA_MANAGER_ACCESS_TOKEN = "unsupported-static-token";
  process.env.GOOGLE_ADS_OPERATING_ACCOUNT_ID = "1234567890";
  process.env.GOOGLE_ADS_LOGIN_ACCOUNT_ID = "1234567890";
  process.env.GOOGLE_ADS_CONVERSION_ACTION_ID = "123456789";
  const result = await sendPlatformPostback({ attemptCount: 0, conversionEventId: "conversion_01",
    emailSha256: "a".repeat(64), eventType: "enrolled", leadEventId: id, leaseToken: "lease_01",
    occurredAt: capturedAt, phoneSha256: "", platform: "google",
    touch: { click_ids: { gclid: "click" }, consent_policy_version: "2026-08-23",
      landing_page: "/", marketing_consent: true } });
  expect(result.status).toBe("retry");
  expect(result.errorCode).toBe("oauth_unavailable");
  delete process.env.RDA_PLATFORM_POSTBACKS_ENABLED;
  delete process.env.GOOGLE_DATA_MANAGER_ACCESS_TOKEN;
  delete process.env.GOOGLE_ADS_OPERATING_ACCOUNT_ID;
  delete process.env.GOOGLE_ADS_LOGIN_ACCOUNT_ID;
  delete process.env.GOOGLE_ADS_CONVERSION_ACTION_ID;
  delete process.env.RDA_POSTBACK_CONSENT_POLICY_VERSIONS;
  delete process.env.RDA_GOOGLE_MILESTONE_MAP_JSON;
});

test("provider acknowledgement and validate-only states stay distinct", async () => {
  const originalFetch = globalThis.fetch;
  process.env.RDA_PLATFORM_POSTBACKS_ENABLED = "true";
  process.env.RDA_POSTBACK_CONSENT_POLICY_VERSIONS = "2026-08-23";
  process.env.META_CAPI_ACCESS_TOKEN = "token";
  process.env.META_CAPI_PIXEL_ID = "123456789";
  process.env.META_GRAPH_API_VERSION = "v24.0";
  globalThis.fetch = async () => new Response(JSON.stringify({ events_received: 1, fbtrace_id: "trace_01" }),
    { headers: { "Content-Type": "application/json" }, status: 200 });
  const baseJob = { attemptCount: 0, conversionEventId: "conversion_01", emailSha256: "a".repeat(64),
    eventType: "qualified_lead", leadEventId: id, leaseToken: "lease_01", occurredAt: capturedAt, phoneSha256: "",
    touch: { captured_at: capturedAt, click_ids: { fbclid: "click" }, landing_page: "/",
      consent_policy_version: "2026-08-23", marketing_consent: true } };
  let fetchCalls = 0;
  globalThis.fetch = async () => { fetchCalls += 1; return new Response("{}"); };
  const blockedMeta = await sendPlatformPostback({ ...baseJob, platform: "meta" });
  expect(blockedMeta.errorCode).toBe("validate_only_no_safe_provider_call");
  expect(fetchCalls).toBe(0);
  process.env.RDA_POSTBACK_VALIDATE_ONLY = "false";
  globalThis.fetch = async () => new Response(JSON.stringify({ events_received: 1, fbtrace_id: "trace_01" }),
    { headers: { "Content-Type": "application/json" }, status: 200 });
  const meta = await sendPlatformPostback({ ...baseJob, platform: "meta" });
  expect(meta).toMatchObject({ providerReceiptId: "trace_01", status: "accepted" });

  process.env.GOOGLE_OAUTH_CLIENT_ID = "client";
  process.env.GOOGLE_OAUTH_CLIENT_SECRET = "secret";
  process.env.GOOGLE_OAUTH_REFRESH_TOKEN = "refresh";
  process.env.GOOGLE_ADS_OPERATING_ACCOUNT_ID = "1234567890";
  process.env.GOOGLE_ADS_LOGIN_ACCOUNT_ID = "1234567890";
  process.env.GOOGLE_ADS_CONVERSION_ACTION_ID = "123456789";
  process.env.RDA_GOOGLE_MILESTONE_MAP_JSON = '{"enrolled":"rda_enrolled"}';
  process.env.RDA_POSTBACK_VALIDATE_ONLY = "true";
  globalThis.fetch = async (input) => String(input).includes("oauth2.googleapis.com")
    ? new Response(JSON.stringify({ access_token: "short-lived", expires_in: 3_600 }), { status: 200 })
    : new Response(JSON.stringify({ requestId: "google_request_01" }), { status: 200 });
  const google = await sendPlatformPostback({ ...baseJob, eventType: "enrolled", platform: "google" });
  expect(google).toMatchObject({ providerReceiptId: "google_request_01", status: "validated" });

  globalThis.fetch = originalFetch;
  for (const name of ["RDA_PLATFORM_POSTBACKS_ENABLED", "META_CAPI_ACCESS_TOKEN", "META_CAPI_PIXEL_ID",
    "META_GRAPH_API_VERSION", "GOOGLE_OAUTH_CLIENT_ID", "GOOGLE_OAUTH_CLIENT_SECRET",
    "GOOGLE_OAUTH_REFRESH_TOKEN", "GOOGLE_ADS_OPERATING_ACCOUNT_ID", "GOOGLE_ADS_LOGIN_ACCOUNT_ID",
    "GOOGLE_ADS_CONVERSION_ACTION_ID", "RDA_POSTBACK_CONSENT_POLICY_VERSIONS",
    "RDA_GOOGLE_MILESTONE_MAP_JSON", "RDA_POSTBACK_VALIDATE_ONLY"]) delete process.env[name];
});

test("private sync routes fail closed without the sync secret", async ({ request }) => {
  const response = await request.post("/api/attribution/sync/leads", { data: [] });
  expect(response.status()).toBe(401);
  expect(await response.json()).toEqual({ error: "Unauthorized" });
});

test("retention route fails closed without the cron secret", async ({ request }) => {
  const response = await request.get("/api/attribution/retention");
  expect(response.status()).toBe(401);
});

test("public receipt route rejects an untrusted origin", async ({ request }) => {
  const response = await request.post("/api/attribution/receipt", {
    data: {},
    headers: { Origin: "https://example.invalid" },
  });
  expect(response.status()).toBe(403);
});

test("aggregate route fails closed before private storage is provisioned", async ({ request }) => {
  const response = await request.get("/api/attribution/dashboard");
  expect(response.status()).toBe(503);
  expect(await response.json()).toMatchObject({ error: expect.any(String) });
});
