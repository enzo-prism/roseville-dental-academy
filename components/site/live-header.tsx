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
  Route,
  ShieldCheck,
  Sparkles,
  UserRoundCheck,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { AnchorHTMLAttributes, ReactNode } from "react";
import { forwardRef, useEffect, useMemo, useState } from "react";

import { SocialLinkButtons } from "@/components/site/social-link-buttons";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuList,
} from "@/components/ui/navigation-menu";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { socialLinks } from "@/lib/site-data";
import {
  activeSitePromo,
  fallbackAnnouncement,
  isSitePromoActive,
} from "@/lib/site-promo";

const logoSrc = "/assets/live/home/logo-academy.png";
const resumePortalHref =
  "https://rosevilledental.godaddysites.com/m/login?r=%2Fresume-portal-dr%252Foms-only";

type NavLinkItem = {
  href: string;
  Icon: LucideIcon;
  iconKey: string;
  label: string;
};

const primaryLinks: NavLinkItem[] = [
  { href: "/", Icon: Home, iconKey: "home", label: "Home" },
  { href: "/bls-cpr-1", Icon: HeartPulse, iconKey: "heart-pulse", label: "BLS/CPR" },
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
    href: "/journey",
    Icon: Route,
    iconKey: "route",
    label: "Career Journey",
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

  if (isExternalHref(href)) {
    return <a {...sharedProps}>{children}</a>;
  }

  return <Link {...sharedProps}>{children}</Link>;
});

export function LiveHeader({ currentRoute }: { currentRoute: string }) {
  const activePath = useActivePath(currentRoute);
  const [mobileMoreOpen, setMobileMoreOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

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

  function desktopLink(link: NavLinkItem) {
    return (
      <NavigationMenuItem key={link.href}>
        <NavLink activePath={activePath} className="rda-nav-link" href={link.href}>
          <NavIcon Icon={link.Icon} iconKey={link.iconKey} />
          {link.label}
        </NavLink>
      </NavigationMenuItem>
    );
  }

  return (
    <header
      className="rda-live-header border-b border-border/70 bg-background/95 backdrop-blur"
      data-rda-shell-header="true"
    >
      <div className="rda-promo-banner border-b border-primary/10 bg-primary text-primary-foreground" role="banner">
        {isSitePromoActive(activeSitePromo) ? (
          <Link
            className="rda-promo-banner-link"
            data-rda-promo-banner="true"
            href={activeSitePromo.ctaHref}
          >
            {activeSitePromo.bannerText}
          </Link>
        ) : (
          <span>{fallbackAnnouncement}</span>
        )}
      </div>

      <div className="rda-mobile-topbar bg-background">
        <Sheet
          open={mobileOpen}
          onOpenChange={(open) => {
            setMobileOpen(open);
            if (!open) {
              setMobileMoreOpen(false);
            }
          }}
        >
          <SheetTrigger asChild>
            <Button
              aria-label={mobileOpen ? "Close Site Navigation" : "Hamburger Site Navigation Icon"}
              className="rda-icon-button"
              size="icon-lg"
              variant="ghost"
            >
              {mobileOpen ? <X aria-hidden="true" /> : <Menu aria-hidden="true" />}
            </Button>
          </SheetTrigger>
          <SheetContent
            className="rda-mobile-menu w-[min(92vw,25rem)] overflow-y-auto border-l border-border bg-background p-0"
            data-rda-mobile-menu="true"
          >
            <SheetHeader className="sr-only">
              <SheetTitle>Roseville Dental Academy</SheetTitle>
            </SheetHeader>
            <nav aria-label="Mobile primary" className="grid gap-0 px-5 py-6">
              {primaryLinks.map((link) => (
                <SheetClose asChild key={link.href}>
                  <NavLink
                    activePath={activePath}
                    className="rda-mobile-link"
                    href={link.href}
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
                  </NavLink>
                </SheetClose>
              ))}
              <SheetClose asChild>
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
                    <span>Ask About Classes</span>
                  </span>
                </Link>
              </SheetClose>
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
                      <SheetClose asChild key={link.href}>
                        <NavLink
                          activePath={activePath}
                          className="rda-mobile-sublink"
                          href={link.href}
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
                        </NavLink>
                      </SheetClose>
                    ))}
                  </div>
                ) : null}
              </div>
              <SheetClose asChild>
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
              </SheetClose>
              <SocialLinkButtons idScope="mobile" links={socialLinks} variant="nav" />
            </nav>
          </SheetContent>
        </Sheet>
        <Button asChild className="rda-contact-us-button" data-rda-contact-us="true" variant="outline">
          <Link href="/contact">
            <NavIcon Icon={Phone} iconKey="phone" />
            <span>Contact Us</span>
          </Link>
        </Button>
      </div>

      <nav aria-label="Primary" className="rda-desktop-nav bg-background">
        <NavigationMenu className="mx-auto max-w-6xl" viewport={false}>
          <NavigationMenuList className="rda-nav-row">
            {primaryLinks.slice(0, 5).map(desktopLink)}
            <NavigationMenuItem>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button className="rda-nav-link rda-nav-button gap-1.5 px-1" variant="ghost">
                    <NavIcon Icon={BookOpenCheck} iconKey="book-open-check" />
                    <span>More Information</span>
                    <ChevronDown aria-hidden="true" className="rda-nav-chevron" size={16} />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="center"
                  className="rda-more-menu min-w-64 border-border bg-popover"
                  data-open="true"
                  data-rda-more-menu="true"
                >
                  {moreLinks.map((link) => (
                    <DropdownMenuItem asChild key={link.href}>
                      <NavLink
                        activePath={activePath}
                        className="rda-more-link flex items-center gap-2 px-2 py-2 text-sm"
                        href={link.href}
                      >
                        <NavIcon className="rda-more-icon" Icon={link.Icon} iconKey={link.iconKey} />
                        <span>{link.label}</span>
                      </NavLink>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </NavigationMenuItem>
            {primaryLinks.slice(5).map(desktopLink)}
            <NavigationMenuItem>
              <Button
                asChild
                aria-current={activePath === "/contact" ? "page" : undefined}
                className="rda-contact-us-button"
                data-rda-contact-us="true"
                variant="outline"
              >
                <Link href="/contact">
                  <NavIcon Icon={Phone} iconKey="phone" />
                  <span>Contact Us</span>
                </Link>
              </Button>
            </NavigationMenuItem>
            <NavigationMenuItem>
              <SocialLinkButtons idScope="desktop" links={socialLinks} variant="nav" />
            </NavigationMenuItem>
          </NavigationMenuList>
        </NavigationMenu>
      </nav>

      <div className="rda-logo-masthead bg-background">
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
    </header>
  );
}
