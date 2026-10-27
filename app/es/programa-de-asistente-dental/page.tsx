import type { Metadata } from "next";

import { LiveShell } from "@/components/site/live-shell";
import { SpanishProgramPage, spanishBreadcrumbs } from "@/components/site/spanish-program-page";
import {
  BreadcrumbStructuredData,
  FaqListStructuredData,
} from "@/components/site/structured-data";
import { spanishDaFaqs, spanishDaRoute } from "@/lib/seo-landing-pages";
import { buildPageMetadata } from "@/lib/site-metadata";

// hreflang (es-US ↔ en-US) comes from HREFLANG_ALTERNATES in lib/site-metadata.ts.
export const metadata: Metadata = buildPageMetadata({ route: spanishDaRoute, locale: "es_US" });

export default function SpanishDentalAssistingRoutePage() {
  return (
    <LiveShell route={spanishDaRoute}>
      <BreadcrumbStructuredData items={spanishBreadcrumbs} />
      <FaqListStructuredData faqs={spanishDaFaqs} id="rda-ld-faq-es-programa-de-asistente-dental" />
      <SpanishProgramPage />
    </LiveShell>
  );
}
