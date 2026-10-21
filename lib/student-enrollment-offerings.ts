import { INFECTION_CONTROL_SEAT_CAPACITY } from "@/lib/academy-policies";
import {
  academyCalendarDate,
  addAcademyCalendarDays,
  ENROLLMENT_AMOUNT,
} from "@/lib/enrollment-contract";

export const INFECTION_CONTROL_COURSE_ID = "infection-control" as const;
export const INFECTION_CONTROL_OFFERING_CURRENCY = "usd" as const;
export const INFECTION_CONTROL_OFFERING_AMOUNT = ENROLLMENT_AMOUNT;
export const INFECTION_CONTROL_OFFERING_CAPACITY = INFECTION_CONTROL_SEAT_CAPACITY;
export const INFECTION_CONTROL_OFFLINE_SEATS = 0;

export type InfectionControlSellableSession = {
  courseDate: "2026-11-14" | "2026-12-05";
  label: "November 14, 2026" | "December 5, 2026";
};

/** Confirmed Infection Control checkout inventory. No other IC dates are sellable. */
export const INFECTION_CONTROL_SELLABLE_SESSIONS = [
  { courseDate: "2026-11-14", label: "November 14, 2026" },
  { courseDate: "2026-12-05", label: "December 5, 2026" },
] as const satisfies readonly InfectionControlSellableSession[];

export const INFECTION_CONTROL_FIXTURE_OFFERING_IDS = {
  "2026-11-14": "11111111-1111-4111-8111-111111111111",
  "2026-12-05": "22222222-2222-4222-8222-222222222222",
} as const;
export const INFECTION_CONTROL_FIXTURE_OFFERING_ID_BY_SLOT = [
  "11111111-1111-4111-8111-111111111111",
  "22222222-2222-4222-8222-222222222222",
] as const;

export function isCanonicalInfectionControlDate(courseDate: string) {
  return INFECTION_CONTROL_SELLABLE_SESSIONS.some(
    (session) => session.courseDate === courseDate,
  );
}

/** Isolated fixture dates stay in the future so CI does not break after Dec 5. */
export function infectionControlFixtureCourseDates(
  now = new Date(),
): [string, string] {
  const today = academyCalendarDate(now);
  const remaining = INFECTION_CONTROL_SELLABLE_SESSIONS.map(
    (session) => session.courseDate,
  ).filter((courseDate) => courseDate > today);
  if (remaining.length >= 2) return [remaining[0], remaining[1]];
  if (remaining.length === 1)
    return [remaining[0], addAcademyCalendarDays(today, 42)];
  return [addAcademyCalendarDays(today, 21), addAcademyCalendarDays(today, 42)];
}

export function infectionControlSessionLabel(courseDate: string) {
  const session = INFECTION_CONTROL_SELLABLE_SESSIONS.find(
    (entry) => entry.courseDate === courseDate,
  );
  if (session) return session.label;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(courseDate)) return undefined;
  const [year, month, day] = courseDate.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day)).toLocaleDateString("en-US", {
    timeZone: "UTC",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

export function formatEnrollmentAmount(amount = INFECTION_CONTROL_OFFERING_AMOUNT) {
  return `$${(amount / 100).toFixed(2)} USD`;
}
