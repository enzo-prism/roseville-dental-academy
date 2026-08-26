import Link from "next/link";

import { siteContact, socialLinks, whatsAppUrl } from "@/lib/site-data";
import { SocialLinkButtons } from "@/components/site/social-link-buttons";
import { WhatsAppIcon } from "@/components/site/whatsapp-icon";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

const footerLinks = [
  { href: "/dental-assisting-program", label: "Dental Assisting Program" },
  { href: "/journey", label: "Career Journey" },
  { href: "/faqs-1", label: "FAQs" },
  { href: "/photos", label: "Photos" },
  { href: "/contact", label: "Contact Us" },
];

export function LiveFooter() {
  return (
    <footer className="rda-live-footer border-t border-border bg-primary text-primary-foreground" data-rda-shell-footer="true">
      <div className="rda-footer-inner">
        <div className="rda-footer-contact">
          <p className="rda-footer-name">{siteContact.school}</p>
          <p>{siteContact.address}</p>
          <p>
            <a data-rda-lead-source="phone" href={`tel:${siteContact.phone.replace(/\D/g, "")}`}>
              {siteContact.phone}
            </a>
          </p>
          <p>
            <a href={`mailto:${siteContact.email}`}>{siteContact.email}</a>
          </p>
          <Button
            asChild
            className="rda-footer-whatsapp mt-1"
            data-rda-lead-source="whatsapp"
            data-rda-whatsapp="true"
            size="sm"
            variant="whatsapp"
          >
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
          <div className="rda-footer-hours">
            <p>{siteContact.hoursLabel}</p>
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
        <Separator className="rda-footer-separator bg-primary-foreground/20" />
        <nav aria-label="Footer" className="rda-footer-links">
          {footerLinks.map((link) => (
            <Link href={link.href} key={link.href}>
              {link.label}
            </Link>
          ))}
        </nav>
        <SocialLinkButtons links={socialLinks} variant="footer" />
        <p className="rda-footer-policy">All Roseville Dental Academy courses are nonrefundable.</p>
        <p className="rda-footer-copy">Copyright © 2026 rosevilledental - All Rights Reserved.</p>
      </div>
    </footer>
  );
}
