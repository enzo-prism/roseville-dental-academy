import type { ReactNode } from "react";
import { CalendarDays, Phone } from "lucide-react";

import { CertificateExpirationNotice } from "@/components/site/certificate-expiration-notice";
import { CourseFactStrip } from "@/components/site/course-fact-strip";
import { InfectionControlRequirementNotice } from "@/components/site/infection-control-requirement-notice";
import { MobileCourseActionBar } from "@/components/site/mobile-course-action-bar";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { showsCertificateExpiration } from "@/lib/certificate-expiration";
import { getCertificationCourseFacts } from "@/lib/course-facts";
import { courseScheduleNote, formatCourseDateLabel, getUpcomingCourseSchedule } from "@/lib/course-schedule";
import type {
  LiveCourseContent,
  LiveCourseLink,
  LiveCourseMedia,
} from "@/lib/live-course-content";
import {
  courseReviewHighlights,
  googleReviewsUrl,
  siteContact,
  type CourseReviewGroup,
} from "@/lib/site-data";

type LiveCourseSection = {
  body: string;
  heading: string;
};

export const COURSE_NONREFUNDABLE_NOTE =
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
  // Short fact sections (price, duration, format) read better as compact stat
  // cards than full badge-headed panels. Text, links, and order are unchanged.
  const isQuickFact =
    body.length > 0 &&
    body.length <= 80 &&
    !body.startsWith("- ") &&
    !body.includes(": - ") &&
    !(links ?? []).some((link) => body.includes(link.text));

  if (isQuickFact) {
    return (
      <Card
        className={
          prominent
            ? "rounded-lg border-border bg-card shadow-sm"
            : "rounded-lg border-border bg-card"
        }
        data-rda-quick-fact="true"
      >
        <CardContent className="space-y-1.5 px-5 py-4">
          <h2 className="rda-quick-fact-label">{section.heading}</h2>
          <div className="rda-quick-fact-body">
            <CourseBody body={body} links={links} />
          </div>
        </CardContent>
      </Card>
    );
  }

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

export function CourseSchedulePanel({ course }: { course: LiveCourseContent }) {
  const scheduleEntries = getUpcomingCourseSchedule(course.id);

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
              <time dateTime={entry.isoDate}>{formatCourseDateLabel(course.id, entry.date)}</time>
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

function CourseReviewRating({ rating }: { rating: number }) {
  return (
    <span className="rda-course-review-rating-badge">
      <span className="rda-review-rating-text">{rating} out of 5 stars</span>
    </span>
  );
}

export function CourseReviews({
  course,
  group,
}: {
  course: LiveCourseContent;
  group: CourseReviewGroup;
}) {
  return (
    <section
      aria-labelledby={`rda-course-reviews-title-${course.id}`}
      className="rda-course-review-section"
      data-rda-course-reviews={course.id}
    >
      <div className="rda-course-review-inner mx-auto px-4 py-10 sm:px-6 sm:py-12 lg:px-8">
        <div className="rda-section-heading">
          <h2 id={`rda-course-reviews-title-${course.id}`}>{group.title}</h2>
          <span aria-hidden="true" />
        </div>
        <p className="rda-review-photo-intro">{group.intro}</p>
        <div className="rda-course-review-grid">
          {group.reviews.map((review) => (
            <Card
              className="rda-google-review-card rda-course-review-card border-border bg-card"
              key={`${course.id}-${review.name}-${review.feature}`}
            >
              <CardContent>
                <p className="rda-review-photo-feature">{review.feature}</p>
                <blockquote>&ldquo;{review.quote}&rdquo;</blockquote>
                <div className="rda-course-review-card-footer">
                  <div>
                    <p className="rda-review-name">{review.name}</p>
                    <p className="rda-review-meta">{review.meta}</p>
                  </div>
                  <p
                    aria-label={`${review.rating} out of 5 stars`}
                    className="rda-review-rating"
                  >
                    <CourseReviewRating rating={review.rating} />
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="rda-course-review-actions">
          <Button asChild variant="outline">
            <a href={googleReviewsUrl} rel="noopener noreferrer" target="_blank">
              Open Google reviews
            </a>
          </Button>
        </div>
      </div>
    </section>
  );
}

export function CourseHeroMosaic({
  className = "",
  course,
}: {
  className?: string;
  course: LiveCourseContent;
}) {
  const supportingMedia = (course.supportingMedia ?? course.supportingImages ?? []).slice(0, 2);

  return (
    <div
      className={`overflow-hidden rounded-lg bg-card shadow-sm ring-1 ring-foreground/10 ${className}`}
      data-rda-course-hero="true"
    >
      {supportingMedia.length ? (
        <div className="grid gap-1 bg-muted max-lg:grid-cols-2 lg:aspect-[4/3] lg:grid-cols-[minmax(0,1.42fr)_minmax(0,0.82fr)]">
          <div className="relative min-w-0 max-lg:col-span-2 max-lg:aspect-[16/10] lg:min-h-0">
            <CourseHeroMedia loading="eager" media={course.image} />
          </div>
          <div className="grid min-h-0 min-w-0 gap-1 max-lg:col-span-2 max-lg:grid-cols-2 lg:grid-cols-1 lg:grid-rows-[repeat(auto-fit,minmax(0,1fr))]">
            {supportingMedia.map((media) => (
              <div
                className="relative min-h-0 min-w-0 max-lg:aspect-[4/3]"
                key={media.src}
              >
                <CourseHeroMedia media={media} />
              </div>
            ))}
          </div>
        </div>
      ) : (
        <AspectRatio ratio={4 / 3}>
          <CourseHeroMedia loading="eager" media={course.image} />
        </AspectRatio>
      )}
    </div>
  );
}

export function CourseHeroActions({
  primaryLabel = "Request a seat",
}: {
  primaryLabel?: string;
}) {
  return (
    <div className="rda-course-hero-actions" data-rda-hero-actions="true">
      <Button asChild size="lg">
        <a data-rda-course-cta="request" href="#quick-sign-up">
          {primaryLabel}
        </a>
      </Button>
      <Button asChild size="lg" variant="outline">
        <a data-rda-course-cta="call" href={`tel:${siteContact.phone.replace(/-/g, "")}`}>
          <Phone aria-hidden="true" />
          Call {siteContact.phone}
        </a>
      </Button>
    </div>
  );
}

export function LiveCoursePage({ course }: { course: LiveCourseContent }) {
  const [hero, ...sections] = splitCourseSections(course);
  const featureCount = course.variant === "program" ? 2 : 1;
  const featureSections = sections.slice(0, featureCount);
  const detailSections = sections.slice(featureCount);
  const reviewGroup = courseReviewHighlights[course.id];
  const facts = getCertificationCourseFacts(course.id);

  return (
    <section className="bg-background" data-rda-live-course={course.id}>
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 sm:px-6 sm:py-14 lg:grid-cols-[minmax(0,1fr)_minmax(360px,0.78fr)] lg:items-start lg:px-8 lg:py-16">
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
              {facts ? (
                <CourseFactStrip facts={facts} label={`${hero.heading} at a glance`} />
              ) : null}
              <CourseHeroActions />
            </div>
          ) : null}
        </div>

        <CourseHeroMosaic className="lg:order-2 lg:row-span-2" course={course} />

        <div className="space-y-6 lg:order-3">
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
          {course.id === "infection-control" ? (
            <InfectionControlRequirementNotice className="mt-6" headingLevel="h2" />
          ) : null}
          {showsCertificateExpiration(course.id) ? (
            <CertificateExpirationNotice className="mt-6" headingLevel="h2" />
          ) : null}
          <p className="rda-course-policy-note mt-5 border-t border-border pt-4 text-sm leading-6 text-muted-foreground">
            * {COURSE_NONREFUNDABLE_NOTE}
          </p>
        </div>
      ) : null}
      {reviewGroup ? <CourseReviews course={course} group={reviewGroup} /> : null}
      <MobileCourseActionBar courseLabel={hero?.heading ?? course.id} />
    </section>
  );
}
