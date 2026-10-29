import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { InstagramPage } from "@/components/academy/pages/instagram-page";
import { LiveShell } from "@/components/site/live-shell";
import { buildPageMetadata } from "@/lib/site-metadata";
import { getSocialChannelPage, getSocialChannelRoute } from "@/lib/social-channel-data";

const page = getSocialChannelPage("instagram");

export const metadata: Metadata = buildPageMetadata({
  path: page?.path ?? "/instagram",
  title: page?.metaTitle,
  description: page?.description,
});

export default function InstagramRoutePage() {
  if (!page) {
    notFound();
  }

  return (
    <LiveShell route={getSocialChannelRoute(page)}>
      <main className="rda-live-main" data-rda-route={page.slug} id="rda-main-content">
        <InstagramPage page={page} />
      </main>
    </LiveShell>
  );
}
