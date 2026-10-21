import type { Metadata } from "next";

import { ReviewsPage } from "@/components/academy/pages/reviews-page";
import { LiveShell } from "@/components/site/live-shell";
import { BreadcrumbStructuredData } from "@/components/site/structured-data";
import { reviewsRoute } from "@/lib/reviews-route";
import { buildPageMetadata } from "@/lib/site-metadata";

export const metadata: Metadata = buildPageMetadata({ route: reviewsRoute });

export default function ReviewsRoutePage() {
  return (
    <LiveShell route={reviewsRoute}>
      <BreadcrumbStructuredData items={[{ name: "Home", path: "/" }, { name: "Student Reviews", path: reviewsRoute.route }]} />
      <main className="rda-live-main" data-rda-route={reviewsRoute.id} id="rda-main-content">
        <ReviewsPage sourceLabel={reviewsRoute.title} />
      </main>
    </LiveShell>
  );
}
