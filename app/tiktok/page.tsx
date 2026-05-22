import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { SocialChannelPage } from "@/components/site/social-channel-page";
import { getSocialChannelPage } from "@/lib/social-channel-data";
import { buildPageMetadata } from "@/lib/site-metadata";

const page = getSocialChannelPage("tiktok");

export const metadata: Metadata = buildPageMetadata({
  path: page?.path ?? "/tiktok",
  title: page?.metaTitle,
  description: page?.description,
});

export default function TiktokPage() {
  if (!page) {
    notFound();
  }

  return <SocialChannelPage page={page} />;
}
