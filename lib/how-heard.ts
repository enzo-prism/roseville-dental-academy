export const HOW_HEARD_FIELD_NAME = "how_heard" as const;
export const HOW_HEARD_OTHER_FIELD_NAME = "how_heard_other" as const;
export const HOW_HEARD_OTHER_VALUE = "Other" as const;
export const HOW_HEARD_LABEL = "How did you hear about us?" as const;
export const HOW_HEARD_EMPTY_LABEL = "Select one (optional)" as const;
export const HOW_HEARD_OTHER_LABEL = "Please tell us more" as const;
export const HOW_HEARD_OTHER_MAX_LENGTH = 80;

export const HOW_HEARD_OPTIONS = [
  "Instagram",
  "Facebook",
  "Google search",
  "ChatGPT",
  "Friend or family",
  "Returning student",
  "Dentist or employer",
  HOW_HEARD_OTHER_VALUE,
] as const;

export type HowHeardOption = (typeof HOW_HEARD_OPTIONS)[number];

export function isHowHeardOther(value: string) {
  return value === HOW_HEARD_OTHER_VALUE;
}
