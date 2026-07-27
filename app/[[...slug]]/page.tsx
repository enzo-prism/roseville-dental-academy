import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { preload } from "react-dom";

import {
  BreadcrumbStructuredData,
  CourseListStructuredData,
  CourseStructuredData,
  FaqStructuredData,
} from "@/components/site/structured-data";
import { HomepageSignupPortal } from "@/components/site/homepage-signup-portal";
import { LiveCoursePage } from "@/components/site/live-course-page";
import { LiveShell } from "@/components/site/live-shell";
import { LiveStableWidgets } from "@/components/site/live-stable-widgets";
import { getLiveCourseContent } from "@/lib/live-course-content";
import {
  HOMEPAGE_HERO_LCP_IMAGE,
  fetchLiveMirrorDocument,
  getLiveRouteForSlug,
  getStaticRouteParams,
} from "@/lib/live-route-data";
import { buildPageMetadata } from "@/lib/site-metadata";

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

  if (!route || route.kind === "plain404") {
    return buildPageMetadata({
      title: "404 Not Found | Roseville Dental Academy",
      description: "The page you are looking for was not found.",
      noindex: true,
      omitCanonical: true,
    });
  }

  return buildPageMetadata({ route });
}

function getBreadcrumbName(route: { route: string; title: string }) {
  if (route.route === "/") {
    return "Home";
  }

  return route.title.split(" | ")[0]?.trim() || route.title;
}

export default async function LiveRoutePage({ params }: PageProps) {
  const { slug } = await params;
  const route = getLiveRouteForSlug(slug);

  if (!route || route.kind === "plain404") {
    notFound();
  }

  if (route.route === "/") {
    preload(HOMEPAGE_HERO_LCP_IMAGE, { as: "image", fetchPriority: "high" });
  }

  const canonicalPath =
    route.route === "/" ? "/" : route.aliases?.[0] ?? route.route;
  const breadcrumbItems =
    route.route === "/"
      ? []
      : [
          { name: "Home", path: "/" },
          { name: getBreadcrumbName(route), path: canonicalPath },
        ];

  const course = getLiveCourseContent(route.id);

  if (course) {
    return (
      <LiveShell route={route}>
        <CourseStructuredData path={canonicalPath} />
        <BreadcrumbStructuredData items={breadcrumbItems} />
        <main className="rda-live-main" data-rda-route={route.id} id="rda-main-content">
          <LiveCoursePage course={course} />
          <LiveStableWidgets route={route} />
        </main>
      </LiveShell>
    );
  }

  const document = await fetchLiveMirrorDocument(route.route);

  return (
    <LiveShell route={route}>
      <CourseStructuredData path={canonicalPath} />
      {route.route === "/" ? <CourseListStructuredData /> : null}
      {route.route === "/faqs-1" ? <FaqStructuredData /> : null}
      <BreadcrumbStructuredData items={breadcrumbItems} />
      {document.headStylesHtml ? (
        <div dangerouslySetInnerHTML={{ __html: document.headStylesHtml }} />
      ) : null}
      <main className="rda-live-main" data-rda-route={route.id} id="rda-main-content">
        <div
          className="rda-snapshot-content"
          dangerouslySetInnerHTML={{ __html: document.bodyHtml }}
        />
        {route.route === "/" ? <HomepageSignupPortal sourceLabel={route.title} /> : null}
        <LiveStableWidgets route={route} />
      </main>
    </LiveShell>
  );
}
