import type { Metadata } from "next";

import { LiveShell } from "@/components/site/live-shell";
import { RdaCoursePathPage, rdaCoursesBreadcrumbs } from "@/components/site/rda-course-path-page";
import {
  BreadcrumbStructuredData,
  FaqListStructuredData,
} from "@/components/site/structured-data";
import { rdaCoursesFaqs, rdaCoursesRoute } from "@/lib/seo-landing-pages";
import { buildPageMetadata } from "@/lib/site-metadata";

export const metadata: Metadata = buildPageMetadata({ route: rdaCoursesRoute });

export default function RdaCertificationCoursesRoutePage() {
  return (
    <LiveShell route={rdaCoursesRoute}>
      <BreadcrumbStructuredData items={rdaCoursesBreadcrumbs} />
      <FaqListStructuredData faqs={rdaCoursesFaqs} id="rda-ld-faq-rda-certification-courses" />
      <RdaCoursePathPage />
    </LiveShell>
  );
}
