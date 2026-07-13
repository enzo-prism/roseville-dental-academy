import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { LiveShell } from "@/components/site/live-shell";
import {
  BreadcrumbStructuredData,
  ResourceArticleStructuredData,
} from "@/components/site/structured-data";
import { ResourceArticlePage } from "@/components/site/resource-article-page";
import {
  getResourceArticle,
  getResourceArticleSlugs,
  resourceArticlePath,
  resourceRouteForArticle,
} from "@/lib/resource-articles";
import { buildPageMetadata } from "@/lib/site-metadata";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export function generateStaticParams() {
  return getResourceArticleSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const article = getResourceArticle(slug);

  if (!article) {
    return buildPageMetadata({
      title: "404 Not Found | Roseville Dental Academy",
      description: "The page you are looking for was not found.",
      noindex: true,
    });
  }

  return buildPageMetadata({ route: resourceRouteForArticle(article), type: "article" });
}

export default async function ResourceArticleRoutePage({ params }: PageProps) {
  const { slug } = await params;
  const article = getResourceArticle(slug);

  if (!article) {
    notFound();
  }

  const path = resourceArticlePath(article.slug);
  const route = resourceRouteForArticle(article);

  return (
    <LiveShell route={route}>
      <ResourceArticleStructuredData article={article} path={path} />
      <BreadcrumbStructuredData
        items={[
          { name: "Home", path: "/" },
          { name: "Resources", path: "/resources" },
          { name: article.h1, path },
        ]}
      />
      <ResourceArticlePage article={article} />
    </LiveShell>
  );
}
