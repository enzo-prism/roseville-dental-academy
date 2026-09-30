import { createHmac } from "node:crypto";
import { neon } from "@neondatabase/serverless";
import type { StudentJobsAuthConfig } from "./student-jobs-auth";

const WINDOW_SECONDS = 15 * 60;
export const STUDENT_JOBS_RATE_LIMIT_SQL = `
  WITH global_allowance AS (
    INSERT INTO rda_student_jobs_rate_limits (bucket_hash, window_start, request_count)
    VALUES ('global', $1, 1)
    ON CONFLICT (bucket_hash, window_start) DO UPDATE SET
      request_count = rda_student_jobs_rate_limits.request_count + 1
    WHERE rda_student_jobs_rate_limits.request_count < 100
    RETURNING bucket_hash
  )
  INSERT INTO rda_student_jobs_rate_limits (bucket_hash, window_start, request_count)
  SELECT $2, $1, 1 FROM global_allowance
  ON CONFLICT (bucket_hash, window_start) DO UPDATE SET
    request_count = rda_student_jobs_rate_limits.request_count + 1
  WHERE rda_student_jobs_rate_limits.request_count < 10
  RETURNING bucket_hash
`;
// Development only. Production always requires the durable database limiter.
const developmentBuckets = new Map<string, { count: number; expires: number }>();

export async function allowStudentJobsLogin(request: Request, config: StudentJobsAuthConfig) {
  const now = Date.now();
  // Vercel overwrites x-vercel-forwarded-for. Do not trust caller-supplied generic forwarded IPs.
  const address = process.env.VERCEL
    ? request.headers.get("x-vercel-forwarded-for")?.split(",")[0]?.trim() || "unknown"
    : "local";
  const bucket = createHmac("sha256", config.secret).update(`student-jobs:${address}`).digest("hex");
  const windowStart = new Date(Math.floor(now / (WINDOW_SECONDS * 1000)) * WINDOW_SECONDS * 1000).toISOString();
  const databaseUrl = process.env.DATABASE_URL?.trim();
  if (databaseUrl) {
    try {
      const sql = neon(databaseUrl);
      // Both checks are atomic. A global budget bounds guesses even across rotating IP addresses.
      const rows = await sql.query(STUDENT_JOBS_RATE_LIMIT_SQL, [windowStart, bucket]);
      return rows.length === 1;
    } catch { return false; }
  }
  if (process.env.NODE_ENV === "production" || process.env.VERCEL) return false;
  for (const [key, value] of developmentBuckets) if (value.expires <= now) developmentBuckets.delete(key);
  const key = `${bucket}:${windowStart}`;
  const entry = developmentBuckets.get(key) || { count: 0, expires: now + WINDOW_SECONDS * 1000 };
  entry.count++;
  developmentBuckets.set(key, entry);
  return entry.count <= 10;
}
