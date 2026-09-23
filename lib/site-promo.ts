export const SATURDAY_ACADEMY_PROMO_ID = "rda-promo-da-monday-2026-10-12";
export const NEXT_DA_START_PROMO_ID = SATURDAY_ACADEMY_PROMO_ID;

export const nextDaStartPromo = {
  id: NEXT_DA_START_PROMO_ID,
  storageKey: NEXT_DA_START_PROMO_ID,
  eyebrow: "Next open Dental Assisting start",
  headline: "Monday class starts October 12, 2026",
  body: "The Saturday Dental Assisting cohort is full. The next available start is Monday, October 12, 2026. Monday, Friday, and Saturday remain separate schedule options — ask admissions which upcoming start fits your preferred class day.",
  ctaLabel: "Ask about Monday, October 12",
  ctaHref: "/lp/dental-assisting-enroll",
  bannerText:
    "Monday Dental Assisting class: October 12, 2026. Ask about seats →",
  // Keep the campaign through the next open start so remaining seats can convert.
  endsAt: "2026-10-12",
} as const;

export type SitePromo = {
  bannerText: string;
  body: string;
  ctaHref: string;
  ctaLabel: string;
  endsAt?: string;
  eyebrow: string;
  headline: string;
  id: string;
  storageKey: string;
};

export const activeSitePromo: SitePromo = nextDaStartPromo;
export const saturdayAcademyPromo = nextDaStartPromo;

export const fallbackAnnouncement =
  "Now accepting registration for 2026 Dental Assisting Training programs.";

export function isSitePromoActive(promo: Pick<SitePromo, "endsAt">, now = Date.now()) {
  if (!promo.endsAt) {
    return true;
  }

  const endMs = Date.parse(`${promo.endsAt}T23:59:59`);

  if (Number.isNaN(endMs)) {
    return true;
  }

  return now <= endMs;
}
