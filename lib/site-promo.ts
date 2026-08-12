export const SATURDAY_ACADEMY_PROMO_ID = "rda-promo-saturday-academy-2026-09-12";

export const saturdayAcademyPromo = {
  id: SATURDAY_ACADEMY_PROMO_ID,
  storageKey: SATURDAY_ACADEMY_PROMO_ID,
  eyebrow: "Now enrolling",
  headline: "Saturday Academy starts September 12, 2026",
  body: "Looking for a weekend path into dental assisting? Choose the schedule that fits your life — Monday, Friday, or Saturday options are separate. You attend one schedule, not all three.",
  ctaLabel: "Ask about Saturday Academy",
  ctaHref: "/lp/dental-assisting-enroll",
  bannerText:
    "Saturday Academy starts Sept 12 — Mon, Fri, or Sat schedules (pick one). Ask about seats →",
  // Keep the campaign through the start date so last-minute seats can still convert.
  endsAt: "2026-09-12",
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

export const activeSitePromo: SitePromo = saturdayAcademyPromo;

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
