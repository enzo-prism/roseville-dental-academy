import {
  ATTRIBUTION_AD_DIMENSION_FIELDS,
  ATTRIBUTION_CLICK_ID_FIELDS,
  ATTRIBUTION_SCHEMA_VERSION,
  ATTRIBUTION_UTM_FIELDS,
  type AttributionReceipt,
  type AttributionTouch,
  type CanonicalConversionInput,
  type CanonicalLeadInput,
  type DailyAdDeliveryInput,
  type PlatformAttributionValidationInput,
} from "@/lib/attribution-contract";

const ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9:._-]{0,199}$/;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const FALLBACK_EVENT_PATTERN = /^[a-z0-9]{8,}-[a-z0-9]{8,}$/i;
const SHA256_PATTERN = /^[a-f0-9]{64}$/;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const MAX_TEXT = 2_048;
const EARLIEST_TIMESTAMP = Date.parse("2020-01-01T00:00:00.000Z");
const MAX_CLOCK_SKEW_MS = 10 * 60 * 1_000;

const PLATFORM_ALIASES: Record<string, DailyAdDeliveryInput["platform"]> = {
  bing: "microsoft", facebook: "meta", google_ads: "google", googleads: "google",
  instagram: "meta", meta_ads: "meta", microsoft_ads: "microsoft", snapchat_ads: "snapchat",
  tiktok_ads: "tiktok",
};

export function canonicalAttributionPlatform(value: unknown) {
  const normalized = typeof value === "string" ? value.trim().toLowerCase() : "";
  const canonical = PLATFORM_ALIASES[normalized] ?? normalized;
  return new Set(["google", "meta", "tiktok", "snapchat", "microsoft"]).has(canonical)
    ? canonical as DailyAdDeliveryInput["platform"] : "";
}

function object(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function hasOnlyKeys(input: Record<string, unknown>, keys: readonly string[]) {
  const allowed = new Set(keys);
  return Object.keys(input).every((key) => allowed.has(key));
}

function text(value: unknown, max = MAX_TEXT) {
  if (typeof value !== "string") return "";
  const result = value.trim();
  return result.length <= max ? result : "";
}

function id(value: unknown) {
  const result = text(value, 200);
  return ID_PATTERN.test(result) ? result : "";
}

function browserEventId(value: string) {
  return UUID_PATTERN.test(value) || FALLBACK_EVENT_PATTERN.test(value);
}

function sha256(value: unknown) {
  const result = text(value, 64).toLowerCase();
  return SHA256_PATTERN.test(result) ? result : "";
}

function timestamp(value: unknown) {
  const result = text(value, 64);
  const millis = Date.parse(result);
  if (!result || !Number.isFinite(millis) || millis < EARLIEST_TIMESTAMP ||
      millis > Date.now() + MAX_CLOCK_SKEW_MS) return "";
  return new Date(millis).toISOString();
}

function nonNegativeNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : null;
}

function recordFor<const T extends readonly string[]>(source: unknown, fields: T, max = 512) {
  const input = object(source) ?? {};
  if (!hasOnlyKeys(input, fields)) return null;
  return Object.fromEntries(fields.map((field) => [field, text(input[field], max)])) as Record<T[number], string>;
}

function safePage(value: unknown) {
  const raw = text(value, 1_024);
  if (!raw) return "";
  try {
    const url = new URL(raw, "https://www.rosevilledentalacademy.com");
    if (!['https:', 'http:'].includes(url.protocol)) return "";
    return raw.startsWith("/") ? url.pathname : `${url.origin}${url.pathname}`;
  } catch {
    return "";
  }
}

function allowedFormIds() {
  return new Set((process.env.RDA_FORMSPREE_FORM_IDS ?? "xzdkgaeg,mpqgyjjg,mwvdrnrk")
    .split(",").map((item) => item.trim()).filter(Boolean));
}

function validDate(value: string) {
  if (!DATE_PATTERN.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value &&
    date.getTime() <= Date.now() + MAX_CLOCK_SKEW_MS;
}

function emptyRecord<const T extends readonly string[]>(fields: T) {
  return Object.fromEntries(fields.map((field) => [field, ""])) as Record<T[number], string>;
}

function parseTouch(value: unknown, expectedType: AttributionTouch["type"]): AttributionTouch | null {
  const input = object(value);
  const consent = object(input?.consent);
  if (!input || !consent) return null;
  if (!hasOnlyKeys(input, [
    "anonymousId", "capturedAt", "clickIds", "consent", "dimensions", "gaClientId",
    "gaSessionId", "landingPage", "referrer", "sessionId", "touchId", "type", "utm",
  ]) || !hasOnlyKeys(consent, ["analytics", "marketing", "policyVersion", "recordedAt"])) return null;
  if (input.type !== expectedType || typeof consent.analytics !== "boolean" || typeof consent.marketing !== "boolean") {
    return null;
  }

  const analyticsConsent = consent.analytics;
  const marketingConsent = consent.marketing;
  const utm = recordFor(input.utm, ATTRIBUTION_UTM_FIELDS);
  const clickIds = recordFor(input.clickIds, ATTRIBUTION_CLICK_ID_FIELDS);
  const dimensions = recordFor(input.dimensions, ATTRIBUTION_AD_DIMENSION_FIELDS);
  if (!utm || !clickIds || !dimensions) return null;
  dimensions.platform = canonicalAttributionPlatform(dimensions.platform || utm.utm_source_platform || utm.utm_source);

  const parsed: AttributionTouch = {
    anonymousId: analyticsConsent ? id(input.anonymousId) : "",
    capturedAt: timestamp(input.capturedAt),
    clickIds: marketingConsent ? clickIds : emptyRecord(ATTRIBUTION_CLICK_ID_FIELDS),
    consent: {
      analytics: analyticsConsent,
      marketing: marketingConsent,
      policyVersion: id(consent.policyVersion),
      recordedAt: timestamp(consent.recordedAt),
    },
    dimensions: marketingConsent ? dimensions : emptyRecord(ATTRIBUTION_AD_DIMENSION_FIELDS),
    gaClientId: analyticsConsent ? id(input.gaClientId) : "",
    gaSessionId: analyticsConsent ? id(input.gaSessionId) : "",
    landingPage: safePage(input.landingPage),
    referrer: analyticsConsent ? safePage(input.referrer) : "",
    sessionId: analyticsConsent ? id(input.sessionId) : "",
    touchId: id(input.touchId),
    type: expectedType,
    utm: analyticsConsent ? utm : emptyRecord(ATTRIBUTION_UTM_FIELDS),
  };
  if (!parsed.capturedAt || !parsed.touchId || !parsed.consent.policyVersion ||
      !parsed.consent.recordedAt || !parsed.landingPage) return null;
  if (analyticsConsent && (!parsed.anonymousId || !parsed.sessionId)) return null;
  if (Date.parse(parsed.consent.recordedAt) > Date.parse(parsed.capturedAt) + MAX_CLOCK_SKEW_MS) return null;
  return parsed;
}

export function parseAttributionReceipt(value: unknown): AttributionReceipt | null {
  const input = object(value);
  if (!input || input.schemaVersion !== ATTRIBUTION_SCHEMA_VERSION || !hasOnlyKeys(input, [
    "acceptedAt", "conversionTouch", "firstTouch", "formId", "formKey", "leadEventId", "schemaVersion",
  ])) return null;
  const firstTouch = parseTouch(input.firstTouch, "first");
  const conversionTouch = parseTouch(input.conversionTouch, "conversion");
  const acceptedAt = timestamp(input.acceptedAt);
  const formId = id(input.formId);
  const leadEventId = id(input.leadEventId);
  if (!firstTouch || !conversionTouch || !acceptedAt || !formId || !allowedFormIds().has(formId) ||
      !browserEventId(leadEventId) || firstTouch.touchId === conversionTouch.touchId) return null;
  if (Date.parse(firstTouch.capturedAt) > Date.parse(conversionTouch.capturedAt) ||
      Date.parse(conversionTouch.capturedAt) > Date.parse(acceptedAt) + MAX_CLOCK_SKEW_MS) return null;
  return { acceptedAt, conversionTouch, firstTouch, formId, formKey: id(input.formKey), leadEventId,
    schemaVersion: ATTRIBUTION_SCHEMA_VERSION };
}

export function parseCanonicalLead(value: unknown): CanonicalLeadInput | null {
  const input = object(value);
  if (!input || !hasOnlyKeys(input, ["contactKey", "emailSha256", "formId", "leadEventId", "leadId",
    "phoneSha256", "programInterest", "sourcePage", "submissionId", "submittedAt"])) return null;
  const formId = id(input.formId);
  const submissionId = id(input.submissionId);
  const leadId = id(input.leadId);
  const parsed: CanonicalLeadInput = {
    contactKey: id(input.contactKey), emailSha256: sha256(input.emailSha256) || undefined, formId,
    leadEventId: id(input.leadEventId) || undefined, leadId, phoneSha256: sha256(input.phoneSha256) || undefined,
    programInterest: text(input.programInterest, 200), sourcePage: safePage(input.sourcePage), submissionId,
    submittedAt: timestamp(input.submittedAt),
  };
  if (!parsed.contactKey || !formId || !allowedFormIds().has(formId) || !leadId || !submissionId || !parsed.submittedAt ||
      leadId !== `${formId}:${submissionId}` || parsed.leadEventId === leadId || parsed.leadEventId === submissionId) return null;
  if (parsed.leadEventId && !browserEventId(parsed.leadEventId)) return null;
  if ((input.emailSha256 && !parsed.emailSha256) || (input.phoneSha256 && !parsed.phoneSha256)) return null;
  return parsed;
}

export function parseCanonicalConversion(value: unknown): CanonicalConversionInput | null {
  const input = object(value);
  if (!input || !hasOnlyKeys(input, ["contactKey", "eventId", "eventType", "leadId", "matchConfidence",
    "matchMethod", "occurredAt", "sourceRecordId"])) return null;
  const eventTypes = new Set(["qualified_lead", "first_visit", "enrolled", "class_started"]);
  const methods = new Set(["exact_email", "exact_phone", "exact_name_and_timing", "reviewed"]);
  const confidence = new Set(["high", "medium"]);
  const parsed = { contactKey: id(input.contactKey), eventId: id(input.eventId), eventType: text(input.eventType, 32),
    leadId: id(input.leadId), matchConfidence: text(input.matchConfidence, 16), matchMethod: text(input.matchMethod, 32),
    occurredAt: timestamp(input.occurredAt), sourceRecordId: id(input.sourceRecordId) };
  if (!parsed.contactKey || !parsed.eventId || !eventTypes.has(parsed.eventType) || !parsed.leadId ||
      !confidence.has(parsed.matchConfidence) || !methods.has(parsed.matchMethod) || !parsed.occurredAt ||
      !parsed.sourceRecordId) return null;
  return parsed as CanonicalConversionInput;
}

export function parseDailyAdDelivery(value: unknown): DailyAdDeliveryInput | null {
  const input = object(value);
  if (!input || !hasOnlyKeys(input, ["accountId", "adId", "adName", "adSetId", "adSetName",
    "campaignId", "campaignName", "clicks", "date", "impressions", "platform", "spend"])) return null;
  const parsed = { accountId: id(input.accountId), adId: id(input.adId), adName: text(input.adName, 300),
    adSetId: id(input.adSetId), adSetName: text(input.adSetName, 300), campaignId: id(input.campaignId),
    campaignName: text(input.campaignName, 300), clicks: nonNegativeNumber(input.clicks), date: text(input.date, 10),
    impressions: nonNegativeNumber(input.impressions), platform: canonicalAttributionPlatform(input.platform), spend: nonNegativeNumber(input.spend) };
  if (!parsed.platform || !parsed.accountId || !parsed.campaignId || !validDate(parsed.date) ||
      parsed.clicks === null || parsed.impressions === null || parsed.spend === null ||
      !Number.isInteger(parsed.clicks) || !Number.isInteger(parsed.impressions)) return null;
  return parsed as DailyAdDeliveryInput;
}

export function parsePlatformAttributionValidation(value: unknown): PlatformAttributionValidationInput | null {
  const input = object(value);
  if (!input || !hasOnlyKeys(input, ["identifierSha256", "identifierType", "leadId", "platform", "provenance",
    "sourceRecordId", "validatedAt", "validationId"])) return null;
  const identifiersByPlatform: Record<string, Set<string>> = {
    google: new Set(["gclid", "gbraid", "wbraid", "ad_id"]), meta: new Set(["fbclid", "fbc", "ad_id"]),
    tiktok: new Set(["ttclid", "ad_id"]), snapchat: new Set(["ad_id"]), microsoft: new Set(["ad_id"]),
  };
  const provenance = new Set(["google_data_manager", "meta_events_manager", "tiktok_events_manager", "reviewed_platform_export"]);
  const provenanceByPlatform: Record<string, Set<string>> = {
    google: new Set(["google_data_manager", "reviewed_platform_export"]),
    meta: new Set(["meta_events_manager", "reviewed_platform_export"]),
    tiktok: new Set(["tiktok_events_manager", "reviewed_platform_export"]),
    snapchat: new Set(["reviewed_platform_export"]), microsoft: new Set(["reviewed_platform_export"]),
  };
  const parsed = { identifierSha256: sha256(input.identifierSha256), identifierType: text(input.identifierType, 16),
    leadId: id(input.leadId), platform: canonicalAttributionPlatform(input.platform), provenance: text(input.provenance, 40),
    sourceRecordId: id(input.sourceRecordId), validatedAt: timestamp(input.validatedAt), validationId: id(input.validationId) };
  if (!parsed.leadId || !parsed.platform || !identifiersByPlatform[parsed.platform]?.has(parsed.identifierType) ||
      !provenance.has(parsed.provenance) || !provenanceByPlatform[parsed.platform]?.has(parsed.provenance) ||
      !parsed.sourceRecordId || !parsed.identifierSha256 || !parsed.validatedAt ||
      !parsed.validationId) return null;
  return parsed as PlatformAttributionValidationInput;
}
