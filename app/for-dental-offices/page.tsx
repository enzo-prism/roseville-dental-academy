import type { Metadata } from "next";

import { DentalOfficesPage, dentalOfficesBreadcrumbs } from "@/components/site/dental-offices-page";
import { LiveShell } from "@/components/site/live-shell";
import {
  BreadcrumbStructuredData,
  FaqListStructuredData,
} from "@/components/site/structured-data";
import { dentalOfficesFaqs, dentalOfficesRoute } from "@/lib/seo-landing-pages";
import { buildPageMetadata } from "@/lib/site-metadata";

export const metadata: Metadata = buildPageMetadata({ route: dentalOfficesRoute });

export default function DentalOfficesRoutePage() {
  return (
    <LiveShell route={dentalOfficesRoute}>
      <BreadcrumbStructuredData items={dentalOfficesBreadcrumbs} />
      <FaqListStructuredData faqs={dentalOfficesFaqs} id="rda-ld-faq-for-dental-offices" />
      <DentalOfficesPage />
    </LiveShell>
  );
}
