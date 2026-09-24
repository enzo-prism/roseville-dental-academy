import type { Metadata } from "next";

import { LiveShell } from "@/components/site/live-shell";
import { LocalHubPage, localHubBreadcrumbs } from "@/components/site/local-hub-page";
import {
  BreadcrumbStructuredData,
  FaqListStructuredData,
} from "@/components/site/structured-data";
import { localHubFaqs, localHubRoute } from "@/lib/local-seo-pages";
import { buildPageMetadata } from "@/lib/site-metadata";

export const metadata: Metadata = buildPageMetadata({ route: localHubRoute });

export default function DentalAssistingSchoolHubRoutePage() {
  return (
    <LiveShell route={localHubRoute}>
      <BreadcrumbStructuredData items={localHubBreadcrumbs} />
      <FaqListStructuredData faqs={localHubFaqs} id="rda-ld-faq-dental-assisting-school" />
      <LocalHubPage />
    </LiveShell>
  );
}
