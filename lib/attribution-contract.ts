export const ATTRIBUTION_SCHEMA_VERSION = 1 as const;

export const ATTRIBUTION_UTM_FIELDS = [
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_id",
  "utm_source_platform",
  "utm_term",
  "utm_content",
] as const;

export const ATTRIBUTION_CLICK_ID_FIELDS = [
  "dclid",
  "fbclid",
  "fbc",
  "fbp",
  "gbraid",
  "gclid",
  "msclkid",
  "sc_click_id",
  "sccid",
  "ttclid",
  "ttp",
  "wbraid",
] as const;

export const ATTRIBUTION_AD_DIMENSION_FIELDS = [
  "platform",
  "account_id",
  "campaign_id",
  "campaign_name",
  "adset_id",
  "adset_name",
  "adgroup_id",
  "adgroup_name",
  "ad_id",
  "ad_name",
  "creative_id",
] as const;

export type AttributionUtmField = (typeof ATTRIBUTION_UTM_FIELDS)[number];
export type AttributionClickIdField = (typeof ATTRIBUTION_CLICK_ID_FIELDS)[number];
export type AttributionAdDimensionField =
  (typeof ATTRIBUTION_AD_DIMENSION_FIELDS)[number];
export type AttributionTouchType = "first" | "conversion";

export type AttributionTouch = {
  anonymousId: string;
  capturedAt: string;
  clickIds: Record<AttributionClickIdField, string>;
  consent: {
    analytics: boolean;
    marketing: boolean;
    policyVersion: string;
    recordedAt: string;
  };
  dimensions: Record<AttributionAdDimensionField, string>;
  gaClientId: string;
  gaSessionId: string;
  landingPage: string;
  referrer: string;
  sessionId: string;
  touchId: string;
  type: AttributionTouchType;
  utm: Record<AttributionUtmField, string>;
};

export type AttributionReceipt = {
  acceptedAt: string;
  conversionTouch: AttributionTouch;
  firstTouch: AttributionTouch;
  formId: string;
  formKey: string;
  leadEventId: string;
  schemaVersion: typeof ATTRIBUTION_SCHEMA_VERSION;
};

export type CanonicalLeadInput = {
  contactKey: string;
  emailSha256?: string;
  formId: string;
  leadEventId?: string;
  leadId: string;
  phoneSha256?: string;
  programInterest?: string;
  sourcePage?: string;
  submissionId: string;
  submittedAt: string;
};

export type CanonicalConversionInput = {
  contactKey: string;
  eventId: string;
  eventType: "qualified_lead" | "first_visit" | "enrolled" | "class_started";
  leadId: string;
  matchConfidence: "high" | "medium";
  matchMethod: "exact_email" | "exact_phone" | "exact_name_and_timing" | "reviewed";
  occurredAt: string;
  sourceRecordId: string;
};

export type DailyAdDeliveryInput = {
  accountId: string;
  adId: string;
  adName?: string;
  adSetId: string;
  adSetName?: string;
  campaignId: string;
  campaignName?: string;
  clicks: number;
  date: string;
  impressions: number;
  platform: "google" | "meta" | "tiktok" | "snapchat" | "microsoft";
  spend: number;
};

export type PlatformAttributionValidationInput = {
  identifierSha256: string;
  identifierType: "ad_id" | "fbclid" | "fbc" | "gbraid" | "gclid" | "ttclid" | "wbraid";
  leadId: string;
  platform: "google" | "meta" | "tiktok" | "snapchat" | "microsoft";
  provenance: "google_data_manager" | "meta_events_manager" | "tiktok_events_manager" | "reviewed_platform_export";
  sourceRecordId: string;
  validatedAt: string;
  validationId: string;
};

export type AttributionDashboardSnapshot = {
  generatedAt: string;
  health: {
    canonicalLeads: number;
    deterministicStudentCoverageRate: number;
    exactAdCoverageRate: number;
    leadCaptureRate: number;
    postbacksAccepted: number;
    postbacksFailed: number;
    postbacksPending: number;
    postbacksValidated: number;
    retainedEvidenceCoverageRate: number;
    retainedEvidenceLeads: number;
    studentSourceCoverageRate: number;
    verifiedReceipts: number;
  };
  observedFunnel: Array<{
    accountId: string;
    adId: string;
    adName: string;
    adSetId: string;
    campaignId: string;
    campaignName: string;
    clicks: number;
    enrolledStudents: number;
    evidenceTier: "A" | "B" | "C" | "D" | "E" | "mixed";
    impressions: number;
    leadEvidenceCounts: Record<"A" | "B" | "C" | "D" | "E", number>;
    leadEvidenceCoverageRate: number;
    leads: number;
    platform: string;
    spend: number;
    studentEvidenceCounts: Record<"A" | "B" | "C" | "D" | "E", number>;
    studentEvidenceCoverageRate: number;
  }>;
  schemaVersion: typeof ATTRIBUTION_SCHEMA_VERSION;
  evidenceWindow: {
    end: string | null;
    start: string | null;
  };
  sourceWindow: {
    end: string | null;
    start: string | null;
  };
  unknownReasons: Array<{ count: number; reason: string }>;
};
