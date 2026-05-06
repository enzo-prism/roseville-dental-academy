"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BadgeCheck,
  BookOpenCheck,
  ChevronDown,
  CircleHelp,
  FileUser,
  GraduationCap,
  HeartPulse,
  Home,
  Images,
  Menu,
  Phone,
  Radiation,
  ShieldCheck,
  Sparkles,
  UserRoundCheck,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import { announcement, socialLinks } from "@/lib/site-data";

import { SocialLinkButtons } from "./social-link-buttons";

const logoSrc = "/assets/live/home/logo-academy.jpg";

type NavLinkItem = {
  href: string;
  Icon: LucideIcon;
  iconKey: string;
  label: string;
};

const primaryLinks: NavLinkItem[] = [
  { href: "/", Icon: Home, iconKey: "home", label: "Home" },
  { href: "/bls%2Fcpr-1", Icon: HeartPulse, iconKey: "heart-pulse", label: "BLS/CPR" },
  { href: "/infection-control", Icon: ShieldCheck, iconKey: "shield-check", label: "Infection Control" },
  { href: "/coronal-polish", Icon: Sparkles, iconKey: "sparkles", label: "Coronal Polish" },
  { href: "/radiation-safety", Icon: Radiation, iconKey: "radiation", label: "Radiation Safety" },
  { href: "/sealants", Icon: BadgeCheck, iconKey: "badge-check", label: "Sealants" },
];

const moreLinks: NavLinkItem[] = [
  {
    href: "/dental-assisting-program",
    Icon: GraduationCap,
    iconKey: "graduation-cap",
    label: "Dental Assisting Program",
  },
  {
    href: "/meet-the-instructors",
    Icon: UserRoundCheck,
    iconKey: "user-round-check",
    label: "Meet the Instructors",
  },
  { href: "/faqs-1", Icon: CircleHelp, iconKey: "circle-help", label: "FAQs" },
  { href: "/photos", Icon: Images, iconKey: "images", label: "Photos" },
  {
    href: "/resume-portal-dr%2Foms-only",
    Icon: FileUser,
    iconKey: "file-user",
    label: "Resume Portal DR/OMS only",
  },
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

function NavIcon({
  className = "rda-nav-icon",
  Icon,
  iconKey,
  size = 15,
}: {
  className?: string;
  Icon: LucideIcon;
  iconKey: string;
  size?: number;
}) {
  return (
    <Icon
      aria-hidden="true"
      className={className}
      data-rda-nav-icon={iconKey}
      size={size}
      strokeWidth={1.9}
    />
  );
}

export function LiveHeader({ currentRoute }: { currentRoute: string }) {
  const activePath = useActivePath(currentRoute);
  const [moreOpen, setMoreOpen] = useState(false);
  const [mobileMoreOpen, setMobileMoreOpen] = useState(false);
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

  function closeMobileMenu() {
    setMobileOpen(false);
    setMobileMoreOpen(false);
  }

  function toggleMobileMenu() {
    if (mobileOpen) {
      setMobileMoreOpen(false);
    }

    setMobileOpen((value) => !value);
  }

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
      <NavIcon Icon={link.Icon} iconKey={link.iconKey} />
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
      <NavIcon className="rda-more-icon" Icon={link.Icon} iconKey={link.iconKey} />
      <span>{link.label}</span>
    </Link>
  ));

  return (
    <header className="rda-live-header" data-rda-shell-header="true">
      <div className="rda-promo-banner" role="banner">
        <span>{announcement}</span>
      </div>

      <div className="rda-mobile-topbar">
        <button
          aria-expanded={mobileOpen}
          aria-label={mobileOpen ? "Close Site Navigation" : "Hamburger Site Navigation Icon"}
          className="rda-icon-button"
          onClick={toggleMobileMenu}
          type="button"
        >
          {mobileOpen ? <X aria-hidden="true" size={32} /> : <Menu aria-hidden="true" size={36} />}
        </button>
        <Link className="rda-contact-us-button" data-rda-contact-us="true" href="/contact">
          <NavIcon Icon={Phone} iconKey="phone" />
          <span>Contact Us</span>
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
              <NavIcon Icon={BookOpenCheck} iconKey="book-open-check" />
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
            <NavIcon Icon={Phone} iconKey="phone" />
            <span>Contact Us</span>
          </Link>
          <SocialLinkButtons links={socialLinks} variant="nav" />
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
                onClick={closeMobileMenu}
              >
                <span className="rda-mobile-label">
                  <NavIcon
                    className="rda-mobile-nav-icon"
                    Icon={link.Icon}
                    iconKey={link.iconKey}
                    size={16}
                  />
                  <span>{link.label}</span>
                </span>
              </Link>
            ))}
            <Link
              className="rda-mobile-link rda-mobile-signup"
              href={activePath === "/" ? "#quick-sign-up" : "/#quick-sign-up"}
              onClick={closeMobileMenu}
            >
              <span className="rda-mobile-label">
                <NavIcon
                  className="rda-mobile-nav-icon"
                  Icon={GraduationCap}
                  iconKey="signup"
                  size={16}
                />
                <span>Sign Up</span>
              </span>
            </Link>
            <div className="rda-mobile-more">
              <button
                aria-expanded={mobileMoreOpen}
                aria-haspopup="true"
                className="rda-mobile-link rda-mobile-more-button"
                onClick={() => setMobileMoreOpen((value) => !value)}
                type="button"
              >
                <span className="rda-mobile-label">
                  <NavIcon
                    className="rda-mobile-nav-icon"
                    Icon={BookOpenCheck}
                    iconKey="book-open-check"
                    size={16}
                  />
                  <span>More Information</span>
                </span>
                <ChevronDown aria-hidden="true" size={16} />
              </button>
              {mobileMoreOpen ? (
                <div className="rda-mobile-submenu" data-open="true" data-rda-more-menu="true">
                  {moreLinks.map((link) => (
                    <Link
                      aria-current={isActive(activePath, link.href) ? "page" : undefined}
                      className="rda-mobile-sublink"
                      href={link.href}
                      key={link.href}
                      onClick={closeMobileMenu}
                    >
                      <span className="rda-mobile-label">
                        <NavIcon
                          className="rda-mobile-nav-icon"
                          Icon={link.Icon}
                          iconKey={link.iconKey}
                          size={15}
                        />
                        <span>{link.label}</span>
                      </span>
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
              onClick={closeMobileMenu}
            >
              <span className="rda-mobile-label">
                <NavIcon
                  className="rda-mobile-nav-icon"
                  Icon={Phone}
                  iconKey="phone"
                  size={16}
                />
                <span>Contact Us</span>
              </span>
            </Link>
            <SocialLinkButtons links={socialLinks} variant="nav" />
          </nav>
        </div>
      ) : null}
    </header>
  );
}
