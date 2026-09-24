import Link from "next/link";
import { ArrowRight, Clock } from "lucide-react";
import { useId } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  RESOURCES_BASE_PATH,
  getResourceArticle,
  resourceArticlePath,
  resourceArticles,
  type ResourceArticle,
} from "@/lib/resource-articles";

// Career-start guides shown by default (homepage). Course pages can pass their
// own `slugs` to surface the guides most relevant to that course.
const DEFAULT_GUIDE_SLUGS = [
  "how-to-become-a-dental-assistant-in-california",
  "dental-assisting-school-cost-california",
  "how-long-does-it-take-to-become-a-dental-assistant",
  "rda-vs-dental-assistant-california",
] as const;

type ResourceGuidesStripProps = {
  /** Guide slugs from lib/resource-articles.ts, in display order. Unknown slugs are skipped. */
  slugs?: readonly string[];
  /** Section heading text. */
  title?: string;
  /** Heading level for the section title; use 3 when nested under another H2. */
  headingLevel?: 2 | 3;
  /** Short line under the heading. Pass null to omit it. */
  intro?: string | null;
  /** Show the "View all guides" link to /resources. */
  showAllLink?: boolean;
  className?: string;
};

function resolveGuides(slugs: readonly string[]): ResourceArticle[] {
  return slugs
    .map((slug) => getResourceArticle(slug))
    .filter((article): article is ResourceArticle => Boolean(article));
}

/**
 * Compact, crawlable block of links into the /resources guide hub. Server
 * component: plain anchors so search engines follow them without JS.
 */
export function ResourceGuidesStrip({
  className,
  headingLevel = 2,
  intro = "Free guides on starting a dental assisting career in California.",
  showAllLink = true,
  slugs = DEFAULT_GUIDE_SLUGS,
  title = "Career guides",
}: ResourceGuidesStripProps) {
  const headingId = useId();
  const guides = resolveGuides(slugs);

  if (guides.length === 0) {
    return null;
  }

  const Heading = headingLevel === 3 ? "h3" : "h2";
  const showAll = showAllLink && guides.length < resourceArticles.length;

  return (
    <section
      aria-labelledby={headingId}
      className={["rda-stable-section", className].filter(Boolean).join(" ")}
      data-rda-stable-widget="resource-guides"
    >
      <div className="rda-section-heading">
        <Heading className="rda-section-title" id={headingId}>
          {title}
        </Heading>
        <span aria-hidden="true" />
      </div>
      {intro ? (
        <p className="-mt-3 mb-8 text-center text-base leading-7 text-muted-foreground">{intro}</p>
      ) : null}
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {guides.map((guide) => (
          <li className="h-full" key={guide.slug}>
            <Link
              className="group flex h-full flex-col gap-3 rounded-lg border border-border bg-card p-5 transition-colors hover:border-primary/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              href={resourceArticlePath(guide.slug)}
            >
              <span className="flex items-center justify-between gap-3">
                <Badge variant="secondary">{guide.category}</Badge>
                <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                  <Clock aria-hidden="true" className="size-3.5" />
                  {guide.readMinutes} min
                </span>
              </span>
              <span className="font-heading text-lg leading-snug font-semibold text-foreground">
                {guide.h1}
              </span>
              <span className="mt-auto inline-flex items-center gap-1.5 text-sm font-medium text-primary group-hover:underline">
                Read guide
                <ArrowRight aria-hidden="true" className="size-4" />
              </span>
            </Link>
          </li>
        ))}
      </ul>
      {showAll ? (
        <div className="mt-8 flex justify-center">
          <Button asChild variant="outline">
            <Link href={RESOURCES_BASE_PATH}>View all guides</Link>
          </Button>
        </div>
      ) : null}
    </section>
  );
}
