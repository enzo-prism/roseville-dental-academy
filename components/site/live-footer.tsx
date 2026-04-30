import Link from "next/link";

import { siteContact, socialLinks } from "@/lib/site-data";

const footerLinks = [
  { href: "/dental-assisting-program", label: "Dental Assisting Program" },
  { href: "/front-office-program", label: "Front Office Program" },
  { href: "/faqs-1", label: "FAQs" },
  { href: "/photos", label: "Photos" },
  { href: "/contact", label: "Contact Us" },
];

export function LiveFooter() {
  return (
    <footer className="rda-live-footer" data-rda-shell-footer="true">
      <div className="rda-footer-inner">
        <div className="rda-footer-contact">
          <p className="rda-footer-name">{siteContact.school}</p>
          <p>{siteContact.address}</p>
          <p>
            <a href={`tel:${siteContact.phone.replace(/\D/g, "")}`}>{siteContact.phone}</a>
          </p>
          <p>
            <a href={`mailto:${siteContact.email}`}>{siteContact.email}</a>
          </p>
          <div className="rda-footer-hours">
            <p>Hours</p>
            <dl>
              {siteContact.weeklyHours.map((entry) => (
                <div key={entry.day}>
                  <dt>{entry.day}</dt>
                  <dd>{entry.time}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
        <nav aria-label="Footer" className="rda-footer-links">
          {footerLinks.map((link) => (
            <Link href={link.href} key={link.href}>
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="rda-footer-social" aria-label="Social links">
          {socialLinks.map((link) => (
            <a href={link.href} key={link.href} rel="noreferrer" target="_blank">
              {link.label}
            </a>
          ))}
        </div>
        <p className="rda-footer-copy">Copyright © 2020 rosevilledental - All Rights Reserved.</p>
      </div>
    </footer>
  );
}
