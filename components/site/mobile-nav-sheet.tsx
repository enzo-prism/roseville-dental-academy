"use client";

import { useEffect, useState } from "react";
import { MenuIcon } from "lucide-react";

import { SmartLink } from "@/components/site/smart-link";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Sheet, SheetClose, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { isActivePath } from "@/lib/site-routing";
import type { CtaLink, LinkItem, NavGroup } from "@/lib/site-types";

type MobileNavSheetProps = {
  pathname: string;
  primaryLinks: readonly LinkItem[];
  navGroups: readonly NavGroup[];
  ctas: {
    admissions: CtaLink;
    studentPortal: CtaLink;
  };
};

export function MobileNavSheet({
  pathname,
  primaryLinks,
  navGroups,
  ctas,
}: MobileNavSheetProps) {
  const [open, setOpen] = useState(false);
  const programs = navGroups.find((group) => group.label === "Programs");
  const courses = navGroups.find((group) => group.label === "Stand-alone Courses");

  useEffect(() => {
    document.body.classList.toggle("is-mobile-nav-open", open);

    return () => {
      document.body.classList.remove("is-mobile-nav-open");
    };
  }, [open]);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          aria-label="Open navigation"
          className="rounded-full border-border/80 md:hidden"
          size="icon-lg"
          variant="outline"
        >
          <MenuIcon />
        </Button>
      </SheetTrigger>
      <SheetContent className="w-[92vw] gap-0 border-l border-border/70 bg-background p-0 sm:max-w-md">
        <SheetHeader className="border-b border-border/60 px-5 py-5 text-left">
          <SheetTitle className="text-left text-lg">Explore Roseville Dental Academy</SheetTitle>
          <SheetDescription className="text-left">
            Programs, certifications, admissions, and portal routes.
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-5 py-5">
          <div className="space-y-3">
            <p className="text-xs font-semibold tracking-[0.24em] text-muted-foreground uppercase">
              Primary
            </p>
            <div className="grid gap-2">
              {primaryLinks.map((link) => (
                <SheetClose key={link.href} asChild>
                  <SmartLink
                    href={link.href}
                    className={cn(
                      "rounded-2xl border border-transparent px-4 py-3 text-sm font-medium text-foreground transition-colors hover:border-border hover:bg-muted/70",
                      isActivePath(pathname, link.href) &&
                        "border-primary/20 bg-primary/7 text-primary",
                    )}
                  >
                    {link.label}
                  </SmartLink>
                </SheetClose>
              ))}
            </div>
          </div>

          <Separator className="my-6" />

          <Accordion type="multiple" className="space-y-4">
            {programs?.children?.length ? (
              <AccordionItem
                value="programs"
                className="rounded-[1.4rem] border border-border/70 bg-card/95 px-4"
              >
                <AccordionTrigger className="py-4 text-sm font-semibold hover:no-underline">
                  Programs
                </AccordionTrigger>
                <AccordionContent className="space-y-2 pb-4">
                  {programs.children.map((link) => (
                    <SheetClose key={link.href} asChild>
                      <SmartLink
                        href={link.href}
                        className={cn(
                          "block rounded-xl px-3 py-3 text-sm text-muted-foreground transition-colors hover:bg-muted/70 hover:text-foreground",
                          isActivePath(pathname, link.href) &&
                            "bg-primary/7 font-medium text-primary",
                        )}
                      >
                        <span className="block text-foreground">{link.label}</span>
                        {link.description ? (
                          <span className="mt-1 block text-xs leading-5 text-muted-foreground">
                            {link.description}
                          </span>
                        ) : null}
                      </SmartLink>
                    </SheetClose>
                  ))}
                </AccordionContent>
              </AccordionItem>
            ) : null}

            {courses?.children?.length ? (
              <AccordionItem
                value="courses"
                className="rounded-[1.4rem] border border-border/70 bg-card/95 px-4"
              >
                <AccordionTrigger className="py-4 text-sm font-semibold hover:no-underline">
                  Stand-alone Courses
                </AccordionTrigger>
                <AccordionContent className="space-y-2 pb-4">
                  {courses.children.map((link) => (
                    <SheetClose key={link.href} asChild>
                      <SmartLink
                        href={link.href}
                        className={cn(
                          "block rounded-xl px-3 py-3 text-sm text-muted-foreground transition-colors hover:bg-muted/70 hover:text-foreground",
                          isActivePath(pathname, link.href) &&
                            "bg-primary/7 font-medium text-primary",
                        )}
                      >
                        <span className="block text-foreground">{link.label}</span>
                        {link.description ? (
                          <span className="mt-1 block text-xs leading-5 text-muted-foreground">
                            {link.description}
                          </span>
                        ) : null}
                      </SmartLink>
                    </SheetClose>
                  ))}
                </AccordionContent>
              </AccordionItem>
            ) : null}
          </Accordion>
        </div>

        <div className="border-t border-border/60 px-5 py-5">
          <div
            data-slot="button-group"
            className="flex flex-col gap-3 sm:flex-row sm:flex-wrap"
          >
            <Button asChild className="rounded-full" size="lg">
              <SheetClose asChild>
                <SmartLink href={ctas.admissions.href}>{ctas.admissions.label}</SmartLink>
              </SheetClose>
            </Button>
            <Button asChild className="rounded-full" size="lg" variant="outline">
              <SheetClose asChild>
                <SmartLink href={ctas.studentPortal.href}>
                  {ctas.studentPortal.label}
                </SmartLink>
              </SheetClose>
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
