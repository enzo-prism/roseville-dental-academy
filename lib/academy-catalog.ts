// One catalog of the academy's courses for the redesigned shell and pages
// (header mega menu, homepage programs, course cards). Prices, hours, and
// Dental Board of California provider numbers mirror the course pages
// (lib/live-course-content.ts) and docs/course-approvals.md; BLS is an AHA
// course and intentionally has no DBC provider number.

import {
  getNextAvailableCourseDate,
  getUpcomingCourseSchedule,
  type CourseScheduleId,
} from "@/lib/course-schedule";

export type AcademyIconKey =
  | "badge-check"
  | "graduation-cap"
  | "heart-pulse"
  | "radiation"
  | "shield-check"
  | "sparkles";

export type AcademyCourse = {
  approval?: string;
  blurb: string;
  duration: string;
  href: string;
  icon: AcademyIconKey;
  id: CourseScheduleId;
  image: { alt: string; src: string };
  name: string;
  navLabel: string;
  price: string;
  tagline: string;
};

export const dentalAssistingProgram: AcademyCourse = {
  blurb:
    "Nine weeks of hands-on chairside training inside a working dental office, plus a 64-hour internship, resume help, and job support.",
  duration: "9 weeks · 210 hours",
  href: "/dental-assisting-program",
  icon: "graduation-cap",
  id: "dental-assisting-program",
  image: {
    alt: "Instructor guiding a student through chairside dental assisting practice.",
    src: "/assets/live/programs/dental-assisting-chairside.jpg",
  },
  name: "Dental Assisting Program",
  navLabel: "Dental Assisting Program",
  price: "$2,500",
  tagline: "Start a dental career in 9 weeks",
};

export const certificationCourses: AcademyCourse[] = [
  {
    blurb: "Initial or renewal BLS/CPR for healthcare providers with live skills practice.",
    duration: "3 hours",
    href: "/bls-cpr-1",
    icon: "heart-pulse",
    id: "bls-cpr-1",
    image: {
      alt: "Students practicing CPR compressions on training manikins.",
      src: "/assets/live/courses/rda-june-2026/bls-cpr-skills.jpg",
    },
    name: "BLS / CPR",
    navLabel: "BLS/CPR",
    price: "$85",
    tagline: "Initial or renewal",
  },
  {
    approval: "DBC IC189",
    blurb: "Board-approved 8-hour Infection Control course for dental assistants.",
    duration: "8 hours",
    href: "/infection-control",
    icon: "shield-check",
    id: "infection-control",
    image: {
      alt: "Student preparing an operatory during infection control training.",
      src: "/assets/live/courses/rda-june-2026/infection-control-operatory.jpg",
    },
    name: "Infection Control",
    navLabel: "Infection Control",
    price: "$395",
    tagline: "Required before patient care",
  },
  {
    approval: "DBC X1036",
    blurb: "32-hour Radiation Safety course so you can take dental x-rays with confidence.",
    duration: "32 hours",
    href: "/radiation-safety",
    icon: "radiation",
    id: "radiation-safety",
    image: {
      alt: "Students positioning an x-ray sensor chairside.",
      src: "/assets/live/drive/xray-chairside.jpg",
    },
    name: "Radiation Safety",
    navLabel: "Radiation Safety",
    price: "$695",
    tagline: "X-ray certification",
  },
  {
    approval: "DBC CP148",
    blurb: "12-hour Coronal Polish course with lab, manikin, and clinical practice.",
    duration: "12 hours",
    href: "/coronal-polish",
    icon: "sparkles",
    id: "coronal-polish",
    image: {
      alt: "Student polishing teeth on a typodont during coronal polish practice.",
      src: "/assets/live/courses/rda-june-2026/coronal-polish-student.jpg",
    },
    name: "Coronal Polish",
    navLabel: "Coronal Polish",
    price: "$500",
    tagline: "RDA pathway course",
  },
  {
    approval: "DBC PF186",
    blurb: "16-hour Pit and Fissure Sealant course for eligible assistants and RDAs.",
    duration: "16 hours",
    href: "/sealants",
    icon: "badge-check",
    id: "sealants",
    image: {
      alt: "Sealant instruments laid out beside a typodont during class.",
      src: "/assets/live/courses/rda-june-2026/sealants-marking.jpg",
    },
    name: "Pit & Fissure Sealants",
    navLabel: "Sealants",
    price: "$550",
    tagline: "RDA pathway course",
  },
];

export const academyCourses: AcademyCourse[] = [dentalAssistingProgram, ...certificationCourses];

export function getAcademyCourse(id: CourseScheduleId) {
  return academyCourses.find((course) => course.id === id);
}

/** "Nov 20" style label for the next open date, or undefined. */
export function getNextOpenShortDate(id: CourseScheduleId) {
  const next = getUpcomingCourseSchedule(id).find((entry) => entry.status !== "full");

  if (!next) {
    return undefined;
  }

  const [year, month, day] = next.isoDate.split("-").map(Number);

  return new Date(Date.UTC(year, month - 1, day)).toLocaleDateString("en-US", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
}

export function getNextOpenLongDate(id: CourseScheduleId) {
  return getNextAvailableCourseDate(id);
}
