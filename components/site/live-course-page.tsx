import type { ReactNode } from "react";
import { CalendarDays } from "lucide-react";

import { AspectRatio } from "@/components/ui/aspect-ratio";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { courseScheduleNote, getCourseSchedule } from "@/lib/course-schedule";
import type {
  LiveCourseContent,
  LiveCourseLink,
  LiveCourseMedia,
} from "@/lib/live-course-content";

type LiveCourseSection = {
  body: string;
  heading: string;
};

const COURSE_NONREFUNDABLE_NOTE =
  "All Roseville Dental Academy courses are nonrefundable.";

function addPricePolicyMarker(body: string) {
  if (!body) {
    return body;
  }

  return body.endsWith(".") ? `${body.slice(0, -1)}*.` : `${body}*`;
}

function splitCourseSections(course: LiveCourseContent): LiveCourseSection[] {
  const sections: LiveCourseSection[] = [];
  let cursor = 0;

  for (const [index, heading] of course.markers.entries()) {
    const headingStart = course.bodyText.indexOf(heading, cursor);

    if (headingStart < 0) {
      continue;
    }

    const bodyStart = headingStart + heading.length;
    const nextHeading = course.markers[index + 1];
    const nextHeadingStart = nextHeading
      ? course.bodyText.indexOf(nextHeading, bodyStart)
      : course.bodyText.length;
    const bodyEnd = nextHeadingStart >= 0 ? nextHeadingStart : course.bodyText.length;

    sections.push({
      body: course.bodyText.slice(bodyStart, bodyEnd).trim(),
      heading,
    });

    cursor = bodyStart;
  }

  return sections;
}

function splitBulletBody(body: string) {
  if (body.startsWith("- ")) {
    return {
      items: body
        .slice(2)
        .split(" - ")
        .map((item) => `- ${item}`),
      lead: "",
    };
  }

  const marker = ": - ";
  const markerIndex = body.indexOf(marker);

  if (markerIndex < 0) {
    return undefined;
  }

  return {
    items: body
      .slice(markerIndex + marker.length)
      .split(" - ")
      .map((item) => `- ${item}`),
    lead: body.slice(0, markerIndex + 1),
  };
}

function renderTextWithLinks(text: string, links: LiveCourseLink[] = []) {
  const pieces: ReactNode[] = [];
  let cursor = 0;
  let key = 0;

  const occurrences = links
    .map((link) => ({
      ...link,
      index: text.indexOf(link.text),
    }))
    .filter((link) => link.index >= 0)
    .sort((a, b) => a.index - b.index);

  for (const link of occurrences) {
    if (link.index < cursor) {
      continue;
    }

    if (link.index > cursor) {
      pieces.push(text.slice(cursor, link.index));
    }

    pieces.push(
      <a
        className="font-medium text-primary underline underline-offset-4 hover:text-primary/80"
        href={link.href}
        key={`link-${key}`}
      >
        {link.text}
      </a>,
    );
    cursor = link.index + link.text.length;
    key += 1;
  }

  if (cursor < text.length) {
    pieces.push(text.slice(cursor));
  }

  return pieces.length ? pieces : text;
}

function CourseBody({ body, links }: { body: string; links?: LiveCourseLink[] }) {
  if (!body) {
    return null;
  }

  const bulletBody = splitBulletBody(body);

  if (bulletBody) {
    return (
      <div className="space-y-4">
        {bulletBody.lead ? (
          <p className="text-base leading-7 text-foreground">
            {renderTextWithLinks(bulletBody.lead, links)}
          </p>
        ) : null}
        <ul className="grid gap-3 text-base leading-7 text-foreground">
          {bulletBody.items.map((item) => (
            <li
              className="rounded-lg border border-border bg-background px-4 py-3"
              key={item}
            >
              {renderTextWithLinks(item, links)}
            </li>
          ))}
        </ul>
      </div>
    );
  }

  if (links?.some((link) => link.text === body)) {
    const link = links.find((item) => item.text === body);

    if (link) {
      return (
        <Button asChild className="h-auto px-4 py-2" variant="outline">
          <a href={link.href}>{link.text}</a>
        </Button>
      );
    }
  }

  return (
    <p className="text-base leading-7 text-foreground">
      {renderTextWithLinks(body, links)}
    </p>
  );
}

function CourseHeroMedia({
  loading = "lazy",
  media,
}: {
  loading?: "eager" | "lazy";
  media: LiveCourseMedia;
}) {
  if (media.type === "video") {
    return (
      <video
        aria-label={media.alt}
        autoPlay
        className="size-full object-cover"
        loop
        muted
        playsInline
        poster={media.poster}
        preload="metadata"
        src={media.src}
      />
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element -- Keep literal live asset URLs for parity checks.
    <img
      alt={media.alt}
      className="size-full object-cover"
      loading={loading}
      src={media.src}
    />
  );
}

function CourseSectionCard({
  prominent = false,
  section,
  links,
}: {
  links?: LiveCourseLink[];
  prominent?: boolean;
  section: LiveCourseSection;
}) {
  const body =
    section.heading === "Price" ? addPricePolicyMarker(section.body) : section.body;

  return (
    <Card
      className={
        prominent
          ? "rounded-lg border-border bg-card shadow-sm"
          : "rounded-lg border-border bg-card"
      }
    >
      <CardHeader className="gap-3">
        <h2>
          <Badge
            className="h-auto max-w-full rounded-md border-border bg-background px-3 py-1 text-left font-heading text-base leading-snug text-foreground whitespace-normal"
            variant="outline"
          >
            {section.heading}
          </Badge>
        </h2>
      </CardHeader>
      {body ? (
        <>
          <Separator />
          <CardContent className="pt-1">
            <CourseBody body={body} links={links} />
          </CardContent>
        </>
      ) : null}
    </Card>
  );
}

function CourseSchedulePanel({ course }: { course: LiveCourseContent }) {
  const scheduleEntries = getCourseSchedule(course.id);

  if (!scheduleEntries.length) {
    return null;
  }

  return (
    <Card className="rounded-lg border-border bg-card shadow-sm">
      <CardHeader className="gap-3">
        <h2>
          <Badge
            className="h-auto max-w-full rounded-md border-border bg-background px-3 py-1 text-left font-heading text-base leading-snug text-foreground whitespace-normal"
            variant="outline"
          >
            Upcoming Class Dates
          </Badge>
        </h2>
      </CardHeader>
      <Separator />
      <CardContent className="grid gap-4 pt-1">
        <div className="flex flex-wrap gap-2">
          {scheduleEntries.map((entry) => (
            <Badge
              className="rda-course-date h-auto min-h-8 rounded-md border-border bg-background px-3 py-1.5 text-sm leading-snug text-foreground"
              data-status={entry.status === "full" ? "full" : undefined}
              key={entry.isoDate}
              variant="outline"
            >
              <CalendarDays aria-hidden="true" />
              <time dateTime={entry.isoDate}>{entry.date}</time>
              {entry.status === "full" ? (
                <span aria-label={`${entry.date} is full`} className="rda-course-date-flag ml-1">
                  Full
                </span>
              ) : null}
            </Badge>
          ))}
        </div>
        <p className="text-sm leading-6 text-muted-foreground">{courseScheduleNote}</p>
      </CardContent>
    </Card>
  );
}

export function LiveCoursePage({ course }: { course: LiveCourseContent }) {
  const [hero, ...sections] = splitCourseSections(course);
  const featureCount = course.variant === "program" ? 2 : 1;
  const featureSections = sections.slice(0, featureCount);
  const detailSections = sections.slice(featureCount);
  const supportingMedia = (course.supportingMedia ?? course.supportingImages ?? []).slice(0, 2);

  return (
    <section className="bg-background" data-rda-live-course={course.id}>
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 sm:px-6 sm:py-14 lg:grid-cols-[minmax(0,1fr)_minmax(360px,0.78fr)] lg:items-start lg:px-8 lg:py-16">
        <div className="overflow-hidden rounded-lg bg-card shadow-sm ring-1 ring-foreground/10 lg:order-2">
          <AspectRatio ratio={4 / 3}>
            {supportingMedia.length ? (
              <div className="grid size-full grid-cols-[minmax(0,1.42fr)_minmax(0,0.82fr)] gap-1 bg-muted">
                <CourseHeroMedia loading="eager" media={course.image} />
                <div className="grid min-h-0 gap-1">
                  {supportingMedia.map((media) => (
                    <div className="min-h-0" key={media.src}>
                      <CourseHeroMedia media={media} />
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <CourseHeroMedia loading="eager" media={course.image} />
            )}
          </AspectRatio>
        </div>

        <div className="space-y-6 lg:order-1">
          {hero ? (
            <div className="space-y-5">
              <h1 className="font-heading text-4xl leading-tight font-semibold text-foreground sm:text-5xl">
                {hero.heading}
              </h1>
              {hero.body ? (
                <Card className="rounded-lg border-border bg-card">
                  <CardContent className="pt-4">
                    <CourseBody body={hero.body} links={course.links} />
                  </CardContent>
                </Card>
              ) : null}
            </div>
          ) : null}
          <CourseSchedulePanel course={course} />
          <div className="grid gap-4">
            {featureSections.map((section) => (
              <CourseSectionCard
                key={section.heading}
                links={course.links}
                prominent
                section={section}
              />
            ))}
          </div>
        </div>

      </div>

      {detailSections.length ? (
        <div className="mx-auto max-w-6xl px-4 pb-12 sm:px-6 sm:pb-16 lg:px-8">
          <div className="grid gap-4 md:grid-cols-2">
            {detailSections.map((section, index) => (
              <CourseSectionCard
                key={section.heading}
                links={course.links}
                prominent={index === detailSections.length - 1}
                section={section}
              />
            ))}
          </div>
          <p className="rda-course-policy-note mt-5 border-t border-border pt-4 text-sm leading-6 text-muted-foreground">
            * {COURSE_NONREFUNDABLE_NOTE}
          </p>
        </div>
      ) : null}
    </section>
  );
}
