import Image from "next/image";

import { SocialLinkButtons } from "@/components/site/social-link-buttons";
import type { LiveRoute } from "@/lib/live-route-data";
import {
  boardApprovalHighlights,
  homeGalleryHighlight,
  instructorBios,
  photoGroups,
  socialLinks,
  studentFaqHighlights,
  testimonials,
} from "@/lib/site-data";

import { LiveContactSection } from "./live-contact-section";
import { LiveSignupSection } from "./live-signup-section";

export function LiveStableWidgets({ route }: { route: LiveRoute }) {
  const slots = new Set(route.widgetSlots);

  return (
    <>
      {slots.has("reviews") ? <StableReviews /> : null}
      {slots.has("board") ? <StableBoardApproval /> : null}
      {slots.has("instructors") ? <StableInstructorBios /> : null}
      {slots.has("faqs") ? <StableStudentFaqs /> : null}
      {slots.has("photos") ? <StableGallery full={route.route === "/photos"} /> : null}
      {route.route === "/contact" && slots.has("contact") ? <LiveContactSection /> : null}
      {slots.has("signup") ? (
        <LiveSignupSection compact={route.route !== "/"} sourceLabel={route.title} />
      ) : null}
      {route.route !== "/contact" && slots.has("contact") ? (
        <LiveContactSection compact={route.route !== "/contact"} />
      ) : null}
      {route.route === "/" ? <StableAppointments /> : null}
    </>
  );
}

function StableBoardApproval() {
  return (
    <section className="rda-stable-section rda-board-section" data-rda-stable-widget="board">
      <div className="rda-section-heading">
        <h2>Dental Board Course Details</h2>
        <span aria-hidden="true" />
      </div>
      <p className="rda-section-intro">
        Student questions often start with approval status, requirements, and what to bring. These
        details keep the next step clear before anyone enrolls.
      </p>
      <div className="rda-board-grid">
        {boardApprovalHighlights.map((item) => (
          <article className="rda-board-card" key={item.title}>
            <h3>{item.title}</h3>
            <p>{item.summary}</p>
            <a
              href={item.href}
              rel={item.href.startsWith("http") ? "noreferrer" : undefined}
              target={item.href.startsWith("http") ? "_blank" : undefined}
            >
              {item.ctaLabel}
            </a>
          </article>
        ))}
      </div>
    </section>
  );
}

function StableInstructorBios() {
  return (
    <section
      className="rda-stable-section rda-instructors-section"
      data-rda-stable-widget="instructors"
    >
      <div className="rda-section-heading">
        <h2>Instructor Bios</h2>
        <span aria-hidden="true" />
      </div>
      <p className="rda-section-intro">
        Meet the team behind the academy&apos;s hands-on coaching, chairside practice, and
        student-first classroom feel.
      </p>
      <div className="rda-instructor-grid">
        {instructorBios.map((instructor) => (
          <article className="rda-instructor-card" key={instructor.name}>
            <figure className="rda-instructor-photo">
              <Image
                alt={instructor.imageAlt}
                height={720}
                sizes="(max-width: 760px) 100vw, 25vw"
                src={instructor.image}
                width={900}
              />
            </figure>
            <div className="rda-instructor-body">
              <p className="rda-instructor-credential">{instructor.credential}</p>
              <h3>{instructor.name}</h3>
              <p>{instructor.summary}</p>
              <ul>
                {instructor.highlights.map((highlight) => (
                  <li key={highlight}>{highlight}</li>
                ))}
              </ul>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function StableStudentFaqs() {
  return (
    <section className="rda-stable-section rda-student-faq-section" data-rda-stable-widget="faqs">
      <div className="rda-section-heading">
        <h2>Common Student Questions</h2>
        <span aria-hidden="true" />
      </div>
      <p className="rda-section-intro">
        These answers are based on recent questions and course notes shared by the academy team,
        with private student details removed.
      </p>
      <div className="rda-student-faq-grid">
        {studentFaqHighlights.map((item) => (
          <article className="rda-student-faq-card" key={item.question}>
            <h3>{item.question}</h3>
            <p>{item.answer}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

function StableReviews() {
  return (
    <section className="rda-stable-section rda-reviews-section" data-rda-stable-widget="reviews">
      <div className="rda-section-heading">
        <h2>Reviews</h2>
        <span aria-hidden="true" />
      </div>
      <p className="rda-review-score">5.0 Roseville Dental Academy 77 Reviews</p>
      <div className="rda-review-grid">
        {testimonials.slice(0, 3).map((review) => (
          <article className="rda-review-card" key={review.name}>
            <p className="rda-review-rating">{review.rating}.0 / 5</p>
            <blockquote>{review.quote}</blockquote>
            <p className="rda-review-name">{review.name}</p>
            <p className="rda-review-meta">{review.meta}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

function StableGallery({ full = false }: { full?: boolean }) {
  const groups = full ? photoGroups : [{ ...homeGalleryHighlight, items: homeGalleryHighlight.items }];

  return (
    <section className="rda-stable-section rda-gallery-section" data-rda-stable-widget="gallery">
      <div className="rda-section-heading">
        <h2>{full ? "Photo Gallery" : homeGalleryHighlight.title}</h2>
        <span aria-hidden="true" />
      </div>
      <div className="rda-gallery-groups">
        {groups.map((group) => (
          <div className="rda-gallery-group" key={group.title}>
            {full ? (
              <>
                <h3>{group.title}</h3>
                <p>{group.copy}</p>
              </>
            ) : null}
            <div className="rda-gallery-grid">
              {group.items.map((item) => (
                <figure className="rda-gallery-item" key={item.src}>
                  <Image alt={item.alt} height={420} sizes="(max-width: 760px) 100vw, 33vw" src={item.src} width={640} />
                </figure>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function StableAppointments() {
  return (
    <section className="rda-stable-section rda-appointments-section" data-rda-stable-widget="appointments">
      <div className="rda-section-heading">
        <h2>Online Appointments</h2>
        <span aria-hidden="true" />
      </div>
      <p>New services are coming soon!</p>
      <SocialLinkButtons links={socialLinks} variant="inline" />
    </section>
  );
}
