"use client";

import type { FormEvent } from "react";
import { useEffect, useId } from "react";
import {
  BadgeCheck,
  CalendarDays,
  CheckCircle2,
  ClipboardCheck,
  Mail,
  Phone,
  Quote,
  Send,
  Star,
  UserRound,
} from "lucide-react";

import { LeadFormError, LeadFormSuccess } from "@/components/site/lead-form-status";
import { trackGaEvent } from "@/components/site/google-analytics";
import { trackSiteEvent } from "@/components/site/interaction-analytics";
import { trackMetaPixelEvent } from "@/components/site/meta-pixel";
import { WhatsAppIcon } from "@/components/site/whatsapp-icon";
import {
  AD_CLICK_ID_FIELDS,
  UTM_FIELDS,
  useLeadAttribution,
  useLeadFormSubmit,
} from "@/components/site/use-lead-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { AdLandingPage as AdLandingPageData } from "@/lib/ad-landing-pages";
import { siteContact, whatsAppUrl } from "@/lib/site-data";

type AdLandingPageProps = {
  page: AdLandingPageData;
};

const SELECT_ICONS = {
  calendar: CalendarDays,
  check: CheckCircle2,
  user: UserRound,
} as const;

function getLandingViewContext(page: AdLandingPageData) {
  const searchParams = new URLSearchParams(window.location.search);
  const utmContext = Object.fromEntries(
    UTM_FIELDS.map((field) => [field, searchParams.get(field) || undefined]),
  );

  return {
    campaign_intent: page.campaignIntent,
    content_category: page.contentCategory,
    course_interest: page.courseInterests.join(", "),
    landing_page: page.slug,
    page_path: page.path,
    ...utmContext,
  };
}

function trackLandingView(page: AdLandingPageData) {
  let attempts = 0;
  let retryTimer: number | undefined;
  let disposed = false;
  let didTrackGa = false;
  let didTrackMeta = false;
  let didTrackVercel = false;
  const viewContext = getLandingViewContext(page);

  const send = () => {
    attempts += 1;

    // The Analytics component initializes after child effects. Wait for the
    // first retry so the event is not lost during that handoff.
    if (!didTrackVercel && attempts > 1) {
      trackSiteEvent("ad_landing_view", viewContext);
      didTrackVercel = true;
    }

    if (!didTrackGa) {
      didTrackGa = trackGaEvent("ad_landing_view", viewContext);
    }

    if (!didTrackMeta) {
      didTrackMeta = trackMetaPixelEvent("ViewContent", {
        content_name: page.campaignIntent,
        ...viewContext,
      });
    }

    if ((!didTrackGa || !didTrackMeta || !didTrackVercel) && !disposed && attempts < 10) {
      retryTimer = window.setTimeout(send, 500);
    }
  };

  send();

  return () => {
    disposed = true;
    if (retryTimer) {
      window.clearTimeout(retryTimer);
    }
  };
}

function IconLabel({
  children,
  icon,
}: {
  children: string;
  icon: "calendar" | "check";
}) {
  const Icon = icon === "calendar" ? CalendarDays : CheckCircle2;

  return (
    <span className="rda-ad-icon-label">
      <Icon aria-hidden="true" />
      {children}
    </span>
  );
}

function StarRating({ rating }: { rating: number }) {
  const roundedRating = Math.max(0, Math.min(5, Math.round(rating)));

  return (
    <div className="rda-ad-rating" aria-label={`${roundedRating} out of 5 stars`}>
      {Array.from({ length: roundedRating }).map((_, index) => (
        <Star aria-hidden="true" fill="currentColor" key={index} />
      ))}
    </div>
  );
}

export function AdLandingPage({ page }: AdLandingPageProps) {
  const formId = useId();
  const attribution = useLeadAttribution();
  const { status, submitLeadForm } = useLeadFormSubmit();
  const environment = process.env.NEXT_PUBLIC_VERCEL_ENV ?? process.env.NODE_ENV ?? "production";
  const interestsLabel = page.courseInterests.join(", ");
  const hasCourseProof = Boolean(page.gallery?.length || page.reviews?.length);
  const socialProof = page.socialProof;

  useEffect(() => trackLandingView(page), [page]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    if (!event.nativeEvent.isTrusted) {
      return;
    }

    event.preventDefault();
    void submitLeadForm(event.currentTarget);
  }

  return (
    <article className="rda-ad-landing" data-rda-ad-landing-page={page.slug}>
      <section className="rda-ad-hero" aria-labelledby={`${formId}-hero-title`}>
        <div className="rda-ad-hero-copy">
          <p className="rda-ad-eyebrow">{page.eyebrow}</p>
          <h1 id={`${formId}-hero-title`}>{page.hero.title}</h1>
          <p className="rda-ad-hero-intro">{page.hero.intro}</p>
          <div className="rda-ad-hero-actions">
            <Button asChild>
              <a
                data-rda-ad-landing-cta="true"
                data-rda-campaign-intent={page.campaignIntent}
                data-rda-landing-page={page.slug}
                href="#ad-lead-form"
              >
                {page.primaryCtaLabel}
              </a>
            </Button>
            <Button asChild variant="outline">
              <a href={`tel:${siteContact.phone.replace(/\D/g, "")}`}>
                Call {siteContact.phone}
              </a>
            </Button>
            <Button asChild data-rda-whatsapp="true" variant="whatsapp">
              <a
                aria-label={siteContact.whatsAppLabel}
                href={whatsAppUrl}
                rel="noreferrer"
                target="_blank"
              >
                <WhatsAppIcon />
                <span>{siteContact.whatsAppLabel}</span>
              </a>
            </Button>
          </div>
          <div className="rda-ad-hero-signals" aria-label="Landing page highlights">
            <IconLabel icon="calendar">{page.hero.badge}</IconLabel>
            <IconLabel icon="check">Roseville, CA hands-on training</IconLabel>
          </div>
        </div>
        <figure className="rda-ad-hero-media">
          {/* eslint-disable-next-line @next/next/no-img-element -- Existing live assets are literal paths. */}
          <img alt={page.hero.imageAlt} src={page.hero.imageSrc} />
        </figure>
      </section>

      <section className="rda-ad-section rda-ad-facts" aria-label="Course facts">
        {page.facts.map((fact) => (
          <div className="rda-ad-fact" key={`${fact.label}-${fact.value}`}>
            <span>{fact.label}</span>
            <strong>{fact.value}</strong>
          </div>
        ))}
      </section>

      {hasCourseProof ? (
        <section
          className="rda-ad-section rda-ad-course-proof"
          aria-labelledby={`${formId}-course-proof-title`}
        >
          <div className="rda-ad-section-heading rda-ad-section-heading-wide">
            <p className="rda-ad-eyebrow">{socialProof?.eyebrow ?? "Student proof"}</p>
            <h2 id={`${formId}-course-proof-title`}>
              {socialProof?.title ?? "Real reviews and photos from this training path"}
            </h2>
          </div>
          <div className="rda-ad-course-proof-layout">
            {page.gallery?.length ? (
              <div
                className="rda-ad-gallery"
                aria-label={socialProof?.galleryLabel ?? "Student success photos"}
              >
                {page.gallery.map((image, index) => (
                  <figure
                    className={
                      index === 0
                        ? "rda-ad-gallery-card rda-ad-gallery-card-featured"
                        : "rda-ad-gallery-card"
                    }
                    key={`${image.src}-${image.caption}`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element -- Existing live assets are literal paths. */}
                    <img
                      alt={image.alt}
                      data-rda-course-gallery-image="true"
                      src={image.src}
                    />
                    <figcaption>{image.caption}</figcaption>
                  </figure>
                ))}
              </div>
            ) : null}
            {page.reviews?.length ? (
              <div
                className="rda-ad-review-grid"
                aria-label={socialProof?.reviewLabel ?? "Student reviews"}
              >
                {page.reviews.map((review) => (
                  <article
                    className="rda-ad-review-card"
                    data-rda-course-review="true"
                    key={`${review.name}-${review.feature}`}
                  >
                    <div className="rda-ad-review-card-top">
                      <StarRating rating={review.rating} />
                      <span className="rda-ad-review-feature">{review.feature}</span>
                    </div>
                    <Quote aria-hidden="true" className="rda-ad-review-mark" />
                    <blockquote>{review.quote}</blockquote>
                    <footer className="rda-ad-review-footer">
                      <strong>{review.name}</strong>
                      <span>{review.meta}</span>
                    </footer>
                  </article>
                ))}
              </div>
            ) : null}
          </div>
        </section>
      ) : null}

      <section className="rda-ad-section rda-ad-proof" aria-labelledby={`${formId}-proof-title`}>
        <div className="rda-ad-section-heading">
          <p className="rda-ad-eyebrow">What is included</p>
          <h2 id={`${formId}-proof-title`}>Clear next steps for this specific course interest</h2>
        </div>
        <div className="rda-ad-proof-grid">
          {page.proofPoints.map((point) => (
            <div className="rda-ad-proof-card" key={point}>
              <BadgeCheck aria-hidden="true" />
              <p>{point}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="rda-ad-section rda-ad-details" aria-label="Program details">
        <div className="rda-ad-detail-column">
          {page.sections.map((section) => (
            <section className="rda-ad-detail-block" key={section.title}>
              <h2>{section.title}</h2>
              <ul>
                {section.items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </section>
          ))}
          <section className="rda-ad-detail-block">
            <h2>Upcoming dates</h2>
            <div className="rda-ad-date-list">
              {page.dates.map((date) => (
                <span key={date}>{date}</span>
              ))}
            </div>
            <p className="rda-ad-muted">
              Dates are penciled in and admissions will confirm current availability.
            </p>
          </section>
        </div>

        <aside className="rda-ad-form-panel" aria-labelledby={`${formId}-form-title`}>
          <div className="rda-ad-form-heading">
            <span className="rda-ad-form-icon">
              <ClipboardCheck aria-hidden="true" />
            </span>
            <div>
              <p className="rda-ad-eyebrow">Request info</p>
              <h2 id={`${formId}-form-title`}>{page.primaryCtaLabel}</h2>
              <p>{interestsLabel}</p>
            </div>
          </div>

          {status === "success" ? (
            <LeadFormSuccess
              copy="Your request is on its way. Admissions will follow up with availability, requirements, and registration next steps."
              title="Request sent"
            />
          ) : (
            <form
              action={page.formspreeEndpoint ?? siteContact.formspreeEndpoint}
              className="rda-ad-form"
              data-rda-form-id="ad_landing_lead"
              data-rda-landing-form="true"
              data-rda-signup-form="true"
              id="ad-lead-form"
              method="post"
              onSubmit={handleSubmit}
            >
              <input name="_subject" type="hidden" value={`RDA landing page lead: ${page.slug}`} />
              <input name="Source page" type="hidden" value={page.metaTitle} />
              <input name="site" type="hidden" value={siteContact.formspreeOps.site} />
              <input
                name="form_key"
                type="hidden"
                value={page.formKey ?? siteContact.formspreeOps.formKey}
              />
              <input name="environment" type="hidden" value={environment} />
              <input name={siteContact.formspreeOps.qaField} type="hidden" value="false" />
              <input name="page_path" type="hidden" value={page.path} />
              <input name="referrer" type="hidden" value={attribution.referrer} />
              <input name="landing_page" type="hidden" value={page.slug} />
              <input name="campaign_intent" type="hidden" value={page.campaignIntent} />
              <input name="course_interest" type="hidden" value={interestsLabel} />
              {UTM_FIELDS.map((field) => (
                <input key={field} name={field} type="hidden" value={attribution.utm[field]} />
              ))}
              {AD_CLICK_ID_FIELDS.map((field) => (
                <input
                  key={field}
                  name={field}
                  type="hidden"
                  value={attribution.clickIds[field]}
                />
              ))}
              {page.courseInterests.map((interest) => (
                <input key={interest} name="Interested classes[]" type="hidden" value={interest} />
              ))}

              <label>
                <span>
                  <UserRound aria-hidden="true" />
                  Name
                </span>
                <Input autoComplete="name" name="Name" placeholder="Name" required type="text" />
              </label>
              <label>
                <span>
                  <Mail aria-hidden="true" />
                  Email
                </span>
                <Input
                  autoComplete="email"
                  name="_replyto"
                  placeholder="Email"
                  required
                  type="email"
                />
              </label>
              <label>
                <span>
                  <Phone aria-hidden="true" />
                  Phone
                </span>
                <Input autoComplete="tel" name="Phone" placeholder="Phone" required type="tel" />
              </label>
              {page.leadSelects?.map((field) => {
                const Icon = field.icon ? SELECT_ICONS[field.icon] : null;

                return (
                  <label key={field.name}>
                    <span>
                      {Icon ? <Icon aria-hidden="true" /> : null}
                      {field.label}
                    </span>
                    <select
                      defaultValue={field.required ? "" : field.options[0]}
                      name={field.name}
                      required={field.required}
                    >
                      {field.required ? (
                        <option disabled value="">
                          Select one
                        </option>
                      ) : null}
                      {field.options.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </label>
                );
              })}
              <label>
                <span>Questions or timing notes</span>
                <Textarea
                  name="Notes"
                  placeholder="Best times, current certifications, or class questions"
                  rows={4}
                />
              </label>
              {page.consent ? (
                <label className="rda-ad-form-consent">
                  <input name={page.consent.name} required type="checkbox" value="Yes" />
                  <span>{page.consent.label}</span>
                </label>
              ) : null}
              {status === "error" ? <LeadFormError /> : null}
              <Button disabled={status === "submitting"} type="submit">
                {status === "submitting" ? "Sending..." : page.primaryCtaLabel}
                <Send aria-hidden="true" />
              </Button>
              <p className="rda-ad-form-note">
                This request does not reserve a seat or collect payment. Admissions will
                confirm the right next step directly.
              </p>
            </form>
          )}
        </aside>
      </section>
    </article>
  );
}
