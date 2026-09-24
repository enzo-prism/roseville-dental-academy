import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowRight, ChevronDown, ExternalLink } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { SeoFaq } from "@/lib/local-seo-pages";
import {
  getNextOpenDateLabel,
  type RdaPathCourse,
} from "@/lib/rda-course-path";
import { cn } from "@/lib/utils";

// Shared server-rendered building blocks for the React-owned SEO landing pages
// (local city pages, /for-dental-offices, /rda-certification-courses, Spanish
// DA page). Token-only styling per DESIGN.md: semantic colors, Playfair
// headings via font-heading, low radius (rounded-lg max), no raw values.

export type SeoCrumb = { name: string; path: string };

export function SeoPageMain({
  children,
  routeId,
  lang,
}: {
  children: ReactNode;
  routeId: string;
  lang?: string;
}) {
  return (
    <main
      className="overflow-x-clip bg-background"
      data-rda-route={routeId}
      data-rda-seo-landing={routeId}
      id="rda-main-content"
      lang={lang}
    >
      {children}
    </main>
  );
}

export function SeoHero({
  breadcrumbs,
  breadcrumbLabel = "Breadcrumb",
  eyebrow,
  title,
  intro,
  children,
}: {
  breadcrumbs: SeoCrumb[];
  breadcrumbLabel?: string;
  eyebrow: string;
  title: string;
  intro: ReactNode;
  children?: ReactNode;
}) {
  return (
    <section className="bg-primary text-primary-foreground">
      <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
        <nav aria-label={breadcrumbLabel} className="mb-5 text-sm text-primary-foreground/80">
          <ol className="flex flex-wrap items-center gap-x-2 gap-y-1">
            {breadcrumbs.map((crumb, index) => {
              const isLast = index === breadcrumbs.length - 1;

              return (
                <li className="flex items-center gap-2" key={crumb.path}>
                  {isLast ? (
                    <span aria-current="page">{crumb.name}</span>
                  ) : (
                    <>
                      <Link className="hover:underline" href={crumb.path}>
                        {crumb.name}
                      </Link>
                      <span aria-hidden="true">/</span>
                    </>
                  )}
                </li>
              );
            })}
          </ol>
        </nav>
        <Badge
          className="h-auto max-w-full whitespace-normal bg-primary-foreground px-3 py-1 text-left leading-5 text-primary"
          variant="secondary"
        >
          {eyebrow}
        </Badge>
        <h1 className="mt-4 max-w-3xl font-heading text-3xl font-semibold leading-tight sm:text-4xl md:text-5xl">
          {title}
        </h1>
        <div className="mt-5 max-w-2xl text-base leading-7 text-primary-foreground/90 sm:text-lg">
          {intro}
        </div>
        {children ? <div className="mt-7 flex flex-wrap gap-3">{children}</div> : null}
      </div>
    </section>
  );
}

export function SeoBody({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("mx-auto max-w-5xl space-y-12 px-4 py-12 sm:px-6 sm:py-14 lg:px-8", className)}>
      {children}
    </div>
  );
}

export function SeoSection({
  id,
  heading,
  intro,
  children,
}: {
  id: string;
  heading: string;
  intro?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <section aria-labelledby={`${id}-heading`} className="space-y-5" id={id}>
      <div className="max-w-3xl space-y-3">
        <h2
          className="font-heading text-2xl font-semibold leading-tight text-foreground sm:text-3xl"
          id={`${id}-heading`}
        >
          {heading}
        </h2>
        {intro ? <div className="space-y-3 text-base leading-7 text-muted-foreground">{intro}</div> : null}
      </div>
      {children}
    </section>
  );
}

export type SeoFact = {
  label: string;
  value: string;
  detail?: ReactNode;
};

export function SeoFactGrid({ facts, label }: { facts: SeoFact[]; label: string }) {
  return (
    <dl aria-label={label} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {facts.map((fact) => (
        <div
          className="min-w-0 rounded-lg border border-border bg-card p-4 sm:p-5"
          data-rda-seo-fact={fact.label}
          key={fact.label}
        >
          <dt className="text-sm font-semibold text-accent-foreground">{fact.label}</dt>
          <dd className="mt-1 font-heading text-xl font-semibold leading-snug text-foreground">
            {fact.value}
          </dd>
          {fact.detail ? (
            <dd className="mt-2 text-sm leading-6 text-muted-foreground">{fact.detail}</dd>
          ) : null}
        </div>
      ))}
    </dl>
  );
}

export function SeoCheckList({ items }: { items: ReactNode[] }) {
  return (
    <ul className="grid gap-3 sm:grid-cols-2">
      {items.map((item, index) => (
        <li
          className="flex gap-3 rounded-lg border border-border bg-card p-4 text-base leading-7 text-foreground"
          key={index}
        >
          <span aria-hidden="true" className="mt-2.5 size-2 shrink-0 rounded-sm bg-primary" />
          <span className="min-w-0">{item}</span>
        </li>
      ))}
    </ul>
  );
}

export function SeoFaqList({
  faqs,
  heading = "Frequently asked questions",
  id = "seo-faq",
}: {
  faqs: SeoFaq[];
  heading?: string;
  id?: string;
}) {
  return (
    <SeoSection heading={heading} id={id}>
      <div className="divide-y divide-border overflow-hidden rounded-lg border border-border">
        {faqs.map((faq) => (
          <details className="group bg-card px-5 py-4" key={faq.question}>
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-medium text-foreground [&::-webkit-details-marker]:hidden">
              <span>{faq.question}</span>
              <ChevronDown
                aria-hidden="true"
                className="size-5 shrink-0 text-muted-foreground transition-transform group-open:rotate-180"
              />
            </summary>
            <p className="mt-3 text-base leading-7 text-muted-foreground">{faq.answer}</p>
          </details>
        ))}
      </div>
    </SeoSection>
  );
}

export function RdaCourseCards({
  courses,
  showPrerequisites = false,
  showOfficeUse = false,
  numbered = false,
}: {
  courses: RdaPathCourse[];
  showPrerequisites?: boolean;
  showOfficeUse?: boolean;
  numbered?: boolean;
}) {
  const ListTag = numbered ? "ol" : "ul";

  return (
    <ListTag className="grid gap-4 md:grid-cols-2">
      {courses.map((course, index) => (
        <li className="h-full" data-rda-seo-course={course.id} key={course.id}>
          <Card className="flex h-full flex-col border-border bg-card">
            <CardHeader>
              <div className="flex flex-wrap items-center gap-2">
                {numbered ? (
                  <Badge variant="default">Step {index + 1}</Badge>
                ) : null}
                {course.providerNumber ? (
                  <Badge variant="secondary">Board-approved · {course.providerNumber}</Badge>
                ) : (
                  <Badge variant="outline">Healthcare provider BLS</Badge>
                )}
              </div>
              <CardTitle className="mt-2 font-heading text-xl leading-snug">
                <Link className="hover:underline" href={course.href}>
                  {course.name}
                </Link>
              </CardTitle>
              <CardDescription className="leading-6">{course.summary}</CardDescription>
            </CardHeader>
            <CardContent className="mt-auto space-y-3 text-sm leading-6">
              <dl className="grid grid-cols-2 gap-3">
                <div>
                  <dt className="font-semibold text-accent-foreground">Price</dt>
                  <dd className="text-foreground">{course.priceLabel}</dd>
                </div>
                <div>
                  <dt className="font-semibold text-accent-foreground">Length</dt>
                  <dd className="text-foreground">{course.hours} hours</dd>
                </div>
                <div className="col-span-2">
                  <dt className="font-semibold text-accent-foreground">Next open date</dt>
                  <dd className="text-foreground">{getNextOpenDateLabel(course.id)}</dd>
                </div>
                {showPrerequisites ? (
                  <div className="col-span-2">
                    <dt className="font-semibold text-accent-foreground">Prerequisites</dt>
                    <dd className="text-muted-foreground">{course.prerequisites}</dd>
                  </div>
                ) : null}
                {showOfficeUse ? (
                  <div className="col-span-2">
                    <dt className="font-semibold text-accent-foreground">For your office</dt>
                    <dd className="text-muted-foreground">{course.officeUse}</dd>
                  </div>
                ) : null}
              </dl>
              <Button asChild size="sm" variant="outline">
                <Link href={course.href}>
                  Course details
                  <ArrowRight aria-hidden="true" className="size-4" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        </li>
      ))}
    </ListTag>
  );
}

export type SeoLink = { href: string; label: string; description?: string; external?: boolean };

export function SeoLinkList({ links }: { links: SeoLink[] }) {
  return (
    <ul className="grid gap-3 sm:grid-cols-2">
      {links.map((link) => {
        const content = (
          <>
            {link.external ? (
              <ExternalLink aria-hidden="true" className="mt-1 size-4 shrink-0 text-primary" />
            ) : (
              <ArrowRight
                aria-hidden="true"
                className="mt-1 size-4 shrink-0 text-primary transition-transform group-hover:translate-x-0.5"
              />
            )}
            <span className="min-w-0">
              <span className="block font-medium text-foreground">{link.label}</span>
              {link.description ? (
                <span className="mt-1 block text-sm leading-6 text-muted-foreground">
                  {link.description}
                </span>
              ) : null}
            </span>
          </>
        );
        const className =
          "group flex h-full items-start gap-3 rounded-lg border border-border bg-card p-4 transition-colors hover:border-primary/40 hover:bg-muted/40";

        return (
          <li key={link.href}>
            {link.external ? (
              <a className={className} href={link.href} rel="noopener noreferrer" target="_blank">
                {content}
              </a>
            ) : (
              <Link className={className} href={link.href}>
                {content}
              </Link>
            )}
          </li>
        );
      })}
    </ul>
  );
}

export function SeoCallout({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("rounded-lg border border-primary/25 bg-accent/20 p-5 sm:p-6", className)}>
      {children}
    </div>
  );
}
