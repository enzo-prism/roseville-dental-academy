"use client";

import Image from "next/image";
import { usePathname } from "next/navigation";

import { MobileNavSheet } from "@/components/site/mobile-nav-sheet";
import { SmartLink } from "@/components/site/smart-link";
import { Button } from "@/components/ui/button";
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
  navigationMenuTriggerStyle,
} from "@/components/ui/navigation-menu";
import { cn } from "@/lib/utils";
import { announcement, headerCtas, navGroups, primaryNavLinks, siteContact } from "@/lib/site-data";
import { isActivePath, navGroupIsActive } from "@/lib/site-routing";

export function SiteHeader() {
  const pathname = usePathname();

  return (
    <div className="sticky top-0 z-50 border-b border-border/70 bg-background/92 backdrop-blur-xl">
      <div className="border-b border-border/50 bg-secondary/50">
        <div className="site-frame flex min-h-7 items-center justify-between gap-4 py-1">
          <p className="max-w-4xl text-[0.68rem] leading-4 text-secondary-foreground sm:text-[0.72rem]">
            {announcement}
          </p>
          <SmartLink
            href={`tel:${siteContact.phone}`}
            className="hidden shrink-0 text-[0.68rem] font-semibold tracking-[0.18em] text-primary uppercase xl:inline-flex"
          >
            {siteContact.phone}
          </SmartLink>
        </div>
      </div>

      <header className="site-frame flex min-h-[4.125rem] items-center justify-between gap-4 py-2.5">
        <SmartLink href="/" className="group flex min-w-0 items-center gap-3">
          <div className="relative size-11 overflow-hidden rounded-full border border-primary/15 bg-card shadow-[0_12px_26px_-18px_rgba(35,57,85,0.55)]">
            <Image
              alt="Roseville Dental Academy seal"
              className="object-cover"
              fill
              priority
              sizes="48px"
              src="/assets/homepage/logo-seal.jpg"
            />
          </div>
          <div className="min-w-0">
            <p className="font-heading text-lg leading-none tracking-[0.04em] text-primary sm:text-xl">
              Roseville Dental Academy
            </p>
            <p className="mt-1 hidden text-xs tracking-[0.24em] text-muted-foreground uppercase sm:block">
              Roseville, California
            </p>
          </div>
        </SmartLink>

        <div className="hidden min-w-0 flex-1 items-center justify-center md:flex">
          <NavigationMenu viewport={false}>
            <NavigationMenuList className="gap-1">
              {navGroups.map((group) => {
                if (group.children?.length) {
                  return (
                    <NavigationMenuItem key={group.label}>
                      <NavigationMenuTrigger
                        className={cn(
                          navGroupIsActive(pathname, group) &&
                            "bg-primary/7 text-primary hover:bg-primary/10 focus:bg-primary/10",
                        )}
                      >
                        {group.label}
                      </NavigationMenuTrigger>
                      <NavigationMenuContent className="min-w-[23rem] p-2.5">
                        <div className="space-y-2.5">
                          {group.description ? (
                            <div className="rounded-[1.65rem] bg-muted/60 px-4 py-3.5">
                              <p className="text-[0.7rem] font-semibold tracking-[0.2em] text-muted-foreground uppercase">
                                {group.label}
                              </p>
                              <p className="mt-2 max-w-[18rem] text-sm leading-6 text-muted-foreground">
                                {group.description}
                              </p>
                            </div>
                          ) : null}
                          {group.children.map((child) => (
                            <NavigationMenuLink key={child.href} asChild>
                              <SmartLink
                                href={child.href}
                                className={cn(
                                  "!grid !items-start gap-1.5 rounded-[1.35rem] px-4 py-3.5 text-left",
                                  isActivePath(pathname, child.href) &&
                                    "bg-primary/7 text-primary",
                                )}
                              >
                                <span className="block max-w-[15rem] text-[1rem] leading-6 font-semibold text-foreground">
                                  {child.label}
                                </span>
                                {child.description ? (
                                  <span className="block text-sm leading-6 text-muted-foreground">
                                    {child.description}
                                  </span>
                                ) : null}
                              </SmartLink>
                            </NavigationMenuLink>
                          ))}
                        </div>
                      </NavigationMenuContent>
                    </NavigationMenuItem>
                  );
                }

                return (
                  <NavigationMenuItem key={group.label}>
                    <NavigationMenuLink asChild>
                      <SmartLink
                        href={group.href ?? "/"}
                        className={cn(
                          navigationMenuTriggerStyle(),
                          isActivePath(pathname, group.href) &&
                            "bg-primary/7 text-primary hover:bg-primary/10 focus:bg-primary/10",
                        )}
                      >
                        {group.label}
                      </SmartLink>
                    </NavigationMenuLink>
                  </NavigationMenuItem>
                );
              })}
            </NavigationMenuList>
          </NavigationMenu>
        </div>

        <div className="hidden items-center gap-3 md:flex">
          <Button asChild className="rounded-full" size="lg" variant="ghost">
            <SmartLink href={headerCtas.studentPortal.href}>
              {headerCtas.studentPortal.label}
            </SmartLink>
          </Button>
          <Button asChild className="rounded-full px-5" size="lg">
            <SmartLink href={headerCtas.admissions.href}>
              {headerCtas.admissions.label}
            </SmartLink>
          </Button>
        </div>

        <MobileNavSheet
          ctas={headerCtas}
          navGroups={navGroups}
          pathname={pathname}
          primaryLinks={primaryNavLinks}
        />
      </header>
    </div>
  );
}
