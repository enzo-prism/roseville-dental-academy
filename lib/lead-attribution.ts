import {
  ATTRIBUTION_AD_DIMENSION_FIELDS,
  ATTRIBUTION_CLICK_ID_FIELDS,
  ATTRIBUTION_SCHEMA_VERSION,
  ATTRIBUTION_UTM_FIELDS,
  type AttributionAdDimensionField,
  type AttributionReceipt,
} from "@/lib/attribution-contract";

export const UTM_FIELDS = ATTRIBUTION_UTM_FIELDS;
export const AD_CLICK_ID_FIELDS = ATTRIBUTION_CLICK_ID_FIELDS;

export const META_UTM_CONTENT_AD_PREFIXES = [
  "static_photo_",
  "tiktok_video_",
  "static_type_",
  "office_compliance_ic189_",
  "renewal_ready_original_copy_",
  "student_story_",
  "video_sept25_clinical_",
  "photo_sept18_graduation_",
  "ic189_student_",
  "ic189_cert_",
] as const;

export const ATTRIBUTION_POLICY_VERSION = "2026-08-23";
export const ATTRIBUTION_UPDATED_EVENT = "rda:lead-attribution-updated";

export type UtmField = (typeof UTM_FIELDS)[number];
export type AdClickIdField = (typeof AD_CLICK_ID_FIELDS)[number];
export type AttributionConsentState = "granted" | "restricted" | "unknown";
export type AttributionStorageScope = "memory" | "persistent" | "session";

export type AttributionTouch = {
  capturedAt: string;
  clickIds: Record<AdClickIdField, string>;
  dimensions: Record<AttributionAdDimensionField, string>;
  gaClientId: string;
  gaSessionId: string;
  pagePath: string;
  referrer: string;
  sessionId: string;
  touchId: string;
  utm: Record<UtmField, string>;
};

export type LeadAttribution = {
  anonymousId: string;
  clickIds: Record<AdClickIdField, string>;
  consentState: AttributionConsentState;
  conversionTouch: AttributionTouch;
  firstTouch: AttributionTouch;
  lastPaidTouch: AttributionTouch;
  policyVersion: string;
  referrer: string;
  sessionId: string;
  storageScope: AttributionStorageScope;
  utm: Record<UtmField, string>;
};

type StoredAttributionRecord = {
  anonymousId: string;
  conversionTouch: AttributionTouch;
  expiresAt: string;
  firstTouch: AttributionTouch;
  lastPaidTouch: AttributionTouch;
  policyVersion: string;
  version: 2;
};

const ATTRIBUTION_STORAGE_KEY = "rda_lead_attribution_v2";
const ATTRIBUTION_SESSION_KEY = "rda_lead_attribution_session_v2";
const ATTRIBUTION_STAMP_COOKIE = "rda_lead_attribution_stamp_v1";
const LEGACY_ATTRIBUTION_STORAGE_KEY = "rda_lead_attribution_v1";
const SESSION_ID_KEY = "rda_attribution_session_id_v1";
const MAX_ATTRIBUTION_AGE_MS = 90 * 24 * 60 * 60 * 1_000;
const MAX_ATTRIBUTION_VALUE_LENGTH = 512;
export const MAX_COOKIE_LENGTH = 3_800;

const EMPTY_UTM = Object.fromEntries(
  UTM_FIELDS.map((field) => [field, ""]),
) as Record<UtmField, string>;
const EMPTY_CLICK_IDS = Object.fromEntries(
  AD_CLICK_ID_FIELDS.map((field) => [field, ""]),
) as Record<AdClickIdField, string>;
const EMPTY_DIMENSIONS = Object.fromEntries(
  ATTRIBUTION_AD_DIMENSION_FIELDS.map((field) => [field, ""]),
) as Record<AttributionAdDimensionField, string>;

let memoryRecord = "";
let memorySessionId = "";
let memoryVisitSignature = "";
let memoryVisitTouchId = "";

function compactAttributionValue(value: string | null | undefined) {
  return value?.trim().slice(0, MAX_ATTRIBUTION_VALUE_LENGTH) ?? "";
}

export function parseMetaAdIdFromUtmContent(utmContent: string | null | undefined) {
  const value = compactAttributionValue(utmContent);

  if (!value) {
    return "";
  }

  const normalized = value.toLowerCase();
  for (const prefix of META_UTM_CONTENT_AD_PREFIXES) {
    if (normalized.startsWith(prefix)) {
      const suffix = value.slice(prefix.length);
      return /^\d{5,40}$/u.test(suffix) ? suffix : "";
    }
  }

  return "";
}

function legacyMetaAdsetId(
  utm: Record<UtmField, string>,
  dimensions: Record<AttributionAdDimensionField, string>,
) {
  // These legacy paid Meta links put the ad-set ID in utm_term. A numeric
  // search term or fbclid alone is not evidence of an ad set.
  const platform = (dimensions.platform || utm.utm_source_platform || utm.utm_source)
    .trim().toLowerCase();
  const medium = utm.utm_medium.trim().toLowerCase();
  const legacyAdId = parseMetaAdIdFromUtmContent(utm.utm_content);
  return /^(meta|meta_ads|facebook|instagram|fb|ig)$/u.test(platform) &&
    /^(paid_social|paid-social|paid|cpc|ppc)$/u.test(medium) &&
    legacyAdId && dimensions.ad_id === legacyAdId &&
    /^\d{5,40}$/u.test(utm.utm_term)
    ? utm.utm_term : "";
}

function createId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

function emptyTouch(capturedAt = ""): AttributionTouch {
  return {
    capturedAt,
    clickIds: { ...EMPTY_CLICK_IDS },
    dimensions: { ...EMPTY_DIMENSIONS },
    gaClientId: "",
    gaSessionId: "",
    pagePath: "",
    referrer: "",
    sessionId: "",
    touchId: "",
    utm: { ...EMPTY_UTM },
  };
}

function touchForRole(touch: AttributionTouch, role: "first" | "conversion") {
  return {
    ...touch,
    clickIds: { ...touch.clickIds },
    dimensions: { ...touch.dimensions },
    touchId: `${role}:${touch.touchId || createId()}`,
    utm: { ...touch.utm },
  };
}

function sanitizeReferrer(value: string, currentOrigin: string) {
  if (!value) {
    return "";
  }

  try {
    const url = new URL(value);

    if (url.origin === currentOrigin) {
      return "";
    }

    return `${url.origin}${url.pathname}`.slice(0, 2_048);
  } catch {
    return value.split(/[?#]/, 1)[0]?.slice(0, 2_048) ?? "";
  }
}

function getCookieValue(name: string) {
  if (typeof document === "undefined") {
    return "";
  }

  const prefix = `${name}=`;
  const value = document.cookie
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(prefix))
    ?.slice(prefix.length);

  if (!value) {
    return "";
  }

  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function getGaClientId() {
  const value = getCookieValue("_ga");
  const parts = value.split(".").filter(Boolean);

  return parts.length >= 2 ? compactAttributionValue(parts.slice(-2).join(".")) : "";
}

function getGaSessionId() {
  if (typeof document === "undefined") {
    return "";
  }

  const sessionCookie = document.cookie
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith("_ga_") && part.includes("="))
    ?.split("=", 2)[1];

  if (!sessionCookie) {
    return "";
  }

  const decoded = decodeURIComponent(sessionCookie);
  const sessionMatch = decoded.match(/(?:^|[.$])s?(\d{8,})(?:[.$]|$)/);

  return compactAttributionValue(sessionMatch?.[1]);
}

function getQueryValue(params: URLSearchParams, names: string[]) {
  for (const name of names) {
    const exact = params.get(name);

    if (exact) {
      return compactAttributionValue(exact);
    }
  }

  const normalizedNames = new Set(names.map((name) => name.toLowerCase()));

  for (const [name, value] of params.entries()) {
    if (normalizedNames.has(name.toLowerCase())) {
      return compactAttributionValue(value);
    }
  }

  return "";
}

export function parseAttributionTouch(
  search: string,
  referrer: string,
  currentOrigin: string,
  pagePath: string,
  capturedAt = new Date().toISOString(),
  sessionId = "",
): AttributionTouch {
  const params = new URLSearchParams(search);
  const utm = { ...EMPTY_UTM };
  const clickIds = { ...EMPTY_CLICK_IDS };
  const dimensions = { ...EMPTY_DIMENSIONS };

  for (const field of UTM_FIELDS) {
    utm[field] = getQueryValue(params, [field]);
  }

  const aliases: Record<AdClickIdField, string[]> = {
    dclid: ["dclid"],
    fbc: ["fbc", "_fbc"],
    fbclid: ["fbclid"],
    fbp: ["fbp", "_fbp"],
    gbraid: ["gbraid"],
    gclid: ["gclid"],
    msclkid: ["msclkid"],
    sc_click_id: ["sc_click_id"],
    sccid: ["ScCid", "sccid"],
    ttclid: ["ttclid"],
    ttp: ["ttp", "_ttp"],
    wbraid: ["wbraid"],
  };

  for (const field of AD_CLICK_ID_FIELDS) {
    clickIds[field] = getQueryValue(params, aliases[field]);
  }

  clickIds.ttp ||= compactAttributionValue(getCookieValue("_ttp"));
  // Meta _fbp/_fbc cookies are applied later, and only when consent is granted.

  const dimensionAliases: Record<AttributionAdDimensionField, string[]> = {
    account_id: ["account_id", "ad_account_id"],
    ad_id: ["ad_id"],
    ad_name: ["ad_name"],
    adgroup_id: ["adgroup_id", "ad_group_id"],
    adgroup_name: ["adgroup_name", "ad_group_name"],
    adset_id: ["adset_id", "ad_set_id"],
    adset_name: ["adset_name", "ad_set_name"],
    campaign_id: ["campaign_id"],
    campaign_name: ["campaign_name"],
    creative_id: ["creative_id"],
    platform: ["platform"],
  };

  for (const field of ATTRIBUTION_AD_DIMENSION_FIELDS) {
    dimensions[field] = getQueryValue(params, dimensionAliases[field]);
  }

  dimensions.platform ||= utm.utm_source_platform || utm.utm_source;
  dimensions.campaign_id ||= utm.utm_id;
  dimensions.ad_id ||= parseMetaAdIdFromUtmContent(utm.utm_content);
  dimensions.adset_id ||= legacyMetaAdsetId(utm, dimensions);

  return {
    capturedAt,
    clickIds,
    dimensions,
    gaClientId: getGaClientId(),
    gaSessionId: getGaSessionId(),
    pagePath: compactAttributionValue(pagePath),
    referrer: sanitizeReferrer(referrer, currentOrigin),
    sessionId,
    touchId: createId(),
    utm,
  };
}

function normalizeTouch(value: Partial<AttributionTouch> | undefined): AttributionTouch {
  const utm = Object.fromEntries(
    UTM_FIELDS.map((field) => [field, compactAttributionValue(value?.utm?.[field])]),
  ) as Record<UtmField, string>;
  const clickIds = Object.fromEntries(
    AD_CLICK_ID_FIELDS.map((field) => [
      field,
      compactAttributionValue(value?.clickIds?.[field]),
    ]),
  ) as Record<AdClickIdField, string>;
  const dimensions = Object.fromEntries(
    ATTRIBUTION_AD_DIMENSION_FIELDS.map((field) => [
      field,
      compactAttributionValue(value?.dimensions?.[field]),
    ]),
  ) as Record<AttributionAdDimensionField, string>;

  dimensions.campaign_id ||= utm.utm_id;
  dimensions.ad_id ||= parseMetaAdIdFromUtmContent(utm.utm_content);
  dimensions.adset_id ||= legacyMetaAdsetId(utm, dimensions);

  return {
    capturedAt: compactAttributionValue(value?.capturedAt),
    clickIds,
    dimensions,
    gaClientId: compactAttributionValue(value?.gaClientId),
    gaSessionId: compactAttributionValue(value?.gaSessionId),
    pagePath: compactAttributionValue(value?.pagePath),
    referrer: compactAttributionValue(value?.referrer),
    sessionId: compactAttributionValue(value?.sessionId),
    touchId: compactAttributionValue(value?.touchId) || createId(),
    utm,
  };
}

function hasExplicitClickId(touch: Pick<AttributionTouch, "clickIds">) {
  return AD_CLICK_ID_FIELDS.some(
    (field) => !["fbc", "fbp", "ttp"].includes(field) && Boolean(touch.clickIds[field]),
  );
}

function hasMeaningfulAttribution(touch: AttributionTouch) {
  return Boolean(
    touch.referrer || Object.values(touch.utm).some(Boolean) || hasExplicitClickId(touch),
  );
}

function hasCampaignTouch(touch: AttributionTouch) {
  return Boolean(
    Object.values(touch.utm).some(Boolean) ||
      hasExplicitClickId(touch) ||
      touch.dimensions.ad_id ||
      touch.dimensions.campaign_id,
  );
}

// Keep these lists identical to RDA-Dashboard src/lib/attribution-quality.ts.
// Paid means: a paid UTM medium, or a click id with no unpaid medium.
// Unpaid mediums stay unpaid even when Meta appends fbclid to an IG post,
// bio link, or GBP share. A bare click id (no medium) still counts as paid.
export const PAID_UTM_MEDIUMS = [
  "cpc",
  "ppc",
  "paid",
  "paid_social",
  "paid-social",
] as const;

export const UNPAID_UTM_MEDIUMS = [
  "social",
  "organic",
  "gmb",
  "gbp",
  "google_business_profile",
] as const;

const PAID_UTM_MEDIUM = new RegExp(`^(${PAID_UTM_MEDIUMS.join("|")})$`, "iu");
const UNPAID_UTM_MEDIUM = new RegExp(`^(${UNPAID_UTM_MEDIUMS.join("|")})$`, "iu");

export function hasPaidTouch(touch: Pick<AttributionTouch, "clickIds" | "utm">) {
  const medium = touch.utm.utm_medium.trim();
  if (PAID_UTM_MEDIUM.test(medium)) return true;
  if (UNPAID_UTM_MEDIUM.test(medium)) return false;
  return hasExplicitClickId(touch);
}

function deriveLastPaidTouch(
  firstTouch: AttributionTouch,
  conversionTouch: AttributionTouch,
  storedLastPaid?: AttributionTouch | null,
): AttributionTouch {
  if (storedLastPaid && hasPaidTouch(storedLastPaid)) {
    return storedLastPaid;
  }
  if (hasPaidTouch(conversionTouch)) {
    return conversionTouch;
  }
  if (hasPaidTouch(firstTouch)) {
    return firstTouch;
  }
  return emptyTouch();
}

function nextLastPaidTouch(
  stored: StoredAttributionRecord | null,
  currentTouch: AttributionTouch,
): AttributionTouch {
  const storedLastPaid = stored
    ? deriveLastPaidTouch(stored.firstTouch, stored.conversionTouch, stored.lastPaidTouch)
    : emptyTouch();

  if (!hasPaidTouch(currentTouch)) {
    return storedLastPaid;
  }

  if (hasPaidTouch(storedLastPaid) && isSameVisit(storedLastPaid, currentTouch)) {
    return fillTouchGaps(storedLastPaid, currentTouch);
  }

  return touchForRole(currentTouch, "conversion");
}

function bareTouchId(touchId: string) {
  return touchId.replace(/^(?:first|conversion):/u, "");
}

function sameAttributionTouch(left: AttributionTouch, right: AttributionTouch) {
  return Boolean(left.touchId) && bareTouchId(left.touchId) === bareTouchId(right.touchId);
}

function distinctLastPaidTouch(record: StoredAttributionRecord) {
  const lastPaid = record.lastPaidTouch;
  if (
    !hasPaidTouch(lastPaid) ||
    sameAttributionTouch(lastPaid, record.firstTouch) ||
    sameAttributionTouch(lastPaid, record.conversionTouch)
  ) {
    return undefined;
  }

  return lastPaid;
}

function isMetaTouch(touch: Pick<AttributionTouch, "clickIds" | "dimensions" | "utm">) {
  const platform = (
    touch.dimensions.platform ||
    touch.utm.utm_source_platform ||
    touch.utm.utm_source
  ).trim().toLowerCase();
  return /^(meta|meta_ads|facebook|instagram|fb|ig)$/u.test(platform) ||
    Boolean(touch.clickIds.fbclid);
}

function buildFbcFromFbclid(fbclid: string, capturedAt: string) {
  const timestamp = Date.parse(capturedAt);
  return `fb.1.${Number.isFinite(timestamp) ? timestamp : Date.now()}.${fbclid}`;
}

function withoutRestrictedBrowserIds(touch: AttributionTouch): AttributionTouch {
  if (!touch.clickIds.fbc && !touch.clickIds.fbp && !touch.clickIds.ttp) {
    return touch;
  }

  return {
    ...touch,
    clickIds: {
      ...touch.clickIds,
      fbc: "",
      fbp: "",
      ttp: "",
    },
  };
}

function enrichMetaBrowserIds(
  touch: AttributionTouch,
  consentState: AttributionConsentState,
): AttributionTouch {
  if (consentState !== "granted" || !isMetaTouch(touch)) {
    return touch;
  }

  const clickIds = { ...touch.clickIds };
  const cookieFbc = compactAttributionValue(getCookieValue("_fbc"));
  const cookieFbp = compactAttributionValue(getCookieValue("_fbp"));

  if (clickIds.fbclid) {
    if (cookieFbc.endsWith(`.${clickIds.fbclid}`)) {
      clickIds.fbc = cookieFbc;
    } else if (!clickIds.fbc && !cookieFbc) {
      clickIds.fbc = buildFbcFromFbclid(clickIds.fbclid, touch.capturedAt);
    }
  }
  clickIds.fbp ||= cookieFbp;

  return { ...touch, clickIds };
}

export function getAttributionConsentState(): AttributionConsentState {
  if (typeof window === "undefined") {
    return "unknown";
  }

  const navigatorWithPrivacy = navigator as Navigator & { globalPrivacyControl?: boolean };

  if (
    navigatorWithPrivacy.globalPrivacyControl === true ||
    navigator.doNotTrack === "1" ||
    (window as Window & { doNotTrack?: string }).doNotTrack === "1"
  ) {
    return "restricted";
  }

  const cookieConsent = [
    getCookieValue("rda_attribution_consent"),
    getCookieValue("rda_analytics_consent"),
    getCookieValue("rda_cookie_consent"),
  ]
    .map((value) => value.toLowerCase());

  if (cookieConsent.some((value) =>
    ["denied", "rejected", "false", "0"].includes(value),
  )) {
    return "restricted";
  }

  if (cookieConsent.some((value) =>
    ["accepted", "granted", "true", "1"].includes(value),
  )) {
    return "granted";
  }

  return "unknown";
}

type BrowserStorage = "localStorage" | "sessionStorage";

function readStorage(storage: BrowserStorage, key: string) {
  try {
    return window[storage]?.getItem(key) ?? "";
  } catch {
    return "";
  }
}

function writeStorage(storage: BrowserStorage, key: string, value: string) {
  try {
    if (!window[storage]) {
      return false;
    }
    window[storage].setItem(key, value);
    return true;
  } catch {
    return false;
  }
}

function expireCookie(name: string) {
  if (typeof document === "undefined") {
    return;
  }

  try {
    document.cookie = `${name}=; Max-Age=0; Path=/; SameSite=Lax; Secure`;
  } catch {
    return;
  }
}

function writeCookie(name: string, value: string, maxEncodedLength = MAX_COOKIE_LENGTH) {
  const encoded = encodeURIComponent(value);
  if (encoded.length > maxEncodedLength) {
    return false;
  }

  try {
    document.cookie = `${name}=${encoded}; Max-Age=${Math.floor(
      MAX_ATTRIBUTION_AGE_MS / 1_000,
    )}; Path=/; SameSite=Lax; Secure`;
    return true;
  } catch {
    return false;
  }
}

function compactNonEmptyRecord(record: Record<string, string>) {
  return Object.fromEntries(Object.entries(record).filter(([, value]) => Boolean(value)));
}

type CompactStampTouch = {
  at?: string;
  d?: Record<string, string>;
  k?: Record<string, string>;
  p?: string;
  s?: string;
  t?: string;
  u?: Record<string, string>;
};

type CompactStampCookie = {
  a?: string;
  c?: CompactStampTouch;
  exp?: string;
  f?: CompactStampTouch;
  p?: CompactStampTouch;
  v?: 1;
};

function compactStampTouch(touch: AttributionTouch): CompactStampTouch {
  const clickIds = Object.fromEntries(
    Object.entries(touch.clickIds).filter(
      ([field]) => !["fbc", "fbp", "ttp"].includes(field),
    ),
  );
  return {
    at: touch.capturedAt,
    d: compactNonEmptyRecord(touch.dimensions),
    k: compactNonEmptyRecord(clickIds),
    p: touch.pagePath,
    s: touch.sessionId,
    t: touch.touchId,
    u: compactNonEmptyRecord(touch.utm),
  };
}

function expandStampTouch(value: CompactStampTouch | undefined): AttributionTouch {
  return normalizeTouch({
    capturedAt: value?.at,
    clickIds: value?.k as AttributionTouch["clickIds"],
    dimensions: value?.d as AttributionTouch["dimensions"],
    pagePath: value?.p,
    sessionId: value?.s,
    touchId: value?.t,
    utm: value?.u as AttributionTouch["utm"],
  });
}

function writeCompactStampCookie(record: StoredAttributionRecord) {
  const lastPaidTouch = distinctLastPaidTouch(record);
  writeCookie(ATTRIBUTION_STAMP_COOKIE, JSON.stringify({
    a: record.anonymousId,
    c: compactStampTouch(record.conversionTouch),
    exp: record.expiresAt,
    f: compactStampTouch(record.firstTouch),
    ...(lastPaidTouch ? { p: compactStampTouch(lastPaidTouch) } : {}),
    v: 1,
  } satisfies CompactStampCookie));
}

function parseCompactStampCookie(raw: string, now: Date): StoredAttributionRecord | null {
  try {
    const parsed = JSON.parse(raw) as CompactStampCookie;
    if (parsed.v !== 1 || !parsed.exp || Date.parse(parsed.exp) <= now.getTime()) {
      return null;
    }

    const firstTouch = expandStampTouch(parsed.f);
    const conversionTouch = expandStampTouch(parsed.c);
    const lastPaidTouch = parsed.p
      ? expandStampTouch(parsed.p)
      : deriveLastPaidTouch(firstTouch, conversionTouch);
    return {
      anonymousId: compactAttributionValue(parsed.a) || createId(),
      conversionTouch: firstTouch.touchId === conversionTouch.touchId
        ? touchForRole(conversionTouch, "conversion") : conversionTouch,
      expiresAt: parsed.exp,
      firstTouch: firstTouch.touchId === conversionTouch.touchId
        ? touchForRole(firstTouch, "first") : firstTouch,
      lastPaidTouch,
      policyVersion: ATTRIBUTION_POLICY_VERSION,
      version: 2,
    };
  } catch {
    return null;
  }
}

function readStoredRecordRaw(consentState: AttributionConsentState) {
  if (typeof window === "undefined") {
    return { raw: memoryRecord, scope: "memory" as const };
  }

  const sessionRaw = readStorage("sessionStorage", ATTRIBUTION_SESSION_KEY);

  if (consentState === "restricted") {
    return sessionRaw
      ? { raw: sessionRaw, scope: "session" as const }
      : { raw: memoryRecord, scope: "memory" as const };
  }

  const localRaw = readStorage("localStorage", ATTRIBUTION_STORAGE_KEY);
  const cookieRaw = getCookieValue(ATTRIBUTION_STORAGE_KEY);
  const stampRaw = getCookieValue(ATTRIBUTION_STAMP_COOKIE);
  const legacyRaw = readStorage("sessionStorage", LEGACY_ATTRIBUTION_STORAGE_KEY);

  if (localRaw || cookieRaw) {
    return { raw: localRaw || cookieRaw, scope: "persistent" as const };
  }

  if (stampRaw) {
    return { raw: stampRaw, scope: "persistent" as const };
  }

  if (sessionRaw || legacyRaw) {
    return { raw: sessionRaw || legacyRaw, scope: "session" as const };
  }

  return { raw: memoryRecord, scope: "memory" as const };
}

function parseStoredRecord(raw: string, now: Date): StoredAttributionRecord | null {
  try {
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as Partial<StoredAttributionRecord> & {
      clickIds?: Record<AdClickIdField, string>;
      referrer?: string;
      utm?: Record<UtmField, string>;
    };

    if (parsed.version === 2 && parsed.firstTouch && parsed.conversionTouch) {
      if (!parsed.expiresAt || Date.parse(parsed.expiresAt) <= now.getTime()) {
        return null;
      }

      const firstTouch = normalizeTouch(parsed.firstTouch);
      const conversionTouch = normalizeTouch(parsed.conversionTouch);
      let lastPaidTouch: AttributionTouch;
      try {
        lastPaidTouch = parsed.lastPaidTouch
          ? normalizeTouch(parsed.lastPaidTouch)
          : deriveLastPaidTouch(firstTouch, conversionTouch);
      } catch {
        lastPaidTouch = deriveLastPaidTouch(firstTouch, conversionTouch);
      }
      return {
        anonymousId: compactAttributionValue(parsed.anonymousId) || createId(),
        conversionTouch: firstTouch.touchId === conversionTouch.touchId
          ? touchForRole(conversionTouch, "conversion") : conversionTouch,
        expiresAt: parsed.expiresAt,
        firstTouch: firstTouch.touchId === conversionTouch.touchId
          ? touchForRole(firstTouch, "first") : firstTouch,
        lastPaidTouch,
        policyVersion: compactAttributionValue(parsed.policyVersion) || ATTRIBUTION_POLICY_VERSION,
        version: 2,
      };
    }

    if (parsed.utm || parsed.clickIds || parsed.referrer) {
      const migratedTouch = normalizeTouch({
        capturedAt: now.toISOString(),
        clickIds: parsed.clickIds,
        referrer: parsed.referrer,
        utm: parsed.utm,
      });
      const firstTouch = touchForRole(migratedTouch, "first");
      const conversionTouch = touchForRole(migratedTouch, "conversion");

      return {
        anonymousId: createId(),
        conversionTouch,
        expiresAt: new Date(now.getTime() + MAX_ATTRIBUTION_AGE_MS).toISOString(),
        firstTouch,
        lastPaidTouch: deriveLastPaidTouch(firstTouch, conversionTouch),
        policyVersion: ATTRIBUTION_POLICY_VERSION,
        version: 2,
      };
    }
  } catch {
    return parseCompactStampCookie(raw, now);
  }

  return parseCompactStampCookie(raw, now);
}

// Only add evidence to the same visit. A later campaign must keep its own
// click IDs, dimensions and UTMs rather than filling gaps from an older ad.
function isSameVisit(stored: AttributionTouch, current: AttributionTouch) {
  const sameIdentity = stored.touchId === `first:${current.touchId}` ||
    stored.touchId === `conversion:${current.touchId}`;
  if (
    !sameIdentity || !stored.sessionId || stored.sessionId !== current.sessionId ||
    stored.pagePath !== current.pagePath
  ) {
    return false;
  }

  if (ATTRIBUTION_AD_DIMENSION_FIELDS.some((field) =>
    stored.dimensions[field] && current.dimensions[field] &&
    stored.dimensions[field] !== current.dimensions[field],
  )) {
    return false;
  }

  const sameUtm = UTM_FIELDS.every((field) => stored.utm[field] === current.utm[field]);
  const sameClick = AD_CLICK_ID_FIELDS
    .filter((field) => !["fbc", "fbp", "ttp"].includes(field))
    .every((field) => stored.clickIds[field] === current.clickIds[field]);
  // Query tags and click IDs identify the visit; browser cookies may arrive later.
  if (
    !sameUtm || !sameClick ||
    hasCampaignTouch(stored) !== hasCampaignTouch(current)
  ) {
    return false;
  }
  return true;
}

function fillTouchGaps(stored: AttributionTouch, current: AttributionTouch): AttributionTouch {
  return {
    ...stored,
    clickIds: Object.fromEntries(
      AD_CLICK_ID_FIELDS.map((field) => [field, stored.clickIds[field] || current.clickIds[field]]),
    ) as Record<AdClickIdField, string>,
    dimensions: Object.fromEntries(
      ATTRIBUTION_AD_DIMENSION_FIELDS.map((field) => [
        field,
        stored.dimensions[field] || current.dimensions[field],
      ]),
    ) as Record<AttributionAdDimensionField, string>,
    gaClientId: stored.gaClientId || current.gaClientId,
    gaSessionId: stored.gaSessionId || current.gaSessionId,
    utm: Object.fromEntries(
      UTM_FIELDS.map((field) => [field, stored.utm[field] || current.utm[field]]),
    ) as Record<UtmField, string>,
  };
}

function createRecord(
  stored: StoredAttributionRecord | null,
  currentTouch: AttributionTouch,
  now: Date,
  anonymousId: string,
): StoredAttributionRecord {
  if (!stored) {
    const firstTouch = touchForRole(currentTouch, "first");
    const conversionTouch = touchForRole(currentTouch, "conversion");
    return {
      anonymousId,
      conversionTouch,
      expiresAt: new Date(now.getTime() + MAX_ATTRIBUTION_AGE_MS).toISOString(),
      firstTouch,
      lastPaidTouch: nextLastPaidTouch(null, currentTouch),
      policyVersion: ATTRIBUTION_POLICY_VERSION,
      version: 2,
    };
  }

  const hasCurrentCampaign = hasCampaignTouch(currentTouch);

  return {
    ...stored,
    conversionTouch: isSameVisit(stored.conversionTouch, currentTouch)
      ? fillTouchGaps(stored.conversionTouch, currentTouch)
      : hasCurrentCampaign
        ? touchForRole(currentTouch, "conversion")
        : stored.conversionTouch,
    expiresAt: hasCurrentCampaign
      ? new Date(now.getTime() + MAX_ATTRIBUTION_AGE_MS).toISOString()
      : stored.expiresAt,
    firstTouch: isSameVisit(stored.firstTouch, currentTouch)
      ? fillTouchGaps(stored.firstTouch, currentTouch)
      : stored.firstTouch,
    lastPaidTouch: nextLastPaidTouch(stored, currentTouch),
    policyVersion: ATTRIBUTION_POLICY_VERSION,
  };
}

function persistRecord(record: StoredAttributionRecord, consentState: AttributionConsentState) {
  const lastPaidTouch = distinctLastPaidTouch(record);
  const serialized = JSON.stringify({
    ...record,
    lastPaidTouch,
  });
  memoryRecord = serialized;

  if (typeof window === "undefined") {
    return "memory" as const;
  }

  // Always keep a same-session copy. Instagram in-app browsers can drop
  // localStorage on the next document while the webview is still open.
  const storedInSession = writeStorage("sessionStorage", ATTRIBUTION_SESSION_KEY, serialized);

  if (consentState === "restricted") {
    return storedInSession ? ("session" as const) : ("memory" as const);
  }

  const storedLocally = writeStorage("localStorage", ATTRIBUTION_STORAGE_KEY, serialized);
  const storedInCookie = writeCookie(ATTRIBUTION_STORAGE_KEY, serialized);
  if (!storedInCookie) {
    expireCookie(ATTRIBUTION_STORAGE_KEY);
  }
  writeCompactStampCookie(record);

  if (storedLocally || storedInCookie) {
    return "persistent" as const;
  }

  return storedInSession ? ("session" as const) : ("memory" as const);
}

function getSessionId() {
  if (typeof window === "undefined") {
    return "";
  }

  const stored = readStorage("sessionStorage", SESSION_ID_KEY);

  if (stored) {
    return stored;
  }

  memorySessionId ||= createId();
  writeStorage("sessionStorage", SESSION_ID_KEY, memorySessionId);
  return memorySessionId;
}

export function getAttributionStorageSnapshot() {
  if (typeof window === "undefined") {
    return "";
  }

  const consentState = getAttributionConsentState();
  const stored = readStoredRecordRaw(consentState);

  return JSON.stringify({ consentState, raw: stored.raw, scope: stored.scope });
}

export function resolveLeadAttribution(input?: {
  anonymousId?: string;
  capturedAt?: string;
  currentOrigin?: string;
  pagePath?: string;
  referrer?: string;
  search?: string;
}, shouldPersist = true): LeadAttribution {
  if (typeof window === "undefined" && !input) {
    const blank = emptyTouch();

    return {
      anonymousId: "",
      clickIds: blank.clickIds,
      consentState: "unknown",
      conversionTouch: blank,
      firstTouch: blank,
      lastPaidTouch: blank,
      policyVersion: ATTRIBUTION_POLICY_VERSION,
      referrer: "",
      sessionId: "",
      storageScope: "memory",
      utm: blank.utm,
    };
  }

  const now = input?.capturedAt ? new Date(input.capturedAt) : new Date();
  const consentState = getAttributionConsentState();
  const storedRaw = readStoredRecordRaw(consentState);
  const stored = parseStoredRecord(storedRaw.raw, now);
  const sessionId = getSessionId();

  if (stored) {
    stored.firstTouch = enrichMetaBrowserIds({
      ...stored.firstTouch,
      sessionId: stored.firstTouch.sessionId || sessionId,
    }, consentState);
    stored.conversionTouch = enrichMetaBrowserIds({
      ...stored.conversionTouch,
      sessionId: stored.conversionTouch.sessionId || sessionId,
    }, consentState);
    stored.lastPaidTouch = enrichMetaBrowserIds({
      ...(stored.lastPaidTouch ?? emptyTouch()),
      sessionId: stored.lastPaidTouch?.sessionId || sessionId,
    }, consentState);
    if (consentState !== "granted") {
      stored.lastPaidTouch = withoutRestrictedBrowserIds(stored.lastPaidTouch);
    }
  }

  const search = input?.search ?? window.location.search;
  const pagePath = input?.pagePath ?? window.location.pathname;
  const visitSignature = JSON.stringify([sessionId, pagePath, search]);
  if (visitSignature !== memoryVisitSignature) {
    memoryVisitSignature = visitSignature;
    memoryVisitTouchId = createId();
  }
  const currentTouch = enrichMetaBrowserIds(parseAttributionTouch(
    search,
    input?.referrer ?? document.referrer,
    input?.currentOrigin ?? window.location.origin,
    pagePath,
    now.toISOString(),
    sessionId,
  ), consentState);
  currentTouch.touchId = memoryVisitTouchId;
  const record = createRecord(
    stored,
    currentTouch,
    now,
    stored?.anonymousId || input?.anonymousId || createId(),
  );
  const storageScope = shouldPersist
    ? persistRecord(record, consentState)
    : storedRaw.scope;

  const attribution = {
    anonymousId: record.anonymousId,
    clickIds: record.conversionTouch.clickIds,
    consentState,
    conversionTouch: record.conversionTouch,
    firstTouch: record.firstTouch,
    lastPaidTouch: record.lastPaidTouch,
    policyVersion: ATTRIBUTION_POLICY_VERSION,
    referrer: record.conversionTouch.referrer,
    sessionId,
    storageScope,
    utm: record.conversionTouch.utm,
  };
  const stamp = getLeadAttributionStamp(attribution);

  return {
    ...attribution,
    clickIds: stamp.clickIds,
    utm: stamp.utm,
  };
}

export type LeadAttributionStamp = {
  ad_id: string;
  campaign_id: string;
  campaign_intent: string;
  clickIds: Record<AdClickIdField, string>;
  landing_page: string;
  utm: Record<UtmField, string>;
};

export function getLeadAttributionStamp(
  attribution: Pick<LeadAttribution, "conversionTouch" | "firstTouch"> & {
    lastPaidTouch?: AttributionTouch;
  },
): LeadAttributionStamp {
  const first = attribution.firstTouch;
  const conversion = attribution.conversionTouch;
  // Top-level Formspree fields answer "which paid click should we tag?"
  // Same order as RDA-Dashboard hasPaidAttributionTouch: a paid medium
  // (cpc/ppc/paid/paid_social/paid-social) wins; unpaid mediums (social,
  // organic, gmb, gbp, google_business_profile) are not paid even with a
  // click id — Meta adds fbclid to organic IG/GBP links too; otherwise a
  // click id with no non-paid medium means paid. Only paid visits update
  // lastPaidTouch, so an organic IG/GBP fbclid cannot hide a later Meta
  // click that is no longer first or conversion. First-touch identity stays
  // in first_touch_* and is never overwritten.
  const lastPaid = attribution.lastPaidTouch && hasPaidTouch(attribution.lastPaidTouch)
    ? attribution.lastPaidTouch
    : undefined;
  const touch = lastPaid
    ? lastPaid
    : hasPaidTouch(conversion)
      ? conversion
      : hasPaidTouch(first)
        ? first
        : hasMeaningfulAttribution(first)
          ? first
          : conversion;
  const utm = { ...touch.utm };
  const clickIds = { ...touch.clickIds };

  return {
    ad_id: touch.dimensions.ad_id || parseMetaAdIdFromUtmContent(utm.utm_content),
    campaign_id: touch.dimensions.campaign_id || utm.utm_id,
    campaign_intent: utm.utm_campaign,
    clickIds,
    landing_page: touch.pagePath || first.pagePath || conversion.pagePath,
    utm,
  };
}

export function getLeadAttributionFormFields(attribution: LeadAttribution) {
  const stamp = getLeadAttributionStamp(attribution);
  const fields: Record<string, string> = {
    ad_id: stamp.ad_id,
    anonymous_id: attribution.anonymousId,
    attribution_consent_state: attribution.consentState,
    attribution_policy_version: attribution.policyVersion,
    attribution_storage_scope: attribution.storageScope,
    campaign_id: stamp.campaign_id,
    // Converting visit's landing page (the conversion-touch path). The form
    // `page_path` field is the page that submitted.
    conversion_landing_page: attribution.conversionTouch.pagePath,
    landing_page: stamp.landing_page,
    conversion_touch_captured_at: attribution.conversionTouch.capturedAt,
    conversion_touch_ga_client_id: attribution.conversionTouch.gaClientId,
    conversion_touch_ga_session_id: attribution.conversionTouch.gaSessionId,
    conversion_touch_page_path: attribution.conversionTouch.pagePath,
    conversion_touch_referrer: attribution.conversionTouch.referrer,
    conversion_touch_session_id: attribution.conversionTouch.sessionId,
    conversion_touch_id: attribution.conversionTouch.touchId,
    first_touch_captured_at: attribution.firstTouch.capturedAt,
    first_touch_ga_client_id: attribution.firstTouch.gaClientId,
    first_touch_ga_session_id: attribution.firstTouch.gaSessionId,
    first_touch_page_path: attribution.firstTouch.pagePath,
    first_touch_referrer: attribution.firstTouch.referrer,
    first_touch_session_id: attribution.firstTouch.sessionId,
    first_touch_id: attribution.firstTouch.touchId,
    session_id: attribution.sessionId,
  };

  for (const field of UTM_FIELDS) {
    fields[field] = stamp.utm[field];
    fields[`conversion_touch_${field}`] = attribution.conversionTouch.utm[field];
    fields[`first_touch_${field}`] = attribution.firstTouch.utm[field];
  }

  for (const field of AD_CLICK_ID_FIELDS) {
    fields[field] = stamp.clickIds[field];
    fields[`conversion_touch_${field}`] = attribution.conversionTouch.clickIds[field];
    fields[`first_touch_${field}`] = attribution.firstTouch.clickIds[field];
  }

  for (const field of ATTRIBUTION_AD_DIMENSION_FIELDS) {
    fields[`conversion_touch_${field}`] = attribution.conversionTouch.dimensions[field];
    fields[`first_touch_${field}`] = attribution.firstTouch.dimensions[field];
  }

  return fields;
}

export function buildAttributionReceipt(
  attribution: LeadAttribution,
  input: {
    acceptedAt: string;
    formId: string;
    formKey: string;
    leadEventId: string;
  },
): AttributionReceipt {
  const toReceiptTouch = (
    touch: AttributionTouch,
    type: "conversion" | "first",
  ): AttributionReceipt["firstTouch"] => ({
    anonymousId: attribution.anonymousId,
    capturedAt: touch.capturedAt,
    clickIds: touch.clickIds,
    consent: {
      analytics: attribution.consentState === "granted",
      marketing: attribution.consentState === "granted",
      policyVersion: attribution.policyVersion,
      recordedAt: touch.capturedAt,
    },
    dimensions: touch.dimensions,
    gaClientId: touch.gaClientId,
    gaSessionId: touch.gaSessionId,
    landingPage: touch.pagePath,
    referrer: touch.referrer,
    sessionId: touch.sessionId || attribution.sessionId,
    touchId: touch.touchId,
    type,
    utm: touch.utm,
  });

  return {
    acceptedAt: input.acceptedAt,
    conversionTouch: toReceiptTouch(attribution.conversionTouch, "conversion"),
    firstTouch: toReceiptTouch(attribution.firstTouch, "first"),
    formId: input.formId,
    formKey: input.formKey,
    leadEventId: input.leadEventId,
    schemaVersion: ATTRIBUTION_SCHEMA_VERSION,
  };
}
