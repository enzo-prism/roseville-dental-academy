import Image from "next/image";

import { SiteIcon, type SiteIconName } from "@/components/site/site-icon";
import { SmartLink } from "@/components/site/smart-link";
import { Separator } from "@/components/ui/separator";
import { footerSections, siteContact, socialLinks } from "@/lib/site-data";

export function SiteFooter() {
  return (
    <footer className="border-t border-border/70 bg-[linear-gradient(180deg,color-mix(in_oklab,var(--color-secondary)_54%,white),color-mix(in_oklab,var(--color-background)_92%,white))]">
      <div className="site-frame py-14">
        <div className="grid gap-10 lg:grid-cols-[1.2fr_1fr_1fr_1fr]">
          <div className="space-y-5">
            <div className="flex items-center gap-3">
              <div className="relative size-14 overflow-hidden rounded-full border border-primary/15 bg-card shadow-[0_16px_30px_-20px_rgba(35,57,85,0.55)]">
                <Image
                  alt="Roseville Dental Academy seal"
                  className="object-cover"
                  fill
                  sizes="56px"
                  src="/assets/homepage/logo-seal.jpg"
                />
              </div>
              <div>
                <p className="font-heading text-2xl leading-none text-primary">
                  Roseville Dental Academy
                </p>
                <p className="mt-1 text-xs tracking-[0.24em] text-muted-foreground uppercase">
                  Training in a live practice
                </p>
              </div>
            </div>

            <p className="max-w-md text-sm leading-7 text-muted-foreground">
              Hands-on dental assisting, clinical certifications, and accelerated
              career-entry training delivered inside a working dental office.
            </p>

            <div className="space-y-2 text-sm text-muted-foreground">
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

          {footerSections.map((section) => (
            <div key={section.title} className="space-y-4">
              <p className="text-xs font-semibold tracking-[0.22em] text-muted-foreground uppercase">
                {section.title}
              </p>
              <ul className="space-y-3">
                {section.links.map((link) => (
                  <li key={link.href}>
                    <SmartLink
                      href={link.href}
                      className="text-sm leading-6 text-foreground/88 transition-colors hover:text-primary"
                    >
                      {link.label}
                    </SmartLink>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <Separator className="my-8" />

        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-3">
            {socialLinks.map((link) => (
              <SmartLink
                key={link.href}
                href={link.href}
                className="flex items-center gap-2 rounded-full border border-border/70 bg-card/85 px-3 py-2 text-sm text-muted-foreground transition-colors hover:border-primary/20 hover:text-primary"
              >
                <SiteIcon className="size-4" name={link.icon as SiteIconName} />
                {link.label}
              </SmartLink>
            ))}
          </div>

          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} Roseville Dental Academy. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
