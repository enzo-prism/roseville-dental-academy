import Link from "next/link";
import { ArrowRight, BookOpenText, Clock } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  resourceArticlePath,
  resourceArticles,
  RESOURCES_HUB_DESCRIPTION,
} from "@/lib/resource-articles";

export function ResourceHubPage() {
  return (
    <main
      className="overflow-x-clip bg-background"
      data-rda-resource-hub="true"
      data-rda-route="resources"
      id="rda-main-content"
    >
      <section className="relative isolate overflow-hidden bg-primary text-primary-foreground">
        <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
          <p className="inline-flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-primary-foreground/80">
            <BookOpenText aria-hidden="true" className="size-4" />
            Dental Assisting Guides
          </p>
          <h1 className="mt-4 max-w-3xl font-heading text-4xl font-semibold leading-tight sm:text-5xl">
            Dental Assisting Career Guides &amp; Resources
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-primary-foreground/90 sm:text-lg">
            {RESOURCES_HUB_DESCRIPTION}
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 sm:py-14 lg:px-8">
        <ul className="grid gap-5 sm:grid-cols-2">
          {resourceArticles.map((article) => (
            <li className="h-full" key={article.slug}>
              <Card className="relative flex h-full flex-col border-border bg-card transition-colors hover:border-primary/40">
                <CardHeader>
                  <div className="flex items-center justify-between gap-3">
                    <Badge variant="secondary">{article.category}</Badge>
                    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock aria-hidden="true" className="size-3.5" />
                      {article.readMinutes} min
                    </span>
                  </div>
                  <CardTitle className="mt-3 font-heading text-xl leading-snug">
                    <Link
                      className="after:absolute after:inset-0"
                      href={resourceArticlePath(article.slug)}
                    >
                      {article.h1}
                    </Link>
                  </CardTitle>
                  <CardDescription className="leading-6">{article.description}</CardDescription>
                </CardHeader>
                <CardContent className="mt-auto">
                  <span className="inline-flex items-center gap-1.5 text-sm font-medium text-primary">
                    Read guide
                    <ArrowRight aria-hidden="true" className="size-4" />
                  </span>
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>

        <section className="mt-12 rounded-2xl border border-border bg-muted/40 px-6 py-8 sm:px-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <h2 className="font-heading text-2xl font-semibold text-foreground">
                Prefer to talk it through?
              </h2>
              <p className="max-w-xl text-base leading-7 text-muted-foreground">
                Explore the 9-week Dental Assisting Program or ask admissions about class dates,
                payment plans, and the RDA path.
              </p>
            </div>
            <div className="flex shrink-0 flex-wrap gap-3">
              <Button asChild>
                <Link href="/dental-assisting-program">
                  View the program
                  <ArrowRight aria-hidden="true" className="size-4" />
                </Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/contact">Contact us</Link>
              </Button>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
