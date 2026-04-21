import { notFound } from "next/navigation";

import { SitePageRenderer } from "../../../components/site/site-page";
import { getPageBySlug } from "../../../lib/site-data";
import { buildSiteMetadata } from "../../../lib/site-metadata";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return buildSiteMetadata(`m/${slug}`);
}

export default async function DynamicPortalPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const joinedSlug = `m/${slug}`;
  const page = getPageBySlug(joinedSlug);

  if (!page || page.kind !== "auth") {
    notFound();
  }

  return <SitePageRenderer slug={joinedSlug} />;
}
