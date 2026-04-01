import { notFound } from "next/navigation";

import { SitePageRenderer } from "../../components/site/site-page";
import { buildSiteMetadata } from "../../lib/site-metadata";
import { getPageBySlug } from "../../lib/site-data";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string[] }>;
}) {
  const { slug } = await params;
  return buildSiteMetadata(slug.join("/"));
}

export default async function DynamicPage({
  params,
}: {
  params: Promise<{ slug: string[] }>;
}) {
  const { slug } = await params;
  const joinedSlug = slug.join("/");

  if (!getPageBySlug(joinedSlug)) {
    notFound();
  }

  return <SitePageRenderer slug={joinedSlug} />;
}
