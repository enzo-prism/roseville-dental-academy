import Link from "next/link";
import { ArrowRight, Phone } from "lucide-react";

import { CertificateExpirationNotice } from "@/components/site/certificate-expiration-notice";
import { LiveSignupSection } from "@/components/site/live-signup-section";
import {
  RdaCourseCards,
  SeoBody,
  SeoCallout,
  SeoFaqList,
  SeoHero,
  SeoLinkList,
  SeoPageMain,
  SeoSection,
} from "@/components/site/seo-landing-parts";
import { Button } from "@/components/ui/button";
import { courseScheduleNote } from "@/lib/course-schedule";
import { PHONE_HREF } from "@/lib/da-program-facts";
import {
  DENTAL_BOARD_COURSE_LISTS_URL,
  rdaPathCourses,
  rdaPathCoursesTotalLabel,
  rdaPathTotalHours,
} from "@/lib/rda-course-path";
import { RDA_COURSES_PATH, rdaCoursesFaqs, rdaCoursesRoute } from "@/lib/seo-landing-pages";
import { siteContact } from "@/lib/site-data";

export const rdaCoursesBreadcrumbs = [
  { name: "Home", path: "/" },
  { name: "RDA Certification Courses", path: RDA_COURSES_PATH },
];

export function RdaCoursePathPage() {
  return (
    <SeoPageMain routeId="rda-certification-courses">
      <SeoHero
        breadcrumbs={rdaCoursesBreadcrumbs}
        eyebrow="The RDA course path, in one place"
        intro={
          <p>
            Roseville Dental Academy offers BLS/CPR plus the four Dental Board of California approved
            courses on the Registered Dental Assistant path — Infection Control, Radiation Safety,
            Coronal Polish, and Pit &amp; Fissure Sealants. Here is the order to take them, what each
            requires first, what each costs, and the next open dates.
          </p>
        }
        title="RDA Certification Courses in Roseville"
      >
        <Button asChild variant="secondary">
          <a data-rda-lead-source="phone" href={PHONE_HREF}>
            <Phone aria-hidden="true" className="size-4" />
            Call {siteContact.phone}
          </a>
        </Button>
        <Button
          asChild
          className="border-primary-foreground/40 bg-transparent text-primary-foreground hover:bg-primary-foreground/10"
          variant="outline"
        >
          <Link href="/journey">
            Full RDA roadmap
            <ArrowRight aria-hidden="true" className="size-4" />
          </Link>
        </Button>
      </SeoHero>

      <SeoBody>
        <SeoSection
          heading="Recommended order and prerequisites"
          id="rda-order"
          intro={
            <>
              <p>
                Each course&apos;s prerequisites come earlier in this list, so taking them in order
                keeps you eligible for the next one. Dental Practice Act certification is also a
                prerequisite for Infection Control, Radiation Safety, and Coronal Polish; it is not one
                of the five courses on this page.
              </p>
              <p className="text-sm">{courseScheduleNote}</p>
            </>
          }
        >
          <RdaCourseCards courses={rdaPathCourses} numbered showPrerequisites />
        </SeoSection>

        <SeoSection heading="What the five courses cost" id="rda-total">
          <SeoCallout>
            <div className="space-y-4">
              <ul className="divide-y divide-border rounded-lg border border-border bg-card">
                {rdaPathCourses.map((course) => (
                  <li
                    className="flex items-center justify-between gap-4 px-4 py-3 text-base text-foreground"
                    key={course.id}
                  >
                    <span className="min-w-0">
                      {course.name}
                      {course.providerNumber ? (
                        <span className="text-muted-foreground"> ({course.providerNumber})</span>
                      ) : null}
                    </span>
                    <span className="shrink-0 font-semibold">{course.priceLabel}</span>
                  </li>
                ))}
              </ul>
              <p
                className="flex flex-wrap items-baseline justify-between gap-2 font-heading text-xl font-semibold text-foreground sm:text-2xl"
                data-rda-rda-total="true"
              >
                <span>Total if you take all five:</span>
                <span>{rdaPathCoursesTotalLabel}</span>
              </p>
              <p className="text-sm leading-6 text-muted-foreground">
                Sum of the individual course prices ({rdaPathTotalHours} course hours in all). All Roseville Dental Academy courses are
                nonrefundable.
              </p>
            </div>
          </SeoCallout>
        </SeoSection>

        <CertificateExpirationNotice />

        <SeoSection
          heading="The rest of the RDA license"
          id="rda-journey"
          intro={
            <p>
              Course certificates are one part of becoming an RDA. The DA to RDA Career Journey walks
              through the full roadmap — training, work experience, required course certificates, the
              application, and the exam.
            </p>
          }
        >
          <SeoLinkList
            links={[
              {
                href: "/journey",
                label: "DA to RDA Career Journey",
                description: "Guided California DA to RDA roadmap.",
              },
              {
                href: "/resources/rda-vs-dental-assistant-california",
                label: "RDA vs. Dental Assistant in California",
                description: "What changes when you become a Registered Dental Assistant.",
              },
              {
                href: "/dental-assisting-program",
                label: "New to dental assisting?",
                description: "Start with the 9-week, 210-hour Dental Assisting Program.",
              },
              {
                href: DENTAL_BOARD_COURSE_LISTS_URL,
                label: "Verify provider numbers",
                description: "Dental Board of California approved-course lists.",
                external: true,
              },
            ]}
          />
        </SeoSection>

        <SeoFaqList faqs={rdaCoursesFaqs} heading="RDA course questions" id="rda-faq" />
      </SeoBody>

      <LiveSignupSection compact pagePath={RDA_COURSES_PATH} sourceLabel={rdaCoursesRoute.title} />
    </SeoPageMain>
  );
}
