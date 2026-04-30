import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { LiveShell } from "@/components/site/live-shell";
import { LiveStableWidgets } from "@/components/site/live-stable-widgets";
import {
  fetchLiveMirrorDocument,
  getLiveRouteForSlug,
  getStaticRouteParams,
} from "@/lib/live-route-data";

type PageProps = {
  params: Promise<{
    slug?: string[];
  }>;
};

export function generateStaticParams() {
  return getStaticRouteParams();
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const route = getLiveRouteForSlug(slug);

  if (!route) {
    return {
      robots: { follow: false, index: false },
      title: "404 Not Found",
    };
  }

  return {
    description: route.description,
    robots: {
      follow: !route.noindex,
      index: !route.noindex,
    },
    title: route.title,
  };
}

export default async function LiveRoutePage({ params }: PageProps) {
  const { slug } = await params;
  const route = getLiveRouteForSlug(slug);

  if (!route || route.kind === "plain404") {
    notFound();
  }

  const document = await fetchLiveMirrorDocument(route.route);

  return (
    <LiveShell route={route}>
      {document.headStylesHtml ? (
        <div dangerouslySetInnerHTML={{ __html: document.headStylesHtml }} />
      ) : null}
      <main className="rda-live-main" data-rda-route={route.id}>
        <div
          className="rda-snapshot-content"
          dangerouslySetInnerHTML={{ __html: document.bodyHtml }}
        />
        <LiveStableWidgets route={route} />
      </main>
    </LiveShell>
  );
}
