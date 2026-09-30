import { neon } from "@neondatabase/serverless";
import { STUDENT_JOBS_PRIVATE_HEADERS } from "@/lib/student-jobs-auth";
import { hasValidBearer } from "@/lib/server/attribution-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!hasValidBearer(request, "CRON_SECRET")) {
    return Response.json({ error: "Unauthorized" }, { status: 401, headers: STUDENT_JOBS_PRIVATE_HEADERS });
  }
  const databaseUrl = process.env.DATABASE_URL?.trim();
  if (!databaseUrl) return Response.json({ error: "Temporarily unavailable" }, { status: 503, headers: STUDENT_JOBS_PRIVATE_HEADERS });
  try {
    const sql = neon(databaseUrl);
    const rows = await sql`DELETE FROM rda_student_jobs_rate_limits WHERE window_start < now() - interval '1 day' RETURNING bucket_hash`;
    return Response.json({ removed: rows.length }, { headers: STUDENT_JOBS_PRIVATE_HEADERS });
  } catch {
    return Response.json({ error: "Temporarily unavailable" }, { status: 503, headers: STUDENT_JOBS_PRIVATE_HEADERS });
  }
}
