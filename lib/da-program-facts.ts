import {
  getAvailableCourseDates,
  getNextAvailableCourseDate,
  getUpcomingCourseSchedule,
  SATURDAY_ACADEMY_START_DATE,
} from "@/lib/course-schedule";
import {
  DENTAL_ASSISTING_DOWN_PAYMENT,
  DENTAL_ASSISTING_TUITION,
} from "@/lib/dental-assisting-program";
import { googleReviewSummary, siteContact } from "@/lib/site-data";

// Core Dental Assisting Program facts shared by the local SEO pages and the
// Spanish page. Wording mirrors lib/site-data.ts (dentalProgramPage) and
// lib/live-course-content.ts. Start dates always come from lib/course-schedule.ts.

export const DA_PROGRAM_PATH = "/dental-assisting-program";

export const daProgramFacts = {
  tuition: 2500,
  tuitionLabel: DENTAL_ASSISTING_TUITION,
  // Registration / payment form: $1,000 minimum down, balance weekly for nine weeks.
  minimumDownPaymentLabel: DENTAL_ASSISTING_DOWN_PAYMENT,
  paymentPlan:
    "$1,000 minimum down payment, with the balance paid weekly over the nine weeks",
  weeks: 9,
  hours: 210,
  internshipHours: 64,
  minimumAge: 16,
  schedule:
    "1 class day (Monday, Friday, or Saturday — pick one) plus 1 assigned internship day",
  format: "Online lectures, homework, chairside experience, and assigned externship hours",
  nonrefundable: "All Roseville Dental Academy courses are nonrefundable.",
} as const;

export function getNextDaStartLabel(): string {
  return getNextAvailableCourseDate("dental-assisting-program") ?? "Ask admissions for the next start date";
}

export function getOpenDaStartDates(): string[] {
  return getAvailableCourseDates("dental-assisting-program");
}

/** Open (not full) upcoming DA start dates as ISO strings, for locale formatting. */
export function getOpenDaStartEntries() {
  return getUpcomingCourseSchedule("dental-assisting-program")
    .filter((entry) => entry.status !== "full")
    .map((entry) => ({
      isoDate: entry.isoDate,
      isSaturdayAcademy: entry.date === SATURDAY_ACADEMY_START_DATE,
    }));
}

/** e.g. "5.0 rating from 77 Google reviews" — derived from the review rows. */
export function getGoogleReviewSummary(): string {
  return `${googleReviewSummary.rating} rating from ${googleReviewSummary.count} Google reviews`;
}

export const ACADEMY_MAPS_DESTINATION = siteContact.mapsAddress;

export function buildDirectionsUrl(origin: string): string {
  const params = new URLSearchParams({
    api: "1",
    origin,
    destination: siteContact.mapsAddress,
  });

  return `https://www.google.com/maps/dir/?${params.toString()}`;
}

export const PHONE_HREF = `tel:${siteContact.phone.replace(/[^0-9]/g, "")}`;
