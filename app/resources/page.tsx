import type { Metadata } from "next";

import { LiveShell } from "@/components/site/live-shell";
import { BreadcrumbStructuredData } from "@/components/site/structured-data";
import { ResourceHubPage } from "@/components/site/resource-hub-page";
import { resourceHubRoute } from "@/lib/resource-articles";
import { buildPageMetadata } from "@/lib/site-metadata";

export const metadata: Metadata = buildPageMetadata({ route: resourceHubRoute });

export default function ResourcesRoutePage() {
  return (
    <LiveShell route={resourceHubRoute}>
      <BreadcrumbStructuredData items={[{ name: "Home", path: "/" }, { name: "Resources", path: "/resources" }]} />
      <ResourceHubPage />
    </LiveShell>
  );
}
