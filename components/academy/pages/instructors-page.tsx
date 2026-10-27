import Image from "next/image";
import Link from "next/link";
import type { CSSProperties } from "react";
import {
  ArrowRight,
  Award,
  BadgeCheck,
  BriefcaseBusiness,
  CheckCircle2,
  Mail,
  MessageSquareQuote,
  Phone,
  Star,
  Stethoscope,
  Users,
} from "lucide-react";

import { AcademyMediaSection } from "@/components/academy/academy-media";
import { PageHero } from "@/components/academy/page-hero";
import { LiveSignupSection } from "@/components/site/live-signup-section";
import { academyTeamMedia } from "@/lib/academy-media";
import { academyInstructors, countReviewMentions } from "@/lib/academy-instructors";
import { googleReviews, instructorsPage, siteContact } from "@/lib/site-data";

const featureIcons = { "badge-check": BadgeCheck, briefcase: BriefcaseBusiness, users: Users } as const;

function quotesMentioning(name: string, limit: number) {
  const pattern = new RegExp(`\\b${name}\\b`, "iu");
  return googleReviews.filter((review) => pattern.test(review.quote)).slice(0, limit);
}

export function InstructorsPage({ sourceLabel }: { sourceLabel: string }) {
  return (
    <div className="ac-page" data-rda-instructors-page="true">
      <PageHero
        actions={
          <>
            <a className="ac-btn ac-btn-primary ac-btn-lg" data-rda-lead-source="phone" href={`tel:${siteContact.phone.replace(/\D/g, "")}`}>
              <Phone aria-hidden="true" />
              Call admissions
            </a>
            <a className="ac-btn ac-btn-secondary ac-btn-lg" href={`mailto:${siteContact.email}`}>
              <Mail aria-hidden="true" />
              Email the academy
            </a>
          </>
        }
        aside={
          <div className="ac-portrait-cluster" aria-hidden="true">
            {academyInstructors.map((instructor, index) => (
              <figure
                className="ac-portrait-chip"
                key={instructor.name}
                style={{ "--i": index } as CSSProperties}
              >
                <Image alt="" fill sizes="220px" src={instructor.image} />
                <figcaption>
                  <strong>{instructor.name}</strong>
                  <span>{instructor.credential}</span>
                </figcaption>
              </figure>
            ))}
          </div>
        }
        breadcrumb="Meet the Instructors"
        eyebrow={instructorsPage.hero.eyebrow}
        intro={instructorsPage.hero.intro}
        title={
          <>
            Learn from instructors who teach in a <em>working practice</em>
          </>
        }
      />

      <section aria-labelledby="ac-bios-title" className="ac-section ac-section-tight" data-rda-stable-widget="instructors">
        <div className="ac-container">
          <div className="ac-heading rda-section-heading" data-reveal="">
            <p className="ac-eyebrow">The team</p>
            <h2 className="ac-h2" id="ac-bios-title">
              Instructor Bios
            </h2>
            <span aria-hidden="true" />
            <p className="ac-lede">
              Meet the team behind the academy&apos;s hands-on coaching, chairside practice, and
              student-first classroom feel.
            </p>
          </div>

          <div className="ac-bio-list">
            {academyInstructors.map((instructor, index) => {
              const mentions = countReviewMentions(instructor.name);
              const quotes = quotesMentioning(instructor.name, 3);

              return (
                <article
                  className="ac-bio rda-instructor-card"
                  data-reveal=""
                  data-side={index % 2 ? "right" : "left"}
                  key={instructor.name}
                >
                  <div className="ac-bio-photo ac-photo">
                    <Image
                      alt={instructor.imageAlt}
                      fill
                      sizes="(max-width: 900px) 100vw, 40vw"
                      src={instructor.image}
                    />
                    {mentions > 0 ? (
                      <span className="ac-bio-mentions">
                        <Star aria-hidden="true" />
                        Named in {mentions} Google review{mentions === 1 ? "" : "s"}
                      </span>
                    ) : null}
                  </div>
                  <div className="ac-bio-body">
                    <p className="ac-chip ac-chip-soft">
                      <Award aria-hidden="true" />
                      {instructor.credential}
                    </p>
                    <h3 className="ac-h2">{instructor.name}</h3>
                    <p className="ac-body ac-bio-summary">{instructor.summary}</p>
                    <ul className="ac-bio-highlights">
                      {instructor.highlights.map((highlight) => (
                        <li key={highlight}>
                          <CheckCircle2 aria-hidden="true" />
                          {highlight}
                        </li>
                      ))}
                    </ul>
                    {quotes.length ? (
                      <div className="ac-bio-quotes">
                        <p className="ac-bio-quotes-label">
                          <MessageSquareQuote aria-hidden="true" />
                          What students say about {instructor.name}
                        </p>
                        {quotes.map((quote) => (
                          <blockquote key={`${quote.name}-${quote.meta}`}>
                            <p>&ldquo;{quote.quote}&rdquo;</p>
                            <cite>
                              {quote.name} · {quote.meta.replace("Google review · ", "")}
                            </cite>
                          </blockquote>
                        ))}
                      </div>
                    ) : null}
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section aria-labelledby="ac-doctor-title" className="ac-section ac-section-tight">
        <div className="ac-container">
          <article className="ac-doctor ac-card" data-reveal="">
            <span className="ac-icon-tile">
              <Stethoscope aria-hidden="true" />
            </span>
            <div>
              <p className="ac-eyebrow ac-eyebrow-plain">Also on the team</p>
              <h2 className="ac-h3" id="ac-doctor-title">
                Dr. Michael Narodovich — &ldquo;Dr. Mike&rdquo;
              </h2>
              <p className="ac-body">
                Students train inside Waikiki Dental, and Dr. Mike also offers custom, one-on-one
                implant and bone grafting coaching for dentists — CBCT-guided and free-hand implant
                placement, bone grafting, and crestal sinus augmentation, hands-on with your own patients.
              </p>
            </div>
            <Link className="ac-btn ac-btn-secondary" href="/contact">
              Ask about coaching
              <ArrowRight aria-hidden="true" data-ac-arrow="" />
            </Link>
          </article>
        </div>
      </section>

      <section aria-labelledby="ac-approach-title" className="ac-section ac-band-ink">
        <div className="ac-container">
          <div className="ac-heading rda-section-heading ac-heading-center" data-reveal="">
            <p className="ac-eyebrow ac-eyebrow-plain">How we teach</p>
            <h2 className="ac-h2" id="ac-approach-title">
              Coaching you can <em>feel</em> on day one
            </h2>
            <span aria-hidden="true" />
          </div>
          <div className="ac-approach-grid">
            {instructorsPage.features.map((feature, index) => {
              const Icon = featureIcons[feature.icon as keyof typeof featureIcons] ?? BadgeCheck;

              return (
                <article
                  className="ac-approach-card"
                  data-reveal=""
                  key={feature.title}
                  style={{ "--reveal-delay": index } as CSSProperties}
                >
                  <span className="ac-icon-tile">
                    <Icon aria-hidden="true" />
                  </span>
                  <h3 className="ac-h3">{feature.title}</h3>
                  <p>{feature.summary}</p>
                </article>
              );
            })}
          </div>
          <div className="ac-approach-photos">
            {[
              { alt: "Instructor coaching a student chairside.", src: "/assets/live/instructors/jessica-teaching.jpg" },
              { alt: "Students practicing on typodonts.", src: "/assets/live/drive/typodont-practice.jpg" },
              { alt: "Students practicing x-ray positioning.", src: "/assets/live/drive/xray-chairside.jpg" },
            ].map((photo, index) => (
              <figure
                className="ac-photo ac-photo-zoom"
                data-reveal="zoom"
                key={photo.src}
                style={{ "--reveal-delay": index } as CSSProperties}
              >
                <Image alt={photo.alt} fill sizes="(max-width: 760px) 100vw, 33vw" src={photo.src} />
              </figure>
            ))}
          </div>
        </div>
      </section>

      <AcademyMediaSection
        description="A teaching milestone from the academy Instagram, plus a captioned classroom introduction."
        id="academy-team-media"
        items={academyTeamMedia}
        title="The team, from recent posts"
      />

      <LiveSignupSection compact pagePath="/meet-the-instructors" sourceLabel={sourceLabel} />
    </div>
  );
}
