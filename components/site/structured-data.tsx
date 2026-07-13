import { getCourseSchedule, type CourseScheduleId } from "@/lib/course-schedule";
import {
  courseReviewHighlights,
  faqItems,
  googleReviewsAggregate,
  homepageReviewHighlights,
  siteContact,
  socialLinks,
  type CourseReviewId,
  type ReviewAggregate,
} from "@/lib/site-data";
import { getSiteUrl } from "@/lib/site-config";
import type { ResourceArticle } from "@/lib/resource-articles";
import type { TestimonialData } from "@/lib/site-types";

const STREET_ADDRESS = "1271 Pleasant Grove Boulevard, Ste. 100";
const ADDRESS_LOCALITY = "Roseville";
const ADDRESS_REGION = "CA";
const POSTAL_CODE = "95747";
const COUNTRY = "US";
const GEO_LATITUDE = 38.7717804;
const GEO_LONGITUDE = -121.3154872;
const GOOGLE_MAPS_CID_URL =
  "https://maps.google.com/maps?cid=11613766695697697595";

const COURSE_SCHEMA_BY_PATH: Record<
  string,
  {
    name: string;
    description: string;
    courseCode?: string;
    courseMode: "Blended" | "Onsite";
    price: number;
    scheduleId: CourseScheduleId;
    timeRequired?: string;
    reviewsId: CourseReviewId;
  }
> = {
  "/dental-assisting-program": {
    name: "Dental Assisting Program",
    description:
      "Nine-week, 210-hour dental assisting training with online lectures, hands-on chairside instruction, resume and job assistance, and a 64-hour internship.",
    courseMode: "Blended",
    price: 2500,
    scheduleId: "dental-assisting-program",
    timeRequired: "PT210H",
    reviewsId: "dental-assisting-program",
  },
  "/bls-cpr-1": {
    name: "BLS/CPR Certification for Healthcare Providers",
    description:
      "Initial and renewal Basic Life Support / CPR training for dental healthcare providers. Three-hour course with 2026 dates beginning June 6.",
    courseMode: "Onsite",
    price: 85,
    scheduleId: "bls-cpr-1",
    timeRequired: "PT3H",
    reviewsId: "bls-cpr-1",
  },
  "/infection-control": {
    name: "Dental Infection Control Course",
    description:
      "California Dental Board approved 8-hour infection control course (provider IC189) for unlicensed dental assistants. Required by the Dental Board of California.",
    courseCode: "IC189",
    courseMode: "Onsite",
    price: 395,
    scheduleId: "infection-control",
    timeRequired: "PT8H",
    reviewsId: "infection-control",
  },
  "/radiation-safety": {
    name: "Dental Radiation Safety & X-Ray Course",
    description:
      "California Dental Board approved 32-hour radiation safety and dental X-ray course (provider X1036) for dental personnel and dentists.",
    courseCode: "X1036",
    courseMode: "Onsite",
    price: 695,
    scheduleId: "radiation-safety",
    timeRequired: "PT32H",
    reviewsId: "radiation-safety",
  },
  "/coronal-polish": {
    name: "Coronal Polish Certification",
    description:
      "California Dental Board approved 12-hour coronal polish course (provider CP148) for eligible dental assistants. Includes didactic, lab, manikin, written exam, and clinical requirements.",
    courseCode: "CP148",
    courseMode: "Onsite",
    price: 500,
    scheduleId: "coronal-polish",
    timeRequired: "PT12H",
    reviewsId: "coronal-polish",
  },
  "/sealants": {
    name: "Pit & Fissure Sealants Certification",
    description:
      "California Dental Board approved 16-hour pit and fissure sealants course (provider PF186) for eligible dental assistants and RDAs.",
    courseCode: "PF186",
    courseMode: "Onsite",
    price: 550,
    scheduleId: "sealants",
    timeRequired: "PT16H",
    reviewsId: "sealants",
  },
};

type JsonLdValue =
  | string
  | number
  | boolean
  | null
  | JsonLdValue[]
  | { [key: string]: JsonLdValue };

function buildAggregateRating(aggregate: ReviewAggregate): JsonLdValue {
  return {
    "@type": "AggregateRating",
    ratingValue: aggregate.ratingValue,
    reviewCount: aggregate.reviewCount,
    bestRating: aggregate.bestRating,
    worstRating: aggregate.worstRating,
  };
}

function buildReviewNodes(reviews: readonly TestimonialData[]): JsonLdValue[] {
  return reviews.map((review) => ({
    "@type": "Review",
    author: { "@type": "Person", name: review.name },
    reviewRating: {
      "@type": "Rating",
      ratingValue: review.rating,
      bestRating: 5,
      worstRating: 1,
    },
    reviewBody: review.quote,
  }));
}

// Aggregate over the exact reviews rendered on a course page, so the markup
// matches the visible "N out of 5 stars" cards (Google requires parity).
function aggregateForReviews(reviews: readonly TestimonialData[]): ReviewAggregate {
  const reviewCount = reviews.length;
  const sum = reviews.reduce((total, review) => total + review.rating, 0);
  const average = reviewCount > 0 ? sum / reviewCount : 0;

  return {
    ratingValue: Math.round(average * 10) / 10,
    reviewCount,
    bestRating: 5,
    worstRating: 1,
  };
}

function StructuredDataScript({ id, data }: { id: string; data: JsonLdValue }) {
  return (
    <script
      type="application/ld+json"
      id={id}
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(data).replace(/</g, "\\u003c"),
      }}
    />
  );
}

function buildOrganizationData() {
  const siteUrl = getSiteUrl();

  return {
    "@context": "https://schema.org",
    "@type": ["EducationalOrganization", "LocalBusiness"],
    "@id": `${siteUrl}#organization`,
    name: siteContact.school,
    url: siteUrl,
    logo: `${siteUrl}/assets/homepage/logo-seal.jpg`,
    image: `${siteUrl}/assets/homepage/logo-seal.jpg`,
    telephone: siteContact.phone,
    email: siteContact.email,
    address: {
      "@type": "PostalAddress",
      streetAddress: STREET_ADDRESS,
      addressLocality: ADDRESS_LOCALITY,
      addressRegion: ADDRESS_REGION,
      postalCode: POSTAL_CODE,
      addressCountry: COUNTRY,
    },
    geo: {
      "@type": "GeoCoordinates",
      latitude: GEO_LATITUDE,
      longitude: GEO_LONGITUDE,
    },
    openingHoursSpecification: [
      {
        "@type": "OpeningHoursSpecification",
        dayOfWeek: "Monday",
        opens: "09:00",
        closes: "17:00",
      },
      {
        "@type": "OpeningHoursSpecification",
        dayOfWeek: "Tuesday",
        opens: "09:00",
        closes: "18:00",
      },
      {
        "@type": "OpeningHoursSpecification",
        dayOfWeek: "Wednesday",
        opens: "08:00",
        closes: "17:00",
      },
      {
        "@type": "OpeningHoursSpecification",
        dayOfWeek: "Thursday",
        opens: "09:00",
        closes: "18:00",
      },
      {
        "@type": "OpeningHoursSpecification",
        dayOfWeek: "Friday",
        opens: "09:00",
        closes: "15:00",
      },
    ],
    hasMap: GOOGLE_MAPS_CID_URL,
    sameAs: socialLinks.map((link) => link.href),
    areaServed: { "@type": "AdministrativeArea", name: "Greater Sacramento" },
    aggregateRating: buildAggregateRating(googleReviewsAggregate),
    review: buildReviewNodes(homepageReviewHighlights),
  } satisfies JsonLdValue;
}

function buildWebsiteData() {
  const siteUrl = getSiteUrl();
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${siteUrl}#website`,
    url: siteUrl,
    name: siteContact.school,
    publisher: { "@id": `${siteUrl}#organization` },
    inLanguage: "en-US",
  } satisfies JsonLdValue;
}

export function GlobalStructuredData() {
  return (
    <>
      <StructuredDataScript id="rda-ld-organization" data={buildOrganizationData()} />
      <StructuredDataScript id="rda-ld-website" data={buildWebsiteData()} />
    </>
  );
}

function buildCourseLocation(): JsonLdValue {
  return {
    "@type": "Place",
    name: siteContact.school,
    address: {
      "@type": "PostalAddress",
      streetAddress: STREET_ADDRESS,
      addressLocality: ADDRESS_LOCALITY,
      addressRegion: ADDRESS_REGION,
      postalCode: POSTAL_CODE,
      addressCountry: COUNTRY,
    },
  };
}

function buildCourseInstances(
  scheduleId: CourseScheduleId,
  courseMode: "Blended" | "Onsite",
  courseWorkload?: string,
): JsonLdValue[] {
  return getCourseSchedule(scheduleId).map((entry) => ({
    "@type": "CourseInstance",
    courseMode,
    startDate: entry.isoDate,
    location: buildCourseLocation(),
    ...(courseWorkload ? { courseWorkload } : {}),
  }));
}

export function CourseStructuredData({ path }: { path: string }) {
  const courseInfo = COURSE_SCHEMA_BY_PATH[path];
  if (!courseInfo) {
    return null;
  }

  const siteUrl = getSiteUrl();
  const reviewGroup = courseReviewHighlights[courseInfo.reviewsId];
  const courseReviews = reviewGroup?.reviews ?? [];
  const data = {
    "@context": "https://schema.org",
    "@type": "Course",
    name: courseInfo.name,
    description: courseInfo.description,
    url: `${siteUrl}${path}`,
    provider: { "@id": `${siteUrl}#organization` },
    educationalLevel: "vocational",
    inLanguage: "en-US",
    offers: {
      "@type": "Offer",
      category: "Paid",
      price: courseInfo.price,
      priceCurrency: "USD",
    },
    hasCourseInstance: buildCourseInstances(
      courseInfo.scheduleId,
      courseInfo.courseMode,
      courseInfo.timeRequired,
    ),
    ...(courseInfo.courseCode ? { courseCode: courseInfo.courseCode } : {}),
    ...(courseInfo.timeRequired ? { timeRequired: courseInfo.timeRequired } : {}),
    // Rating + reviews mirror the review cards rendered on the course page.
    ...(courseReviews.length > 0
      ? {
          aggregateRating: buildAggregateRating(aggregateForReviews(courseReviews)),
          review: buildReviewNodes(courseReviews),
        }
      : {}),
  } satisfies JsonLdValue;

  return <StructuredDataScript id={`rda-ld-course-${path.slice(1)}`} data={data} />;
}

export function FaqStructuredData() {
  const data = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqItems.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer,
      },
    })),
  } satisfies JsonLdValue;

  return <StructuredDataScript id="rda-ld-faq" data={data} />;
}

export function BreadcrumbStructuredData({
  items,
}: {
  items: { name: string; path: string }[];
}) {
  if (items.length === 0) {
    return null;
  }

  const siteUrl = getSiteUrl();
  const data = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: `${siteUrl}${item.path === "/" ? "" : item.path}`,
    })),
  } satisfies JsonLdValue;

  return <StructuredDataScript id="rda-ld-breadcrumb" data={data} />;
}

export function ResourceArticleStructuredData({
  article,
  path,
}: {
  article: ResourceArticle;
  path: string;
}) {
  const siteUrl = getSiteUrl();
  const url = `${siteUrl}${path}`;

  const articleData = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: article.h1,
    description: article.description,
    url,
    mainEntityOfPage: url,
    image: `${siteUrl}${article.heroImage.src}`,
    datePublished: article.datePublished,
    dateModified: article.dateModified,
    inLanguage: "en-US",
    articleSection: article.category,
    author: { "@id": `${siteUrl}#organization` },
    publisher: { "@id": `${siteUrl}#organization` },
  } satisfies JsonLdValue;

  const faqData = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: article.faqs.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer,
      },
    })),
  } satisfies JsonLdValue;

  return (
    <>
      <StructuredDataScript id={`rda-ld-article-${article.slug}`} data={articleData} />
      {article.faqs.length > 0 ? (
        <StructuredDataScript id={`rda-ld-article-faq-${article.slug}`} data={faqData} />
      ) : null}
    </>
  );
}
