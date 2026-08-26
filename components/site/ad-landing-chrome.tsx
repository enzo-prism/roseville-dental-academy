import Image from "next/image";
import Link from "next/link";
import { Phone } from "lucide-react";

import { Button } from "@/components/ui/button";
import { siteContact } from "@/lib/site-data";

const logoSrc = "/assets/live/home/logo-academy.png";

function phoneHref() {
  return `tel:${siteContact.phone.replace(/\D/g, "")}`;
}

export function AdLandingHeader() {
  return (
    <header className="rda-ad-lander-header" data-rda-ad-lander-header="true">
      <Link aria-label="Roseville Dental Academy" className="rda-ad-lander-logo" href="/">
        <Image
          alt="Roseville Dental Academy logo with dental tools and a tooth symbol."
          height={56}
          priority
          sizes="56px"
          src={logoSrc}
          width={58}
        />
      </Link>
      <Button asChild>
        <a data-rda-lead-source="phone" href={phoneHref()}>
          <Phone aria-hidden="true" />
          <span>Call {siteContact.phone}</span>
        </a>
      </Button>
    </header>
  );
}

export function AdLandingFooter() {
  return (
    <footer className="rda-ad-lander-footer" data-rda-ad-lander-footer="true">
      <p className="rda-ad-lander-footer-name">{siteContact.school}</p>
      <p>{siteContact.address}</p>
      <p>
        <a data-rda-lead-source="phone" href={phoneHref()}>
          {siteContact.phone}
        </a>
      </p>
      <p className="rda-ad-lander-footer-copy">
        Copyright © 2026 rosevilledental - All Rights Reserved.
      </p>
    </footer>
  );
}
