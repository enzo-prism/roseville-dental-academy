import Image from "next/image";
import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";
import {
  AirVent,
  ArrowRight,
  ArrowUpRight,
  BadgeCheck,
  BriefcaseBusiness,
  CalendarCheck2,
  CalendarDays,
  Camera,
  CircleDollarSign,
  ClipboardCheck,
  ExternalLink,
  FileText,
  GraduationCap,
  HandHeart,
  HeartPulse,
  Laptop,
  ListChecks,
  MapPin,
  Microscope,
  Quote,
  Route,
  ShieldCheck,
  Sparkles,
  Star,
  Stethoscope,
  Syringe,
  UserCheck,
  Users,
} from "lucide-react";

import { AcademyMediaSection } from "@/components/academy/academy-media";
import { courseIcons } from "@/components/academy/course-icons";
import { HomeHero, type HeroSlide } from "@/components/academy/home/home-hero";
import { LazyVideo } from "@/components/academy/lazy-video";
import { PhotoLightboxGrid } from "@/components/academy/photo-lightbox";
import { LiveContactSection } from "@/components/site/live-contact-section";
import { LiveSignupSection } from "@/components/site/live-signup-section";
import { SocialLinkButtons } from "@/components/site/social-link-buttons";
import {
  certificationCourses,
  dentalAssistingProgram,
  getNextOpenShortDate,
} from "@/lib/academy-catalog";
import { academyInstructors } from "@/lib/academy-instructors";
import { academyClassPhotos, academyHomeVideos } from "@/lib/academy-media";
import {
  courseScheduleCourseDetails,
  courseScheduleNote,
  getAvailableCourseDates,
  getUpcomingScheduleMonths,
} from "@/lib/course-schedule";
import { homepageCourseSections } from "@/lib/homepage-course-sections";
import {
  boardApprovalHighlights,
  googleReviews,
  googleReviewsAggregate,
  googleReviewsUrl,
  homeGalleryHighlight,
  homepageReviewHighlights,
  socialLinks,
} from "@/lib/site-data";
import { activeSitePromo } from "@/lib/site-promo";

const heroSlides: HeroSlide[] = [
  {
    alt: "Roseville Dental Academy graduates holding their certificates behind a Congratulations banner.",
    caption: "Graduation day",
    src: "/assets/live/drive/certificate-celebration.jpg",
  },
  {
    alt: "Instructor coaching a student through chairside suction on a patient.",
    caption: "Chairside coaching",
    src: "/assets/live/drive/chairside-coaching-closeup.jpg",
  },
  {
    alt: "Students positioning an x-ray sensor during radiography practice.",
    caption: "X-ray practice",
    src: "/assets/live/drive/xray-chairside.jpg",
  },
];

type ActionTile = {
  alt: string;
  caption: string;
  icon: typeof Camera;
  layout: "tall" | "wide" | "square";
  src: string;
};

const studentsInAction: ActionTile[] = [
  {
    alt: "Instructor guiding a student through chairside dental assisting practice.",
    caption: "Chairside assisting",
    icon: Stethoscope,
    layout: "tall",
    src: "/assets/live/programs/dental-assisting-chairside.jpg",
  },
  {
    alt: "Students practicing dental assisting skills on typodonts around a table.",
    caption: "Typodont practice",
    icon: Microscope,
    layout: "square",
    src: "/assets/live/drive/typodont-practice.jpg",
  },
  {
    alt: "Student in a lab coat practicing sterilization and instrument handling.",
    caption: "Sterilization & infection control",
    icon: ShieldCheck,
    layout: "square",
    src: "/assets/live/drive/sterilization-hands-on.jpg",
  },
  {
    alt: "Students practicing CPR compressions on training manikins.",
    caption: "BLS / CPR skills",
    icon: HeartPulse,
    layout: "wide",
    src: "/assets/live/courses/rda-june-2026/bls-cpr-skills.jpg",
  },
  {
    alt: "Student polishing teeth on a typodont during coronal polish practice.",
    caption: "Coronal polish",
    icon: Sparkles,
    layout: "square",
    src: "/assets/live/courses/rda-june-2026/coronal-polish-student.jpg",
  },
  {
    alt: "Students practicing radiography and chairside workflow with a patient.",
    caption: "Radiography",
    icon: Syringe,
    layout: "square",
    src: "/assets/live/programs/radiography-chairside.jpg",
  },
];

const tickerItems = [
  { icon: Stethoscope, label: "Chairside assisting" },
  { icon: Microscope, label: "Dental x-rays" },
  { icon: ShieldCheck, label: "Infection control" },
  { icon: HeartPulse, label: "BLS / CPR" },
  { icon: Sparkles, label: "Coronal polish" },
  { icon: BadgeCheck, label: "Pit & fissure sealants" },
  { icon: FileText, label: "Resume help" },
  { icon: BriefcaseBusiness, label: "64-hour internship" },
  { icon: Users, label: "Small class sizes" },
  { icon: MapPin, label: "Roseville, CA" },
];

const whyIcons = [BriefcaseBusiness, CircleDollarSign, CalendarCheck2, Route] as const;
const whyStats = ["15.3%", "$18–22", "PT · FT", "DA → RDA"] as const;
const boardIcons = [ListChecks, BadgeCheck, ClipboardCheck] as const;

function Stars({ className }: { className?: string }) {
  return (
    <span aria-hidden="true" className={`ac-stars ${className ?? ""}`}>
      {Array.from({ length: 5 }, (_, index) => (
        <Star key={index} />
      ))}
    </span>
  );
}

function SectionHeading({
  center = false,
  eyebrow,
  id,
  intro,
  title,
}: {
  center?: boolean;
  eyebrow: string;
  id?: string;
  intro?: string;
  title: ReactNode;
}) {
  return (
    <div className={`ac-heading rda-section-heading${center ? " ac-heading-center" : ""}`} data-reveal="">
      <p className={`ac-eyebrow${center ? " ac-eyebrow-plain" : ""}`}>{eyebrow}</p>
      <h2 className="ac-h2" id={id}>
        {title}
      </h2>
      <span aria-hidden="true" />
      {intro ? <p className="ac-lede">{intro}</p> : null}
    </div>
  );
}

function TickerStrip() {
  const track = (hidden: boolean) => (
    <ul aria-hidden={hidden || undefined} className="ac-marquee-track ac-ticker-track">
      {tickerItems.map((item) => (
        <li key={item.label}>
          <item.icon aria-hidden="true" />
          {item.label}
        </li>
      ))}
    </ul>
  );

  return (
    <div aria-label="What you'll learn" className="ac-ticker" role="region">
      <div className="ac-marquee" style={{ "--marquee-duration": "45s" } as CSSProperties}>
        {track(false)}
        {track(true)}
      </div>
    </div>
  );
}

function StudentsInAction() {
  return (
    <section aria-labelledby="ac-action-title" className="ac-section ac-action" data-rda-home-students="true">
      <div className="ac-container">
        <div className="ac-heading-row">
          <SectionHeading
            eyebrow="Students in action"
            id="ac-action-title"
            intro="Every class happens inside a working dental office, so you practice on real equipment with an instructor at your side — not just in a textbook."
            title={
              <>
                Real chairs. Real patients.
                <br />
                <em>Real confidence.</em>
              </>
            }
          />
          <Link className="ac-btn ac-btn-secondary" data-reveal="" href="/photos">
            <Camera aria-hidden="true" />
            See all photos
          </Link>
        </div>

        <div className="ac-bento">
          {studentsInAction.slice(0, 3).map((tile, index) => (
            <figure
              className={`ac-photo ac-photo-zoom ac-bento-tile ac-bento-${tile.layout}`}
              data-reveal="zoom"
              key={tile.src}
              style={{ "--reveal-delay": index } as CSSProperties}
            >
              <Image alt={tile.alt} fill sizes="(max-width: 760px) 100vw, 33vw" src={tile.src} />
              <figcaption className="ac-photo-caption">
                <tile.icon aria-hidden="true" />
                {tile.caption}
              </figcaption>
            </figure>
          ))}

          <figure className="ac-photo ac-bento-tile ac-bento-video" data-reveal="zoom">
            <LazyVideo
              captionsSrc="/assets/social/instagram/05-dya2wfosi08.vtt"
              label="Dental assisting students in lab coats celebrating with their instructor."
              poster="/assets/social/instagram/05-dya2wfosi08-poster.jpg"
              src="/assets/social/instagram/05-dya2wfosi08.mp4"
            />
            <figcaption className="ac-photo-caption">
              <span aria-hidden="true" className="ac-rec-dot" />
              From our Instagram
            </figcaption>
          </figure>

          <div className="ac-bento-tile ac-bento-stats" data-reveal="zoom">
            <p className="ac-stat">
              <span className="ac-stat-value">
                <span data-count-to={googleReviewsAggregate.reviewCount}>{googleReviewsAggregate.reviewCount}</span>
              </span>
              <span className="ac-stat-label">Google reviews, averaging {googleReviewsAggregate.ratingValue.toFixed(1)} stars</span>
            </p>
            <p className="ac-stat">
              <span className="ac-stat-value">
                <span data-count-to="9">9</span>
                <small>weeks</small>
              </span>
              <span className="ac-stat-label">start to finish, 210 hours total</span>
            </p>
            <p className="ac-stat">
              <span className="ac-stat-value">
                <span data-count-to="64">64</span>
                <small>hrs</small>
              </span>
              <span className="ac-stat-label">of internship experience</span>
            </p>
          </div>

          {studentsInAction.slice(3).map((tile, index) => (
            <figure
              className={`ac-photo ac-photo-zoom ac-bento-tile ac-bento-${tile.layout}`}
              data-reveal="zoom"
              key={tile.src}
              style={{ "--reveal-delay": index + 1 } as CSSProperties}
            >
              <Image alt={tile.alt} fill sizes="(max-width: 760px) 100vw, 33vw" src={tile.src} />
              <figcaption className="ac-photo-caption">
                <tile.icon aria-hidden="true" />
                {tile.caption}
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}

// Each marquee track is one GPU layer as wide as its row, kept for the whole
// loop. Every written review (~76) made rows ~12,800px wide (~80MB per track
// at 3x), by far the largest layer on phones. /reviews has the rest.
const MARQUEE_REVIEWS_PER_ROW = 10;

function ReviewMarquee() {
  // Rating-only reviews have no written excerpt worth scrolling past.
  const written = googleReviews.filter((review) => !/^\d-star Google rating\.$/u.test(review.quote));
  const rows = [
    written.slice(0, MARQUEE_REVIEWS_PER_ROW),
    written.slice(MARQUEE_REVIEWS_PER_ROW, MARQUEE_REVIEWS_PER_ROW * 2),
  ];

  return (
    <div className="ac-review-marquees" data-rda-review-marquee="true">
      {rows.map((row, rowIndex) => (
        <div
          className="ac-marquee"
          data-direction={rowIndex === 1 ? "reverse" : undefined}
          key={rowIndex}
          style={{ "--marquee-duration": `${row.length * 5}s`, "--marquee-gap": "1rem" } as CSSProperties}
        >
          {[false, true].map((hidden) => (
            <ul aria-hidden={hidden || undefined} className="ac-marquee-track" key={String(hidden)}>
              {row.map((review) => (
                <li className="ac-mini-review" key={`${review.name}-${review.meta}`}>
                  <Stars />
                  <p>&ldquo;{review.quote}&rdquo;</p>
                  <span className="ac-mini-review-name">
                    <span aria-hidden="true" className="ac-avatar-initial">
                      {review.name.replace(/[^\p{L}]/gu, "").charAt(0).toUpperCase() || "★"}
                    </span>
                    {review.name}
                    <small>{review.meta.replace("Google review · ", "")}</small>
                  </span>
                </li>
              ))}
            </ul>
          ))}
        </div>
      ))}
    </div>
  );
}

function ReviewsSection() {
  const fiveStarCount = googleReviews.filter((review) => review.rating === 5).length;

  return (
    <section
      aria-labelledby="ac-reviews-title"
      className="ac-section ac-band-ink ac-reviews"
      data-rda-home-review-highlights="true"
    >
      <div className="ac-container">
        <div className="ac-reviews-top">
          <SectionHeading
            eyebrow="Student reviews"
            id="ac-reviews-title"
            intro="Real Google reviews from graduates and certification students — the instructors, the hands-on training, and the job help come up again and again."
            title="What Students Are Saying"
          />
          <div className="ac-score-card" data-reveal="right">
            <div className="ac-score">
              <span className="ac-score-value" data-count-decimals="1" data-count-to={googleReviewsAggregate.ratingValue}>
                {googleReviewsAggregate.ratingValue.toFixed(1)}
              </span>
              <span className="ac-score-meta">
                <Stars className="ac-stars-lg" />
                <span>
                  {googleReviewsAggregate.reviewCount} Google reviews · {fiveStarCount} five-star
                </span>
              </span>
            </div>
            <div className="ac-score-actions">
              <Link className="ac-btn ac-btn-light" href="/reviews">
                Read all {googleReviewsAggregate.reviewCount} reviews
                <ArrowRight aria-hidden="true" data-ac-arrow="" />
              </Link>
              <a
                className="ac-btn ac-btn-outline-light"
                href={googleReviewsUrl}
                rel="noopener noreferrer"
                target="_blank"
              >
                Open on Google
                <ExternalLink aria-hidden="true" />
              </a>
            </div>
          </div>
        </div>

        <div className="ac-review-grid">
          {homepageReviewHighlights.map((review, index) => (
            <article
              className="ac-review-card rda-review-photo-card"
              data-reveal=""
              key={review.name}
              style={{ "--reveal-delay": index % 3 } as CSSProperties}
            >
              <div className="ac-review-photo ac-photo">
                <Image
                  alt={review.image.alt}
                  fill
                  sizes="(max-width: 760px) 100vw, 33vw"
                  src={review.image.src}
                />
                <span className="ac-review-feature">{review.feature}</span>
              </div>
              <div className="ac-review-body">
                <Quote aria-hidden="true" className="ac-review-quote-mark" />
                <span aria-label={`${review.rating} out of 5 stars`} role="img">
                  <Stars />
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
              </div>
            </article>
          ))}
        </div>
      </div>
      <ReviewMarquee />
    </section>
  );
}

function ProgramsSection() {
  const daDates = getAvailableCourseDates(dentalAssistingProgram.id);
  const DaIcon = courseIcons[dentalAssistingProgram.icon];

  return (
    <section aria-labelledby="ac-programs-title" className="ac-section" data-rda-home-course-system="true" id="courses">
      <div className="ac-container">
        <SectionHeading
          eyebrow="Courses & programs"
          id="ac-programs-title"
          intro="Start from zero with the 9-week Dental Assisting program, or add the Board-approved certifications you need for your RDA."
          title={
            <>
              Choose your path into <em>dentistry</em>
            </>
          }
        />

        <article className="ac-program-feature" data-reveal="">
          <div className="ac-program-feature-media ac-photo">
            <Image
              alt={dentalAssistingProgram.image.alt}
              fill
              sizes="(max-width: 1023px) 100vw, 50vw"
              src="/assets/live/drive/class-group-scrubs.jpg"
            />
            <span className="ac-program-price">
              <small>Tuition</small>
              {dentalAssistingProgram.price}
            </span>
          </div>
          <div className="ac-program-feature-body">
            <p className="ac-eyebrow">
              <DaIcon aria-hidden="true" />
              Flagship program
            </p>
            <h3 className="ac-h2">Dental Assisting Program</h3>
            <p className="ac-body">
              Our accelerated program prepares you for an entry-level dental assisting job in 9 weeks
              (210 hours). All lectures and hands-on learning happen in our office at Waikiki Dental,
              with small classes and a 64-hour internship.
            </p>
            <ul className="ac-check-list">
              <li>
                <CalendarDays aria-hidden="true" />
                Pick one class day — Monday, Friday, or Saturday — plus one internship day
              </li>
              <li>
                <HandHeart aria-hidden="true" />
                Chairside experience, resume help, and job assistance
              </li>
              <li>
                <UserCheck aria-hidden="true" />
                Ages 16+, no prerequisites
              </li>
            </ul>
            {daDates.length ? (
              <div className="ac-next-dates">
                <span>Next starts</span>
                {daDates.slice(0, 3).map((date) => (
                  <span className="ac-chip ac-chip-soft" key={date}>
                    <CalendarDays aria-hidden="true" />
                    {date}
                  </span>
                ))}
              </div>
            ) : null}
            <div className="ac-program-actions">
              <Link className="ac-btn ac-btn-primary" href={dentalAssistingProgram.href}>
                Explore the program
                <ArrowRight aria-hidden="true" data-ac-arrow="" />
              </Link>
              <a className="ac-btn ac-btn-secondary" href="#quick-sign-up">
                Ask about the next start
              </a>
            </div>
          </div>
        </article>

        <div className="ac-course-grid">
          {certificationCourses.map((course, index) => {
            const Icon = courseIcons[course.icon];
            const next = getNextOpenShortDate(course.id);

            return (
              <Link
                className="ac-course-card ac-card ac-card-hover"
                data-reveal=""
                href={course.href}
                key={course.id}
                style={{ "--reveal-delay": index } as CSSProperties}
              >
                <span className="ac-course-card-media ac-photo">
                  <Image alt={course.image.alt} fill sizes="(max-width: 760px) 100vw, 20vw" src={course.image.src} />
                  {course.approval ? (
                    <span className="ac-course-badge">
                      <BadgeCheck aria-hidden="true" />
                      {course.approval}
                    </span>
                  ) : null}
                </span>
                <span className="ac-course-card-body">
                  <span className="ac-icon-tile">
                    <Icon aria-hidden="true" />
                  </span>
                  <span className="ac-course-card-title">{course.name}</span>
                  <span className="ac-course-card-blurb">{course.blurb}</span>
                  <span className="ac-course-card-meta">
                    <span>{course.duration}</span>
                    <strong>{course.price}</strong>
                  </span>
                  <span className="ac-course-card-next">
                    <CalendarDays aria-hidden="true" />
                    {next ? `Next class ${next}` : "Ask about dates"}
                    <ArrowUpRight aria-hidden="true" className="ac-course-card-arrow" />
                  </span>
                </span>
              </Link>
            );
          })}
        </div>

        <div className="ac-extra-grid">
          <article className="ac-extra-card ac-card" data-reveal="">
            <span className="ac-icon-tile">
              <Laptop aria-hidden="true" />
            </span>
            <div>
              <h3 className="ac-h3">HeartCode BLS — $85</h3>
              <p className="ac-body">
                Now offering blended learning: complete the online portion at home, then come in for a
                skills test. Call to schedule your skills evaluation and bring proof of online completion.
              </p>
              <a className="ac-link" href={homepageCourseSections.bls.ctaHref} rel="noreferrer" target="_blank">
                Link for online portion
                <ExternalLink aria-hidden="true" />
              </a>
            </div>
          </article>
          <article className="ac-extra-card ac-card" data-reveal="" style={{ "--reveal-delay": 1 } as CSSProperties}>
            <span className="ac-icon-tile">
              <AirVent aria-hidden="true" />
            </span>
            <div>
              <h3 className="ac-h3">N95 Fit Test — $89.99</h3>
              <p className="ac-body">
                Initial and annual qualitative fit testing with a TSI Portacount to help offices meet
                OSHA requirements. By appointment; each additional mask is $20.
              </p>
              <a className="ac-link" href="https://n95fittests.com/" rel="noreferrer" target="_blank">
                Book Appointment Here
                <ExternalLink aria-hidden="true" />
              </a>
            </div>
          </article>
          <article className="ac-extra-card ac-card" data-reveal="" style={{ "--reveal-delay": 2 } as CSSProperties}>
            <span className="ac-icon-tile">
              <Stethoscope aria-hidden="true" />
            </span>
            <div>
              <h3 className="ac-h3">Implant & bone grafting coaching</h3>
              <p className="ac-body">
                One-on-one, hands-on coaching for dentists with Dr. Michael Narodovich — guided and
                free-hand implant placement, bone grafting, and sinus augmentation, with your own patients.
              </p>
              <Link className="ac-link" href="/contact">
                Ask about coaching
                <ArrowRight aria-hidden="true" />
              </Link>
            </div>
          </article>
          <article className="ac-extra-card ac-card" data-reveal="" style={{ "--reveal-delay": 3 } as CSSProperties}>
            <span className="ac-icon-tile">
              <GraduationCap aria-hidden="true" />
            </span>
            <div>
              <h3 className="ac-h3">Ergonomics & patient care for hygienists</h3>
              <p className="ac-body">
                A skills-based refresher covering periodontal review, clinical ergonomics, scaling
                technique, dental emergencies, medications, and patient communication.
              </p>
              <Link className="ac-link" href="/contact">
                Ask about the next session
                <ArrowRight aria-hidden="true" />
              </Link>
            </div>
          </article>
        </div>
      </div>
    </section>
  );
}

function InstructorsSection() {
  return (
    <section aria-labelledby="ac-team-title" className="ac-section ac-band-raised ac-team" data-rda-home-instructors="true">
      <div className="ac-container">
        <div className="ac-heading-row">
          <SectionHeading
            eyebrow="Your instructors"
            id="ac-team-title"
            intro="Learn from registered dental assistants and dental professionals who know what offices expect — two of them graduated from this very academy."
            title={
              <>
                The people who&apos;ll <em>coach you</em>
              </>
            }
          />
          <Link className="ac-btn ac-btn-secondary" data-reveal="" href="/meet-the-instructors">
            <Users aria-hidden="true" />
            Meet the whole team
          </Link>
        </div>
        <div className="ac-team-grid">
          {academyInstructors.map((instructor, index) => (
            <article
              className="ac-team-card"
              data-reveal=""
              key={instructor.name}
              style={{ "--reveal-delay": index } as CSSProperties}
            >
              <div className="ac-team-photo ac-photo">
                <Image alt={instructor.imageAlt} fill sizes="(max-width: 760px) 50vw, 25vw" src={instructor.image} />
                <span className="ac-team-credential">{instructor.credential}</span>
              </div>
              <h3 className="ac-h3">{instructor.name}</h3>
              <ul className="ac-team-tags">
                {instructor.highlights.slice(0, 2).map((highlight) => (
                  <li key={highlight}>{highlight}</li>
                ))}
              </ul>
              {instructor.quote ? (
                <blockquote className="ac-team-quote">
                  <p>&ldquo;{instructor.quote.text}&rdquo;</p>
                  <cite>— {instructor.quote.author}, Google review</cite>
                </blockquote>
              ) : (
                <p className="ac-team-summary">{instructor.summary}</p>
              )}
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function ScheduleSection() {
  const months = getUpcomingScheduleMonths();

  return (
    <section aria-labelledby="ac-schedule-title" className="ac-section" data-rda-home-course-block="schedule" id="schedule">
      <div className="ac-container">
        <SectionHeading
          eyebrow="2026 dates"
          id="ac-schedule-title"
          intro={courseScheduleNote}
          title="Upcoming Class Schedule"
        />
        {months.length ? (
          <div className="ac-schedule">
            {months.map((month, monthIndex) => (
              <article
                className="ac-schedule-month ac-card"
                data-reveal=""
                key={month.month}
                style={{ "--reveal-delay": monthIndex } as CSSProperties}
              >
                <h3 className="ac-schedule-month-title">
                  <CalendarDays aria-hidden="true" />
                  {month.month}
                </h3>
                <ul>
                  {month.entries.map((entry) => {
                    const [, , day] = entry.isoDate.split("-");

                    return (
                      <li className="ac-schedule-row rda-home-schedule-date-row" key={entry.isoDate}>
                        <time className="ac-schedule-date" dateTime={entry.isoDate}>
                          <span>{entry.day.slice(0, 3)}</span>
                          <strong>{Number(day)}</strong>
                        </time>
                        <span className="ac-schedule-courses">
                          {entry.courses.map((course) => (
                            <span
                              className="ac-schedule-course rda-home-schedule-course-wrap"
                              data-status={course.status === "full" ? "full" : "available"}
                              key={course.id}
                            >
                              <Link href={courseScheduleCourseDetails[course.id].href}>{course.label}</Link>
                              {course.status === "full" ? <span className="ac-full-flag">Full</span> : null}
                            </span>
                          ))}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </article>
            ))}
          </div>
        ) : (
          <p className="ac-body">Ask admissions for upcoming dates.</p>
        )}
      </div>
    </section>
  );
}

function WhySection() {
  return (
    <section aria-labelledby="ac-why-title" className="ac-section ac-band-raised ac-why">
      <div className="ac-container ac-why-grid">
        <div className="ac-why-media ac-photo" data-reveal="left">
          <Image
            alt="A recent graduating class holding certificates under a Congratulations banner indoors."
            fill
            sizes="(max-width: 1023px) 100vw, 40vw"
            src="/assets/live/drive/recent-indoor-certificates.jpg"
          />
          <span className="ac-why-media-badge">
            <GraduationCap aria-hidden="true" />
            Graduation day
          </span>
        </div>
        <div>
          <SectionHeading
            eyebrow="Why dental assisting?"
            id="ac-why-title"
            intro="A fast, hands-on way into healthcare — with steady demand, flexible hours, and room to grow."
            title={
              <>
                A career that <em>opens doors</em>
              </>
            }
          />
          <div className="ac-why-items">
            {homepageCourseSections.why.items.map((item, index) => {
              const Icon = whyIcons[index % whyIcons.length];

              return (
                <article
                  className="ac-why-item"
                  data-reveal=""
                  key={item.title}
                  style={{ "--reveal-delay": index } as CSSProperties}
                >
                  <span className="ac-icon-tile">
                    <Icon aria-hidden="true" />
                  </span>
                  <div>
                    <p className="ac-why-stat">{whyStats[index]}</p>
                    <h3>{item.title}</h3>
                    <p>{item.body}</p>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

function BoardSection() {
  return (
    <section aria-labelledby="ac-board-title" className="ac-section ac-section-tight" data-rda-stable-widget="board">
      <div className="ac-container">
        <div className="ac-board" data-reveal="">
          <div className="ac-board-intro">
            <span className="ac-board-seal" aria-hidden="true">
              <BadgeCheck />
            </span>
            <h2 className="ac-h3" id="ac-board-title">
              Dental Board Course Details
            </h2>
            <p className="ac-body">
              Approval status, requirements, and what to bring — clear before anyone enrolls.
            </p>
          </div>
          <div className="ac-board-items">
            {boardApprovalHighlights.map((item, index) => {
              const Icon = boardIcons[index % boardIcons.length];
              const external = item.href.startsWith("http");

              return (
                <article className="ac-board-item" key={item.title}>
                  <h3>
                    <Icon aria-hidden="true" />
                    {item.title}
                  </h3>
                  <p>{item.summary}</p>
                  <a
                    className="ac-link"
                    href={item.href}
                    rel={external ? "noreferrer" : undefined}
                    target={external ? "_blank" : undefined}
                  >
                    {item.ctaLabel}
                    {external ? <ExternalLink aria-hidden="true" /> : <ArrowRight aria-hidden="true" />}
                  </a>
                </article>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

function GallerySection() {
  return (
    <section
      aria-labelledby="ac-gallery-title"
      className="ac-section ac-gallery-home"
      data-rda-gallery-mode="home"
      data-rda-stable-widget="gallery"
    >
      <div className="ac-container ac-gallery-layout">
        <div className="ac-gallery-main">
          <div className="ac-heading-row">
            <SectionHeading eyebrow="Life at the academy" id="ac-gallery-title" intro={homeGalleryHighlight.copy} title="Gallery" />
            <Link className="ac-btn ac-btn-secondary" data-reveal="" href="/photos">
              {homeGalleryHighlight.ctaLabel}
              <ArrowRight aria-hidden="true" data-ac-arrow="" />
            </Link>
          </div>
          <PhotoLightboxGrid
            className="ac-gallery-mosaic"
            photos={homeGalleryHighlight.items.map((item) => ({ alt: item.alt, src: item.src }))}
            sizes="(max-width: 760px) 50vw, 22vw"
          />
        </div>
        <aside
          aria-labelledby="ac-tiktok-title"
          className="ac-tiktok"
          data-reveal="right"
          data-rda-stable-widget="tiktok-follow"
        >
          <div className="ac-phone">
            <LazyVideo
              label="Roseville Dental Academy TikTok preview"
              poster="/assets/social/tiktok/homepage-follow-1000-poster.jpg"
              src="/assets/social/tiktok/homepage-follow-1000.mp4"
            />
          </div>
          <div className="ac-tiktok-copy">
            <p className="ac-eyebrow ac-eyebrow-plain">Follow along on TikTok</p>
            <h2 className="ac-h3" id="ac-tiktok-title">
              Help us reach 1,000 followers.
            </h2>
            <p className="ac-body">Class moments, quick course reminders, and behind-the-scenes updates.</p>
            <a
              className="ac-btn ac-btn-primary ac-btn-sm"
              data-rda-social-button="tiktok"
              href="https://www.tiktok.com/@rosevilledentalacademy?_r=1&_t=ZP-96u9ZhtrfJu"
              rel="noreferrer"
              target="_blank"
            >
              Follow on TikTok
              <ArrowUpRight aria-hidden="true" />
            </a>
          </div>
        </aside>
      </div>
    </section>
  );
}

function SocialFollow() {
  return (
    <section
      aria-labelledby="ac-social-title"
      className="ac-section ac-section-tight ac-social-follow"
      data-rda-stable-widget="social-follow"
    >
      <div className="ac-container ac-social-follow-inner" data-reveal="">
        <div>
          <h2 className="ac-h3" id="ac-social-title">
            Follow Us on Social Media
          </h2>
          <p className="ac-body">
            See class photos, course updates, student moments, and academy reminders on Facebook,
            Instagram, and TikTok.
          </p>
        </div>
        <SocialLinkButtons links={socialLinks} variant="inline" />
      </div>
    </section>
  );
}

export function HomePage({ sourceLabel }: { sourceLabel: string }) {
  const daNext = getNextOpenShortDate(dentalAssistingProgram.id);
  const nextClassLabel = activeSitePromo.courseId === "dental-assisting-program" && daNext
    ? `Now enrolling · Next class ${daNext}`
    : daNext
      ? `Next Dental Assisting class ${daNext}`
      : undefined;

  return (
    <div className="ac-home" data-rda-home="true">
      <HomeHero
        instructorFaces={academyInstructors.map((instructor) => ({ name: instructor.name, src: instructor.image }))}
        nextClassLabel={nextClassLabel}
        rating={googleReviewsAggregate.ratingValue.toFixed(1)}
        reviewCount={googleReviewsAggregate.reviewCount}
        slides={heroSlides}
      />
      <TickerStrip />
      <StudentsInAction />
      <ReviewsSection />
      <ProgramsSection />
      {/* Dates and the inquiry form come right after the courses so phones
          reach them sooner, ahead of the instructors and front-desk intro. */}
      <ScheduleSection />
      <LiveSignupSection pagePath="/" sourceLabel={sourceLabel} />
      <section className="ac-section ac-section-tight" aria-labelledby="ac-front-office-intro">
        <div className="ac-container ac-social-follow-inner">
          <div><p className="ac-eyebrow">New program</p><h2 className="ac-h3" id="ac-front-office-intro">Start on the front office side of dentistry.</h2><p className="ac-body">Explore beginner dental receptionist training in scheduling, insurance basics, patient communication, and office procedures.</p></div>
          <Link className="ac-btn ac-btn-secondary" href="/dental-front-desk-program">Explore dental front desk <ArrowRight aria-hidden="true" /></Link>
        </div>
      </section>
      <InstructorsSection />
      <WhySection />
      <BoardSection />
      <AcademyMediaSection
        description="Recent first-day, celebration, and graduation photos from the academy Instagram, shown in full frame."
        id="academy-class-photos"
        items={academyClassPhotos}
        title="Class photos from Instagram"
      />
      <AcademyMediaSection
        description="Captioned classroom clips. Press play when you want sound — nothing autoplays with audio."
        id="academy-home-videos"
        items={academyHomeVideos}
        title="Training clips, with captions"
      />
      <GallerySection />
      <LiveContactSection compact />
      <SocialFollow />
    </div>
  );
}
