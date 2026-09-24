import {
  getNextAvailableCourseDate,
  type CourseScheduleId,
} from "@/lib/course-schedule";
import { programCards } from "@/lib/site-data";

// Shared, data-driven view of the RDA-path certification courses. Used by the
// local city pages, /for-dental-offices, and /rda-certification-courses.
//
// Prices are read from `programCards` in lib/site-data.ts (the same strings the
// homepage course cards show) so this file never hard-codes a second copy.
// Provider numbers follow docs/course-approvals.md; BLS/CPR has no Dental Board
// provider number and must not be given one. Prerequisites mirror the
// "Prerequisites" copy in lib/live-course-content.ts.

export type RdaPathCourseId = Extract<
  CourseScheduleId,
  "bls-cpr-1" | "infection-control" | "radiation-safety" | "coronal-polish" | "sealants"
>;

export type RdaPathCourse = {
  id: RdaPathCourseId;
  href: string;
  name: string;
  /** Dental Board of California provider number, when the Board approves the course. */
  providerNumber?: string;
  /** Dental Board approved-course list for this course type, for verification. */
  boardListUrl?: string;
  hours: number;
  price: number;
  priceLabel: string;
  prerequisites: string;
  summary: string;
  officeUse: string;
};

export const DENTAL_BOARD_COURSE_LISTS_URL = "https://www.dbc.ca.gov/applicants/rda_courses.shtml";

function priceFor(href: string): { price: number; priceLabel: string } {
  const card = programCards.find((entry) => entry.href === href);

  if (!card) {
    throw new Error(`No programCards price for ${href}`);
  }

  const price = Number(card.price.replace(/[^0-9.]/g, ""));

  return { price, priceLabel: `$${price.toLocaleString("en-US")}` };
}

// Recommended order: each course's prerequisites come earlier in the list.
export const rdaPathCourses: RdaPathCourse[] = [
  {
    id: "bls-cpr-1",
    href: "/bls-cpr-1",
    name: "BLS / CPR for Healthcare Providers",
    hours: 3,
    ...priceFor("/bls-cpr-1"),
    prerequisites: "None.",
    summary:
      "Initial or renewal Basic Life Support for healthcare providers. Current BLS is a prerequisite for every other course on this path.",
    officeUse: "Initial certification or renewal for chairside staff.",
  },
  {
    id: "infection-control",
    href: "/infection-control",
    name: "8-Hour Infection Control",
    providerNumber: "IC189",
    boardListUrl: "https://www.dbc.ca.gov/applicants/courses_ic.pdf",
    hours: 8,
    ...priceFor("/infection-control"),
    prerequisites:
      "Current BLS certification through AHA or ARC, plus a 2-hour Dental Practice Act certification.",
    summary:
      "The Board-approved course unlicensed dental assistants must complete before duties involving potential exposure to blood, saliva, or other potentially infectious materials.",
    officeUse: "Required before a new unlicensed assistant performs exposure-prone duties.",
  },
  {
    id: "radiation-safety",
    href: "/radiation-safety",
    name: "Radiation Safety (Dental X-Ray)",
    providerNumber: "X1036",
    boardListUrl: "https://www.dbc.ca.gov/applicants/course_rs.pdf",
    hours: 32,
    ...priceFor("/radiation-safety"),
    prerequisites:
      "Current BLS certification from AHA or ARC, current 8-hour Infection Control certification, and Dental Practice Act certification. The student must not be pregnant.",
    summary:
      "Didactic, laboratory, and clinical training in x-ray safety, digital imaging, and evaluation for dental personnel.",
    officeUse: "For dentists who want staff x-ray certified.",
  },
  {
    id: "coronal-polish",
    href: "/coronal-polish",
    name: "Coronal Polish",
    providerNumber: "CP148",
    boardListUrl: "https://www.dbc.ca.gov/applicants/courses_cp.pdf",
    hours: 12,
    ...priceFor("/coronal-polish"),
    prerequisites:
      "BLS certification through AHA or ARC, 8-hour Infection Control certification, and Dental Practice Act certification.",
    summary:
      "Didactic, laboratory, and clinical training, including manikin work, a written exam, and human patient clinical requirements.",
    officeUse: "For assistants building toward RDA duties.",
  },
  {
    id: "sealants",
    href: "/sealants",
    name: "Pit & Fissure Sealants",
    providerNumber: "PF186",
    boardListUrl: "https://www.dbc.ca.gov/applicants/course_pfs.pdf",
    hours: 16,
    ...priceFor("/sealants"),
    prerequisites:
      "BLS, 8-hour Infection Control, Dental Practice Act, Radiation Safety, and Coronal Polish certifications — or a current RDA license plus proof of current BLS.",
    summary:
      "Didactic, laboratory, and clinical training. Only an RDA can perform pit and fissure sealants after completing a Board-approved course.",
    officeUse: "For RDA-track assistants and licensed RDAs.",
  },
];

export function getRdaPathCourse(id: RdaPathCourseId): RdaPathCourse {
  const course = rdaPathCourses.find((entry) => entry.id === id);

  if (!course) {
    throw new Error(`Unknown RDA path course ${id}`);
  }

  return course;
}

export function getNextOpenDateLabel(id: CourseScheduleId): string {
  return getNextAvailableCourseDate(id) ?? "Ask admissions for current availability";
}

// Straight sum of the individual course prices. There is intentionally no
// bundle discount: a discounted "all five" price is a business decision pending
// the academy. Do not show a lower number here until they confirm one.
export const rdaPathCoursesTotal = rdaPathCourses.reduce((total, course) => total + course.price, 0);
export const rdaPathCoursesTotalLabel = `$${rdaPathCoursesTotal.toLocaleString("en-US")}`;

export const rdaPathTotalHours = rdaPathCourses.reduce((total, course) => total + course.hours, 0);
