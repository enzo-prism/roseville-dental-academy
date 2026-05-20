import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { SocialChannelPage } from "@/components/site/social-channel-page";
import { getSocialChannelPage } from "@/lib/social-channel-data";

const page = getSocialChannelPage("instagram");

export const metadata: Metadata = {
  description: page?.description,
  title: page?.metaTitle,
};

export default function InstagramPage() {
  if (!page) {
    notFound();
  }

  return <SocialChannelPage page={page} />;
}
