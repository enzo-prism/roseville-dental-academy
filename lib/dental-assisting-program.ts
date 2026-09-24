import {
  getUpcomingCourseSchedule,
  type CourseScheduleId,
} from "@/lib/course-schedule";
import {
  dentalAssistingRegistrationFormHref,
  dentalProgramPage,
  googleReviewSummary,
  instructorBios,
  siteContact,
  siteImages,
} from "@/lib/site-data";

// Content for the rebuilt /dental-assisting-program page. Every claim here is
// sourced from existing academy material, never invented:
// - Tuition, the $1,000 minimum down payment, weekly balance, nonrefundable
//   deposit, and certificates-after-payment rules: the academy's registration /
//   payment form (public/assets/forms/dap-registration-form.pdf).
// - 9 weeks / 210 hours / 64-hour internship / class-day format / 16+: the
//   live course facts in lib/live-course-content.ts.
// - Curriculum groups: the legacy GoDaddy program page (`dentalProgramPage`).
// - Graduate stories: instructor bios and verbatim Google review excerpts.
// Do not add placement rates, pass rates, pay figures, or seat counts here
// unless the academy supplies a source.

export const DENTAL_ASSISTING_TUITION = "$2,500";
export const DENTAL_ASSISTING_DOWN_PAYMENT = "$1,000";

export type ProgramFact = {
  detail: string;
  id: string;
  label: string;
  value: string;
};

export type ProgramStartDate = {
  isoDate: string;
  label: string;
  weekday: string;
};

const weekdayFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: "UTC",
  weekday: "long",
});

const shortDateFormatter = new Intl.DateTimeFormat("en-US", {
  day: "numeric",
  month: "short",
  timeZone: "UTC",
  weekday: "short",
});

function isoToUtcDate(isoDate: string) {
  return new Date(`${isoDate}T12:00:00Z`);
}

export function getOpenStartDates(courseId: CourseScheduleId): ProgramStartDate[] {
  return getUpcomingCourseSchedule(courseId)
    .filter((entry) => entry.status !== "full")
    .map((entry) => ({
      isoDate: entry.isoDate,
      label: entry.date,
      weekday: weekdayFormatter.format(isoToUtcDate(entry.isoDate)),
    }));
}

export function formatShortStartDate(isoDate: string) {
  return shortDateFormatter.format(isoToUtcDate(isoDate));
}

export function getNextOpenStartFact(courseId: CourseScheduleId): ProgramFact {
  const next = getOpenStartDates(courseId)[0];

  return {
    detail: next ? `${next.weekday} class · dates may change` : "Admissions confirms the next date",
    id: "next-start",
    label: "Next open start",
    value: next ? formatShortStartDate(next.isoDate) : "Ask admissions",
  };
}

export function getDentalAssistingFacts(): ProgramFact[] {
  return [
    {
      detail: "Full program tuition*",
      id: "tuition",
      label: "Tuition",
      value: DENTAL_ASSISTING_TUITION,
    },
    {
      detail: "Balance paid weekly over the 9 weeks",
      id: "payment-plan",
      label: "Payment plan",
      value: `${DENTAL_ASSISTING_DOWN_PAYMENT} down`,
    },
    {
      detail: "210 hours · 1 class day + 1 internship day a week",
      id: "length",
      label: "Program length",
      value: "9 weeks",
    },
    getNextOpenStartFact("dental-assisting-program"),
    {
      detail: "Students must be 16 or older",
      id: "prerequisites",
      label: "Prerequisites",
      value: "None",
    },
  ];
}

export const dentalAssistingHero = {
  eyebrow: "Roseville, CA · 9-week career program",
  title: "Dental Assisting Program",
  intro:
    "Train for an entry-level dental assistant job in 9 weeks. You attend one class day a week plus one assigned internship day, and you practice chairside inside a working dental office.",
  trustLine: `${googleReviewSummary.rating} ★ from ${googleReviewSummary.count} Google reviews`,
  primaryCta: { href: "#quick-sign-up", label: "Request a seat" },
  callCta: { href: `tel:${siteContact.phone.replace(/-/g, "")}`, label: `Call ${siteContact.phone}` },
  formCta: { href: dentalAssistingRegistrationFormHref, label: "Download the registration form (PDF)" },
} as const;

export const dentalAssistingPaymentPlan = {
  title: "Tuition and payment plan",
  intro:
    "Tuition is $2,500 for the full 9-week program. You do not need to pay it all up front.",
  steps: [
    "A $1,000 minimum down payment reserves your spot in the next class.",
    "The remaining balance is paid weekly over the nine weeks, due at the beginning of each class.",
    "Certificates are issued once the balance is paid in full.",
  ],
  finePrint:
    "The deposit and tuition are nonrefundable. The academy does not offer traditional financial aid; it keeps tuition affordable and offers this payment plan instead.",
} as const;

export type ProgramTimelineStep = {
  body: string;
  id: string;
  title: string;
};

export const dentalAssistingTimeline: ProgramTimelineStep[] = [
  {
    id: "enroll",
    title: "Pick your start date and class day",
    body: "Monday, Friday, and Saturday are separate class options — you attend one of them each week, not all three. Admissions confirms which day each start date uses.",
  },
  {
    id: "learn",
    title: "Learn online, practice chairside",
    body: "Online lectures and homework cover the fundamentals. On class day you practice with real instruments, materials, and equipment under instructor supervision.",
  },
  {
    id: "internship",
    title: "Complete your 64-hour internship",
    body: "One assigned internship day a week puts you inside an active dental office rather than a simulation-only classroom.",
  },
  {
    id: "graduate",
    title: "Finish with resume and job help",
    body: "After 9 weeks and 210 hours, the team helps with your resume and your search for a first dental assistant job.",
  },
  {
    id: "grow",
    title: "Keep growing toward RDA",
    body: "Add Board-approved certificates such as Radiation Safety, Coronal Polish, and Sealants, and work toward a Registered Dental Assistant license.",
  },
];

export const dentalAssistingSkillGroups = dentalProgramPage.requirements;

export const dentalAssistingOutcomes = {
  title: "What you leave with",
  items: [
    "Chairside experience from hands-on practice with instructors",
    "A completed 64-hour internship in a working dental office",
    "Resume and job assistance for your first dental assistant role",
  ],
  quote: {
    name: "Amanda Lehr",
    source: "Google review",
    text: "The 9 week course teaches you everything you need to know to start your career as a dental assistant. After completing the program I had multiple job offers.",
  },
  links: [
    { href: "/resources/dental-assistant-salary-sacramento", label: "What dental assistants earn near Sacramento" },
    { href: "/journey", label: "See the DA to RDA career path" },
  ],
} as const;

const jessica = instructorBios.find((bio) => bio.name === "Jessica");
const katelyn = instructorBios.find((bio) => bio.name === "Katelyn");

export type GraduateStory = {
  credential: string;
  id: string;
  image: { alt: string; src: string };
  kicker: string;
  name: string;
  path: string[];
  quote?: string;
  source: string;
  story: string;
};

export const dentalAssistingGraduateStories: GraduateStory[] = [
  {
    credential: jessica?.credential ?? "RDA-OA Lead Instructor",
    id: "jessica",
    image: { alt: jessica?.imageAlt ?? "Jessica, Lead Instructor", src: siteImages.instructorJessica },
    kicker: "Graduate → RDA → Lead Instructor",
    name: "Jessica",
    path: ["Program graduate", "X-ray license", "RDA since 2017", "Orthodontic Assistant permit", "Lead Instructor"],
    source: "Instructor bio",
    story:
      "Jessica completed the program, earned her x-ray license, and was hired at Waikiki Dental. She grew through chairside, co-assisting, and patient administration roles, and now leads the classes she once took.",
  },
  {
    credential: katelyn?.credential ?? "RDA Instructor",
    id: "katelyn",
    image: { alt: katelyn?.imageAlt ?? "Katelyn, RDA Instructor", src: siteImages.instructorKatelyn },
    kicker: "New to California → RDA → Instructor",
    name: "Katelyn",
    path: ["Program graduate (2021)", "Registered Dental Assistant", "Instructor", "Dental hygiene student"],
    source: "Instructor bio",
    story:
      "Katelyn attended Roseville Dental Academy in 2021 after moving from Indiana. She became a Registered Dental Assistant, now teaches here, and is studying dental hygiene.",
  },
  {
    credential: "Program graduate",
    id: "salvador",
    image: {
      alt: "Roseville Dental Academy students holding certificates outside the office",
      src: "/assets/live/photos/img-5918-2.jpg",
    },
    kicker: "Graduate → hired",
    name: "Salvador Garcia",
    path: ["9-week program", "Resume help", "Hired"],
    quote:
      "The staff is very caring and helps make sure you understand everything. They helped with resumes and applying to jobs, which is how I got hired.",
    source: "Google review",
    story: "",
  },
];

export const dentalAssistingInstructors = instructorBios;

export const dentalAssistingFaqs = [
  {
    question: "Is there a payment plan?",
    answer:
      "Yes. A $1,000 minimum down payment reserves your spot in the next class, and the remaining balance is paid weekly over the nine weeks, due at the beginning of each class. The deposit and tuition are nonrefundable, and certificates are issued once the balance is paid in full.",
  },
  {
    question: "Do you offer financial aid?",
    answer:
      "No. Rather than raise tuition to fund financial assistance, the academy keeps tuition affordable and offers a payment plan.",
  },
  {
    question: "Do I need experience or prerequisites?",
    answer:
      "No. There are no prerequisites. Students must be 16 or older, and students under 18 should expect parent or guardian consent paperwork.",
  },
  {
    question: "Do Dental Assisting classes meet Monday, Friday, and Saturday?",
    answer:
      "No. Monday, Friday, and Saturday are separate schedule options. Students pick one class day, plus one assigned externship day — not all three. Admissions will confirm the next available start for your chosen class day.",
  },
  {
    question: "Does this program make me a Registered Dental Assistant (RDA)?",
    answer:
      "No. The program prepares you for entry-level dental assistant roles. California RDA licensure has additional requirements, including Board-approved courses, work experience, and an exam. The DA to RDA career journey walks through each step.",
  },
  {
    question: "How do I enroll?",
    answer:
      "Send a request below or call 916-888-9821. Admissions confirms your start date and class day, then you complete the registration form and the $1,000 down payment to reserve your spot. Sending the online form alone does not reserve a seat.",
  },
] as const;

export const dentalAssistingGuideSlugs = [
  "how-to-become-a-dental-assistant-in-california",
  "dental-assisting-school-cost-california",
  "how-long-does-it-take-to-become-a-dental-assistant",
  "dental-assistant-salary-sacramento",
] as const;
