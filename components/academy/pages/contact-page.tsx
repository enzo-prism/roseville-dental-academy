import { Mail, MessageCircle, Phone } from "lucide-react";

import { PageHero } from "@/components/academy/page-hero";
import { LiveContactSection } from "@/components/site/live-contact-section";
import { LiveSignupSection } from "@/components/site/live-signup-section";
import { WhatsAppIcon } from "@/components/site/whatsapp-icon";
import { siteContact, whatsAppUrl } from "@/lib/site-data";

export function ContactPage({ sourceLabel }: { sourceLabel: string }) {
  const phoneHref = `tel:${siteContact.phone.replace(/\D/g, "")}`;

  return (
    <div className="ac-page" data-rda-contact-page="true">
      <PageHero
        aside={
          <ul className="ac-quick-contact">
            <li>
              <a data-rda-lead-source="phone" href={phoneHref}>
                <span className="ac-icon-tile">
                  <Phone aria-hidden="true" />
                </span>
                <span>
                  <strong>Call</strong>
                  {siteContact.phone}
                </span>
              </a>
            </li>
            <li>
              <a
                data-rda-lead-source="whatsapp"
                data-rda-whatsapp="true"
                href={whatsAppUrl}
                rel="noreferrer"
                target="_blank"
              >
                <span className="ac-icon-tile ac-icon-tile-whatsapp">
                  <WhatsAppIcon />
                </span>
                <span>
                  <strong>WhatsApp</strong>
                  {siteContact.whatsAppDisplay}
                </span>
              </a>
            </li>
            <li>
              <a href={`mailto:${siteContact.email}`}>
                <span className="ac-icon-tile">
                  <Mail aria-hidden="true" />
                </span>
                <span>
                  <strong>Email</strong>
                  {siteContact.email}
                </span>
              </a>
            </li>
          </ul>
        }
        breadcrumb="Contact"
        eyebrow="Get in touch"
        intro="Questions about classes, start dates, or requirements? Call, message, or stop by — admissions is happy to help you find the right course."
        title={
          <>
            We&apos;d love to <em>hear from you</em>
          </>
        }
      />
      <LiveContactSection />
      <div className="ac-contact-divider" aria-hidden="true">
        <MessageCircle />
      </div>
      <LiveSignupSection compact pagePath="/contact" sourceLabel={sourceLabel} />
    </div>
  );
}
