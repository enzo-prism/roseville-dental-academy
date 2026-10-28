import type { CSSProperties, ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  CalendarDays,
  ChevronRight,
  CircleDollarSign,
  ClipboardList,
  Clock3,
  ExternalLink,
  GraduationCap,
  Layers,
  ListChecks,
  Phone,
  Quote,
  Star,
  Target,
  Users,
} from "lucide-react";

import { courseIcons } from "@/components/academy/course-icons";
import { LazyVideo } from "@/components/academy/lazy-video";
import { CertificateExpirationNotice } from "@/components/site/certificate-expiration-notice";
import { ClinicalRequirements } from "@/components/site/clinical-requirements";
import { InfectionControlRequirementNotice } from "@/components/site/infection-control-requirement-notice";
import { SiteLink } from "@/components/site/site-link";
import { WhatsAppIcon } from "@/components/site/whatsapp-icon";
import { showsCertificateExpiration } from "@/lib/certificate-expiration";
import { studentPublicEnrollCtas } from "@/lib/student-enrollment";
import { CANCELLATION_POLICY_PATH, CANCELLATION_POLICY_SUMMARY, CANCELLATION_POLICY_TITLE, hasStandaloneClinicalRequirements, INFECTION_CONTROL_PAYMENT_NOTE } from "@/lib/academy-policies";
import { getAcademyCourse } from "@/lib/academy-catalog";
import {
  courseScheduleNote,
  formatCourseDateLabel,
  getHeroStartDates,
  getNextAvailableCourseDate,
  getUpcomingCourseSchedule,
  type CourseScheduleId,
  type UpcomingStartDate,
} from "@/lib/course-schedule";
import type {
  LiveCourseContent,
  LiveCourseLink,
  LiveCourseMedia,
} from "@/lib/live-course-content";
import {
  courseReviewHighlights,
  googleReviewsUrl,
  siteContact,
  whatsAppUrl,
  type CourseReviewGroup,
} from "@/lib/site-data";

type LiveCourseSection = {
  body: string;
  heading: string;
};

const sectionIcons: Record<string, typeof Users> = {
  "Best next step": Target,
  Format: Layers,
  Prerequisites: ListChecks,
  "What students get at the end": GraduationCap,
  "Who is it for?": Users,
};

const SMALL_WORDS = new Set(["a", "an", "and", "for", "in", "of", "or", "the", "to"]);
const KEEP_UPPER = new Set(["BLS", "CPR", "RDA", "DA"]);

/** "BLS CERTIFICATION COURSE - INITIAL OR RENEWAL" -> "BLS Certification Course — Initial or Renewal". */
function toDisplayTitle(heading: string) {
  if (heading !== heading.toUpperCase()) {
    return heading;
  }

  return heading
    .split(/\s+/u)
    .map((word, index) => {
      if (word === "-") return "—";
      if (KEEP_UPPER.has(word)) return word;
      const lower = word.toLowerCase();
      if (index > 0 && SMALL_WORDS.has(lower)) return lower;
      return lower.replace(/(^|-)(\p{L})/gu, (_, dash: string, letter: string) => `${dash}${letter.toUpperCase()}`);
    })
    .join(" ");
}

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
      <a className="ac-inline-link" href={link.href} key={`link-${key}`}>
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

function CourseMedia({
  loading = "lazy",
  media,
  sizes,
}: {
  loading?: "eager" | "lazy";
  media: LiveCourseMedia;
  sizes: string;
}) {
  if (media.type === "video") {
    return <LazyVideo label={media.alt} poster={media.poster} src={media.src} />;
  }

  // Sized by the mosaic grid. The originals are up to 1800px / 670KB, which
  // made the hero the slowest paint on phones, and prefetched course links
  // pulled every original onto the homepage too.
  return <Image alt={media.alt} fill preload={loading === "eager"} sizes={sizes} src={media.src} />;
}

function CourseHeroStartDates({
  courseId,
  dates,
}: {
  courseId: CourseScheduleId;
  dates: UpcomingStartDate[];
}) {
  return (
    <div className="ac-hero-starts" data-rda-hero-starts={courseId}>
      <p className="ac-hero-starts-label">
        <CalendarDays aria-hidden="true" />
        Next starts
      </p>
      <div className="ac-hero-starts-dates">
        {dates.map((entry) => (
          <span
            className="ac-hero-starts-date"
            data-rda-hero-start=""
            data-status={entry.status === "full" ? "full" : "open"}
            key={entry.isoDate}
          >
            <time dateTime={entry.isoDate}>{entry.weekdayShort}</time>
            {entry.status === "full" ? <span className="ac-full-flag">Full</span> : null}
          </span>
        ))}
      </div>
    </div>
  );
}

function CourseSchedule({ course }: { course: LiveCourseContent }) {
  const scheduleEntries = getUpcomingCourseSchedule(course.id);

  if (!scheduleEntries.length) {
    return <p className="ac-body">Call the office for upcoming class dates.</p>;
  }

  return (
    <ul className="ac-course-dates">
      {scheduleEntries.map((entry) => {
        const [, month, day] = entry.isoDate.split("-");
        const monthLabel = new Date(Date.UTC(2026, Number(month) - 1, 1)).toLocaleDateString("en-US", {
          month: "short",
          timeZone: "UTC",
        });

        return (
          <li
            className="rda-course-date ac-course-date"
            data-status={entry.status === "full" ? "full" : undefined}
            key={entry.isoDate}
          >
            <span aria-hidden="true" className="ac-schedule-date">
              <span>{monthLabel}</span>
              <strong>{Number(day)}</strong>
            </span>
            <span className="ac-course-date-copy">
              <time dateTime={entry.isoDate}>{formatCourseDateLabel(course.id, entry.date)}</time>
              <small>
                {new Date(`${entry.isoDate}T12:00:00Z`).toLocaleDateString("en-US", { timeZone: "UTC", weekday: "long" })}
              </small>
            </span>
            {entry.status === "full" ? (
              <span aria-label={`${entry.date} is full`} className="ac-full-flag rda-course-date-flag">
                Full
              </span>
            ) : (
              <span className="ac-open-flag">Open</span>
            )}
          </li>
        );
      })}
    </ul>
  );
}

function CourseReviews({
  course,
  group,
}: {
  course: LiveCourseContent;
  group: CourseReviewGroup;
}) {
  return (
    <section
      aria-labelledby={`rda-course-reviews-title-${course.id}`}
      className="ac-section ac-band-ink rda-course-review-section"
      data-rda-course-reviews={course.id}
    >
      <div className="ac-container">
        <div className="ac-heading-row">
          <div className="ac-heading rda-section-heading" data-reveal="">
            <p className="ac-eyebrow">Student reviews</p>
            <h2 className="ac-h2" id={`rda-course-reviews-title-${course.id}`}>
              {group.title}
            </h2>
            <span aria-hidden="true" />
            <p className="ac-lede">{group.intro}</p>
          </div>
          <div className="ac-score-actions" data-reveal="">
            <a className="ac-btn ac-btn-light" href={googleReviewsUrl} rel="noopener noreferrer" target="_blank">
              Open Google reviews
              <ExternalLink aria-hidden="true" />
            </a>
            <Link className="ac-btn ac-btn-outline-light" href="/reviews">
              All student reviews
            </Link>
          </div>
        </div>
        <div className="ac-course-review-grid">
          {group.reviews.map((review, index) => (
            <article
              className="ac-course-review rda-course-review-card"
              data-reveal=""
              key={`${course.id}-${review.name}-${review.feature}`}
              style={{ "--reveal-delay": index } as CSSProperties}
            >
              <Quote aria-hidden="true" className="ac-review-quote-mark" />
              <p className="ac-course-review-feature">{review.feature}</p>
              <span aria-label={`${review.rating} out of 5 stars`} className="ac-stars" role="img">
                {Array.from({ length: 5 }, (_, starIndex) => (
                  <Star aria-hidden="true" key={starIndex} />
                ))}
              </span>
              <blockquote>&ldquo;{review.quote}&rdquo;</blockquote>
              <p className="ac-review-author">
                <span aria-hidden="true" className="ac-avatar-initial">
                  {review.name.charAt(0).toUpperCase()}
                </span>
                <span>
                  <strong>{review.name}</strong>
                  <small>{review.meta}</small>
                </span>
              </p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

export function LiveCoursePage({ course }: { course: LiveCourseContent }) {
  const sections = splitCourseSections(course);
  const [hero, ...rest] = sections;
  const catalog = getAcademyCourse(course.id);
  const Icon = catalog ? courseIcons[catalog.icon] : GraduationCap;
  const price = rest.find((section) => section.heading === "Price");
  const duration = rest.find((section) => section.heading === "Duration");
  const detailSections = rest.filter(
    (section) =>
      section.heading !== "Price" &&
      section.heading !== "Duration" &&
      !/^Class (start )?dates?/u.test(section.heading),
  );
  const scheduleSection = rest.find((section) => /^Class (start )?dates?/u.test(section.heading));
  const supportingMedia = (course.supportingMedia ?? course.supportingImages ?? []).slice(0, 2);
  const reviewGroup = courseReviewHighlights[course.id];
  const nextDate = getNextAvailableCourseDate(course.id);
  const heroStarts = getHeroStartDates(course.id);
  const showHeroStarts = course.id === "dental-assisting-program" && heroStarts.length > 0;
  const phoneHref = `tel:${siteContact.phone.replace(/\D/g, "")}`;
  const title = hero ? toDisplayTitle(hero.heading) : catalog?.name ?? "";

  return (
    <div className="ac-course" data-rda-live-course={course.id}>
      <section className="ac-course-hero">
        <div aria-hidden="true" className="ac-hero-glow" />
        <div className="ac-container ac-course-hero-grid">
          <div className="ac-course-hero-copy rda-home-hero-copy">
            <nav aria-label="Breadcrumb" className="ac-breadcrumb">
              <Link href="/">Home</Link>
              <ChevronRight aria-hidden="true" />
              <Link href="/#courses">Courses</Link>
              <ChevronRight aria-hidden="true" />
              <span aria-current="page">{catalog?.navLabel ?? title}</span>
            </nav>
            <div className="ac-course-chips">
              <span className="ac-chip ac-chip-soft">
                <Icon aria-hidden="true" />
                {course.variant === "program" ? "Career program" : "Certification course"}
              </span>
              {catalog?.approval ? (
                <span className="ac-chip">
                  <BadgeCheck aria-hidden="true" />
                  Board-approved · {catalog.approval.replace("DBC ", "")}
                </span>
              ) : null}
            </div>
            <h1 className="ac-h1">{title}</h1>
            {showHeroStarts ? <CourseHeroStartDates courseId={course.id} dates={heroStarts} /> : null}
            {hero?.body ? <p className="ac-lede">{renderTextWithLinks(hero.body, course.links)}</p> : null}
            <dl className={`ac-course-facts${showHeroStarts ? " is-pair" : ""}`}>
              {price ? (
                <div data-rda-quick-fact="true">
                  <dt>
                    <CircleDollarSign aria-hidden="true" />
                    Price
                  </dt>
                  <dd>{catalog ? `${catalog.price}*` : addPricePolicyMarker(price.body)}</dd>
                </div>
              ) : null}
              {duration ? (
                <div data-rda-quick-fact="true">
                  <dt>
                    <Clock3 aria-hidden="true" />
                    Duration
                  </dt>
                  <dd>{catalog?.duration.split(" · ")[0] ?? duration.body}</dd>
                </div>
              ) : null}
              {showHeroStarts ? null : (
                <div>
                  <dt>
                    <CalendarDays aria-hidden="true" />
                    Next class
                  </dt>
                  <dd>{nextDate ?? "Ask admissions"}</dd>
                </div>
              )}
            </dl>
            <div className="ac-hero-actions">
              <a className="ac-btn ac-btn-primary ac-btn-lg" href="#quick-sign-up">
                Ask about this course
                <ArrowRight aria-hidden="true" data-ac-arrow="" />
              </a>
              <a className="ac-btn ac-btn-secondary ac-btn-lg" data-rda-lead-source="phone" href={phoneHref}>
                <Phone aria-hidden="true" />
                {siteContact.phone}
              </a>
            </div>
          </div>

          <div
            className={`ac-course-mosaic${supportingMedia.length ? "" : " is-single"}`}
            data-count={supportingMedia.length + 1}
            data-rda-course-hero="true"
          >
            <figure className="ac-photo ac-course-mosaic-main">
              <CourseMedia loading="eager" media={course.image} sizes="(max-width: 639px) 100vw, 34vw" />
            </figure>
            {supportingMedia.map((media, index) => (
              <figure
                className="ac-photo ac-course-mosaic-side"
                data-reveal="zoom"
                key={media.src}
                style={{ "--reveal-delay": index + 1 } as CSSProperties}
              >
                <CourseMedia media={media} sizes="(max-width: 639px) 50vw, 22vw" />
              </figure>
            ))}
            {duration ? (
              <span aria-hidden="true" className="ac-hero-float ac-course-float">
                <span className="ac-icon-tile">
                  <Clock3 />
                </span>
                <span>
                  <strong>{duration.body.replace(/\.$/u, "").split(";")[0]}</strong>
                  <small>{catalog?.tagline}</small>
                </span>
              </span>
            ) : null}
          </div>
        </div>
      </section>

      <section className="ac-section ac-section-tight">
        <div className="ac-container ac-course-layout">
          <div className="ac-course-main">
            {detailSections.map((section, index) => {
              const SectionIcon = sectionIcons[section.heading] ?? ClipboardList;

              return (
                <article
                  className="ac-course-section"
                  data-reveal=""
                  key={section.heading}
                  style={{ "--reveal-delay": index % 2 } as CSSProperties}
                >
                  <span className="ac-icon-tile">
                    <SectionIcon aria-hidden="true" />
                  </span>
                  <div>
                    <h2 className="ac-h3">{section.heading}</h2>
                    <p className="ac-body">{renderTextWithLinks(section.body, course.links)}</p>
                  </div>
                </article>
              );
            })}
            {hasStandaloneClinicalRequirements(course.id) ? <ClinicalRequirements /> : null}
            {course.id === "infection-control" ? (
              <InfectionControlRequirementNotice headingLevel="h2" />
            ) : null}
            {showsCertificateExpiration(course.id) ? (
              <CertificateExpirationNotice headingLevel="h2" />
            ) : null}
            <p className="rda-course-policy-note ac-policy-note">
              {course.id === "infection-control" ? <><strong>{INFECTION_CONTROL_PAYMENT_NOTE}</strong>{" "}</> : null}
              * {CANCELLATION_POLICY_SUMMARY}{" "}
              <Link className="ac-inline-link" href={CANCELLATION_POLICY_PATH}>
                {CANCELLATION_POLICY_TITLE}
              </Link>
            </p>
          </div>
          <aside className="ac-course-aside">
            <div className="ac-enroll-card">
              <div className="ac-enroll-head">
                <span className="ac-enroll-price">{catalog?.price ?? price?.body}</span>
                <span className="ac-enroll-duration">{catalog?.duration}</span>
              </div>
              <h2 className="ac-enroll-title">
                <CalendarDays aria-hidden="true" />
                Upcoming Class Dates
              </h2>
              <CourseSchedule course={course} />
              <p className="ac-enroll-note">{courseScheduleNote}</p>
              {scheduleSection ? <p className="sr-only">{scheduleSection.body}</p> : null}
              <a className="ac-btn ac-btn-primary ac-enroll-cta" href="#quick-sign-up">
                Request course info
                <ArrowRight aria-hidden="true" data-ac-arrow="" />
              </a>
              {course.id === "infection-control"
                ? studentPublicEnrollCtas().map((cta) => (
                    <SiteLink
                      key={cta.href}
                      className="ac-btn ac-btn-primary ac-enroll-cta"
                      href={cta.href}
                      data-rda-student-enroll-cta=""
                    >
                      {cta.label}
                      <ArrowRight aria-hidden="true" data-ac-arrow="" />
                    </SiteLink>
                  ))
                : null}
              <div className="ac-enroll-alt">
                <a data-rda-lead-source="phone" href={phoneHref}>
                  <Phone aria-hidden="true" />
                  Call
                </a>
                <a
                  data-rda-lead-source="whatsapp"
                  data-rda-whatsapp="true"
                  href={whatsAppUrl}
                  rel="noreferrer"
                  target="_blank"
                >
                  <WhatsAppIcon />
                  WhatsApp
                </a>
              </div>
              {catalog?.approval ? (
                <a
                  className="ac-enroll-verify"
                  href="https://www.dbc.ca.gov/applicants/rda_courses.shtml"
                  rel="noreferrer"
                  target="_blank"
                >
                  <BadgeCheck aria-hidden="true" />
                  Verify provider {catalog.approval.replace("DBC ", "")} with the Dental Board
                  <ExternalLink aria-hidden="true" />
                </a>
              ) : null}
            </div>
          </aside>
        </div>
      </section>

      {reviewGroup ? <CourseReviews course={course} group={reviewGroup} /> : null}
    </div>
  );
}
