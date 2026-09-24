import Link from "next/link";
import { ClipboardCheck, Phone, ShieldCheck } from "lucide-react";

import { InfectionControlRequirementNotice } from "@/components/site/infection-control-requirement-notice";
import { LiveSignupSection } from "@/components/site/live-signup-section";
import {
  RdaCourseCards,
  SeoBody,
  SeoCallout,
  SeoFactGrid,
  SeoFaqList,
  SeoHero,
  SeoLinkList,
  SeoPageMain,
  SeoSection,
} from "@/components/site/seo-landing-parts";
import { Button } from "@/components/ui/button";
import { getAvailableCourseDateList } from "@/lib/course-schedule";
import { PHONE_HREF } from "@/lib/da-program-facts";
import {
  DENTAL_BOARD_COURSE_LISTS_URL,
  getNextOpenDateLabel,
  getRdaPathCourse,
  rdaPathCourses,
} from "@/lib/rda-course-path";
import { DENTAL_OFFICES_PATH, dentalOfficesFaqs, dentalOfficesRoute } from "@/lib/seo-landing-pages";
import { siteContact } from "@/lib/site-data";

export const dentalOfficesBreadcrumbs = [
  { name: "Home", path: "/" },
  { name: "For Dental Offices", path: DENTAL_OFFICES_PATH },
];

export function DentalOfficesPage() {
  const infectionControl = getRdaPathCourse("infection-control");
  const upskillCourses = rdaPathCourses.filter((course) => course.id !== "infection-control");

  return (
    <SeoPageMain routeId="for-dental-offices">
      <SeoHero
        breadcrumbs={dentalOfficesBreadcrumbs}
        eyebrow="For dentists and office managers"
        intro={
          <p>
            Get new hires through California&apos;s required 8-hour Infection Control course before
            they start exposure-prone duties, and grow your team&apos;s skills with Board-approved
            x-ray, coronal polish, and sealant courses in Roseville.
          </p>
        }
        title="Infection Control and Certification Courses for Dental Offices"
      >
        <Button asChild variant="secondary">
          <a data-rda-lead-source="phone" href={PHONE_HREF}>
            <Phone aria-hidden="true" className="size-4" />
            Call {siteContact.phone} to register
          </a>
        </Button>
        <Button
          asChild
          className="border-primary-foreground/40 bg-transparent text-primary-foreground hover:bg-primary-foreground/10"
          variant="outline"
        >
          <a href="#quick-sign-up">
            <ClipboardCheck aria-hidden="true" className="size-4" />
            Request course info
          </a>
        </Button>
      </SeoHero>

      <SeoBody>
        <InfectionControlRequirementNotice />

        <SeoSection
          heading="8-Hour Infection Control for new hires"
          id="offices-infection-control"
          intro={
            <p>
              Roseville Dental Academy&apos;s Infection Control course is Dental Board of California
              approved (provider {infectionControl.providerNumber}). Check each new assistant&apos;s
              employee file for a completion certificate before they begin duties with potential
              exposure to blood, saliva, or other potentially infectious materials.
            </p>
          }
        >
          <SeoFactGrid
            facts={[
              {
                label: "Price",
                value: infectionControl.priceLabel,
                detail: `${infectionControl.hours} hours, provider ${infectionControl.providerNumber}.`,
              },
              {
                label: "Next open date",
                value: getNextOpenDateLabel("infection-control"),
                detail: `Upcoming Infection Control dates: ${getAvailableCourseDateList("infection-control")}.`,
              },
              {
                label: "Prerequisites",
                value: "BLS + Dental Practice Act",
                detail: infectionControl.prerequisites,
              },
            ]}
            label="8-hour Infection Control course facts"
          />
        </SeoSection>

        <SeoSection
          heading="Register one new hire or your whole team"
          id="offices-register"
        >
          <SeoCallout className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="flex items-start gap-3 text-base leading-7 text-foreground">
              <ShieldCheck aria-hidden="true" className="mt-1 size-5 shrink-0 text-primary" />
              <span>
                Call admissions at {siteContact.phone}. The team can help register one new hire or
                your whole team and confirm the next open date for each course.
              </span>
            </p>
            <Button asChild className="shrink-0">
              <a data-rda-lead-source="phone" href={PHONE_HREF}>
                <Phone aria-hidden="true" className="size-4" />
                Call {siteContact.phone}
              </a>
            </Button>
          </SeoCallout>
        </SeoSection>

        <SeoSection
          heading="Upskill your team on the RDA path"
          id="offices-upskill"
          intro={
            <p>
              Stand-alone courses for assistants who need BLS renewal, x-ray certification, or the
              coronal polish and sealant courses on the way to RDA duties. Each card shows the
              current price and next open date.{" "}
              <Link
                className="text-primary underline-offset-4 hover:underline"
                href="/rda-certification-courses"
              >
                See the recommended course order
              </Link>
              .
            </p>
          }
        >
          <RdaCourseCards courses={upskillCourses} showOfficeUse />
        </SeoSection>

        <SeoSection
          heading="Verify our Dental Board approvals"
          id="offices-verify"
          intro={
            <p>
              The Dental Board of California publishes approved-course lists. Current public lists
              show Roseville Dental Academy for Radiation Safety X1036, Infection Control IC189,
              Coronal Polishing CP148, and Pit and Fissure Sealants PF186.
            </p>
          }
        >
          <SeoLinkList
            links={[
              {
                href: DENTAL_BOARD_COURSE_LISTS_URL,
                label: "Dental Board approved-course lists",
                description: "dbc.ca.gov — RDA course provider lists.",
                external: true,
              },
              ...rdaPathCourses
                .filter((course) => course.boardListUrl)
                .map((course) => ({
                  href: course.boardListUrl as string,
                  label: `${course.name} list (${course.providerNumber})`,
                  description: "Dental Board of California PDF.",
                  external: true,
                })),
            ]}
          />
        </SeoSection>

        <SeoFaqList faqs={dentalOfficesFaqs} heading="Questions from dental offices" id="offices-faq" />
      </SeoBody>

      <LiveSignupSection compact pagePath={DENTAL_OFFICES_PATH} sourceLabel={dentalOfficesRoute.title} />
    </SeoPageMain>
  );
}
