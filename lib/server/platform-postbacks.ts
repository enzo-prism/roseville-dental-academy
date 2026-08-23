import type { PendingPostback, PostbackOutcome } from "@/lib/server/attribution-db";
import { approvedConsentPolicyVersions, providerEventName, validateOnlyMode } from "@/lib/server/postback-config";

const GOOGLE_EVENTS_ENDPOINT = "https://datamanager.googleapis.com/v1/events:ingest";
const GOOGLE_TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token";
const TIKTOK_EVENTS_ENDPOINT = "https://business-api.tiktok.com/open_api/v1.3/event/track/";
const REQUEST_TIMEOUT_MS = 10_000;

let googleTokenCache: { accessToken: string; expiresAt: number } | null = null;

function record(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function stringField(value: unknown) {
  return typeof value === "string" ? value : "";
}

function identifiers(job: PendingPostback) {
  const touch = record(job.touch);
  return {
    capturedAt: stringField(touch.captured_at),
    clickIds: record(touch.click_ids),
    landingPage: stringField(touch.landing_page),
    marketingConsent: touch.marketing_consent === true,
    policyVersion: stringField(touch.consent_policy_version),
  };
}

function milestone(job: PendingPostback) {
  return providerEventName(job.platform, job.eventType);
}

function providerEventId(job: PendingPostback) {
  return job.eventType === "qualified_lead" ? job.leadEventId : job.conversionEventId;
}

function retryableStatus(status: number) {
  return status === 408 || status === 425 || status === 429 || status >= 500;
}

async function responseJson(response: Response) {
  try {
    return record(await response.json());
  } catch {
    return {};
  }
}

async function fetchWithTimeout(url: string, init: RequestInit) {
  return fetch(url, { ...init, redirect: "error", signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) });
}

function transportFailure(error: unknown): PostbackOutcome {
  const timeout = error instanceof Error && error.name === "TimeoutError";
  return {
    errorCode: timeout ? "timeout" : "network_error",
    errorSummary: timeout ? "Provider request timed out" : "Provider request failed before acknowledgement",
    retryable: true,
    status: "retry",
  };
}

async function sendMeta(job: PendingPostback): Promise<PostbackOutcome> {
  const token = process.env.META_CAPI_ACCESS_TOKEN?.trim();
  const pixelId = process.env.META_CAPI_PIXEL_ID?.trim();
  const version = process.env.META_GRAPH_API_VERSION?.trim();
  if (!token || !pixelId || !version || !/^[0-9]{5,40}$/u.test(pixelId) || !/^v\d{1,2}\.\d{1,2}$/u.test(version)) {
    return { status: "retry", retryable: true, errorCode: "not_configured", errorSummary: "Meta CAPI is not configured with valid identifiers" };
  }
  const attribution = identifiers(job);
  const userData: Record<string, string | string[]> = {};
  if (job.emailSha256) userData.em = [job.emailSha256];
  if (job.phoneSha256) userData.ph = [job.phoneSha256];
  const fbclid = stringField(attribution.clickIds.fbclid);
  const clickTimestamp = Date.parse(attribution.capturedAt || job.occurredAt);
  const fbc = stringField(attribution.clickIds.fbc) || (fbclid && Number.isFinite(clickTimestamp)
    ? `fb.1.${clickTimestamp}.${fbclid}` : "");
  const fbp = stringField(attribution.clickIds.fbp);
  if (fbc) userData.fbc = fbc;
  if (fbp) userData.fbp = fbp;

  try {
    const response = await fetchWithTimeout(`https://graph.facebook.com/${version}/${pixelId}/events`, {
      body: JSON.stringify({ data: [{ action_source: "website", event_id: providerEventId(job),
        event_name: milestone(job), event_source_url: attribution.landingPage || undefined,
        event_time: Math.floor(Date.parse(job.occurredAt) / 1_000), user_data: userData }] }),
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      method: "POST",
    });
    const payload = await responseJson(response);
    if (response.ok && Number(payload.events_received) > 0) {
      return { status: "accepted", providerReceiptId: stringField(payload.fbtrace_id) || undefined };
    }
    return { status: retryableStatus(response.status) ? "retry" : "failed",
      retryable: retryableStatus(response.status), errorCode: `meta_http_${response.status}`,
      errorSummary: "Meta did not acknowledge the conversion event" };
  } catch (error) {
    return transportFailure(error);
  }
}

async function getGoogleAccessToken(): Promise<string> {
  if (googleTokenCache && googleTokenCache.expiresAt > Date.now() + 60_000) return googleTokenCache.accessToken;
  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID?.trim();
  const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET?.trim();
  const refreshToken = process.env.GOOGLE_OAUTH_REFRESH_TOKEN?.trim();
  if (!clientId || !clientSecret || !refreshToken) return "";
  const response = await fetchWithTimeout(GOOGLE_TOKEN_ENDPOINT, {
    body: new URLSearchParams({ client_id: clientId, client_secret: clientSecret,
      grant_type: "refresh_token", refresh_token: refreshToken }),
    headers: { "Content-Type": "application/x-www-form-urlencoded" }, method: "POST",
  });
  if (!response.ok) return "";
  const payload = await responseJson(response);
  const accessToken = stringField(payload.access_token);
  const expiresIn = Number(payload.expires_in);
  if (!accessToken || !Number.isFinite(expiresIn) || expiresIn < 60) return "";
  googleTokenCache = { accessToken, expiresAt: Date.now() + expiresIn * 1_000 };
  return accessToken;
}

async function sendGoogle(job: PendingPostback): Promise<PostbackOutcome> {
  const operatingAccountId = process.env.GOOGLE_ADS_OPERATING_ACCOUNT_ID?.trim();
  const loginAccountId = process.env.GOOGLE_ADS_LOGIN_ACCOUNT_ID?.trim();
  const destinationId = process.env.GOOGLE_ADS_CONVERSION_ACTION_ID?.trim();
  if (!operatingAccountId || !loginAccountId || !destinationId ||
      !/^[0-9-]{3,30}$/u.test(operatingAccountId) || !/^[0-9-]{3,30}$/u.test(loginAccountId) ||
      !/^[0-9]{3,30}$/u.test(destinationId)) {
    return { status: "retry", retryable: true, errorCode: "not_configured", errorSummary: "Google Data Manager account mapping is not configured" };
  }
  let token = "";
  try {
    token = await getGoogleAccessToken();
  } catch (error) {
    return transportFailure(error);
  }
  if (!token) return { status: "retry", retryable: true, errorCode: "oauth_unavailable",
    errorSummary: "Durable Google OAuth refresh credentials are unavailable" };

  const attribution = identifiers(job);
  const clickIds = attribution.clickIds;
  const userIdentifiers = [job.emailSha256 ? { emailAddress: job.emailSha256 } : null,
    job.phoneSha256 ? { phoneNumber: job.phoneSha256 } : null].filter(Boolean);
  const validateOnly = process.env.RDA_POSTBACK_VALIDATE_ONLY !== "false";
  try {
    const response = await fetchWithTimeout(GOOGLE_EVENTS_ENDPOINT, {
      body: JSON.stringify({
        consent: { adPersonalization: "CONSENT_GRANTED", adUserData: "CONSENT_GRANTED" },
        destinations: [{ loginAccount: { accountId: loginAccountId, accountType: "GOOGLE_ADS" },
          operatingAccount: { accountId: operatingAccountId, accountType: "GOOGLE_ADS" },
          productDestinationId: destinationId }],
        encoding: "HEX",
        events: [{ adIdentifiers: { gbraid: stringField(clickIds.gbraid) || undefined,
          gclid: stringField(clickIds.gclid) || undefined, wbraid: stringField(clickIds.wbraid) || undefined },
          eventName: milestone(job), eventSource: "WEB", eventTimestamp: job.occurredAt,
          transactionId: providerEventId(job), userData: { userIdentifiers } }],
        validateOnly,
      }),
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, method: "POST",
    });
    const payload = await responseJson(response);
    const requestId = stringField(payload.requestId);
    if (response.ok && requestId) return { status: validateOnly ? "validated" : "accepted", providerReceiptId: requestId };
    return { status: retryableStatus(response.status) ? "retry" : "failed", retryable: retryableStatus(response.status),
      errorCode: `google_http_${response.status}`, errorSummary: "Google Data Manager did not return a request ID" };
  } catch (error) {
    return transportFailure(error);
  }
}

async function sendTikTok(job: PendingPostback): Promise<PostbackOutcome> {
  const token = process.env.TIKTOK_EVENTS_ACCESS_TOKEN?.trim();
  const pixelCode = process.env.TIKTOK_PIXEL_CODE?.trim();
  if (!token || !pixelCode || !/^[A-Za-z0-9_-]{5,80}$/u.test(pixelCode)) {
    return { status: "retry", retryable: true, errorCode: "not_configured", errorSummary: "TikTok Events API is not configured" };
  }
  const attribution = identifiers(job);
  try {
    const response = await fetchWithTimeout(TIKTOK_EVENTS_ENDPOINT, {
      body: JSON.stringify({ event_source: "web", event_source_id: pixelCode, data: [{
        event: milestone(job), event_id: providerEventId(job),
        event_time: Math.floor(Date.parse(job.occurredAt) / 1_000),
        page: { url: attribution.landingPage || undefined },
        user: { email: job.emailSha256 ? [job.emailSha256] : undefined,
          phone: job.phoneSha256 ? [job.phoneSha256] : undefined,
          ttclid: stringField(attribution.clickIds.ttclid) || undefined,
          ttp: stringField(attribution.clickIds.ttp) || undefined },
      }] }),
      headers: { "Access-Token": token, "Content-Type": "application/json" }, method: "POST",
    });
    const payload = await responseJson(response);
    const success = response.ok && (Number(payload.code) === 0 || stringField(payload.code) === "0");
    if (success) return { status: "accepted", providerReceiptId: stringField(payload.request_id) ||
      stringField(payload.log_id) || undefined };
    return { status: retryableStatus(response.status) ? "retry" : "failed", retryable: retryableStatus(response.status),
      errorCode: `tiktok_http_${response.status}`, errorSummary: "TikTok did not acknowledge the conversion event" };
  } catch (error) {
    return transportFailure(error);
  }
}

export async function sendPlatformPostback(job: PendingPostback): Promise<PostbackOutcome> {
  const attribution = identifiers(job);
  if (process.env.RDA_PLATFORM_POSTBACKS_ENABLED !== "true") return { status: "disabled", errorCode: "disabled",
    errorSummary: "Platform postbacks are disabled" };
  if (validateOnlyMode() && job.platform !== "google") return { status: "disabled",
    errorCode: "validate_only_no_safe_provider_call",
    errorSummary: "Validate-only mode blocks all real Meta and TikTok requests" };
  if (!attribution.marketingConsent) return { status: "disabled", errorCode: "consent_unavailable",
    errorSummary: "Marketing consent was not captured" };
  if (!approvedConsentPolicyVersions().has(attribution.policyVersion)) return { status: "disabled",
    errorCode: "consent_policy_not_approved",
    errorSummary: "The captured consent policy version is not approved for platform sharing" };
  if (!milestone(job)) return { status: "failed", errorCode: "unsupported_milestone",
    errorSummary: "The conversion milestone has no reviewed platform mapping" };
  if (!job.emailSha256 && !job.phoneSha256 && !Object.values(attribution.clickIds).some(Boolean)) {
    return { status: "disabled", errorCode: "identifier_unavailable", errorSummary: "No consented match identifier is available" };
  }
  if (job.platform === "meta") return sendMeta(job);
  if (job.platform === "google") return sendGoogle(job);
  return sendTikTok(job);
}
