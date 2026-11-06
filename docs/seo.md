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
| Local SEO landers | `lib/local-seo-pages.ts`, `lib/seo-landing-pages.ts` + `app/dental-assisting-school/**`, `app/for-dental-offices`, `app/rda-certification-courses`, `app/es/programa-de-asistente-dental` | City hub + six city pages, dental-office IC page, RDA path, Spanish DA page. |

## Structured data (JSON-LD)

All JSON-LD is centralized in `components/site/structured-data.tsx` and rendered via the
shared `StructuredDataScript` helper (escapes `<` as `\\u003c`).

- **Organization / LocalBusiness** (`buildOrganizationData`) — `EducationalOrganization` +
  `LocalBusiness` with `@id` `${siteUrl}#organization`, address, geo, opening hours, and `sameAs`.
- **WebSite** (`buildWebsiteData`).
- **Course list** (`CourseListStructuredData`) — homepage `ItemList` linking the six course
  detail pages with unique canonical URLs.
- **Course** (`CourseStructuredData`) — one per course path in `COURSE_SCHEMA_BY_PATH`, with
  `hasCourseInstance` for upcoming *open* dates only (sold-out/`full` instances are omitted),
  `offers`, and provider codes.
- **FAQPage** (`FaqStructuredData` for `/faqs-1`, built from `studentFaqHighlights` so the markup mirrors the visible FAQ cards; `ResourceArticleStructuredData` for guide FAQs; `FaqListStructuredData` for the local SEO landers). Do not point it at `faqItems`, whose questions are not rendered on the live page.
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

The Dental Assisting Program English/Spanish pair is the only hreflang convention on the site:
`/dental-assisting-program` (en-US, x-default) ↔ `/es/programa-de-asistente-dental` (es-US). Both
sides emit the same `alternates.languages` map. The Spanish page also sets `openGraph.locale` to
`es_US` and `lang="es"` on `<main>`; the document `<html lang>` stays `en` (no per-route html-lang
layout exists). The page does not claim that classes are taught in Spanish.

## Sitemap, robots, llms.txt

- **Sitemap** — `app/sitemap.website.xml/route.ts` collects public routes from
  `getPublicSitemapRoutes()`, the synthetic `journeyRoute`, reviews/cancellation routes,
  `getResourceSitemapRoutes()`, `getLocalSeoSitemapRoutes()`, `getSeoLandingSitemapRoutes()`, and the
  social channel pages. Noindex (`/lp/*`, `/m/*`, utility) routes are excluded. Priorities are set
  in `priorityFor`.
- **Robots** — `app/robots.txt/route.ts` disallows `/m/`, resume-portal, `/g/api/`, and `/markup/`
  for both the wildcard group and explicitly named AI crawlers.
- **llms.txt** — `app/llms.txt/route.ts` is a curated, human-readable index. The Guides section is
  generated from `resourceArticles`, so new guides appear automatically.

## Content hub (`/resources`)

The content hub targets top-of-funnel informational and local intent (how to become a dental
assistant in California, cost, timeline, RDA vs DA, Sacramento-area pay, and the 8-hour Infection
Control requirement for dental offices) and links down to the
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

## Local SEO landers

React-owned indexable pages that sit beside the snapshot catch-all (`app/[[...slug]]/page.tsx`).
Explicit `app/` routes win, so these paths are not shadowed.

| Path | Purpose |
| --- | --- |
| `/dental-assisting-school` | Hub for Sacramento-area commute pages |
| `/dental-assisting-school/{city}` | Sacramento, Rocklin, Lincoln, Folsom, Citrus Heights, Auburn |
| `/for-dental-offices` | 8-hour Infection Control course option for office teams |
| `/rda-certification-courses` | Five Board-approved / BLS courses in recommended order |
| `/es/programa-de-asistente-dental` | Spanish summary of the 9-week program |

Copy and measured drive times live in `lib/local-seo-pages.ts` and `lib/seo-landing-pages.ts`.
Prices come from `programCards` / `academy-catalog`; class dates come from `lib/course-schedule`.
They are in the website sitemap and `llms.txt`. As of November 6, the shared header links to Spanish and dental-office training, and the footer links to those pages plus the school hub. Program and resource pages provide contextual links. Shared-shell content baselines are refreshed with deliberate navigation changes.

## Image performance (Core Web Vitals)

The frozen GoDaddy snapshots ship images without native loading hints. `promoteLazyImages` in
`lib/live-route-data.ts` restores them during body sanitization:

- Every snapshot `<img>` gets `decoding="async"`.
- Every snapshot `<img>` except the first gets `loading="lazy"` (the first is kept eager as the
  likely LCP element; the homepage hero is injected separately with its own `eager` /
  `fetchpriority` hints via `replaceHomepageHero`).

These are invisible attribute-only changes, so they do not affect content or visual parity — the
visual suite scrolls the full page before capturing, so lazy images still load for the comparison.

## Resource discovery

The Resources hub is linked in the shared footer. Individual guides link to relevant approved courses, current dates, and program information. Follow `docs/release-qa.md` for accepting deliberate shared-shell changes; do not hide navigation from parity checks.

## October 29 local-page release review

The city, office, course-path, and Spanish pages retain the current academy tuition and schedule sources. Unconfirmed CEREC/CT/Nomad equipment statements and new down-payment/weekly-payment prose are omitted; admissions confirms payment arrangements. The Spanish page labels and links the approved English cancellation summary rather than presenting an unapproved policy translation. It does not claim Spanish-language classes or staff. The sitemap keeps the already-live dental front desk inquiry page.

The new office and course-path pages describe the academy’s approved 8-hour Infection Control offering without saying it is the only qualifying pathway. Employers are directed to verify current Dental Board requirements for the individual assistant; the September 2026 SB 1311 change makes the former blanket 8-hour claim inappropriate.


## November 6, 2026 SEO/AEO release

The header and footer now expose the existing Spanish program and dental-office training pages; the footer also exposes the school/location hub. Course pages include a decision guide for the entry-level DA program and Radiation Safety, with Board references and explicit distinctions between course completion, RDA licensure, and patient X-rays. The program title/H1 describes training in Roseville. No new approval, clinical eligibility, employment outcome, fee or schedule was invented. `CourseDecisionGuide` derives price/duration from the approved academy catalog. Resource articles link directly to relevant course cards with catalog facts and the approved next available date.

Repeated Instagram logos now use one cacheable, same-origin SVG asset. Homepage review stars share one SVG definition. Compared with the same main-branch production build, decoded HTML fell from 728,009 to 582,004 bytes on Home (20.0%) and from 996,360 to 424,814 on Instagram (57.4%). This measures HTML payload, not a field Core Web Vitals improvement. Posts, captions and review text are preserved.

The canonical apex redirect was changed through the Vercel domain API to permanent 308, read back, and tested with campaign parameters intact. Existing www canonicals and sitemap remain authoritative. Search Console owner access was verified for the native Google identity. October 7–November 3 data: 716 clicks and 31,130 impressions; this is a pre-release baseline, not an outcome.

FAQ markup describes visible answers; it does not guarantee rich results or AI citations. Evaluate retrieval with a dated set of local school, DA/RDA, tuition, duration and Radiation Safety queries, recording engine, locale, prompt, cited URL and answer accuracy. Compare admissions leads and enrolled students separately from clicks and booking starts.

Remaining externally dependent work: admissions confirmation of any unpublished cost inclusions, original clinician/instructor media with usage rights, Google Business Profile reconciliation through an authorized account, and downstream enrollment reporting. Do not start payment/email operations that are held in the operational runbook.

Content review found conflicting legacy lecture-format statements (online versus all lectures in person). Until admissions confirms delivery for the 9-week clinical DA program, public copy describes lectures/coursework and verified in-person chairside training without promising either lecture mode. The separate front-desk course retains its confirmed Zoom/Saturday format.
