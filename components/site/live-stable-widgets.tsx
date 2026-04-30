import Image from "next/image";

import type { LiveRoute } from "@/lib/live-route-data";
import {
  homeGalleryHighlight,
  photoGroups,
  siteContact,
  socialLinks,
  testimonials,
} from "@/lib/site-data";

import { LiveContactSection } from "./live-contact-section";

export function LiveStableWidgets({ route }: { route: LiveRoute }) {
  const slots = new Set(route.widgetSlots);

  return (
    <>
      {slots.has("reviews") ? <StableReviews /> : null}
      {slots.has("photos") ? <StableGallery full={route.route === "/photos"} /> : null}
      {slots.has("newsletter") ? <StableNewsletter /> : null}
      {slots.has("contact") ? <LiveContactSection compact={route.route !== "/contact"} /> : null}
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

function StableNewsletter() {
  return (
    <section className="rda-stable-section rda-newsletter-section" data-rda-stable-widget="newsletter">
      <div className="rda-section-heading">
        <h2>Subscribe</h2>
        <span aria-hidden="true" />
      </div>
      <form action={siteContact.formspreeEndpoint} data-rda-subscribe-form="true" method="post">
        <label>
          <span>Email</span>
          <input aria-label="Email" name="_replyto" placeholder="Email" required type="email" />
        </label>
        <button data-aid="SUBSCRIBE_SUBMIT_BUTTON_REND" type="submit">
          Sign up
        </button>
      </form>
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
