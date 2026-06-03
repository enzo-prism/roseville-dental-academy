import type { Metadata } from "next";

import { JourneyPage } from "@/components/site/journey-page";
import { LiveShell } from "@/components/site/live-shell";
import { journeyRoute } from "@/lib/journey-roadmap-data";
import { buildPageMetadata } from "@/lib/site-metadata";

export const metadata: Metadata = buildPageMetadata({
  route: journeyRoute,
});

export default function JourneyRoutePage() {
  return (
    <LiveShell route={journeyRoute}>
      <JourneyPage />
    </LiveShell>
  );
}
