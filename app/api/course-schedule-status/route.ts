import { buildPublishedCourseScheduleStatus } from "@/lib/published-course-schedule";

// This describes only the JSON bundled in this deployment. Never fetch the live
// dashboard feed here: that could claim a change is public before pages rebuild.
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export function GET() {
  return Response.json(buildPublishedCourseScheduleStatus(), {
    headers: {
      "Cache-Control": "no-store, max-age=0",
      "CDN-Cache-Control": "no-store",
      "Vercel-CDN-Cache-Control": "no-store",
      "X-Robots-Tag": "noindex",
    },
  });
}
