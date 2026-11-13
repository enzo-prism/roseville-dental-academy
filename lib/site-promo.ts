import {
  COURSE_SCHEDULE_REVIEWED_ON,
  getCourseSchedule,
  isLastScheduledStartOfYear,
  type CourseScheduleId,
} from "@/lib/course-schedule";

// Nov 20 filled on Nov 13, 2026, which retired the Nov 20 promo. Saturday, Dec 5
// is the last Dental Assisting start of 2026, so the promo leads with that. The
// "last class" claim is checked against the schedule (`lastOfYear`): the promo
// hides itself if Dec 5 fills or a later 2026 start is added. A new storage key
// lets visitors who dismissed the Nov 20 promo see this one once.
export const DENTAL_ASSISTING_PROMO_ID = "rda-promo-da-2026-12-05-last";

export const dentalAssistingLastOfYearPromo = {
  courseId: "dental-assisting-program",
  startDate: "2026-12-05",
  lastOfYear: true,
  id: DENTAL_ASSISTING_PROMO_ID,
  storageKey: DENTAL_ASSISTING_PROMO_ID,
  eyebrow: "Last class of 2026",
  headline: "The last Dental Assisting class of 2026 starts Saturday, Dec 5.",
  body: "Saturday, Dec 5 is the final Dental Assisting start this year, and classes are small. Ask admissions to save your seat.",
  ctaLabel: "Ask about Dec 5",
  ctaHref: "/lp/dental-assisting-enroll",
  bannerText: "Last Dental Assisting class of 2026 starts Saturday, Dec 5. →",
  endsAt: "2026-12-05",
} as const;

export type SitePromo = {
  courseId?: CourseScheduleId;
  startDate?: string;
  /** Only show while `startDate` is the last scheduled start of its year. */
  lastOfYear?: boolean;
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

export const activeSitePromo: SitePromo = dentalAssistingLastOfYearPromo;

export const fallbackAnnouncement =
  "Now accepting registration for 2026 Dental Assisting Training programs.";

export function isSitePromoActive(
  promo: Pick<SitePromo, "endsAt" | "courseId" | "startDate" | "lastOfYear">,
  // Static server output and the first hydration use the same reviewed cutoff.
  now = Date.parse(`${COURSE_SCHEDULE_REVIEWED_ON}T12:00:00Z`),
  schedule: readonly { isoDate: string; status: string }[] = getCourseSchedule(promo.courseId ?? "dental-assisting-program"),
) {
  if (!Number.isFinite(now)) return false;
  if (promo.courseId && (!promo.startDate || !schedule.some(
    (entry) => entry.isoDate === promo.startDate && entry.status !== "full",
  ))) return false;
  if (promo.lastOfYear && (!promo.startDate || !isLastScheduledStartOfYear(promo.startDate, schedule))) return false;
  if (!promo.endsAt) return true;
  if (!/^\d{4}-\d{2}-\d{2}$/u.test(promo.endsAt)) return false;
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Los_Angeles", year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(now);
  const datePart = (type: string) => parts.find((part) => part.type === type)?.value;
  const academyDate = `${datePart("year")}-${datePart("month")}-${datePart("day")}`;
  return academyDate <= promo.endsAt;
}
