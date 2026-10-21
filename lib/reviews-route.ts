import type { LiveRoute } from "@/lib/live-route-data";

export const REVIEWS_PATH = "/reviews";

// Indexable student-reviews page. Reviews are shown as visible Google review
// excerpts only; no Review/AggregateRating structured data (self-serving
// review markup was removed site-wide, see docs/seo.md).
export const reviewsRoute: LiveRoute = {
  aliases: [],
  assetRoot: "",
  contentBaselinePath: "",
  description:
    "Read every Google review from Roseville Dental Academy students and graduates — dental assisting program, x-ray, BLS, infection control, and RDA certification courses in Roseville, CA.",
  htmlPath: "",
  id: "reviews",
  kind: "mirror",
  noindex: false,
  route: REVIEWS_PATH,
  shellVariant: "public",
  sitemap: true,
  sourcePath: REVIEWS_PATH,
  status: 200,
  title: "Student Reviews | Roseville Dental Academy",
  visualBaselines: {},
  visualMasks: [],
  widgetSlots: [],
};
