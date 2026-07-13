import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  Clock,
  GraduationCap,
  Phone,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { SITE_NAME } from "@/lib/site-metadata";
import {
  getResourceArticle,
  RESOURCES_BASE_PATH,
  resourceArticlePath,
  type ResourceArticle,
} from "@/lib/resource-articles";

function sectionParagraphs(paragraphs: string[]) {
  return paragraphs.map((paragraph, index) => (
    <p className="text-base leading-7 text-muted-foreground" key={index}>
      {paragraph}
    </p>
  ));
}

export function ResourceArticlePage({ article }: { article: ResourceArticle }) {
  const relatedArticles = article.relatedSlugs
    .map((slug) => getResourceArticle(slug))
    .filter((entry): entry is ResourceArticle => Boolean(entry));

  return (
    <main
      className="overflow-x-clip bg-background"
      data-rda-resource-article={article.slug}
      data-rda-route={`resources-${article.slug}`}
      id="rda-main-content"
    >
      <section className="relative isolate overflow-hidden bg-primary text-primary-foreground">
        <Image
          alt={article.heroImage.alt}
          className="absolute inset-0 -z-20 size-full object-cover opacity-25"
          fill
          priority
          sizes="100vw"
          src={article.heroImage.src}
        />
        <div className="absolute inset-0 -z-10 bg-primary/80" />
        <div className="mx-auto max-w-3xl px-4 py-14 sm:px-6 sm:py-20 lg:px-8">
          <nav aria-label="Breadcrumb" className="mb-6 text-sm text-primary-foreground/80">
            <ol className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <li>
                <Link className="hover:underline" href="/">
                  Home
                </Link>
              </li>
              <li aria-hidden="true">/</li>
              <li>
                <Link className="hover:underline" href={RESOURCES_BASE_PATH}>
                  Resources
                </Link>
              </li>
            </ol>
          </nav>
          <Badge
            className="h-auto max-w-full whitespace-normal bg-primary-foreground px-3 py-1 text-left leading-5 text-primary"
            variant="secondary"
          >
            {article.category}
          </Badge>
          <h1 className="mt-4 font-heading text-3xl font-semibold leading-tight sm:text-4xl md:text-5xl">
            {article.h1}
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-primary-foreground/90 sm:text-lg">
            {article.intro}
          </p>
          <p className="mt-6 inline-flex items-center gap-2 text-sm text-primary-foreground/80">
            <Clock aria-hidden="true" className="size-4" />
            {article.readMinutes} min read
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-3xl space-y-12 px-4 py-12 sm:px-6 sm:py-14 lg:px-8">
        <aside className="rounded-xl border border-border bg-muted/40 p-6 sm:p-7">
          <h2 className="font-heading text-lg font-semibold text-foreground">Key takeaways</h2>
          <ul className="mt-4 space-y-3">
            {article.keyTakeaways.map((takeaway, index) => (
              <li className="flex gap-3 text-base leading-7 text-foreground" key={index}>
                <CheckCircle2 aria-hidden="true" className="mt-1 size-5 shrink-0 text-primary" />
                <span>{takeaway}</span>
              </li>
            ))}
          </ul>
        </aside>

        {article.sections.map((section) => (
          <section aria-labelledby={`${section.id}-heading`} className="space-y-4" id={section.id} key={section.id}>
            <h2
              className="font-heading text-2xl font-semibold leading-tight text-foreground sm:text-3xl"
              id={`${section.id}-heading`}
            >
              {section.heading}
            </h2>
            {sectionParagraphs(section.paragraphs)}
            {section.bullets ? (
              <ul className="list-disc space-y-2 pl-5 text-base leading-7 text-muted-foreground marker:text-primary">
                {section.bullets.map((bullet, index) => (
                  <li key={index}>{bullet}</li>
                ))}
              </ul>
            ) : null}
          </section>
        ))}

        <section aria-labelledby="resource-faq-heading" className="space-y-4">
          <h2
            className="font-heading text-2xl font-semibold leading-tight text-foreground sm:text-3xl"
            id="resource-faq-heading"
          >
            Frequently asked questions
          </h2>
          <div className="divide-y divide-border overflow-hidden rounded-xl border border-border">
            {article.faqs.map((faq, index) => (
              <details className="group bg-card px-5 py-4" key={index}>
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
        </section>

        <section aria-labelledby="resource-courses-heading" className="space-y-5">
          <h2
            className="font-heading text-2xl font-semibold leading-tight text-foreground sm:text-3xl"
            id="resource-courses-heading"
          >
            Courses and classes to get you started
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {article.relatedCourses.map((course) => (
              <Card className="flex flex-col border-border bg-card" key={course.href}>
                <CardHeader>
                  <CardTitle className="font-heading text-lg">{course.label}</CardTitle>
                  <CardDescription className="leading-6">{course.blurb}</CardDescription>
                </CardHeader>
                <CardContent className="mt-auto">
                  <Button asChild variant="outline">
                    <Link href={course.href}>
                      View course
                      <ArrowRight aria-hidden="true" className="size-4" />
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        <section className="rounded-2xl bg-primary px-6 py-8 text-primary-foreground sm:px-8 sm:py-10">
          <div className="flex flex-col gap-5">
            <div className="space-y-2">
              <p className="inline-flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-primary-foreground/80">
                <GraduationCap aria-hidden="true" className="size-4" />
                {SITE_NAME}
              </p>
              <h2 className="font-heading text-2xl font-semibold leading-tight sm:text-3xl">
                Ready to start your dental assisting career?
              </h2>
              <p className="max-w-2xl text-base leading-7 text-primary-foreground/90">
                Train hands-on in Roseville with a 9-week program that includes chairside practice,
                an internship, and resume and job assistance. Ask admissions about the next class
                date.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button asChild variant="secondary">
                <Link href="/dental-assisting-program">
                  Explore the 9-week program
                  <ArrowRight aria-hidden="true" className="size-4" />
                </Link>
              </Button>
              <Button
                asChild
                className="border-primary-foreground/40 bg-transparent text-primary-foreground hover:bg-primary-foreground/10"
                variant="outline"
              >
                <Link href="/contact">
                  <Phone aria-hidden="true" className="size-4" />
                  Contact admissions
                </Link>
              </Button>
            </div>
          </div>
        </section>

        {relatedArticles.length > 0 ? (
          <section aria-labelledby="resource-related-heading" className="space-y-5">
            <h2
              className="font-heading text-2xl font-semibold leading-tight text-foreground sm:text-3xl"
              id="resource-related-heading"
            >
              Keep reading
            </h2>
            <ul className="space-y-3">
              {relatedArticles.map((entry) => (
                <li key={entry.slug}>
                  <Link
                    className="group flex items-start gap-3 rounded-lg border border-border bg-card p-4 transition-colors hover:border-primary/40 hover:bg-muted/40"
                    href={resourceArticlePath(entry.slug)}
                  >
                    <ArrowRight
                      aria-hidden="true"
                      className="mt-1 size-4 shrink-0 text-primary transition-transform group-hover:translate-x-0.5"
                    />
                    <span>
                      <span className="block font-medium text-foreground">{entry.h1}</span>
                      <span className="mt-1 block text-sm leading-6 text-muted-foreground">
                        {entry.description}
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <p className="border-t border-border pt-6 text-sm leading-6 text-muted-foreground">
          This guide is general information, not legal or licensing advice. Dental assisting
          requirements in California can change — always verify current rules, required courses, and
          timelines with the{" "}
          <a
            className="text-primary underline-offset-4 hover:underline"
            href="https://www.dbc.ca.gov/"
            rel="noopener noreferrer nofollow"
            target="_blank"
          >
            Dental Board of California
          </a>
          .
        </p>
      </div>
    </main>
  );
}
