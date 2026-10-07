import { COURSE_SCHEDULE_REVIEWED_ON, getCourseSchedule, type CourseScheduleId } from "@/lib/course-schedule";

// October 12 is full on production and in this bundled fixture. Preview/CI use
// the fixture when the dashboard feed is not configured, so the promo targets
// the next open Dental Assisting date (Nov 20) and a new storage key so
// previously dismissed visitors see the updated announcement once.
export const DENTAL_ASSISTING_PROMO_ID = "rda-promo-da-2026-11-20";

export const dentalAssistingNovemberPromo = {
  courseId: "dental-assisting-program",
  startDate: "2026-11-20",
  id: DENTAL_ASSISTING_PROMO_ID,
  storageKey: DENTAL_ASSISTING_PROMO_ID,
  eyebrow: "Dental Assisting class",
  headline: "Next class starts Friday, Nov 20. Saturday class starts Dec 5.",
  body: "The next Dental Assisting class starts Friday, Nov 20. Saturday class starts Dec 5. Ask admissions which schedule fits your week.",
  ctaLabel: "Ask about Nov 20",
  ctaHref: "/lp/dental-assisting-enroll",
  bannerText:
    "Next Dental Assisting class starts Friday, Nov 20. Saturday class starts Dec 5. →",
  endsAt: "2026-11-20",
} as const;

export type SitePromo = {
  courseId?: CourseScheduleId;
  startDate?: string;
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

export const activeSitePromo: SitePromo = dentalAssistingNovemberPromo;

export const fallbackAnnouncement =
  "Now accepting registration for 2026 Dental Assisting Training programs.";

export function isSitePromoActive(
  promo: Pick<SitePromo, "endsAt" | "courseId" | "startDate">,
  // Static server output and the first hydration use the same reviewed cutoff.
  now = Date.parse(`${COURSE_SCHEDULE_REVIEWED_ON}T12:00:00Z`),
  schedule: readonly { isoDate: string; status: string }[] = getCourseSchedule(promo.courseId ?? "dental-assisting-program"),
) {
  if (!Number.isFinite(now)) return false;
  if (promo.courseId && (!promo.startDate || !schedule.some(
    (entry) => entry.isoDate === promo.startDate && entry.status !== "full",
  ))) return false;
  if (!promo.endsAt) return true;
  if (!/^\d{4}-\d{2}-\d{2}$/u.test(promo.endsAt)) return false;
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Los_Angeles", year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(now);
  const datePart = (type: string) => parts.find((part) => part.type === type)?.value;
  const academyDate = `${datePart("year")}-${datePart("month")}-${datePart("day")}`;
  return academyDate <= promo.endsAt;
}
