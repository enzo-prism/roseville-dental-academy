import type { LiveRoute } from "@/lib/live-route-data";
import { SITE_NAME } from "@/lib/site-metadata";

// Data-driven, indexable resource/guide hub. Mirrors the synthetic-route pattern
// used by lib/journey-roadmap-data.ts: each article and the hub expose a
// `LiveRoute` so they render inside the shared <LiveShell> and appear in the
// sitemap. These pages target informational + local search intent (how to become
// a dental assistant, cost, timeline, RDA path, local demand) and link down to the
// commercial course pages to funnel organic visitors toward enrollment.

export const RESOURCES_BASE_PATH = "/resources";

export const RESOURCES_HUB_TITLE =
  "Dental Assisting Career Guides & Resources | Roseville Dental Academy";
export const RESOURCES_HUB_DESCRIPTION =
  "Free guides on becoming a dental assistant in California — how to start, what school costs, how long it takes, the RDA path, and dental assistant pay in the Sacramento area.";

export type ResourceArticleSection = {
  id: string;
  heading: string;
  paragraphs: string[];
  bullets?: string[];
};

export type ResourceFaq = {
  question: string;
  answer: string;
};

export type ResourceRelatedCourse = {
  href: string;
  label: string;
  blurb: string;
};

export type ResourceArticle = {
  slug: string;
  title: string;
  h1: string;
  description: string;
  category: string;
  readMinutes: number;
  datePublished: string;
  dateModified: string;
  heroImage: {
    src: string;
    alt: string;
  };
  intro: string;
  keyTakeaways: string[];
  sections: ResourceArticleSection[];
  faqs: ResourceFaq[];
  relatedCourses: ResourceRelatedCourse[];
  relatedSlugs: string[];
};

const DA_PROGRAM_COURSE: ResourceRelatedCourse = {
  href: "/dental-assisting-program",
  label: "9-Week Dental Assisting Program",
  blurb:
    "Hands-on, 210-hour training with online lectures, chairside practice, a 64-hour internship, and resume and job assistance.",
};

const BLS_COURSE: ResourceRelatedCourse = {
  href: "/bls-cpr-1",
  label: "BLS / CPR Certification",
  blurb: "3-hour initial or renewal Basic Life Support course for dental healthcare providers.",
};

const INFECTION_CONTROL_COURSE: ResourceRelatedCourse = {
  href: "/infection-control",
  label: "Infection Control (IC189)",
  blurb: "California Dental Board approved 8-hour course required for unlicensed dental assistants.",
};

const RADIATION_SAFETY_COURSE: ResourceRelatedCourse = {
  href: "/radiation-safety",
  label: "Radiation Safety & X-Ray (X1036)",
  blurb: "32-hour board-approved course to become x-ray certified for chairside imaging.",
};

const CORONAL_POLISH_COURSE: ResourceRelatedCourse = {
  href: "/coronal-polish",
  label: "Coronal Polish (CP148)",
  blurb: "12-hour board-approved certification course on the RDA pathway.",
};

const SEALANTS_COURSE: ResourceRelatedCourse = {
  href: "/sealants",
  label: "Pit & Fissure Sealants (PF186)",
  blurb: "16-hour board-approved certification course for eligible dental assistants and RDAs.",
};

export const resourceArticles: ResourceArticle[] = [
  {
    slug: "how-to-become-a-dental-assistant-in-california",
    title:
      "How to Become a Dental Assistant in California (2026 Step-by-Step Guide)",
    h1: "How to Become a Dental Assistant in California",
    description:
      "A step-by-step guide to becoming a dental assistant in California: what an unlicensed dental assistant can do, the training and certificates you need, and how to start in the Sacramento area.",
    category: "Career Guide",
    readMinutes: 8,
    datePublished: "2026-07-12",
    dateModified: "2026-07-12",
    heroImage: {
      src: "/assets/live/programs/dental-assisting-chairside.jpg",
      alt: "Instructor guiding a student through chairside dental assisting practice in Roseville, California.",
    },
    intro:
      "California is one of the few states that regulates dental assisting in detail, so knowing the difference between an unlicensed dental assistant, a Registered Dental Assistant (RDA), and the certificates each role needs saves you time and money. This guide walks through how most people start a dental assisting career in California and where hands-on training fits in.",
    keyTakeaways: [
      "You can start working as an unlicensed dental assistant in California without a state license, but you must complete a Dental Board approved 8-hour Infection Control course and a Dental Practice Act course before or shortly after you begin patient care.",
      "A career-focused training program shortens the learning curve by teaching chairside skills, x-ray safety, and workflow before you ever apply for a job.",
      "Becoming a Registered Dental Assistant (RDA) is a separate, later step that requires qualifying work experience, specific course certificates, and a state exam.",
    ],
    sections: [
      {
        id: "what-a-dental-assistant-does",
        heading: "What a dental assistant actually does",
        paragraphs: [
          "Dental assistants keep the clinical side of a dental office running. They seat and prepare patients, pass instruments chairside, take and process dental x-rays (once certified), maintain infection control, sterilize instruments, take impressions, and help patients understand their treatment.",
          "In California, the duties you are allowed to perform depend on your status. An unlicensed dental assistant handles basic supportive tasks, while a Registered Dental Assistant (RDA) can perform additional allowable duties after licensure.",
        ],
      },
      {
        id: "unlicensed-vs-rda",
        heading: "Unlicensed dental assistant vs. Registered Dental Assistant",
        paragraphs: [
          "Most people begin as an unlicensed dental assistant. This is the entry point that lets you earn income and build the chairside experience California later counts toward RDA licensure.",
          "The RDA credential is issued by the Dental Board of California and expands the duties you can legally perform. It is not required to start working, but it raises your earning potential and career options.",
        ],
        bullets: [
          "Unlicensed dental assistant: entry-level, no state license required to begin, but board-approved Infection Control and Dental Practice Act courses are mandatory.",
          "Registered Dental Assistant (RDA): requires qualifying work experience, required course certificates, an application to the Dental Board, and passing the written and law-and-ethics exam.",
        ],
      },
      {
        id: "step-by-step",
        heading: "The typical step-by-step path",
        paragraphs: [
          "There is no single mandated route, but most successful new assistants follow a similar sequence.",
        ],
        bullets: [
          "Complete a hands-on dental assisting training program to learn chairside skills, terminology, and workflow.",
          "Complete the required 8-hour Infection Control course and a Dental Practice Act course.",
          "Add BLS/CPR certification, which nearly every dental office requires.",
          "Get x-ray certified through a Radiation Safety course so you can take chairside images.",
          "Apply for entry-level dental assistant roles and build qualifying chairside experience.",
          "When you are eligible, complete RDA-track courses (such as Coronal Polish and Sealants) and apply for RDA licensure.",
        ],
      },
      {
        id: "training-options",
        heading: "Do you need a training program?",
        paragraphs: [
          "California does not require a formal program to work as an unlicensed dental assistant, but most offices strongly prefer candidates who already have hands-on training. A focused program compresses months of on-the-job trial and error into a few weeks and helps you walk in job-ready.",
          `${SITE_NAME}'s 9-week Dental Assisting Program is built for this. It combines online lectures with chairside practice and a 64-hour internship, and it bundles the certificates offices look for, including Infection Control, Radiation Safety, and BLS/CPR.`,
        ],
      },
      {
        id: "official-requirements",
        heading: "Verify current requirements with the Dental Board",
        paragraphs: [
          "Dental assisting rules, required courses, and certificate timing windows can change. Always confirm the current requirements directly with the Dental Board of California before you register for a course or apply for licensure.",
          "The Dental Board publishes the official duties, required-course lists, and RDA application steps on its website at dbc.ca.gov.",
        ],
      },
    ],
    faqs: [
      {
        question: "Do you need a license to be a dental assistant in California?",
        answer:
          "No. You can work as an unlicensed dental assistant in California without a state license. However, you must complete a Dental Board approved 8-hour Infection Control course and a Dental Practice Act course, and most offices also require BLS/CPR. A license (RDA) is only required to perform additional allowable duties.",
      },
      {
        question: "How do I start as a dental assistant with no experience?",
        answer:
          "Most people with no experience begin with a short, hands-on dental assisting training program that teaches chairside skills and includes the required certificates, then apply for entry-level roles. Roseville Dental Academy's 9-week program includes a 64-hour internship plus resume and job assistance to help you get hired.",
      },
      {
        question: "Is dental assisting a good career in California?",
        answer:
          "Dental assisting is a stable, in-demand entry point into healthcare. Dental assistant employment is projected to grow, and California's large number of dental offices creates steady local demand. It also offers a clear path to higher pay through RDA licensure.",
      },
      {
        question: "What is the difference between a dental assistant and an RDA?",
        answer:
          "A dental assistant (unlicensed) performs basic chairside support and can begin without a state license. A Registered Dental Assistant (RDA) is licensed by the Dental Board of California, can perform additional allowable duties, and typically earns more. Becoming an RDA requires qualifying work experience, specific course certificates, and a state exam.",
      },
    ],
    relatedCourses: [DA_PROGRAM_COURSE, INFECTION_CONTROL_COURSE, RADIATION_SAFETY_COURSE],
    relatedSlugs: [
      "how-long-does-it-take-to-become-a-dental-assistant",
      "dental-assisting-school-cost-california",
      "rda-vs-dental-assistant-california",
    ],
  },
  {
    slug: "dental-assisting-school-cost-california",
    title: "How Much Does Dental Assisting School Cost in California? (2026)",
    h1: "How Much Does Dental Assisting School Cost in California?",
    description:
      "What dental assisting school really costs in California, what should be included in tuition, hidden fees to watch for, and how Roseville Dental Academy's 9-week program compares.",
    category: "Cost & Tuition",
    readMinutes: 6,
    datePublished: "2026-07-12",
    dateModified: "2026-07-12",
    heroImage: {
      src: "/assets/live/drive/typodont-practice.jpg",
      alt: "Dental assisting student practicing on a typodont during hands-on training.",
    },
    intro:
      "Dental assisting tuition in California varies widely — from a few thousand dollars for a focused accelerated program to well over ten thousand at longer college programs. The real question is not just the sticker price, but what the price includes and how quickly you can start earning. This guide breaks down what drives the cost and what to look for.",
    keyTakeaways: [
      "Accelerated, career-focused dental assisting programs in California typically cost far less than multi-term college programs and get you working sooner.",
      "The most important comparison is what is bundled into tuition — required certificates, materials, an internship, and job assistance can be worth thousands on their own.",
      "Roseville Dental Academy's 9-week Dental Assisting Program is $2,500 and includes lectures, chairside training, and a 64-hour internship, with payment plans that may be available.",
    ],
    sections: [
      {
        id: "cost-ranges",
        heading: "What dental assisting school typically costs",
        paragraphs: [
          "Program length is the biggest cost driver. Short accelerated programs concentrate the essential chairside skills into a few weeks, while community-college and longer private programs spread training over one or more terms and cost more overall.",
          "Roseville Dental Academy's 9-week program is $2,500. Individual certification courses on the RDA pathway are priced separately, so you only pay for the credentials you actually need.",
        ],
        bullets: [
          "9-Week Dental Assisting Program: $2,500",
          "Infection Control (IC189): $395",
          "Radiation Safety & X-Ray (X1036): $695",
          "Coronal Polish (CP148): $500",
          "Pit & Fissure Sealants (PF186): $550",
          "BLS / CPR certification: $85",
        ],
      },
      {
        id: "whats-included",
        heading: "What should be included in tuition",
        paragraphs: [
          "Two programs with the same price tag can deliver very different value. Before you enroll, ask exactly what tuition covers so you can compare fairly.",
        ],
        bullets: [
          "Hands-on chairside training, not just online lectures.",
          "An internship or externship that builds real experience and something to put on your resume.",
          "Required certificates offices expect, such as Infection Control, Radiation Safety, and BLS/CPR.",
          "Materials and lab time.",
          "Resume help and job placement assistance.",
        ],
      },
      {
        id: "hidden-costs",
        heading: "Hidden costs to watch for",
        paragraphs: [
          "The advertised tuition is not always the total. Ask whether the following are included or billed separately so there are no surprises.",
        ],
        bullets: [
          "Separate exam, registration, or certificate fees.",
          "Scrubs, instruments, or lab materials.",
          "Background checks and Live Scan fingerprinting for RDA licensure.",
          "State application and exam fees paid to the Dental Board (for RDA licensure, not the training itself).",
        ],
      },
      {
        id: "value",
        heading: "Cost vs. speed to earning",
        paragraphs: [
          "A shorter program that gets you job-ready in weeks can be the better financial decision even at a similar price, because you start earning a dental assistant wage sooner. When you compare programs, weigh tuition against how quickly you can realistically be hired and how much support you get finding that first job.",
        ],
      },
    ],
    faqs: [
      {
        question: "How much does dental assisting school cost in California?",
        answer:
          "It ranges widely. Accelerated, career-focused programs often cost a few thousand dollars, while longer college programs can cost well over ten thousand. Roseville Dental Academy's 9-week Dental Assisting Program is $2,500 and includes chairside training and a 64-hour internship.",
      },
      {
        question: "Are payment plans available for dental assisting programs?",
        answer:
          "Payment plans may be available for dental assisting training and certification courses at Roseville Dental Academy. Contact admissions to ask about current options and class dates.",
      },
      {
        question: "Does the cost of dental assisting school include certifications?",
        answer:
          "It depends on the program. Some bundle required certificates like Infection Control, Radiation Safety, and BLS/CPR into the program, while others charge separately. Always confirm what is included before enrolling.",
      },
      {
        question: "Is dental assisting school worth the cost?",
        answer:
          "For most students, yes — a focused program compresses the learning curve, includes the certificates offices require, and provides job assistance, helping you start earning a dental assistant wage sooner than learning entirely on the job.",
      },
    ],
    relatedCourses: [DA_PROGRAM_COURSE, INFECTION_CONTROL_COURSE, BLS_COURSE],
    relatedSlugs: [
      "how-to-become-a-dental-assistant-in-california",
      "how-long-does-it-take-to-become-a-dental-assistant",
      "dental-assistant-salary-sacramento",
    ],
  },
  {
    slug: "how-long-does-it-take-to-become-a-dental-assistant",
    title: "How Long Does It Take to Become a Dental Assistant? (California)",
    h1: "How Long Does It Take to Become a Dental Assistant?",
    description:
      "How long it takes to become a dental assistant in California — from an accelerated 9-week program to the longer timeline for becoming a Registered Dental Assistant (RDA).",
    category: "Career Guide",
    readMinutes: 5,
    datePublished: "2026-07-12",
    dateModified: "2026-07-12",
    heroImage: {
      src: "/assets/live/drive/chairside-coaching-closeup.jpg",
      alt: "Student practicing chairside dental assisting skills with instructor support.",
    },
    intro:
      "How fast you can become a dental assistant depends on which role you are aiming for. You can be job-ready as an entry-level dental assistant in a matter of weeks, while becoming a licensed Registered Dental Assistant (RDA) takes longer because California requires qualifying work experience and an exam.",
    keyTakeaways: [
      "You can complete an accelerated dental assisting program and be ready to apply for entry-level jobs in as little as 9 weeks.",
      "Becoming a Registered Dental Assistant (RDA) takes longer — California pathways can involve at least 15 months and around 1,280 hours of qualifying work experience, depending on the route.",
      "Adding certificates like Radiation Safety, Coronal Polish, and Sealants can be done alongside work as you progress toward RDA eligibility.",
    ],
    sections: [
      {
        id: "entry-level-timeline",
        heading: "Entry-level dental assistant: a few weeks",
        paragraphs: [
          "The fastest route into the field is an accelerated training program. Roseville Dental Academy's Dental Assisting Program runs 9 weeks and totals 210 hours, combining online lectures, hands-on chairside practice, and a 64-hour internship.",
          "After completing an accelerated program and the required Infection Control and Dental Practice Act courses, you can begin applying for unlicensed dental assistant roles right away.",
        ],
      },
      {
        id: "rda-timeline",
        heading: "Registered Dental Assistant (RDA): 15+ months",
        paragraphs: [
          "The RDA license is a longer commitment. California outlines work-experience and blended-education pathways that can involve at least 15 months and roughly 1,280 hours of qualifying chairside experience, depending on the pathway you choose.",
          "During that time you complete the required course certificates, submit an application to the Dental Board of California, and pass the RDA Combined Written and Law and Ethics Examination.",
        ],
      },
      {
        id: "what-affects-timeline",
        heading: "What can speed up or slow down your timeline",
        paragraphs: [
          "Your personal timeline depends on a few factors within your control.",
        ],
        bullets: [
          "How quickly you complete initial training and the required certificates.",
          "How soon you get hired and start logging qualifying work hours.",
          "Whether you complete RDA-track courses (Coronal Polish, Sealants, Radiation Safety) along the way.",
          "Application processing and exam scheduling with the Dental Board.",
        ],
      },
    ],
    faqs: [
      {
        question: "How long does it take to become a dental assistant in California?",
        answer:
          "You can be ready for entry-level dental assistant roles in as little as 9 weeks through an accelerated program like Roseville Dental Academy's 210-hour Dental Assisting Program, plus the required Infection Control and Dental Practice Act courses.",
      },
      {
        question: "How long does it take to become an RDA in California?",
        answer:
          "Becoming a Registered Dental Assistant takes longer than entry-level assisting. California pathways can involve at least 15 months and about 1,280 hours of qualifying work experience, along with required course certificates and passing the state exam. Verify current requirements with the Dental Board of California.",
      },
      {
        question: "Can you become a dental assistant fast?",
        answer:
          "Yes. Accelerated programs are designed to get you job-ready quickly. A 9-week program plus the required certificates can prepare you to apply for entry-level dental assistant positions in a couple of months.",
      },
    ],
    relatedCourses: [DA_PROGRAM_COURSE, RADIATION_SAFETY_COURSE, CORONAL_POLISH_COURSE],
    relatedSlugs: [
      "how-to-become-a-dental-assistant-in-california",
      "rda-vs-dental-assistant-california",
      "dental-assisting-school-cost-california",
    ],
  },
  {
    slug: "rda-vs-dental-assistant-california",
    title: "RDA vs. Dental Assistant in California: What's the Difference?",
    h1: "RDA vs. Dental Assistant: What's the Difference in California?",
    description:
      "Understand the difference between an unlicensed dental assistant, a Registered Dental Assistant (RDA), and an RDAEF in California — duties, requirements, pay, and how to move up.",
    category: "Career Guide",
    readMinutes: 6,
    datePublished: "2026-07-12",
    dateModified: "2026-07-12",
    heroImage: {
      src: "/assets/live/courses/bls-hands-on.jpg",
      alt: "Dental assisting students practicing clinical skills during certification training.",
    },
    intro:
      "California uses specific titles for dental assisting roles, and they are not interchangeable. Knowing the difference between a dental assistant (DA), a Registered Dental Assistant (RDA), and a Registered Dental Assistant in Extended Functions (RDAEF) helps you plan your career and understand which courses you actually need.",
    keyTakeaways: [
      "A dental assistant (unlicensed) is the entry point and does not require a state license to begin working.",
      "A Registered Dental Assistant (RDA) is licensed by the Dental Board of California, can perform additional allowable duties, and generally earns more.",
      "An RDAEF is an advanced credential that permits extended clinical functions and requires additional education and examination.",
    ],
    sections: [
      {
        id: "dental-assistant",
        heading: "Dental Assistant (DA) — the entry point",
        paragraphs: [
          "An unlicensed dental assistant performs basic supportive and chairside duties. You can start in this role without a state license, provided you complete the Dental Board approved 8-hour Infection Control course and a Dental Practice Act course, and most offices also require BLS/CPR.",
          "This is where nearly everyone begins, and the qualifying experience you gain here counts toward RDA eligibility.",
        ],
      },
      {
        id: "rda",
        heading: "Registered Dental Assistant (RDA) — the licensed step up",
        paragraphs: [
          "The RDA is a state license from the Dental Board of California. It expands the duties you are legally allowed to perform and typically increases your pay and job options.",
          "To qualify, you generally need qualifying work experience or a board-approved RDA program, specific course certificates, and you must pass the RDA Combined Written and Law and Ethics Examination.",
        ],
        bullets: [
          "Required certificate courses commonly include Coronal Polish and Pit & Fissure Sealants.",
          "Radiation Safety (x-ray) certification is expected for chairside imaging.",
          "Qualifying work experience is documented and submitted with your application.",
        ],
      },
      {
        id: "rdaef",
        heading: "RDA in Extended Functions (RDAEF) — advanced practice",
        paragraphs: [
          "The RDAEF credential authorizes additional, more advanced clinical functions under California rules. It builds on RDA licensure and requires further approved education and examination. Most assistants pursue it later in their careers once they are established as an RDA.",
        ],
      },
      {
        id: "how-to-move-up",
        heading: "How to move from DA to RDA",
        paragraphs: [
          "The practical path is to start as a dental assistant, get hired, and build qualifying experience while completing the required RDA-track courses. Our DA to RDA career roadmap lays out each step, from training through the exam.",
        ],
      },
    ],
    faqs: [
      {
        question: "What is the difference between a DA and an RDA in California?",
        answer:
          "A dental assistant (DA) is an unlicensed, entry-level role you can start without a state license. A Registered Dental Assistant (RDA) is licensed by the Dental Board of California, can perform additional allowable duties, and usually earns more. Becoming an RDA requires qualifying experience, specific course certificates, and passing a state exam.",
      },
      {
        question: "Is an RDA higher than a dental assistant?",
        answer:
          "Yes. An RDA is a licensed credential above the unlicensed dental assistant role, with a broader scope of allowable duties and typically higher pay.",
      },
      {
        question: "What courses do you need to become an RDA in California?",
        answer:
          "RDA applicants commonly need certificates such as Coronal Polish and Pit & Fissure Sealants, along with Radiation Safety, Infection Control, and the Dental Practice Act. Requirements can change, so verify the current list with the Dental Board of California.",
      },
      {
        question: "What is an RDAEF?",
        answer:
          "An RDAEF is a Registered Dental Assistant in Extended Functions — an advanced California credential that authorizes additional clinical functions and requires further education and examination beyond the RDA license.",
      },
    ],
    relatedCourses: [CORONAL_POLISH_COURSE, SEALANTS_COURSE, RADIATION_SAFETY_COURSE],
    relatedSlugs: [
      "how-to-become-a-dental-assistant-in-california",
      "how-long-does-it-take-to-become-a-dental-assistant",
      "dental-assistant-salary-sacramento",
    ],
  },
  {
    slug: "dental-assistant-salary-sacramento",
    title: "Dental Assistant Salary in the Sacramento Area (2026 Guide)",
    h1: "Dental Assistant Salary in the Sacramento Area",
    description:
      "What dental assistants earn in the Sacramento and Roseville area, how pay grows with RDA licensure and certifications, and how to increase your earning potential.",
    category: "Local Guide",
    readMinutes: 5,
    datePublished: "2026-07-12",
    dateModified: "2026-07-12",
    heroImage: {
      src: "/assets/live/photos/img-5918-2.jpg",
      alt: "Roseville Dental Academy graduates holding certificates outside the academy.",
    },
    intro:
      "Pay is one of the first things people ask about when considering a dental assisting career near Sacramento. Actual wages depend on your role, certifications, experience, and the specific office, but there are clear patterns — and clear ways to increase what you earn.",
    keyTakeaways: [
      "Entry-level dental assistant starting pay commonly falls around $18–$22 per hour, varying by employer and experience.",
      "Becoming a Registered Dental Assistant (RDA) and adding certifications such as x-ray, coronal polish, and sealants generally raises earning potential.",
      "The greater Sacramento region — including Roseville, Rocklin, Folsom, Citrus Heights, and Elk Grove — has steady demand from a large number of dental offices.",
    ],
    sections: [
      {
        id: "starting-pay",
        heading: "What entry-level dental assistants earn",
        paragraphs: [
          "Starting pay for new dental assistants commonly falls in the range of $18 to $22 per hour, depending on the employer, your certifications, and your experience. Offices that need x-ray-certified assistants or assistants with additional credentials often pay toward the higher end.",
          "These figures are general guidance, not a guarantee — always confirm pay with individual employers.",
        ],
      },
      {
        id: "raise-your-pay",
        heading: "How to increase your earning potential",
        paragraphs: [
          "The most reliable way to earn more is to expand what you are qualified to do. Each credential you add makes you more valuable to an office.",
        ],
        bullets: [
          "Get x-ray certified through a Radiation Safety course so you can take chairside images.",
          "Complete Coronal Polish and Pit & Fissure Sealants certification on the RDA pathway.",
          "Earn your Registered Dental Assistant (RDA) license for a broader scope of duties.",
          "Build experience and reliability, which offices reward with raises and better roles.",
        ],
      },
      {
        id: "local-demand",
        heading: "Dental assistant demand around Sacramento",
        paragraphs: [
          "The Roseville and greater Sacramento area is home to a large concentration of dental practices across communities like Rocklin, Lincoln, Folsom, Citrus Heights, Elk Grove, and Sacramento proper. That density creates consistent local demand for trained, certified dental assistants.",
          `${SITE_NAME} is located in Roseville and trains students from across the region, with resume and job assistance to help graduates connect with nearby offices.`,
        ],
      },
    ],
    faqs: [
      {
        question: "How much do dental assistants make in the Sacramento area?",
        answer:
          "Entry-level dental assistant pay commonly starts around $18–$22 per hour and rises with certifications, RDA licensure, and experience. Exact pay varies by employer, so confirm with individual offices.",
      },
      {
        question: "Do RDAs make more than dental assistants?",
        answer:
          "Generally, yes. A Registered Dental Assistant (RDA) license expands your allowable duties and typically increases earning potential compared with an unlicensed dental assistant.",
      },
      {
        question: "Is there demand for dental assistants near Roseville and Sacramento?",
        answer:
          "Yes. The greater Sacramento region has a high concentration of dental offices across Roseville, Rocklin, Folsom, Citrus Heights, Elk Grove, and surrounding communities, creating steady demand for trained dental assistants.",
      },
    ],
    relatedCourses: [DA_PROGRAM_COURSE, RADIATION_SAFETY_COURSE, CORONAL_POLISH_COURSE],
    relatedSlugs: [
      "how-to-become-a-dental-assistant-in-california",
      "rda-vs-dental-assistant-california",
      "dental-assisting-school-cost-california",
    ],
  },
];

const articlesBySlug = new Map(resourceArticles.map((article) => [article.slug, article]));

export function getResourceArticle(slug: string): ResourceArticle | undefined {
  return articlesBySlug.get(slug);
}

export function getResourceArticleSlugs(): string[] {
  return resourceArticles.map((article) => article.slug);
}

export function resourceArticlePath(slug: string): string {
  return `${RESOURCES_BASE_PATH}/${slug}`;
}

function buildResourceRoute(
  route: string,
  id: string,
  title: string,
  description: string,
): LiveRoute {
  return {
    aliases: [],
    assetRoot: "",
    contentBaselinePath: "",
    description,
    htmlPath: "",
    id,
    kind: "mirror",
    noindex: false,
    route,
    shellVariant: "public",
    sitemap: true,
    sourcePath: route,
    status: 200,
    title,
    visualBaselines: {},
    visualMasks: [],
    widgetSlots: [],
  };
}

export const resourceHubRoute: LiveRoute = buildResourceRoute(
  RESOURCES_BASE_PATH,
  "resources",
  RESOURCES_HUB_TITLE,
  RESOURCES_HUB_DESCRIPTION,
);

export function resourceRouteForArticle(article: ResourceArticle): LiveRoute {
  return buildResourceRoute(
    resourceArticlePath(article.slug),
    `resources-${article.slug}`,
    article.title,
    article.description,
  );
}

export function getResourceSitemapRoutes(): LiveRoute[] {
  return [resourceHubRoute, ...resourceArticles.map(resourceRouteForArticle)];
}
