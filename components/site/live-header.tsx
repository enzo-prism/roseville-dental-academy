"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown, Menu, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

const logoSrc = "/assets/live/home/logo-academy.jpg";

const primaryLinks = [
  { href: "/", label: "Home" },
  { href: "/bls%2Fcpr-1", label: "BLS/CPR" },
  { href: "/infection-control", label: "Infection Control" },
  { href: "/coronal-polish", label: "Coronal Polish" },
  { href: "/radiation-safety", label: "Radiation Safety" },
  { href: "/sealants", label: "Sealants" },
];

const moreLinks = [
  { href: "/dental-assisting-program", label: "Dental Assisting Program" },
  { href: "/meet-the-instructors", label: "Meet the Instructors" },
  { href: "/faqs-1", label: "FAQs" },
  { href: "/photos", label: "Photos" },
  { href: "/front-office-program", label: "Front Office Program" },
  { href: "/resume-portal-dr%2Foms-only", label: "Resume Portal DR/OMS only" },
];

function normalizePathname(value: string) {
  try {
    return decodeURIComponent(value.replace(/\/+$/g, "") || "/");
  } catch {
    return value.replace(/\/+$/g, "") || "/";
  }
}

function useActivePath(currentRoute: string) {
  const pathname = usePathname();

  return useMemo(() => normalizePathname(pathname || currentRoute), [currentRoute, pathname]);
}

function isActive(activePath: string, href: string) {
  return normalizePathname(href) === activePath;
}

export function LiveHeader({ currentRoute }: { currentRoute: string }) {
  const activePath = useActivePath(currentRoute);
  const [moreOpen, setMoreOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const moreRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!moreOpen) {
      return;
    }

    function onPointerDown(event: PointerEvent) {
      if (!moreRef.current?.contains(event.target as Node)) {
        setMoreOpen(false);
      }
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setMoreOpen(false);
      }
    }

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [moreOpen]);

  useEffect(() => {
    document.body.classList.toggle("rda-mobile-menu-open", mobileOpen);

    return () => {
      document.body.classList.remove("rda-mobile-menu-open");
    };
  }, [mobileOpen]);

  const navLinks = primaryLinks.map((link) => (
    <Link
      aria-current={isActive(activePath, link.href) ? "page" : undefined}
      className="rda-nav-link"
      href={link.href}
      key={link.href}
      onClick={() => {
        setMobileOpen(false);
        setMoreOpen(false);
      }}
    >
      {link.label}
    </Link>
  ));

  const moreMenuLinks = moreLinks.map((link) => (
    <Link
      aria-current={isActive(activePath, link.href) ? "page" : undefined}
      className="rda-more-link"
      href={link.href}
      key={link.href}
      onClick={() => {
        setMobileOpen(false);
        setMoreOpen(false);
      }}
      role="menuitem"
    >
      {link.label}
    </Link>
  ));

  return (
    <header className="rda-live-header" data-rda-shell-header="true">
      <div className="rda-promo-banner" role="banner">
        <span>Now accepting registration for 2026 programs and courses that meet California Dental</span>
      </div>

      <div className="rda-mobile-topbar">
        <button
          aria-expanded={mobileOpen}
          aria-label={mobileOpen ? "Close Site Navigation" : "Hamburger Site Navigation Icon"}
          className="rda-icon-button"
          onClick={() => setMobileOpen((value) => !value)}
          type="button"
        >
          {mobileOpen ? <X aria-hidden="true" size={32} /> : <Menu aria-hidden="true" size={36} />}
        </button>
        <Link className="rda-contact-us-button" data-rda-contact-us="true" href="/contact">
          Contact Us
        </Link>
      </div>

      <nav aria-label="Primary" className="rda-desktop-nav">
        <div className="rda-nav-row">
          {navLinks.slice(0, 5)}
          <div className="rda-more-wrap" ref={moreRef}>
            <button
              aria-expanded={moreOpen}
              aria-haspopup="menu"
              className="rda-nav-link rda-nav-button"
              onClick={() => setMoreOpen((value) => !value)}
              type="button"
            >
              <span>More Information</span>
              <ChevronDown aria-hidden="true" size={16} />
            </button>
            {moreOpen ? (
              <div
                className="rda-more-menu"
                data-open="true"
                data-rda-more-menu="true"
                role="menu"
              >
                {moreMenuLinks}
              </div>
            ) : null}
          </div>
          {navLinks.slice(5)}
          <Link
            aria-current={activePath === "/contact" ? "page" : undefined}
            className="rda-contact-us-button"
            data-rda-contact-us="true"
            href="/contact"
          >
            Contact Us
          </Link>
        </div>
      </nav>

      <div className="rda-logo-masthead">
        <Link aria-label="Roseville Dental Academy" className="rda-live-logo" href="/">
          <Image
            alt="Roseville Dental Academy logo with dental tools and a tooth symbol."
            height={601}
            priority
            src={logoSrc}
            width={620}
          />
        </Link>
      </div>

      {mobileOpen ? (
        <div className="rda-mobile-menu" data-rda-mobile-menu="true">
          <nav aria-label="Mobile primary">
            {primaryLinks.map((link) => (
              <Link
                aria-current={isActive(activePath, link.href) ? "page" : undefined}
                className="rda-mobile-link"
                href={link.href}
                key={link.href}
                onClick={() => setMobileOpen(false)}
              >
                {link.label}
              </Link>
            ))}
            <div className="rda-mobile-more">
              <button
                aria-expanded={moreOpen}
                className="rda-mobile-link rda-mobile-more-button"
                onClick={() => setMoreOpen((value) => !value)}
                type="button"
              >
                <span>More Information</span>
                <ChevronDown aria-hidden="true" size={16} />
              </button>
              {moreOpen ? (
                <div className="rda-mobile-submenu" data-open="true" data-rda-more-menu="true">
                  {moreLinks.map((link) => (
                    <Link
                      aria-current={isActive(activePath, link.href) ? "page" : undefined}
                      className="rda-mobile-sublink"
                      href={link.href}
                      key={link.href}
                      onClick={() => setMobileOpen(false)}
                    >
                      {link.label}
                    </Link>
                  ))}
                </div>
              ) : null}
            </div>
            <Link
              aria-current={activePath === "/contact" ? "page" : undefined}
              className="rda-mobile-link rda-mobile-contact"
              data-rda-contact-us="true"
              href="/contact"
              onClick={() => setMobileOpen(false)}
            >
              Contact Us
            </Link>
          </nav>
        </div>
      ) : null}
    </header>
  );
}
