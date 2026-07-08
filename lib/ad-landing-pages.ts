import {
  getCourseSchedule,
  getNextAvailableCourseDate,
  type CourseScheduleId,
} from "@/lib/course-schedule";
import { siteImages } from "@/lib/site-data";

export type AdLandingPageSlug =
  | "dental-assisting-student-story"
  | "coronal-polish-office-awareness"
  | "infection-control-office-awareness"
  | "pit-fissure-sealants-rda"
  | "rda-renewal-ready"
  // Dedicated pages for the currently-running Facebook/Instagram ads (2026-07).
  | "dental-assisting-enroll"
  | "coronal-sealants-renewal";

export type AdLandingPageStat = {
  label: string;
  value: string;
};

export type AdLandingPageSection = {
  items: string[];
  title: string;
};

export type AdLandingPageGalleryImage = {
  alt: string;
  caption: string;
  src: string;
};

export type AdLandingPageReview = {
  feature: string;
  meta: string;
  name: string;
  quote: string;
  rating: number;
};

// A tailored dropdown rendered on the lead form (e.g. "Preferred start date" or
// "Are you a current RDA?"). Each option submits to Formspree under `name`, which
// is how per-ad qualification data is captured.
export type AdLandingLeadSelect = {
  icon?: "calendar" | "check" | "user";
  label: string;
  name: string;
  options: string[];
  // When true a disabled "Select one" placeholder is shown and a choice is
  // required; otherwise the first option is pre-selected.
  required?: boolean;
};

// Opt-in checkbox shown above the submit button. `name` is the Formspree field.
export type AdLandingConsent = {
  label: string;
  name: string;
};

export type AdLandingPage = {
  audience: string;
  campaignIntent: string;
  // Optional opt-in checkbox rendered before the submit button.
  consent?: AdLandingConsent;
  contentCategory: string;
  courseInterests: string[];
  dates: string[];
  eyebrow: string;
  facts: AdLandingPageStat[];
  gallery?: AdLandingPageGalleryImage[];
  // Per-ad Formspree endpoint. When omitted, the form posts to the shared
  // `siteContact.formspreeEndpoint` so leads are still captured. Set this to a
  // dedicated form (https://formspree.io/f/XXXXXXXX) to segment this ad's leads
  // into their own Formspree inbox/dashboard.
  formspreeEndpoint?: string;
  hero: {
    badge: string;
    imageAlt: string;
    imageSrc: string;
    intro: string;
    title: string;
  };
  // Optional tailored dropdowns rendered between Phone and Notes.
  leadSelects?: AdLandingLeadSelect[];
  metaDescription: string;
  metaTitle: string;
  path: string;
  primaryCtaLabel: string;
  proofPoints: string[];
  reviews?: AdLandingPageReview[];
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
const infectionControlDates = availableDates("infection-control");
const coronalPolishDates = availableDates("coronal-polish");
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
    audience:
      "Dentists, office managers, and new dental assistants comparing training options in the greater Sacramento area.",
    campaignIntent: "infection_control_office_awareness",
    contentCategory: "infection_control",
    courseInterests: ["Infection Control"],
    dates: infectionControlDates,
    eyebrow: "Infection Control course",
    facts: [
      { label: "Provider", value: "IC189" },
      { label: "Course length", value: "8 hours" },
      { label: "Price", value: "$395" },
      { label: "Next date", value: firstAvailableDate("infection-control") },
    ],
    hero: {
      badge: `Next date: ${firstAvailableDate("infection-control")}`,
      imageAlt: "Students learning infection control and sterilization workflow.",
      imageSrc: siteImages.infection,
      intro:
        "Need to help a new hire understand the Infection Control course path? Ask admissions about the 8-hour IC189 course, prerequisites, and upcoming local dates.",
      title: "Infection Control training for new dental assistants",
    },
    metaDescription:
      "Ask Roseville Dental Academy about its 8-hour IC189 Infection Control course for new dental assistants and office teams.",
    metaTitle: "Infection Control Course From Facebook | Roseville Dental Academy",
    path: "/lp/infection-control-office-awareness",
    primaryCtaLabel: "Ask about Infection Control",
    proofPoints: [
      "Provider number IC189 is listed for the 8-hour Infection Control course.",
      "Course details are built around California Dental Board certification requirements for qualifying students.",
      "Admissions can confirm prerequisites, current dates, and registration next steps before anyone reserves a seat.",
    ],
    sections: [
      {
        title: "Best for",
        items: [
          "Office managers helping a new dental assistant understand the training checklist.",
          "Dentists comparing local course options for team members before clinical onboarding.",
          "New hires who need admissions to confirm prerequisites and the right upcoming date.",
        ],
      },
      {
        title: "Important before registering",
        items: [
          "Students need current CPR BLS certification from AHA or ARC.",
          "Students also need 2-hour Dental Practice Act certification before registration.",
          "Admissions will confirm availability, required documents, and what to bring for class.",
        ],
      },
    ],
    slug: "infection-control-office-awareness",
  },
  {
    audience:
      "Dental offices, office managers, and eligible assistants comparing Coronal Polish training options in the greater Sacramento area.",
    campaignIntent: "coronal_polish_office_awareness",
    contentCategory: "coronal_polish",
    courseInterests: ["Coronal Polish"],
    dates: coronalPolishDates,
    eyebrow: "Coronal Polish course",
    facts: [
      { label: "Provider", value: "CP148" },
      { label: "Course length", value: "12 hours" },
      { label: "Price", value: "$500" },
      { label: "Next date", value: firstAvailableDate("coronal-polish") },
    ],
    hero: {
      badge: `Next date: ${firstAvailableDate("coronal-polish")}`,
      imageAlt: "Dental professionals practicing coronal polish technique.",
      imageSrc: siteImages.coronal,
      intro:
        "Planning Coronal Polish training for an assistant or your office? Ask admissions about the CP148 course, prerequisites, patient planning, and upcoming dates.",
      title: "Coronal Polish training for eligible assistants",
    },
    metaDescription:
      "Ask Roseville Dental Academy about its 12-hour CP148 Coronal Polish course for eligible dental assistants and office teams.",
    metaTitle: "Coronal Polish Course From Facebook | Roseville Dental Academy",
    path: "/lp/coronal-polish-office-awareness",
    primaryCtaLabel: "Ask about Coronal Polish",
    proofPoints: [
      "Provider number CP148 is listed for the 12-hour Coronal Polish course.",
      "Training includes didactic, lab, manikin, written exam, and human patient requirements.",
      "Admissions can confirm prerequisites, patient planning, dates, and registration steps.",
    ],
    sections: [
      {
        title: "Best for",
        items: [
          "Dental offices planning next certification steps for an eligible assistant.",
          "Assistants who already have current BLS, Infection Control, and Dental Practice Act certification.",
          "Local teams comparing course timing while admissions confirms current availability.",
        ],
      },
      {
        title: "Important before registering",
        items: [
          "Current BLS, current 8-hour Infection Control, and current Dental Practice Act certification are required before registration.",
          "Students complete three coronal polishes on a manikin, pass a written exam above 75%, and complete coronal polish on three human patients.",
          "The academy does not provide patients, so admissions should confirm patient planning before a seat is reserved.",
        ],
      },
    ],
    slug: "coronal-polish-office-awareness",
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
  // ---------------------------------------------------------------------------
  // Dedicated pages for the two Facebook/Instagram ads running as of July 2026
  // (the existing-RDA sealants ad is paused, so its page was removed). Each maps
  // 1:1 to an ad and posts to its own `formspreeEndpoint` so per-ad traffic,
  // conversions, and leads stay fully separated.
  // ---------------------------------------------------------------------------
  {
    // Ad 1: "Dental Assisting Training course" — career-entry enrollment.
    audience:
      "Prospective students ready to enroll in hands-on dental assisting training near Roseville.",
    campaignIntent: "dental_assisting_enroll",
    consent: {
      label:
        "Yes, Roseville Dental Academy can contact me about this program by phone, text, or email.",
      name: "Consent to contact",
    },
    contentCategory: "dental_assisting_program",
    courseInterests: ["Dental Assisting Program"],
    dates: dentalAssistingDates,
    eyebrow: "Dental Assisting Training",
    facts: [
      { label: "Program length", value: "9 weeks" },
      { label: "Training total", value: "210 hours" },
      { label: "Internship", value: "64 hours" },
      { label: "Tuition", value: "$2,500" },
    ],
    formspreeEndpoint: "https://formspree.io/f/mpqgyjjg",
    gallery: [
      {
        alt: "Recent Roseville Dental Academy students holding completion certificates",
        caption: "Recent graduates finishing the program with certificates in hand.",
        src: "/assets/live/drive/recent-certificates-banner.jpg",
      },
      {
        alt: "Roseville Dental Academy class group in scrubs outside the academy",
        caption: "Students building confidence together during the program.",
        src: "/assets/live/drive/class-group-scrubs.jpg",
      },
      {
        alt: "Student practicing chairside skills with instructor support",
        caption: "Small class coaching inside a working dental office.",
        src: "/assets/live/drive/chairside-coaching-closeup.jpg",
      },
    ],
    hero: {
      badge: `Next start: ${firstAvailableDate("dental-assisting-program")}`,
      imageAlt:
        "Roseville Dental Academy students practicing hands-on dental assisting skills.",
      imageSrc: siteImages.programHero,
      intro:
        "Start a hands-on dental assisting career in just 9 weeks. Tell us where to send class dates, tuition details, and enrollment next steps for the Roseville Dental Academy Dental Assisting Training Program.",
      title: "Enroll in hands-on dental assistant training in Roseville",
    },
    leadSelects: [
      {
        icon: "calendar",
        label: "Preferred start date",
        name: "Preferred start date",
        options: ["I'm flexible", ...dentalAssistingDates],
      },
    ],
    metaDescription:
      "Enroll in Roseville Dental Academy's 9-week Dental Assisting Training Program with chairside training, a 64-hour internship, and resume and job support.",
    metaTitle: "Dental Assisting Training Enrollment | Roseville Dental Academy",
    path: "/lp/dental-assisting-enroll",
    primaryCtaLabel: "Get enrollment info",
    proofPoints: [
      "Accelerated 9-week, 210-hour program taught inside a working dental office.",
      "Chairside experience, online lectures, homework, and a 64-hour internship.",
      "Resume and job assistance to help you land your first dental assistant role.",
    ],
    reviews: [
      {
        feature: "9-week program",
        meta: "Google review",
        name: "Adriana Nebuloni",
        quote:
          "The 9-week program was well-structured, hands-on, and incredibly informative. The instructors were supportive, knowledgeable, and genuinely invested in our success.",
        rating: 5,
      },
      {
        feature: "Hands-on training",
        meta: "Google review",
        name: "Selene",
        quote:
          "Excellent dental assisting program with hands-on training and great support. Jessica is patient, knowledgeable, and truly invested in her students.",
        rating: 5,
      },
      {
        feature: "Career support",
        meta: "Google review",
        name: "grace",
        quote:
          "The instructors truly want to see their students succeed and go above and beyond to support us. They even help by sharing our resumes with local dental offices.",
        rating: 5,
      },
    ],
    sections: [
      {
        title: "Who this is for",
        items: [
          "New students age 16 or older who want an entry-level path into dental assisting.",
          "People who want practical chairside training instead of a long college route.",
          "Students who want support with resumes, internships, and local dental office readiness.",
        ],
      },
      {
        title: "What admissions will confirm",
        items: [
          "Current start dates for September 4, October 5, and November 20, 2026.",
          "Tuition, available payment plans, and registration next steps.",
          "How the 64-hour internship fits into the 9-week, 210-hour schedule.",
        ],
      },
    ],
    slug: "dental-assisting-enroll",
  },
  {
    // Ad 2: "Coronal Polishing & Pit + Fissure Sealants" — license-renewal angle.
    audience:
      "Licensed dental professionals and RDAs staying ahead of license renewal requirements.",
    campaignIntent: "coronal_sealants_renewal",
    consent: {
      label:
        "Yes, Roseville Dental Academy can contact me about these courses by phone, text, or email.",
      name: "Consent to contact",
    },
    contentCategory: "rda_certification_courses",
    courseInterests: ["Coronal Polish", "Pit and Fissure Sealants"],
    dates: coronalSealantsDates,
    eyebrow: "Stay renewal-ready",
    facts: [
      { label: "Coronal Polish", value: "CP148" },
      { label: "Sealants", value: "PF186" },
      { label: "Combined price", value: "$1,050" },
      { label: "Next date", value: firstAvailableDate("coronal-polish") },
    ],
    formspreeEndpoint: "https://formspree.io/f/mwvdrnrk",
    gallery: [
      {
        alt: "Student practicing coronal polish technique in a Roseville Dental Academy operatory",
        caption: "Coronal polish technique practice with direct instructor oversight.",
        src: "/assets/live/courses/rda-june-2026/coronal-polish-student.jpg",
      },
      {
        alt: "Close-up of coronal polish hands-on training",
        caption: "Hands-on polishing practice before clinical requirements.",
        src: "/assets/live/courses/rda-june-2026/coronal-polish-closeup.jpg",
      },
      {
        alt: "Pit and fissure sealants tools arranged for class",
        caption: "Sealants tools and prep for the PF186 course path.",
        src: "/assets/live/courses/rda-june-2026/sealants-tools.jpg",
      },
      {
        alt: "Sealants marking practice during Roseville Dental Academy course",
        caption: "Pit and fissure sealants practice for current dental professionals.",
        src: "/assets/live/courses/rda-june-2026/sealants-marking.jpg",
      },
    ],
    hero: {
      badge: "Coronal Polish + Sealants",
      imageAlt: "Dental professionals practicing coronal polish technique.",
      imageSrc: siteImages.coronal,
      intro:
        "Do not let your license renewal sneak up on you. Get renewal-ready with hands-on Coronal Polishing and Pit and Fissure Sealants training at Roseville Dental Academy — ask about board-approved courses, small classes, and simple enrollment.",
      title: "Stay ahead of your license renewal requirements",
    },
    leadSelects: [
      {
        icon: "check",
        label: "Which course(s) do you need?",
        name: "Renewal focus",
        options: [
          "Coronal Polish",
          "Pit and Fissure Sealants",
          "Both Coronal Polish and Sealants",
          "Not sure — help me plan",
        ],
        required: true,
      },
      {
        icon: "calendar",
        label: "Preferred class date",
        name: "Preferred class date",
        options: ["I'm flexible", ...coronalSealantsDates],
      },
    ],
    metaDescription:
      "Stay renewal-ready with Roseville Dental Academy's board-approved Coronal Polish (CP148) and Pit and Fissure Sealants (PF186) courses. Ask about dates and enrollment.",
    metaTitle: "Coronal Polish & Sealants Renewal Courses | Roseville Dental Academy",
    path: "/lp/coronal-sealants-renewal",
    primaryCtaLabel: "Ask about renewal courses",
    proofPoints: [
      "Board-approved provider numbers: Coronal Polish CP148 and Sealants PF186.",
      "Hands-on training with small class sizes and experienced instructors.",
      "Fast, simple enrollment — admissions confirms prerequisites and current seats.",
    ],
    reviews: [
      {
        feature: "Certification courses",
        meta: "Google review",
        name: "Jordyn Sturgeon",
        quote:
          "As a DA I took a bunch of their classes working toward my RDA. Everyone was incredibly sweet, with great communication and teaching from the office.",
        rating: 5,
      },
      {
        feature: "Sealants course",
        meta: "Google review",
        name: "Karen Chavez",
        quote: "I took the X-ray and sealant course here and loved it.",
        rating: 5,
      },
      {
        feature: "Course path",
        meta: "Google review",
        name: "Karisa",
        quote: "Roseville Dental Academy is the place to do all your courses and classes.",
        rating: 5,
      },
    ],
    sections: [
      {
        title: "Best for",
        items: [
          "Working dental assistants and RDAs staying ahead of renewal requirements.",
          "Professionals who want both course paths discussed in one call or email.",
          "Anyone who wants timing sorted out before a renewal deadline gets close.",
        ],
      },
      {
        title: "Important before registering",
        items: [
          "Coronal Polish requires current BLS, Infection Control, and Dental Practice Act certification.",
          "Sealants requires current BLS, Infection Control, Dental Practice Act, Radiation Safety, and Coronal Polish, unless you already hold a current RDA license with BLS proof.",
          "The academy does not provide clinical patients, so admissions confirms patient planning before a seat is reserved.",
        ],
      },
    ],
    slug: "coronal-sealants-renewal",
  },
];

export function getAdLandingPage(slug: string) {
  return adLandingPages.find((page) => page.slug === slug);
}
