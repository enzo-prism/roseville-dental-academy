import { COURSE_SCHEDULE_REVIEWED_ON, getCourseSchedule, type CourseScheduleId } from "@/lib/course-schedule";

// September 23 sync: the Saturday Dental Assisting class is full, so the
// banner promotes the next open start, the Monday class on October 12.
export const DENTAL_ASSISTING_PROMO_ID = "rda-promo-da-monday-2026-10-12";

export const dentalAssistingMondayPromo = {
  courseId: "dental-assisting-program",
  startDate: "2026-10-12",
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

export const activeSitePromo: SitePromo = dentalAssistingMondayPromo;

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
