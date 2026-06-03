import type { LiveRoute } from "@/lib/live-route-data";

export const JOURNEY_ROUTE_PATH = "/journey";
export const JOURNEY_TITLE = "DA to RDA Career Journey | Roseville Dental Academy";
export const JOURNEY_DESCRIPTION =
  "Explore a guided DA to RDA career roadmap for California dental assistants, with training, work experience, course, application, and exam next steps.";

export type JourneyPathwayId = "new" | "working" | "ready";
export type JourneyStepId =
  | "start-training"
  | "graduate-ready"
  | "work-office"
  | "complete-courses"
  | "apply-exam"
  | "licensed-rda";
export type JourneyIconKey =
  | "book"
  | "briefcase"
  | "clipboard"
  | "file"
  | "medal"
  | "sparkles";

export type JourneyPathway = {
  detail: string;
  focusStep: JourneyStepId;
  id: JourneyPathwayId;
  label: string;
  nextAction: string;
};

export type JourneyStep = {
  bullets: string[];
  ctaHref: string;
  ctaLabel: string;
  detail: string;
  eyebrow: string;
  icon: JourneyIconKey;
  id: JourneyStepId;
  number: number;
  support: string;
  title: string;
};

export type JourneyOfficialLink = {
  description: string;
  href: string;
  label: string;
};

export const journeyPathways: JourneyPathway[] = [
  {
    detail:
      "Begin with Roseville Dental Academy's 9-week dental assisting program, then use the roadmap to understand the RDA path ahead.",
    focusStep: "start-training",
    id: "new",
    label: "New to dental assisting",
    nextAction: "Start with the 9-week program and ask admissions about the next class date.",
  },
  {
    detail:
      "If you are already chairside, focus on tracking qualifying experience, forms, and required course certificates.",
    focusStep: "work-office",
    id: "working",
    label: "Already working",
    nextAction: "Confirm your work-experience documentation and course timing before applying.",
  },
  {
    detail:
      "If your experience is close, organize certificates, verify current provider status, and prepare for the written exam.",
    focusStep: "complete-courses",
    id: "ready",
    label: "Ready for RDA steps",
    nextAction: "Review required courses, expiration windows, and the Dental Board application steps.",
  },
];

export const journeySteps: JourneyStep[] = [
  {
    bullets: [
      "9-week DA training",
      "210 total hours",
      "Hands-on chairside practice plus 64-hour internship",
    ],
    ctaHref: "/dental-assisting-program",
    ctaLabel: "Explore the program",
    detail:
      "Build the foundation for an entry-level dental office role through lectures, homework, hands-on practice, and instructor support.",
    eyebrow: "Train",
    icon: "book",
    id: "start-training",
    number: 1,
    support: "Roseville helps students start with a practical, accelerated DA program.",
    title: "Start Training",
  },
  {
    bullets: [
      "Completion certificate",
      "Resume and job assistance",
      "Entry-level dental office skills",
    ],
    ctaHref: "/#quick-sign-up",
    ctaLabel: "Ask about classes",
    detail:
      "Finish with the documents and job-readiness support that help you talk with dental offices and pursue your first role.",
    eyebrow: "Graduate",
    icon: "medal",
    id: "graduate-ready",
    number: 2,
    support: "The goal is to leave with skills, confidence, and a clearer first-office plan.",
    title: "Graduate Job-Ready",
  },
  {
    bullets: [
      "Build chairside experience",
      "Track hours and forms",
      "California RDA path may require 15 months / 1,280 hours total",
    ],
    ctaHref: "https://www.dbc.ca.gov/applicants/become_licensed_rda.shtml",
    ctaLabel: "Check Dental Board steps",
    detail:
      "California lists work-experience and blended education pathways that can involve at least 15 months and 1,280 hours, depending on the pathway.",
    eyebrow: "Work",
    icon: "briefcase",
    id: "work-office",
    number: 3,
    support: "Keep documentation organized while you build qualifying chairside experience.",
    title: "Work in a Dental Office",
  },
  {
    bullets: [
      "BLS/CPR, Infection Control, and Dental Practice Act",
      "Radiation Safety",
      "Coronal Polish plus Pit and Fissure Sealants",
    ],
    ctaHref: "/infection-control",
    ctaLabel: "Review courses",
    detail:
      "RDA applicants submit required course certificates. Timing windows can matter, so verify current requirements before registering or applying.",
    eyebrow: "Certify",
    icon: "clipboard",
    id: "complete-courses",
    number: 4,
    support: "Roseville offers several California Dental Board-aligned stand-alone courses.",
    title: "Complete RDA Courses",
  },
  {
    bullets: [
      "Submit RDA application",
      "Prepare, study, and pass the written exam",
      "Keep certificates and documentation together",
    ],
    ctaHref: "https://www.dbc.ca.gov/applicants/overview_dapp.pdf",
    ctaLabel: "View process overview",
    detail:
      "After the Dental Board processes a complete application, applicants are authorized to schedule the RDA Combined Written and Law and Ethics Examination.",
    eyebrow: "Apply",
    icon: "file",
    id: "apply-exam",
    number: 5,
    support: "Use official Dental Board instructions for applications, Live Scan, and exam scheduling.",
    title: "Apply and Pass Exam",
  },
  {
    bullets: [
      "Expand allowable duties",
      "Grow your dental career",
      "Keep learning and renew on time",
    ],
    ctaHref: "https://www.dbc.ca.gov/applicants/rda_courses.shtml",
    ctaLabel: "Verify approved courses",
    detail:
      "Licensure opens additional responsibilities under California rules. Keep current with renewal, continuing education, and permitted-duty guidance.",
    eyebrow: "Grow",
    icon: "sparkles",
    id: "licensed-rda",
    number: 6,
    support: "The roadmap ends with a license, but the career keeps building from there.",
    title: "Become a Licensed RDA",
  },
];

export const journeyOfficialLinks: JourneyOfficialLink[] = [
  {
    description:
      "Official pathway, application, required course, background check, exam, and licensure information.",
    href: "https://www.dbc.ca.gov/applicants/become_licensed_rda.shtml",
    label: "Dental Board RDA applicants",
  },
  {
    description:
      "Official provider and course lookup for RDA programs, Radiation Safety, Coronal Polish, Sealants, and Infection Control.",
    href: "https://www.dbc.ca.gov/applicants/rda_courses.shtml",
    label: "Approved programs and courses",
  },
  {
    description:
      "Dental Board process overview with pathway summaries, certificate timing, and common application notes.",
    href: "https://dbc.ca.gov/applicants/overview_dapp.pdf",
    label: "RDA process overview PDF",
  },
];

export const journeyRoute: LiveRoute = {
  aliases: [],
  assetRoot: "",
  contentBaselinePath: "",
  description: JOURNEY_DESCRIPTION,
  htmlPath: "",
  id: "journey",
  kind: "mirror",
  noindex: false,
  route: JOURNEY_ROUTE_PATH,
  shellVariant: "public",
  sitemap: true,
  sourcePath: JOURNEY_ROUTE_PATH,
  status: 200,
  title: JOURNEY_TITLE,
  visualBaselines: {},
  visualMasks: [],
  widgetSlots: [],
};
