import courseScheduleData from "@/data/course-schedule.json";
import { scheduleRevision } from "@/lib/course-schedule-revision.mjs";

// This describes only the JSON bundled in this deployment. Never fetch the live
// dashboard feed here: that could claim a change is public before pages rebuild.
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export function GET() {
  return Response.json(
    {
      version: 1,
      revision: scheduleRevision(courseScheduleData.entries),
      reviewedOn: courseScheduleData.reviewedOn,
      source: courseScheduleData.source,
    },
    {
      headers: {
        "Cache-Control": "no-store, max-age=0",
        "CDN-Cache-Control": "no-store",
        "Vercel-CDN-Cache-Control": "no-store",
        "X-Robots-Tag": "noindex",
      },
    },
  );
}
