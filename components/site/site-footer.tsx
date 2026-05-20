import Image from "next/image";

import { SocialBrandLogo } from "@/components/site/social-brand-logo";
import { SmartLink } from "@/components/site/smart-link";
import { Separator } from "@/components/ui/separator";
import { footerSections, siteContact, siteImages, socialLinks } from "@/lib/site-data";

export function SiteFooter() {
  return (
    <footer className="border-t border-border/70 bg-[linear-gradient(180deg,color-mix(in_oklab,var(--color-secondary)_54%,white),color-mix(in_oklab,var(--color-background)_92%,white))]">
      <div className="site-frame py-10 sm:py-12 lg:py-14">
        <div className="space-y-8 lg:grid lg:grid-cols-[1.15fr_1.85fr] lg:gap-10 lg:space-y-0">
          <div className="space-y-4 sm:space-y-5">
            <div className="flex items-center gap-3">
              <div className="relative size-12 overflow-hidden rounded-full border border-primary/15 bg-card shadow-[0_16px_30px_-20px_rgba(35,57,85,0.55)] sm:size-14">
                <Image
                  alt="Roseville Dental Academy seal"
                  className="object-cover"
                  fill
                  sizes="(max-width: 640px) 48px, 56px"
                  src={siteImages.logo}
                />
              </div>
              <div className="min-w-0">
                <p className="font-heading text-[1.45rem] leading-none text-primary sm:text-2xl">
                  Roseville Dental Academy
                </p>
                <p className="mt-1 text-[0.68rem] tracking-[0.22em] text-muted-foreground uppercase sm:text-xs sm:tracking-[0.24em]">
                  Training in a live practice
                </p>
              </div>
            </div>

            <p className="max-w-md text-sm leading-6 text-muted-foreground sm:leading-7">
              Hands-on dental assisting, clinical certifications, and accelerated
              career-entry training delivered inside a working dental office.
            </p>

            <div className="space-y-1.5 text-sm text-muted-foreground sm:space-y-2">
              <p>{siteContact.address}</p>
              <p>{siteContact.hours}</p>
              <SmartLink href={`tel:${siteContact.phone}`} className="block hover:text-primary">
                {siteContact.phone}
              </SmartLink>
              <SmartLink
                href={`mailto:${siteContact.email}`}
                className="block break-all hover:text-primary"
              >
                {siteContact.email}
              </SmartLink>
            </div>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4 xl:gap-8">
            {footerSections.map((section) => (
              <div key={section.title} className="space-y-3">
                <p className="text-xs font-semibold tracking-[0.22em] text-muted-foreground uppercase">
                  {section.title}
                </p>
                <ul className="space-y-2.5">
                  {section.links.map((link) => (
                    <li key={link.href}>
                      <SmartLink
                        href={link.href}
                        className="block break-words text-sm leading-6 text-foreground/88 transition-colors hover:text-primary"
                      >
                        {link.label}
                      </SmartLink>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <Separator className="my-6 sm:my-8" />

        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between sm:gap-5">
          <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
            {socialLinks.map((link) => (
              <SmartLink
                key={link.href}
                href={link.href}
                className="flex items-center gap-2 rounded-full border border-border/70 bg-card/85 px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:border-primary/20 hover:text-primary sm:py-2 sm:text-sm"
              >
                <SocialBrandLogo
                  className="size-4"
                  idPrefix={`rda-site-footer-${link.icon}`}
                  platform={link.icon}
                />
                {link.label}
              </SmartLink>
            ))}
          </div>

          <p className="text-xs text-muted-foreground sm:text-sm">
            © {new Date().getFullYear()} Roseville Dental Academy. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
