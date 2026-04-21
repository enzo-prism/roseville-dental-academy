import { notFound } from "next/navigation";

import { SitePageRenderer } from "../../components/site/site-page";
import { getPageBySlug } from "../../lib/site-data";
import { buildSiteMetadata } from "../../lib/site-metadata";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return buildSiteMetadata(slug);
}

export default async function DynamicTopLevelPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const page = getPageBySlug(slug);

  if (!page || page.slug.startsWith("m/")) {
    notFound();
  }

  return <SitePageRenderer slug={slug} />;
}
