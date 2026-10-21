"use client";

import Image from "next/image";
import { SiteLink as Link } from "@/components/site/site-link";
import { usePathname } from "next/navigation";
import { NavigationMenu as NavigationMenuPrimitive } from "radix-ui";
import {
  ArrowRight,
  BookOpenText,
  BriefcaseBusiness,
  CalendarDays,
  ChevronDown,
  CircleHelp,
  FileUser,
  GraduationCap,
  Home,
  Images,
  Menu,
  MessageSquareHeart,
  Phone,
  Route,
  Star,
  UserRoundCheck,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { AnchorHTMLAttributes, ReactNode } from "react";
import { forwardRef, useEffect, useMemo, useState, useSyncExternalStore } from "react";

import { courseIcons } from "@/components/academy/course-icons";
import { ThemeToggle } from "@/components/academy/theme-toggle";
import { SeasonalBannerSky } from "@/components/site/seasonal-banner-sky";
import { SocialLinkButtons } from "@/components/site/social-link-buttons";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  certificationCourses,
  dentalAssistingProgram,
  getNextOpenShortDate,
} from "@/lib/academy-catalog";
import { googleReviewsAggregate, siteContact, socialLinks } from "@/lib/site-data";
import {
  activeSitePromo,
  fallbackAnnouncement,
  isSitePromoActive,
} from "@/lib/site-promo";

const logoSrc = "/assets/live/home/logo-academy.png";
const resumePortalHref =
  "https://rosevilledental.godaddysites.com/m/login?r=%2Fresume-portal-dr%252Foms-only";

type NavLinkItem = {
  description?: string;
  href: string;
  Icon: LucideIcon;
  iconKey: string;
  label: string;
};

// Top-level destinations beside the Courses mega menu. Instructors and reviews
// are first-class: they are the academy's strongest proof.
const primaryLinks: NavLinkItem[] = [
  { href: "/meet-the-instructors", Icon: UserRoundCheck, iconKey: "user-round-check", label: "Instructors" },
  { href: "/reviews", Icon: MessageSquareHeart, iconKey: "message-square-heart", label: "Reviews" },
  { href: "/photos", Icon: Images, iconKey: "images", label: "Photos" },
];

const moreLinks: NavLinkItem[] = [
  {
    description: "Answers about classes, schedules, and requirements",
    href: "/faqs-1",
    Icon: CircleHelp,
    iconKey: "circle-help",
    label: "FAQs",
  },
  {
    description: "Step-by-step path from DA to RDA",
    href: "/journey",
    Icon: Route,
    iconKey: "route",
    label: "Career Journey",
  },
  {
    description: "Guides on cost, timelines, pay, and licensing",
    href: "/resources",
    Icon: BookOpenText,
    iconKey: "book-open-text",
    label: "Resources",
  },
  {
    description: "Private job board for students and alumni",
    href: "/student-jobs",
    Icon: BriefcaseBusiness,
    iconKey: "briefcase-business",
    label: "Student & Alumni Jobs",
  },
  {
    description: "For dental and oral surgery offices",
    href: resumePortalHref,
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
  if (/^https?:\/\//i.test(href)) {
    return false;
  }

  return normalizePathname(href) === activePath;
}

function isExternalHref(href: string) {
  return /^https?:\/\//i.test(href);
}

function NavIcon({
  className = "rda-nav-icon",
  Icon,
  iconKey,
  size = 16,
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

type NavLinkProps = Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href"> & {
  activePath: string;
  children: ReactNode;
  className: string;
  href: string;
};

const NavLink = forwardRef<HTMLAnchorElement, NavLinkProps>(function NavLink(
  { activePath, children, className, href, ...props },
  ref,
) {
  const active = isActive(activePath, href);
  const sharedProps = {
    ...props,
    "aria-current": active ? ("page" as const) : undefined,
    className,
    href,
    ref,
  };

  if (isExternalHref(href) || href === "/student-jobs") {
    return <a {...sharedProps}>{children}</a>;
  }

  return <Link {...sharedProps}>{children}</Link>;
});

function subscribeToPromoTime(notify: () => void) {
  const timer = window.setInterval(notify, 60_000);
  return () => window.clearInterval(timer);
}

function subscribeToScroll(notify: () => void) {
  window.addEventListener("scroll", notify, { passive: true });
  return () => window.removeEventListener("scroll", notify);
}

function CoursesMegaMenu({ activePath }: { activePath: string }) {
  const daNext = getNextOpenShortDate(dentalAssistingProgram.id);

  return (
    <div className="ac-mega" data-rda-courses-menu="true">
      <NavigationMenuPrimitive.Link asChild>
        <NavLink
          activePath={activePath}
          className="ac-mega-feature"
          href={dentalAssistingProgram.href}
        >
          <span className="ac-mega-feature-media">
            <Image alt="" fill sizes="300px" src={dentalAssistingProgram.image.src} />
          </span>
          <span className="ac-mega-feature-body">
            <span className="ac-mega-kicker">
              <NavIcon Icon={GraduationCap} iconKey="graduation-cap" size={14} />
              Flagship program
            </span>
            <span className="ac-mega-feature-title">{dentalAssistingProgram.name}</span>
            <span className="ac-mega-feature-meta">
              {dentalAssistingProgram.duration} · {dentalAssistingProgram.price}
            </span>
            {daNext ? (
              <span className="ac-chip ac-chip-soft ac-chip-live ac-mega-feature-date">
                Next class {daNext}
              </span>
            ) : null}
          </span>
        </NavLink>
      </NavigationMenuPrimitive.Link>
      <div className="ac-mega-list">
        <p className="ac-mega-list-label">Certification courses</p>
        <ul>
          {certificationCourses.map((course) => {
            const Icon = courseIcons[course.icon];
            const next = getNextOpenShortDate(course.id);

            return (
              <li key={course.id}>
                <NavigationMenuPrimitive.Link asChild>
                  <NavLink activePath={activePath} className="ac-mega-item rda-nav-link" href={course.href}>
                    <span className="ac-icon-tile">
                      <NavIcon Icon={Icon} iconKey={course.icon} />
                    </span>
                    <span className="ac-mega-item-copy">
                      <span className="ac-mega-item-title">{course.navLabel}</span>
                      <span className="ac-mega-item-meta">
                        {course.duration} · {course.price}
                        {next ? ` · Next ${next}` : ""}
                      </span>
                    </span>
                  </NavLink>
                </NavigationMenuPrimitive.Link>
              </li>
            );
          })}
        </ul>
        <div className="ac-mega-footer">
          <NavigationMenuPrimitive.Link asChild>
            <Link className="ac-link" href="/#schedule">
              <CalendarDays aria-hidden="true" />
              See the full class schedule
            </Link>
          </NavigationMenuPrimitive.Link>
          <NavigationMenuPrimitive.Link asChild>
            <Link className="ac-link" href="/journey">
              <Route aria-hidden="true" />
              DA to RDA career journey
            </Link>
          </NavigationMenuPrimitive.Link>
        </div>
      </div>
    </div>
  );
}

export function LiveHeader({ currentRoute, seasonal = false }: { currentRoute: string; seasonal?: boolean }) {
  const activePath = useActivePath(currentRoute);
  const [mobileOpen, setMobileOpen] = useState(false);
  const promoActive = useSyncExternalStore(
    subscribeToPromoTime,
    () => isSitePromoActive(activeSitePromo, Date.now()),
    () => isSitePromoActive(activeSitePromo),
  );
  const scrolled = useSyncExternalStore(
    subscribeToScroll,
    () => window.scrollY > 24,
    () => false,
  );
  const coursesActive = [dentalAssistingProgram, ...certificationCourses].some((course) =>
    isActive(activePath, course.href),
  );
  const askHref = activePath === "/" ? "#quick-sign-up" : "/#quick-sign-up";
  const phoneHref = `tel:${siteContact.phone.replace(/\D/g, "")}`;

  useEffect(() => {
    document.body.classList.toggle("rda-mobile-menu-open", mobileOpen);

    return () => {
      document.body.classList.remove("rda-mobile-menu-open");
    };
  }, [mobileOpen]);

  function closeMobileMenu() {
    setMobileOpen(false);
  }

  return (
    <header
      className="rda-live-header"
      data-rda-header-scrolled={scrolled ? "true" : undefined}
      data-rda-shell-header="true"
    >
      <div className="ac-banner-shell">
        <div className="rda-promo-banner" role="banner">
          {seasonal ? <SeasonalBannerSky /> : null}
          {promoActive ? (
            <Link
              className="rda-promo-banner-link"
              data-rda-promo-banner="true"
              href={activeSitePromo.ctaHref}
            >
              <span aria-hidden="true" className="ac-banner-dot" />
              <span className="ac-banner-text">
                {activeSitePromo.bannerText.replace(/\s*→\s*$/u, "")}
              </span>
              <ArrowRight aria-hidden="true" className="ac-banner-arrow" />
            </Link>
          ) : (
            <span className="rda-promo-banner-link">{fallbackAnnouncement}</span>
          )}
        </div>
      </div>

      <div className="ac-nav-bar">
        <div className="ac-container ac-nav-inner">
          <Link aria-label="Roseville Dental Academy" className="rda-live-logo ac-brand" href="/">
            <Image
              alt="Roseville Dental Academy logo with dental tools and a tooth symbol."
              className="ac-brand-mark"
              height={601}
              priority
              src={logoSrc}
              width={620}
            />
            <span aria-hidden="true" className="ac-brand-text">
              <span className="ac-brand-name">Roseville Dental Academy</span>
              <span className="ac-brand-sub">Dental assisting school · Roseville, CA</span>
            </span>
          </Link>

          <NavigationMenuPrimitive.Root
            aria-label="Primary"
            className="rda-desktop-nav"
            delayDuration={80}
          >
            <NavigationMenuPrimitive.List className="rda-nav-row">
              <NavigationMenuPrimitive.Item>
                <NavLink activePath={activePath} className="rda-nav-link" href="/">
                  <NavIcon Icon={Home} iconKey="home" />
                  <span>Home</span>
                </NavLink>
              </NavigationMenuPrimitive.Item>
              <NavigationMenuPrimitive.Item>
                <NavigationMenuPrimitive.Trigger
                  className="rda-nav-link rda-nav-button"
                  data-active={coursesActive ? "true" : undefined}
                >
                  <NavIcon Icon={GraduationCap} iconKey="graduation-cap" />
                  <span>Courses</span>
                  <ChevronDown aria-hidden="true" className="rda-nav-chevron" size={15} />
                </NavigationMenuPrimitive.Trigger>
                <NavigationMenuPrimitive.Content className="ac-nav-panel ac-nav-panel-wide">
                  <CoursesMegaMenu activePath={activePath} />
                </NavigationMenuPrimitive.Content>
              </NavigationMenuPrimitive.Item>
              {primaryLinks.map((link) => (
                <NavigationMenuPrimitive.Item key={link.href}>
                  <NavLink activePath={activePath} className="rda-nav-link" href={link.href}>
                    <NavIcon Icon={link.Icon} iconKey={link.iconKey} />
                    <span>{link.label}</span>
                  </NavLink>
                </NavigationMenuPrimitive.Item>
              ))}
              <NavigationMenuPrimitive.Item>
                <NavigationMenuPrimitive.Trigger className="rda-nav-link rda-nav-button">
                  <span>More</span>
                  <ChevronDown aria-hidden="true" className="rda-nav-chevron" size={15} />
                </NavigationMenuPrimitive.Trigger>
                <NavigationMenuPrimitive.Content className="ac-nav-panel ac-nav-panel-end">
                  <ul className="rda-more-menu ac-more-list" data-open="true" data-rda-more-menu="true">
                    {moreLinks.map((link) => (
                      <li key={link.href}>
                        <NavigationMenuPrimitive.Link asChild>
                          <NavLink
                            activePath={activePath}
                            className="rda-more-link ac-more-item"
                            href={link.href}
                          >
                            <span className="ac-icon-tile">
                              <NavIcon className="rda-more-icon" Icon={link.Icon} iconKey={link.iconKey} />
                            </span>
                            <span className="ac-mega-item-copy">
                              <span className="ac-mega-item-title">{link.label}</span>
                              {link.description ? (
                                <span className="ac-mega-item-meta">{link.description}</span>
                              ) : null}
                            </span>
                          </NavLink>
                        </NavigationMenuPrimitive.Link>
                      </li>
                    ))}
                  </ul>
                </NavigationMenuPrimitive.Content>
              </NavigationMenuPrimitive.Item>
            </NavigationMenuPrimitive.List>
            <div className="ac-nav-viewport-anchor">
              <NavigationMenuPrimitive.Viewport className="ac-nav-viewport" />
            </div>
          </NavigationMenuPrimitive.Root>

          <div className="ac-nav-actions">
            <ThemeToggle className="ac-nav-theme" />
            <Link
              aria-current={activePath === "/contact" ? "page" : undefined}
              className="rda-contact-us-button ac-btn ac-btn-secondary ac-btn-sm"
              data-rda-contact-us="true"
              href="/contact"
            >
              <NavIcon Icon={Phone} iconKey="phone" size={15} />
              <span>Contact Us</span>
            </Link>
            <Link
              className="ac-btn ac-btn-primary ac-btn-sm ac-nav-cta"
              data-rda-header-cta="true"
              href={askHref}
            >
              <span>Ask About Classes</span>
              <ArrowRight aria-hidden="true" data-ac-arrow="" />
            </Link>
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger asChild>
                <button
                  aria-label={mobileOpen ? "Close Site Navigation" : "Hamburger Site Navigation Icon"}
                  className="rda-icon-button ac-menu-button"
                  type="button"
                >
                  {mobileOpen ? <X aria-hidden="true" /> : <Menu aria-hidden="true" />}
                </button>
              </SheetTrigger>
              <SheetContent className="rda-mobile-menu ac-mobile-menu" data-rda-mobile-menu="true">
                <SheetHeader className="sr-only">
                  <SheetTitle>Roseville Dental Academy</SheetTitle>
                </SheetHeader>
                <div className="ac-mobile-head">
                  <span className="ac-stars" aria-hidden="true">
                    {Array.from({ length: 5 }, (_, index) => (
                      <Star key={index} />
                    ))}
                  </span>
                  <span>
                    {googleReviewsAggregate.ratingValue.toFixed(1)} from{" "}
                    {googleReviewsAggregate.reviewCount} Google reviews
                  </span>
                </div>
                <nav aria-label="Mobile primary" className="ac-mobile-nav">
                  <SheetClose asChild>
                    <NavLink activePath={activePath} className="rda-mobile-link" href="/" onClick={closeMobileMenu}>
                      <NavIcon className="rda-mobile-nav-icon" Icon={Home} iconKey="home" />
                      <span>Home</span>
                    </NavLink>
                  </SheetClose>
                  <p className="ac-mobile-group-label">Courses</p>
                  {[dentalAssistingProgram, ...certificationCourses].map((course) => {
                    const Icon = courseIcons[course.icon];
                    const next = getNextOpenShortDate(course.id);

                    return (
                      <SheetClose asChild key={course.id}>
                        <NavLink
                          activePath={activePath}
                          className="rda-mobile-link ac-mobile-course"
                          href={course.href}
                          onClick={closeMobileMenu}
                        >
                          <NavIcon className="rda-mobile-nav-icon" Icon={Icon} iconKey={course.icon} />
                          <span className="ac-mobile-course-copy">
                            <span>{course.navLabel}</span>
                            <small>
                              {course.price}
                              {next ? ` · Next ${next}` : ""}
                            </small>
                          </span>
                        </NavLink>
                      </SheetClose>
                    );
                  })}
                  <p className="ac-mobile-group-label">The academy</p>
                  {[...primaryLinks, ...moreLinks].map((link) => (
                    <SheetClose asChild key={link.href}>
                      <NavLink
                        activePath={activePath}
                        className="rda-mobile-link"
                        href={link.href}
                        onClick={closeMobileMenu}
                      >
                        <NavIcon className="rda-mobile-nav-icon" Icon={link.Icon} iconKey={link.iconKey} />
                        <span>{link.label}</span>
                      </NavLink>
                    </SheetClose>
                  ))}
                  <SheetClose asChild>
                    <Link
                      aria-current={activePath === "/contact" ? "page" : undefined}
                      className="rda-mobile-link rda-mobile-contact"
                      data-rda-contact-us="true"
                      href="/contact"
                      onClick={closeMobileMenu}
                    >
                      <NavIcon className="rda-mobile-nav-icon" Icon={Phone} iconKey="phone" />
                      <span>Contact Us</span>
                    </Link>
                  </SheetClose>
                </nav>
                <div className="ac-mobile-actions">
                  <SheetClose asChild>
                    <Link
                      className="ac-btn ac-btn-primary rda-mobile-signup"
                      href={askHref}
                      onClick={closeMobileMenu}
                    >
                      <span>Ask About Classes</span>
                      <ArrowRight aria-hidden="true" data-ac-arrow="" />
                    </Link>
                  </SheetClose>
                  <a className="ac-btn ac-btn-secondary" data-rda-lead-source="phone" href={phoneHref}>
                    <Phone aria-hidden="true" />
                    <span>Call {siteContact.phone}</span>
                  </a>
                  <div className="ac-mobile-footer">
                    <SocialLinkButtons idScope="mobile" links={socialLinks} variant="nav" />
                    <ThemeToggle />
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </header>
  );
}
