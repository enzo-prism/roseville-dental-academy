import type { LiveRoute } from "@/lib/live-route-data";
import type { RdaPathCourseId } from "@/lib/rda-course-path";

// Sacramento-area "Dental Assisting School near ..." hub + city pages.
//
// Each city page is rendered from one template (components/site/local-city-page.tsx)
// but carries real, per-city details: measured drive distance/time, the actual
// roads the route uses, and city-specific commute FAQs. Do not add claims about
// where students live, placement/pass rates, pay, employers, or Spanish-speaking
// staff — none of that is verified.

export const LOCAL_SEO_BASE_PATH = "/dental-assisting-school";

export type SeoFaq = {
  question: string;
  answer: string;
};

export type LocalCity = {
  slug: string;
  name: string;
  county: "Placer County" | "Sacramento County";
  /** Origin string for the Google Maps directions link. */
  mapsOrigin: string;
  /** Where the drive was measured from, in plain words. */
  measuredFrom: string;
  drive: {
    /** Rounded, as shown on the page. */
    miles: number;
    minutes: number;
    /** Raw OSRM output, kept for auditability. */
    osrmMiles: number;
    osrmMinutes: number;
    /** Main roads, in driving order, from the OSRM step list. */
    route: string;
  };
  title: string;
  description: string;
  h1: string;
  intro: string;
  /** Short, city-specific paragraphs for the "Getting to class" section. */
  commuteNotes: string[];
  /** Optional extra city-specific sections (used to give Sacramento more depth). */
  extraSections?: { id: string; heading: string; paragraphs: string[] }[];
  highlightCourses: RdaPathCourseId[];
  faqs: SeoFaq[];
  relatedResourceSlugs: string[];
};

// Drive data source (retrieved 2026-09-24):
// - Geocoding: Nominatim (OpenStreetMap), https://nominatim.openstreetmap.org/search
//   Academy: 1271 Pleasant Grove Blvd, Roseville, CA 95747 → 38.77179, -121.31549.
//   Each city: "<City>, California, USA" → the city center point Nominatim returns.
// - Routing: public OSRM demo server, driving profile, city center → academy,
//   https://router.project-osrm.org/route/v1/driving/{lon1},{lat1};{lon2},{lat2}?steps=true
// - OSRM times assume free-flowing traffic; pages round and say "without traffic".
//   Re-measure before changing any figure.
export const localCities: LocalCity[] = [
  {
    slug: "sacramento",
    name: "Sacramento",
    county: "Sacramento County",
    mapsOrigin: "Sacramento, CA",
    measuredFrom: "downtown Sacramento",
    drive: {
      miles: 21,
      minutes: 30,
      osrmMiles: 20.7,
      osrmMinutes: 30.7,
      route: "Capital City Freeway (Business 80) to I-80 east, then Riverside Avenue, Cirby Way, and Foothills Boulevard",
    },
    title: "Dental Assisting near Sacramento | Roseville Dental Academy",
    description:
      "9-week, 210-hour dental assisting program about 30 minutes from downtown Sacramento. 1 class day a week, 64-hour internship, $2,500 tuition.",
    h1: "Dental Assisting Program for Sacramento Students",
    intro:
      "Roseville Dental Academy is about 21 miles from downtown Sacramento — roughly a 30-minute drive without traffic up the Capital City Freeway and I-80. The 9-week program meets one class day a week, so Sacramento students commute for class once a week plus one assigned internship day, instead of every day.",
    commuteNotes: [
      "From downtown, the fastest route follows the Capital City Freeway (Business 80) onto I-80 east, exits toward Riverside Avenue, and finishes on Cirby Way and Foothills Boulevard to Pleasant Grove Boulevard. Expect it to take longer during weekday rush hours.",
      "Class runs on one day a week — Monday, Friday, or Saturday, and you pick one. If you work weekdays, ask admissions about the Saturday schedule and how your assigned internship day fits.",
      "The academy is in Woodcreek Plaza on Pleasant Grove Boulevard in Roseville, in neighboring Placer County.",
    ],
    extraSections: [
      {
        id: "sacramento-week",
        heading: "What a week looks like from Sacramento",
        paragraphs: [
          "The program combines online lectures and homework with in-person chairside training, so some of each week's learning happens from home. You drive to Roseville for your one class day and for your assigned internship day.",
          "Over 9 weeks that adds up to 210 hours of training, including the 64-hour internship. Class days are Monday, Friday, or Saturday — separate schedules, and you attend one of them.",
        ],
      },
      {
        id: "sacramento-after",
        heading: "After the program: moving toward the RDA license",
        paragraphs: [
          "Graduates who want to grow into Registered Dental Assistant (RDA) duties can come back for the Board-approved certification courses one at a time on the scheduled course dates, without re-enrolling in the full program.",
          "The DA to RDA journey explains the full licensing path, and our Sacramento-area pay guide covers what dental assistants earn in the region.",
        ],
      },
    ],
    highlightCourses: ["bls-cpr-1", "infection-control", "radiation-safety", "coronal-polish", "sealants"],
    faqs: [
      {
        question: "How far is Roseville Dental Academy from Sacramento?",
        answer:
          "About 21 miles from downtown Sacramento, or roughly 30 minutes without traffic via the Capital City Freeway (Business 80) and I-80. Rush-hour drives take longer, so leave extra time for weekday classes.",
      },
      {
        question: "How many days a week would I drive from Sacramento?",
        answer:
          "The program is 1 class day a week (Monday, Friday, or Saturday — you pick one) plus 1 assigned internship day, over 9 weeks and 210 hours total. Admissions confirms the internship schedule when you enroll.",
      },
      {
        question: "Can I keep my Sacramento job while I train?",
        answer:
          "Class meets one day a week, so you can choose the Monday, Friday, or Saturday schedule that fits around work. Talk to admissions about how the assigned internship day fits your availability.",
      },
      {
        question: "I already work as a dental assistant in Sacramento. Which courses can I take?",
        answer:
          "Working assistants can take the stand-alone Board-approved courses without enrolling in the full program: 8-Hour Infection Control (IC189), Radiation Safety (X1036), Coronal Polish (CP148), and Pit & Fissure Sealants (PF186), plus BLS/CPR.",
      },
    ],
    relatedResourceSlugs: [
      "dental-assistant-salary-sacramento",
      "how-to-become-a-dental-assistant-in-california",
      "dental-assisting-school-cost-california",
    ],
  },
  {
    slug: "rocklin",
    name: "Rocklin",
    county: "Placer County",
    mapsOrigin: "Rocklin, CA",
    measuredFrom: "central Rocklin",
    drive: {
      miles: 6,
      minutes: 12,
      osrmMiles: 6.3,
      osrmMinutes: 11.8,
      route: "Pacific Street and Taylor Road to East Roseville Parkway, then Pleasant Grove Boulevard",
    },
    title: "Dental Assisting near Rocklin | Roseville Dental Academy",
    description:
      "Dental assisting program about 12 minutes from Rocklin by surface streets. 9 weeks, 210 hours, 1 class day a week, 64-hour internship, $2,500.",
    h1: "Dental Assisting Program for Rocklin Students",
    intro:
      "From central Rocklin, Roseville Dental Academy is about 6 miles away — around 12 minutes without traffic, using surface streets rather than the freeway. The 9-week program meets one class day a week plus one assigned internship day.",
    commuteNotes: [
      "The route runs down Pacific Street and Taylor Road, then along East Roseville Parkway to Pleasant Grove Boulevard — no freeway driving needed.",
      "With class one day a week (Monday, Friday, or Saturday — pick one), a short local drive makes it easier to fit training around work or family.",
    ],
    highlightCourses: ["infection-control", "radiation-safety"],
    faqs: [
      {
        question: "How long is the drive from Rocklin to Roseville Dental Academy?",
        answer:
          "About 12 minutes and 6 miles from central Rocklin without traffic, via Pacific Street, Taylor Road, East Roseville Parkway, and Pleasant Grove Boulevard.",
      },
      {
        question: "Do I have to attend class every day?",
        answer:
          "No. The program is 1 class day a week (Monday, Friday, or Saturday — you pick one) plus 1 assigned internship day, for 9 weeks and 210 hours total.",
      },
      {
        question: "Is there anything to complete before the first class?",
        answer:
          "There are no prerequisites for the Dental Assisting Program; students must be 16 or older. Call admissions to register and confirm your start date.",
      },
    ],
    relatedResourceSlugs: [
      "how-long-does-it-take-to-become-a-dental-assistant",
      "how-to-become-a-dental-assistant-in-california",
    ],
  },
  {
    slug: "lincoln",
    name: "Lincoln",
    county: "Placer County",
    mapsOrigin: "Lincoln, CA",
    measuredFrom: "central Lincoln",
    drive: {
      miles: 9,
      minutes: 15,
      osrmMiles: 9.0,
      osrmMinutes: 15.4,
      route: "Lincoln Boulevard to Highway 65 south, then Washington Boulevard and Pleasant Grove Boulevard",
    },
    title: "Dental Assisting near Lincoln, CA | Roseville Dental Academy",
    description:
      "Dental assisting program about 15 minutes from Lincoln via Highway 65. 9 weeks, 210 hours, 1 class day a week, 64-hour internship, $2,500.",
    h1: "Dental Assisting Program for Lincoln Students",
    intro:
      "Roseville Dental Academy is about 9 miles from central Lincoln — roughly 15 minutes without traffic, most of it on Highway 65. The 9-week program meets one class day a week plus one assigned internship day.",
    commuteNotes: [
      "Take Lincoln Boulevard to Highway 65 south, exit toward Washington Boulevard, and continue to Pleasant Grove Boulevard. The academy is in Woodcreek Plaza.",
      "Pick one weekly class day — Monday, Friday, or Saturday — and admissions assigns your internship day.",
    ],
    highlightCourses: ["infection-control", "coronal-polish"],
    faqs: [
      {
        question: "How far is the academy from Lincoln?",
        answer:
          "About 9 miles and 15 minutes from central Lincoln without traffic, mostly on Highway 65 south to Washington Boulevard and Pleasant Grove Boulevard.",
      },
      {
        question: "What does the program cost and how do payments work?",
        answer:
          "Tuition is $2,500. There is a $1,000 minimum down payment, with the balance paid weekly over the nine weeks. All Roseville Dental Academy courses are nonrefundable.",
      },
      {
        question: "Which class days can I choose?",
        answer:
          "Monday, Friday, or Saturday — they are separate schedules and you attend one. You also complete 1 assigned internship day each week as part of the 64-hour internship.",
      },
    ],
    relatedResourceSlugs: [
      "dental-assisting-school-cost-california",
      "how-to-become-a-dental-assistant-in-california",
    ],
  },
  {
    slug: "folsom",
    name: "Folsom",
    county: "Sacramento County",
    mapsOrigin: "Folsom, CA",
    measuredFrom: "central Folsom",
    drive: {
      miles: 14,
      minutes: 25,
      osrmMiles: 14.2,
      osrmMinutes: 24.1,
      route: "Auburn-Folsom Road to Douglas Boulevard, then East Roseville Parkway and Pleasant Grove Boulevard",
    },
    title: "Dental Assisting near Folsom | Roseville Dental Academy",
    description:
      "Dental assisting program about 25 minutes from Folsom via Auburn-Folsom Rd and Douglas Blvd. 9 weeks, 1 class day a week, 64-hour internship, $2,500.",
    h1: "Dental Assisting Program for Folsom Students",
    intro:
      "From central Folsom, Roseville Dental Academy is about 14 miles away — around 25 minutes without traffic by way of Auburn-Folsom Road and Douglas Boulevard. The 9-week program meets one class day a week plus one assigned internship day.",
    commuteNotes: [
      "The fastest route heads north on Auburn-Folsom Road, west on Douglas Boulevard, then up East Roseville Parkway to Pleasant Grove Boulevard — no freeway required.",
      "Because class meets once a week (Monday, Friday, or Saturday — pick one), the drive is a weekly commitment rather than a daily one.",
    ],
    highlightCourses: ["infection-control", "radiation-safety", "sealants"],
    faqs: [
      {
        question: "How long is the drive from Folsom to Roseville Dental Academy?",
        answer:
          "About 25 minutes and 14 miles from central Folsom without traffic, using Auburn-Folsom Road, Douglas Boulevard, and East Roseville Parkway.",
      },
      {
        question: "How long is the program?",
        answer:
          "9 weeks and 210 hours total, including a 64-hour internship. You attend 1 class day a week (Monday, Friday, or Saturday — pick one) plus 1 assigned internship day.",
      },
      {
        question: "Do I need experience or prerequisites?",
        answer:
          "No prerequisites are required; students must be 16 or older. The program is designed for entry-level students.",
      },
    ],
    relatedResourceSlugs: [
      "how-long-does-it-take-to-become-a-dental-assistant",
      "rda-vs-dental-assistant-california",
    ],
  },
  {
    slug: "citrus-heights",
    name: "Citrus Heights",
    county: "Sacramento County",
    mapsOrigin: "Citrus Heights, CA",
    measuredFrom: "central Citrus Heights",
    drive: {
      miles: 6,
      minutes: 13,
      osrmMiles: 6.3,
      osrmMinutes: 12.6,
      route: "Antelope Road and Auburn Boulevard to Riverside Avenue and Cirby Way, then north on Foothills Boulevard",
    },
    title: "Dental Assisting near Citrus Heights | Roseville Dental Academy",
    description:
      "Dental assisting program about 13 minutes from Citrus Heights via Foothills Blvd. 9 weeks, 210 hours, 1 class day a week, 64-hour internship, $2,500.",
    h1: "Dental Assisting Program for Citrus Heights Students",
    intro:
      "Roseville Dental Academy is about 6 miles from central Citrus Heights — roughly 13 minutes without traffic, entirely on surface streets. The 9-week program meets one class day a week plus one assigned internship day.",
    commuteNotes: [
      "Head up Antelope Road and Auburn Boulevard, cross into Roseville on Riverside Avenue and Cirby Way, then take Foothills Boulevard north to Pleasant Grove Boulevard.",
      "Choose a Monday, Friday, or Saturday class schedule; the assigned internship day is confirmed by admissions.",
    ],
    highlightCourses: ["infection-control", "coronal-polish"],
    faqs: [
      {
        question: "How far is Roseville Dental Academy from Citrus Heights?",
        answer:
          "About 6 miles and 13 minutes from central Citrus Heights without traffic, via Auburn Boulevard, Cirby Way, and Foothills Boulevard.",
      },
      {
        question: "What happens during the internship?",
        answer:
          "The program includes a 64-hour internship component with assigned externship hours built into the 9-week schedule, so you practice in an active office environment rather than a simulation-only space.",
      },
      {
        question: "How do I reserve a spot?",
        answer:
          "Call admissions at 916-888-9821 or send the request form on this page. The minimum down payment is $1,000, with the balance paid weekly over the nine weeks.",
      },
    ],
    relatedResourceSlugs: [
      "how-to-become-a-dental-assistant-in-california",
      "dental-assisting-school-cost-california",
    ],
  },
  {
    slug: "auburn",
    name: "Auburn",
    county: "Placer County",
    mapsOrigin: "Auburn, CA",
    measuredFrom: "central Auburn",
    drive: {
      miles: 18,
      minutes: 25,
      osrmMiles: 18.1,
      osrmMinutes: 24.1,
      route: "I-80 west to Highway 65, then Pleasant Grove Boulevard",
    },
    title: "Dental Assisting near Auburn, CA | Roseville Dental Academy",
    description:
      "Dental assisting program about 25 minutes from Auburn via I-80 and Highway 65. 9 weeks, 210 hours, 1 class day a week, 64-hour internship, $2,500.",
    h1: "Dental Assisting Program for Auburn Students",
    intro:
      "From central Auburn, Roseville Dental Academy is about 18 miles down I-80 — roughly 25 minutes without traffic. The 9-week program meets one class day a week plus one assigned internship day, so the drive is weekly rather than daily.",
    commuteNotes: [
      "Take I-80 west for about 13 miles, merge onto Highway 65, and exit at Pleasant Grove Boulevard. The academy is in Woodcreek Plaza.",
      "Choose one class schedule — Monday, Friday, or Saturday. Admissions confirms available dates and your assigned internship day.",
    ],
    highlightCourses: ["radiation-safety", "coronal-polish", "sealants"],
    faqs: [
      {
        question: "How long is the drive from Auburn?",
        answer:
          "About 25 minutes and 18 miles from central Auburn without traffic: I-80 west to Highway 65, then the Pleasant Grove Boulevard exit.",
      },
      {
        question: "How many times a week do I come to Roseville?",
        answer:
          "Class meets 1 day a week (Monday, Friday, or Saturday — you pick one), plus 1 assigned internship day, for 9 weeks.",
      },
      {
        question: "Does the academy help with finding a job afterward?",
        answer:
          "The program includes resume and job assistance to help you prepare for an entry-level position in a dental office.",
      },
    ],
    relatedResourceSlugs: [
      "how-long-does-it-take-to-become-a-dental-assistant",
      "rda-vs-dental-assistant-california",
    ],
  },
];

export const LOCAL_HUB_TITLE = "Dental Assisting School near Sacramento | Roseville Dental Academy";
export const LOCAL_HUB_H1 = "Dental Assisting School near Sacramento";
export const LOCAL_HUB_DESCRIPTION =
  "9-week dental assisting program in Roseville serving Sacramento, Rocklin, Lincoln, Folsom, Citrus Heights, and Auburn. Real drive times and schedules.";

export const LOCAL_HUB_INTRO =
  "Roseville Dental Academy is in Woodcreek Plaza on Pleasant Grove Boulevard in Roseville, a short drive from much of the Sacramento region. The 9-week, 210-hour Dental Assisting Program meets one class day a week plus one assigned internship day, so the trip to Roseville is a weekly one. Pick your area below for measured drive times, routes, and local FAQs.";

export const localHubFaqs: SeoFaq[] = [
  {
    question: "Where is Roseville Dental Academy?",
    answer:
      "1271 Pleasant Grove Boulevard, Ste. 100, Roseville, California 95747, in Woodcreek Plaza.",
  },
  {
    question: "How often do students need to come to Roseville?",
    answer:
      "The program is 1 class day a week (Monday, Friday, or Saturday — pick one) plus 1 assigned internship day, for 9 weeks and 210 hours total. Lectures and homework are also completed online.",
  },
  {
    question: "How were the drive times on these pages measured?",
    answer:
      "Using OpenStreetMap routing from each city's center to the academy, without traffic. Rush-hour drives take longer, so use the Google Maps directions link on each page for a live estimate.",
  },
];

export function localCityPath(slug: string): string {
  return `${LOCAL_SEO_BASE_PATH}/${slug}`;
}

export function getLocalCity(slug: string): LocalCity | undefined {
  return localCities.find((city) => city.slug === slug);
}

/** Synthetic LiveRoute for React-owned SEO pages (same shape as /journey and /resources). */
export function buildSeoLandingRoute(
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

export const localHubRoute: LiveRoute = buildSeoLandingRoute(
  LOCAL_SEO_BASE_PATH,
  "dental-assisting-school",
  LOCAL_HUB_TITLE,
  LOCAL_HUB_DESCRIPTION,
);

export function localRouteForCity(city: LocalCity): LiveRoute {
  return buildSeoLandingRoute(
    localCityPath(city.slug),
    `dental-assisting-school-${city.slug}`,
    city.title,
    city.description,
  );
}

export function getLocalSeoSitemapRoutes(): LiveRoute[] {
  return [localHubRoute, ...localCities.map(localRouteForCity)];
}
