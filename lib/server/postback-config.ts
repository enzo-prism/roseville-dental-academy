export type PostbackPlatform = "google" | "meta" | "tiktok";
export type PostbackMilestone = "qualified_lead" | "first_visit" | "enrolled" | "class_started";

const ENV_BY_PLATFORM: Record<PostbackPlatform, string> = {
  google: "RDA_GOOGLE_MILESTONE_MAP_JSON",
  meta: "RDA_META_MILESTONE_MAP_JSON",
  tiktok: "RDA_TIKTOK_MILESTONE_MAP_JSON",
};

const DEFAULT_MAP: Record<PostbackPlatform, Partial<Record<PostbackMilestone, string>>> = {
  google: {},
  meta: { qualified_lead: "Lead" },
  tiktok: {},
};

const MILESTONES = new Set<PostbackMilestone>([
  "qualified_lead", "first_visit", "enrolled", "class_started",
]);
const PROVIDER_EVENT_PATTERN = /^[A-Za-z][A-Za-z0-9_]{0,79}$/u;

export function configuredMilestoneMap(platform: PostbackPlatform) {
  const raw = process.env[ENV_BY_PLATFORM[platform]]?.trim();
  if (!raw) return DEFAULT_MAP[platform];
  try {
    const input = JSON.parse(raw) as unknown;
    if (!input || typeof input !== "object" || Array.isArray(input)) return {};
    const entries = Object.entries(input as Record<string, unknown>);
    if (platform === "google" && entries.length > 1) return {};
    const values = new Set<string>();
    const result: Partial<Record<PostbackMilestone, string>> = {};
    for (const [key, value] of entries) {
      if (!MILESTONES.has(key as PostbackMilestone) || typeof value !== "string" ||
          !PROVIDER_EVENT_PATTERN.test(value) || values.has(value.toLowerCase())) return {};
      values.add(value.toLowerCase());
      result[key as PostbackMilestone] = value;
    }
    return result;
  } catch {
    return {};
  }
}

export function configuredPostbackPlatforms(milestone: PostbackMilestone) {
  return (["google", "meta", "tiktok"] as const).filter(
    (platform) => Boolean(configuredMilestoneMap(platform)[milestone]),
  );
}

export function providerEventName(platform: PostbackPlatform, milestone: string) {
  return MILESTONES.has(milestone as PostbackMilestone)
    ? configuredMilestoneMap(platform)[milestone as PostbackMilestone] ?? "" : "";
}

export function validateOnlyMode() {
  return process.env.RDA_POSTBACK_VALIDATE_ONLY !== "false";
}

export function approvedConsentPolicyVersions() {
  return new Set((process.env.RDA_POSTBACK_CONSENT_POLICY_VERSIONS ?? "")
    .split(",").map((value) => value.trim()).filter(Boolean));
}
