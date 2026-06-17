import {
  getCourseSchedule,
  getNextAvailableCourseDate,
  type CourseScheduleId,
} from "@/lib/course-schedule";
import { siteImages } from "@/lib/site-data";

export type AdLandingPageSlug =
  | "dental-assisting-student-story"
  | "pit-fissure-sealants-rda"
  | "rda-renewal-ready";

export type AdLandingPageStat = {
  label: string;
  value: string;
};

export type AdLandingPageSection = {
  items: string[];
  title: string;
};

export type AdLandingPage = {
  audience: string;
  campaignIntent: string;
  contentCategory: string;
  courseInterests: string[];
  dates: string[];
  eyebrow: string;
  facts: AdLandingPageStat[];
  hero: {
    badge: string;
    imageAlt: string;
    imageSrc: string;
    intro: string;
    title: string;
  };
  metaDescription: string;
  metaTitle: string;
  path: string;
  primaryCtaLabel: string;
  proofPoints: string[];
  sections: AdLandingPageSection[];
  slug: AdLandingPageSlug;
};

function availableDates(courseId: CourseScheduleId) {
  return getCourseSchedule(courseId)
    .filter((entry) => entry.status !== "full")
    .map((entry) => entry.date);
}

function firstAvailableDate(courseId: CourseScheduleId) {
  return getNextAvailableCourseDate(courseId) ?? "Ask admissions";
}

const dentalAssistingDates = availableDates("dental-assisting-program");
const coronalSealantsDates = availableDates("coronal-polish");
const sealantsDates = availableDates("sealants");

export const adLandingPages: AdLandingPage[] = [
  {
    audience: "Prospective students comparing dental assisting programs near Roseville.",
    campaignIntent: "dental_assisting_testimonial",
    contentCategory: "dental_assisting_program",
    courseInterests: ["Dental Assisting Program"],
    dates: dentalAssistingDates,
    eyebrow: "Dental assisting program",
    facts: [
      { label: "Program length", value: "9 weeks" },
      { label: "Training total", value: "210 hours" },
      { label: "Internship", value: "64 hours" },
      { label: "Tuition", value: "$2,500" },
    ],
    hero: {
      badge: `Next start: ${firstAvailableDate("dental-assisting-program")}`,
      imageAlt:
        "Roseville Dental Academy students practicing hands-on dental assisting skills.",
      imageSrc: siteImages.programHero,
      intro:
        "Students describe Roseville Dental Academy as hands-on, supportive, and easier to start than expected. Ask about the next class and see whether the 9-week program is a fit.",
      title: "Hands-on dental assistant training in Roseville",
    },
    metaDescription:
      "Ask about Roseville Dental Academy's 9-week dental assisting program with chairside training, resume support, and a 64-hour internship.",
    metaTitle: "Dental Assistant Training From Facebook | Roseville Dental Academy",
    path: "/lp/dental-assisting-student-story",
    primaryCtaLabel: "Request dental assisting info",
    proofPoints: [
      "Small classes with instructor support inside a working dental office.",
      "Chairside experience, online lectures, homework, and assigned externship hours.",
      "Resume and job assistance for students preparing to enter dental offices.",
    ],
    sections: [
      {
        title: "Who this is for",
        items: [
          "New students age 16 or older who want an entry-level path into dental assisting.",
          "People who want practical chairside training instead of a long college route.",
          "Students who want support with next steps, resumes, and local dental office readiness.",
        ],
      },
      {
        title: "What admissions will confirm",
        items: [
          "Current class availability for September 4, October 5, and November 20, 2026.",
          "Registration paperwork, payment next steps, and whether a tour makes sense.",
          "How the 64-hour internship component fits into the 9-week schedule.",
        ],
      },
    ],
    slug: "dental-assisting-student-story",
  },
  {
    audience: "Working dental assistants and RDAs trying to stay renewal-ready.",
    campaignIntent: "rda_renewal_bundle",
    contentCategory: "rda_certification_courses",
    courseInterests: ["Coronal Polish", "Pit and Fissure Sealants"],
    dates: coronalSealantsDates,
    eyebrow: "RDA renewal-ready courses",
    facts: [
      { label: "Coronal Polish", value: "CP148" },
      { label: "Sealants", value: "PF186" },
      { label: "Combined price", value: "$1,050" },
      { label: "Next date", value: firstAvailableDate("coronal-polish") },
    ],
    hero: {
      badge: "Coronal Polish + Sealants",
      imageAlt: "Dental professionals practicing coronal polish technique.",
      imageSrc: siteImages.coronal,
      intro:
        "Do not wait until the last minute. Ask admissions about completing Coronal Polish and Pit and Fissure Sealants with current Roseville Dental Academy course dates.",
      title: "Get renewal-ready with Coronal Polish and Sealants",
    },
    metaDescription:
      "Ask Roseville Dental Academy about Coronal Polish CP148 and Pit and Fissure Sealants PF186 dates for dental assistants and RDAs.",
    metaTitle: "RDA Renewal Courses From Facebook | Roseville Dental Academy",
    path: "/lp/rda-renewal-ready",
    primaryCtaLabel: "Ask about renewal courses",
    proofPoints: [
      "Board-approved provider numbers are listed for Coronal Polish CP148 and Sealants PF186.",
      "Hands-on training includes lab, manikin, written exam, and clinical requirements.",
      "Admissions can confirm prerequisites, patient planning, and current seat availability.",
    ],
    sections: [
      {
        title: "Best for",
        items: [
          "Dental assistants organizing certification steps for RDA readiness.",
          "RDAs or eligible assistants who need to understand timing before renewal deadlines.",
          "Students who want both course paths discussed in one call or email follow-up.",
        ],
      },
      {
        title: "Important before registering",
        items: [
          "Coronal Polish requires current BLS, Infection Control, and Dental Practice Act certification.",
          "Sealants requires current BLS, Infection Control, Dental Practice Act, Radiation Safety, and Coronal Polish, unless the student already holds a current RDA license with BLS proof.",
          "The academy does not provide clinical patients, so admissions should confirm patient planning before a seat is reserved.",
        ],
      },
    ],
    slug: "rda-renewal-ready",
  },
  {
    audience: "Existing RDAs and eligible dental assistants who specifically need sealants.",
    campaignIntent: "sealants_existing_rda",
    contentCategory: "pit_fissure_sealants",
    courseInterests: ["Pit and Fissure Sealants"],
    dates: sealantsDates,
    eyebrow: "Pit and fissure sealants",
    facts: [
      { label: "Provider", value: "PF186" },
      { label: "Course length", value: "16 hours" },
      { label: "Price", value: "$550" },
      { label: "Next date", value: firstAvailableDate("sealants") },
    ],
    hero: {
      badge: "For eligible dental professionals",
      imageAlt: "Sealants procedure training on a dental mannequin.",
      imageSrc: siteImages.sealants,
      intro:
        "Already an RDA or working through the required course path? Ask about Roseville Dental Academy's hands-on Pit and Fissure Sealants course in Roseville.",
      title: "Need your Pit and Fissure Sealants course?",
    },
    metaDescription:
      "Ask about Roseville Dental Academy's PF186 Pit and Fissure Sealants course for eligible dental assistants and RDAs.",
    metaTitle: "Pit and Fissure Sealants From Facebook | Roseville Dental Academy",
    path: "/lp/pit-fissure-sealants-rda",
    primaryCtaLabel: "Ask about sealants",
    proofPoints: [
      "16-hour course with didactic, lab, manikin, written exam, and clinical components.",
      "Designed for eligible dental assistants and RDAs who need sealants training.",
      "Admissions can confirm prerequisites, patients, date availability, and registration steps.",
    ],
    sections: [
      {
        title: "Before you reserve a seat",
        items: [
          "Students need current BLS, Infection Control, Dental Practice Act, Radiation Safety, and Coronal Polish, or current RDA license with BLS proof.",
          "Students complete sealants on a manikin and four clinical patients.",
          "Each patient must meet the course criteria; the academy does not provide patients.",
        ],
      },
      {
        title: "What to ask admissions",
        items: [
          "Which upcoming date has space for the PF186 course.",
          "Whether your current certificates satisfy the prerequisite path.",
          "What patient documentation or planning is needed before class.",
        ],
      },
    ],
    slug: "pit-fissure-sealants-rda",
  },
];

export function getAdLandingPage(slug: string) {
  return adLandingPages.find((page) => page.slug === slug);
}
