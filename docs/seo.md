# SEO and Structured Data

This document describes the organic-search surfaces of the site: structured data,
metadata, the sitemap/robots/llms.txt trio, the `/resources` content hub, and image
performance. Read it before changing schema, canonical/robots behavior, the sitemap,
or adding indexable content.

## SEO surfaces at a glance

| Surface | Source | Notes |
| --- | --- | --- |
| Page metadata (title, description, canonical, OG/Twitter, robots) | `lib/site-metadata.ts` (`buildPageMetadata`) | Per-route; canonical prefers a clean alias over encoded-slash routes. |
| Global JSON-LD (Organization/LocalBusiness + WebSite) | `components/site/structured-data.tsx` (`GlobalStructuredData`, mounted in `app/layout.tsx`) | Includes NAP, geo, hours, and `sameAs`. |
| Per-route JSON-LD (Course list, Course, FAQ, Breadcrumb, Article) | `components/site/structured-data.tsx` | Emitted by the route that needs it. |
| Sitemap | `app/sitemap.xml/route.ts` (index) → `app/sitemap.website.xml/route.ts` (urls) | `force-static`. Public, indexable routes only. |
| Robots | `app/robots.txt/route.ts` | Disallows utility paths; explicitly allows named AI crawlers. |
| LLM discovery | `app/llms.txt/route.ts` | Human-readable index of programs, guides, and contact info for AI search. |
| Content hub | `lib/resource-articles.ts` + `app/resources/**` | Indexable informational/local guides (see below). |

## Structured data (JSON-LD)

All JSON-LD is centralized in `components/site/structured-data.tsx` and rendered via the
shared `StructuredDataScript` helper (escapes `<` as `\\u003c`).

- **Organization / LocalBusiness** (`buildOrganizationData`) — `EducationalOrganization` +
  `LocalBusiness` with `@id` `${siteUrl}#organization`, address, geo, opening hours, and `sameAs`.
- **WebSite** (`buildWebsiteData`).
- **Course list** (`CourseListStructuredData`) — homepage `ItemList` linking the six course
  detail pages with unique canonical URLs.
- **Course** (`CourseStructuredData`) — one per course path in `COURSE_SCHEMA_BY_PATH`, with
  `hasCourseInstance` schedule dates, `offers`, and provider codes.
- **FAQPage** (`FaqStructuredData` for `/faqs-1`; `ResourceArticleStructuredData` for guide FAQs).
- **BreadcrumbList** (`BreadcrumbStructuredData`).
- **Article** (`ResourceArticleStructuredData`) — one per `/resources/*` guide.

### Ratings and reviews (guideline rationale)

Organization- and Course-level rating markup is intentionally omitted because the testimonials
originate on Google, and Google does not support self-serving or cross-site aggregated review
snippets. The visible homepage summary links to the complete Google listing without embedding
every hidden review in the page payload. Course testimonials remain visible page content but are
not represented as review schema.

When reviews change, update the review rows in `lib/site-data.ts`. Validate with Google's Rich
Results Test after any schema change.

## Metadata and canonicals

`buildPageMetadata` (`lib/site-metadata.ts`) produces the `Metadata` object for every route:
title, description, canonical (`alternates.canonical`), `robots` (index/follow driven by the
route's `noindex`), OpenGraph, Twitter card, and a default OG image from `app/opengraph-image.tsx`.
Encoded-slash routes (e.g. `/bls%2Fcpr-1`) emit their clean alias (`/bls-cpr-1`) as canonical.

## Sitemap, robots, llms.txt

- **Sitemap** — `app/sitemap.website.xml/route.ts` collects public routes from
  `getPublicSitemapRoutes()`, the synthetic `journeyRoute`, `getResourceSitemapRoutes()`, and the
  social channel pages. Noindex (`/lp/*`, `/m/*`, utility) routes are excluded. Priorities are set
  in `priorityFor`.
- **Robots** — `app/robots.txt/route.ts` disallows `/m/`, resume-portal, `/g/api/`, and `/markup/`
  for both the wildcard group and explicitly named AI crawlers.
- **llms.txt** — `app/llms.txt/route.ts` is a curated, human-readable index. The Guides section is
  generated from `resourceArticles`, so new guides appear automatically.

## Content hub (`/resources`)

The content hub targets top-of-funnel informational and local intent (how to become a dental
assistant in California, cost, timeline, RDA vs DA, Sacramento-area pay) and links down to the
commercial course pages. It is a data-driven engine modeled on `lib/journey-roadmap-data.ts`.

**Files:**

- `lib/resource-articles.ts` — the article data model, the seed articles, and synthetic `LiveRoute`
  builders (`resourceHubRoute`, `resourceRouteForArticle`, `getResourceSitemapRoutes`).
- `app/resources/page.tsx` — the hub index (`ResourceHubPage`).
- `app/resources/[slug]/page.tsx` — one prerendered page per article (`generateStaticParams`),
  with Article + FAQ + Breadcrumb JSON-LD.
- `components/site/resource-hub-page.tsx` and `components/site/resource-article-page.tsx` — the
  render layer (server components; FAQ uses native `<details>` so answers are crawlable without JS).

**To add a new guide:**

1. Append a `ResourceArticle` object to `resourceArticles` in `lib/resource-articles.ts` (unique
   `slug`, `title`, `h1`, `description`, `datePublished`/`dateModified`, `heroImage`, sections,
   `faqs`, `relatedCourses`, `relatedSlugs`).
2. That is it — the page prerenders, joins the sitemap and `llms.txt`, and gets full schema
   automatically. Cross-link it from a sibling article's `relatedSlugs`.
3. Keep content genuinely useful and grounded (real course facts + Dental Board sources). Avoid
   thin, near-duplicate "doorway" pages, which Google penalizes.

**Gating:** `/resources/*` (like `/lp/*`) is **not** listed in `tests/support/qa-routes.json`, so new
guides cannot drift the content/visual baselines and no baseline refresh is required.

## Image performance (Core Web Vitals)

The frozen GoDaddy snapshots ship images without native loading hints. `promoteLazyImages` in
`lib/live-route-data.ts` restores them during body sanitization:

- Every snapshot `<img>` gets `decoding="async"`.
- Every snapshot `<img>` except the first gets `loading="lazy"` (the first is kept eager as the
  likely LCP element; the homepage hero is injected separately with its own `eager` /
  `fetchpriority` hints via `replaceHomepageHero`).

These are invisible attribute-only changes, so they do not affect content or visual parity — the
visual suite scrolls the full page before capturing, so lazy images still load for the comparison.

## Known follow-up

A header/footer navigation link to `/resources` is **not** yet added. Because content parity
compares full-page body text, a link in the shared shell would drift the committed baselines unless
it is excluded via `additiveParitySelectors` in **both** `tests/support/qa-helpers.ts` and
`scripts/refresh-live-baselines.mjs`, and the visual gate (home, dental-assisting-program,
infection-control, photos, m-login) would still capture the layout change. Add it deliberately with
a `pnpm snapshot:refresh` baseline update. Until then, the hub is discovered via the sitemap and
`llms.txt` and is internally linked from every guide.
