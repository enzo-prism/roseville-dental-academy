// September 23 sync: the Saturday Dental Assisting class is full, so the
// banner promotes the next open start, the Monday class on October 12.
export const DENTAL_ASSISTING_PROMO_ID = "rda-promo-da-monday-2026-10-12";

export const dentalAssistingMondayPromo = {
  id: DENTAL_ASSISTING_PROMO_ID,
  storageKey: DENTAL_ASSISTING_PROMO_ID,
  eyebrow: "Monday Dental Assisting class",
  headline: "Next Dental Assisting start is Monday, October 12, 2026",
  body: "Seats are still open in the Monday class. Students attend one class day a week plus one assigned externship day. Ask admissions to reserve your seat.",
  ctaLabel: "Ask about October 12",
  ctaHref: "/lp/dental-assisting-enroll",
  bannerText:
    "Next Dental Assisting start: Monday, October 12. Seats open →",
  // Keep the campaign through the Monday start so remaining seats can convert.
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

export const activeSitePromo: SitePromo = dentalAssistingMondayPromo;

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
