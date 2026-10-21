import Image from "next/image";
import { ArrowRight, Clock3, Mail, MapPin, Phone, Star } from "lucide-react";

import { SiteLink as Link } from "@/components/site/site-link";
import { SeasonalFooterDecor } from "@/components/site/seasonal-footer-decor";
import { SeasonalFooterFog } from "@/components/site/seasonal-footer-fog";
import { SocialLinkButtons } from "@/components/site/social-link-buttons";
import { WhatsAppIcon } from "@/components/site/whatsapp-icon";
import { CANCELLATION_POLICY_PATH, CANCELLATION_POLICY_SUMMARY, CANCELLATION_POLICY_TITLE } from "@/lib/academy-policies";
import { academyCourses } from "@/lib/academy-catalog";
import { googleReviewsAggregate, siteContact, socialLinks, whatsAppUrl } from "@/lib/site-data";

const academyLinks = [
  { href: "/meet-the-instructors", label: "Meet the Instructors" },
  { href: "/reviews", label: "Student Reviews" },
  { href: "/photos", label: "Photos" },
  { href: "/journey", label: "Career Journey" },
  { href: "/resources", label: "Resources" },
  { href: "/faqs-1", label: "FAQs" },
  { href: "/student-jobs", label: "Student & Alumni Jobs" },
  { href: "/contact", label: "Contact Us" },
];

export function LiveFooter({ seasonal = false }: { seasonal?: boolean }) {
  const phoneHref = `tel:${siteContact.phone.replace(/\D/g, "")}`;

  return (
    <footer className="rda-live-footer" data-rda-shell-footer="true">
      {seasonal ? <SeasonalFooterFog /> : null}
      {seasonal ? <SeasonalFooterDecor /> : null}
      <div className="ac-container rda-footer-inner">
        <div className="ac-footer-cta">
          <div>
            <p className="ac-eyebrow">Your next chapter</p>
            <p className="ac-footer-cta-title">
              Ready to start your <em>dental career</em>?
            </p>
          </div>
          <div className="ac-footer-cta-actions">
            <Link className="ac-btn ac-btn-light ac-btn-lg" href="/#quick-sign-up">
              Ask About Classes
              <ArrowRight aria-hidden="true" data-ac-arrow="" />
            </Link>
            <a className="ac-btn ac-btn-outline-light ac-btn-lg" data-rda-lead-source="phone" href={phoneHref}>
              <Phone aria-hidden="true" />
              {siteContact.phone}
            </a>
          </div>
        </div>

        <div className="ac-footer-grid">
          <div className="rda-footer-contact ac-footer-brand">
            <Link aria-label="Roseville Dental Academy home" className="ac-footer-logo" href="/">
              <Image
                alt=""
                height={601}
                src="/assets/live/home/logo-academy.png"
                width={620}
              />
              <span className="rda-footer-name">{siteContact.school}</span>
            </Link>
            <p className="ac-footer-rating">
              <span aria-hidden="true" className="ac-stars">
                {Array.from({ length: 5 }, (_, index) => (
                  <Star key={index} />
                ))}
              </span>
              {googleReviewsAggregate.ratingValue.toFixed(1)} · {googleReviewsAggregate.reviewCount} Google reviews
            </p>
            <ul className="ac-footer-contact-list">
              <li>
                <MapPin aria-hidden="true" />
                <a href={siteContact.directionsUrl} rel="noreferrer" target="_blank">
                  {siteContact.address}
                </a>
              </li>
              <li>
                <Phone aria-hidden="true" />
                <a data-rda-lead-source="phone" href={phoneHref}>
                  {siteContact.phone}
                </a>
              </li>
              <li>
                <Mail aria-hidden="true" />
                <a href={`mailto:${siteContact.email}`}>{siteContact.email}</a>
              </li>
            </ul>
            <a
              aria-label={siteContact.whatsAppLabel}
              className="rda-footer-whatsapp ac-btn ac-btn-sm"
              data-rda-lead-source="whatsapp"
              data-rda-whatsapp="true"
              href={whatsAppUrl}
              rel="noreferrer"
              target="_blank"
            >
              <WhatsAppIcon />
              <span>{siteContact.whatsAppLabel}</span>
            </a>
          </div>

          <nav aria-label="Courses" className="ac-footer-col">
            <p className="ac-footer-heading">Courses</p>
            <ul>
              {academyCourses.map((course) => (
                <li key={course.id}>
                  <Link href={course.href}>{course.name}</Link>
                </li>
              ))}
            </ul>
          </nav>

          <nav aria-label="Footer" className="ac-footer-col rda-footer-links">
            <p className="ac-footer-heading">Academy</p>
            <ul>
              {academyLinks.map((link) => (
                <li key={link.href}>
                  {link.href === "/student-jobs" ? (
                    <a href={link.href}>{link.label}</a>
                  ) : (
                    <Link href={link.href}>{link.label}</Link>
                  )}
                </li>
              ))}
            </ul>
          </nav>

          <div className="ac-footer-col rda-footer-hours">
            <p className="ac-footer-heading">
              <Clock3 aria-hidden="true" />
              {siteContact.hoursLabel}
            </p>
            <dl>
              {siteContact.weeklyHours.map((entry) => (
                <div key={entry.day}>
                  <dt>{entry.day}</dt>
                  <dd>{entry.time}</dd>
                </div>
              ))}
            </dl>
            <p className="rda-hours-note">{siteContact.hoursNote}</p>
          </div>
        </div>

        <div className="ac-footer-bottom">
          <SocialLinkButtons links={socialLinks} variant="footer" />
          <p className="rda-footer-policy">
            {CANCELLATION_POLICY_SUMMARY}{" "}
            <Link href={CANCELLATION_POLICY_PATH}>{CANCELLATION_POLICY_TITLE}</Link>
          </p>
          <p className="rda-footer-copy">Copyright © 2026 rosevilledental - All Rights Reserved.</p>
        </div>
      </div>
    </footer>
  );
}
