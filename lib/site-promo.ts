export const SATURDAY_ACADEMY_PROMO_ID = "rda-promo-da-next-start-2026-10-12";

export const saturdayAcademyPromo = {
  id: SATURDAY_ACADEMY_PROMO_ID,
  storageKey: SATURDAY_ACADEMY_PROMO_ID,
  eyebrow: "Upcoming Dental Assisting classes",
  headline: "Next Dental Assisting start is October 12, 2026",
  body: "Monday, Friday, and Saturday are separate class schedules. Ask admissions which upcoming start fits your preferred class day.",
  ctaLabel: "Ask about October 12",
  ctaHref: "/lp/dental-assisting-enroll",
  bannerText:
    "Next Dental Assisting start: October 12, 2026. Ask about seats →",
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
