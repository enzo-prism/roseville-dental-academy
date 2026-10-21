import type { Metadata } from "next";
import { notFound } from "next/navigation";

import {
  BreadcrumbStructuredData,
  CourseListStructuredData,
  CourseStructuredData,
  FaqStructuredData,
} from "@/components/site/structured-data";
import { HomePage } from "@/components/academy/home/home-page";
import { ContactPage } from "@/components/academy/pages/contact-page";
import { FaqsPage } from "@/components/academy/pages/faqs-page";
import { InstructorsPage } from "@/components/academy/pages/instructors-page";
import { PhotosPage } from "@/components/academy/pages/photos-page";
import { LiveCoursePage } from "@/components/site/live-course-page";
import { LiveShell } from "@/components/site/live-shell";
import { LiveStableWidgets } from "@/components/site/live-stable-widgets";
import { getLiveCourseContent } from "@/lib/live-course-content";
import {
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

  const canonicalPath =
    route.route === "/" ? "/" : route.aliases?.[0] ?? route.route;
  const breadcrumbItems =
    route.route === "/"
      ? []
      : [
          { name: "Home", path: "/" },
          { name: getBreadcrumbName(route), path: canonicalPath },
        ];

  if (route.route === "/") {
    return (
      <LiveShell route={route}>
        <CourseStructuredData path={canonicalPath} />
        <CourseListStructuredData />
        <main className="rda-live-main" data-rda-route={route.id} id="rda-main-content">
          <HomePage sourceLabel={route.title} />
        </main>
      </LiveShell>
    );
  }

  const reactPage =
    route.route === "/contact" ? <ContactPage sourceLabel={route.title} /> :
    route.route === "/faqs-1" ? <FaqsPage sourceLabel={route.title} /> :
    route.route === "/meet-the-instructors" ? <InstructorsPage sourceLabel={route.title} /> :
    route.route === "/photos" ? <PhotosPage sourceLabel={route.title} /> :
    null;

  if (reactPage) {
    return (
      <LiveShell route={route}>
        <CourseStructuredData path={canonicalPath} />
        {route.route === "/faqs-1" ? <FaqStructuredData /> : null}
        <BreadcrumbStructuredData items={breadcrumbItems} />
        <main className="rda-live-main" data-rda-route={route.id} id="rda-main-content">
          {reactPage}
        </main>
      </LiveShell>
    );
  }

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
        <LiveStableWidgets route={route} />
      </main>
    </LiveShell>
  );
}
