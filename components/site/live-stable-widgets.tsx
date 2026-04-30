import Image from "next/image";

import type { LiveRoute } from "@/lib/live-route-data";
import {
  homeGalleryHighlight,
  photoGroups,
  socialLinks,
  testimonials,
} from "@/lib/site-data";

import { LiveContactSection } from "./live-contact-section";
import { LiveSignupSection } from "./live-signup-section";

export function LiveStableWidgets({ route }: { route: LiveRoute }) {
  const slots = new Set(route.widgetSlots);

  return (
    <>
      {slots.has("reviews") ? <StableReviews /> : null}
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
      <div className="rda-social-row">
        {socialLinks.map((link) => (
          <a href={link.href} key={link.href} rel="noreferrer" target="_blank">
            {link.label}
          </a>
        ))}
      </div>
    </section>
  );
}
