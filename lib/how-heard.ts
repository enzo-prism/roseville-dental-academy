// Visible "How did you hear about us?" question on every public lead form.
//
// Field names are human-readable on purpose: Formspree shows the field name as
// the label in each lead email. They are deliberately distinct from the hidden
// attribution field `how-heard` (always "website" for forms; see
// docs/analytics.md), which is a channel stamp, not the visitor's answer.
//
// Only the categorical answer may reach analytics (as `self_reported_source`);
// the free-text "Other" detail stays in Formspree.

export const HOW_HEARD_FIELD = "How did you hear about us?";
export const HOW_HEARD_OTHER_FIELD = "How did you hear about us? (please specify)";
export const HOW_HEARD_OTHER_VALUE = "Other";
export const HOW_HEARD_OTHER_MAX_LENGTH = 120;

export type HowHeardIcon = "ai" | "friend" | "other" | "search" | "social";

export type HowHeardOption = {
  icon: HowHeardIcon;
  label: string;
  value: string;
};

export const HOW_HEARD_OPTIONS: readonly HowHeardOption[] = [
  { icon: "social", label: "Facebook or Instagram ad", value: "Facebook or Instagram ad" },
  { icon: "search", label: "Google search", value: "Google search" },
  { icon: "ai", label: "AI (ChatGPT, etc.)", value: "AI (ChatGPT, etc.)" },
  { icon: "friend", label: "A friend told me", value: "A friend told me" },
  { icon: "other", label: "Other", value: HOW_HEARD_OTHER_VALUE },
] as const;

const HOW_HEARD_SLUGS: Record<string, string> = {
  "A friend told me": "friend",
  "AI (ChatGPT, etc.)": "ai",
  "Facebook or Instagram ad": "facebook_instagram_ad",
  "Google search": "google_search",
  Other: "other",
};

/** Analytics-safe slug for a submitted answer, or undefined for anything unexpected. */
export function howHeardAnalyticsValue(value: string | null | undefined) {
  return value ? HOW_HEARD_SLUGS[value] : undefined;
}
