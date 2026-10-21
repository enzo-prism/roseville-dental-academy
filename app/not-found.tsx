import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, GraduationCap, MessageSquareHeart, Phone, SearchX } from "lucide-react";

import { ThemeToggle } from "@/components/academy/theme-toggle";
import { siteContact } from "@/lib/site-data";
import { buildPageMetadata } from "@/lib/site-metadata";
import { activeSeasonalTheme } from "@/lib/site-seasonal";

export const metadata: Metadata = buildPageMetadata({
  title: "404 Not Found | Roseville Dental Academy",
  description: "The page you are looking for was not found.",
  noindex: true,
  omitCanonical: true,
});

// Standalone 404: no primary navigation, just a calm way back. During the
// Halloween season the ghost-lantern art hangs over the h1 (see the seasonal
// rules for `.rda-not-found-content`), replacing the icon right before it.
export default function NotFound() {
  return (
    <div
      className="rda-not-found-page ac-not-found"
      data-rda-seasonal-scope={activeSeasonalTheme ? "true" : undefined}
      data-rda-shell-ready="true"
    >
      <header className="ac-not-found-bar">
        <Link aria-label="Roseville Dental Academy" className="ac-brand" href="/">
          <Image alt="" className="ac-brand-mark" height={601} src="/assets/live/home/logo-academy.png" width={620} />
          <span className="ac-brand-text">
            <span className="ac-brand-name">Roseville Dental Academy</span>
          </span>
        </Link>
        <ThemeToggle />
      </header>
      <main className="rda-not-found-content" id="rda-main-content">
        <p className="ac-not-found-code" aria-hidden="true">
          404
        </p>
        <SearchX aria-hidden="true" className="ac-not-found-icon" />
        <h1 className="ac-h1">File not found (404 error)</h1>
        <p className="ac-lede">
          If you think what you&apos;re looking for should be here, please contact the site owner —
          or pick up where most students start.
        </p>
        <div className="ac-not-found-links">
          <Link className="ac-btn ac-btn-primary ac-btn-lg" href="/">
            Back to the homepage
            <ArrowRight aria-hidden="true" data-ac-arrow="" />
          </Link>
          <Link className="ac-btn ac-btn-secondary ac-btn-lg" href="/dental-assisting-program">
            <GraduationCap aria-hidden="true" />
            Dental Assisting Program
          </Link>
        </div>
        <p className="ac-not-found-help">
          <Link href="/reviews">
            <MessageSquareHeart aria-hidden="true" />
            Student reviews
          </Link>
          <a data-rda-lead-source="phone" href={`tel:${siteContact.phone.replace(/\D/g, "")}`}>
            <Phone aria-hidden="true" />
            {siteContact.phone}
          </a>
        </p>
      </main>
    </div>
  );
}
