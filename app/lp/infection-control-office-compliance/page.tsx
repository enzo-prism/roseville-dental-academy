import { AdLandingLayout } from "@/components/site/ad-landing-layout";
import { getAdLandingPage } from "@/lib/ad-landing-pages";
import { ATTRIBUTION_UTM_FIELDS } from "@/lib/attribution-contract";
import { buildPageMetadata } from "@/lib/site-metadata";
import {
  studentConfig, studentEnrollPageOfferings, studentOfferingIsSelectable, studentPublicEnrollCtas,
} from "@/lib/student-enrollment";
import { studentSessionLabel } from "@/lib/student-enrollment-offerings";

export const dynamic = "force-dynamic";
const page = getAdLandingPage("infection-control-office-compliance")!;
export const metadata = buildPageMetadata({
  description: page.metaDescription,
  image: page.hero.imageSrc,
  imageAlt: page.hero.imageAlt,
  noindex: true,
  path: page.path,
  title: page.metaTitle,
});

type CampaignQuery = Record<string, string | string[] | undefined>;

async function officeEnrollmentOffer(query: CampaignQuery) {
  const course = "infection-control";
  const config = studentConfig();
  const [cta] = studentPublicEnrollCtas(course);
  if (!config || !cta) return { status: "unavailable" } as const;
  const rows = (await studentEnrollPageOfferings(config)).filter((row) => row.course_id === course && row.dashboard_state !== "removed");
  const open = rows.find(studentOfferingIsSelectable);
  if (!open) {
    if (rows.length && rows.every((row) => row.dashboard_state === "closed" || (row.dashboard_state !== "unknown" && row.remaining <= 0))) {
      return { status: "full" } as const;
    }
    return { status: "unavailable" } as const;
  }
  const url = new URL(cta.href, "https://www.rosevilledentalacademy.com");
  for (const key of ATTRIBUTION_UTM_FIELDS) {
    const value = query[key];
    if (typeof value === "string" && value.length <= 256) url.searchParams.set(key, value);
  }
  return {
    status: "open" as const,
    date: studentSessionLabel(open.course_date) ?? open.course_date,
    price: new Intl.NumberFormat("en-US", { style: "currency", currency: open.currency, minimumFractionDigits: 0 }).format(open.amount / 100),
    seats: open.remaining,
    href: url.pathname + url.search,
  };
}

export default async function OfficeLandingPage({ searchParams }: { searchParams: Promise<CampaignQuery> }) {
  const offer = await officeEnrollmentOffer(await searchParams);
  return <AdLandingLayout page={page} officeOffer={offer} />;
}
