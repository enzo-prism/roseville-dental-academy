import { studentDatabase } from "@/lib/student-enrollment";
import { studentSeatSheetConfig } from "@/lib/student-seat-sheet";

export function studentDashboardFeedConfig(env: Record<string, string | undefined> = process.env) {
  const url = env.RDA_SCHEDULE_FEED_URL?.trim();
  const token = env.RDA_SCHEDULE_FEED_TOKEN?.trim();
  if (!url && !token) return env.VERCEL_ENV === "production" ? "unavailable" : "off";
  return url && token ? { url, token } : "unavailable";
}

export async function checkStudentDashboardSeats(
  offering: { id: string; course_id: string; course_date: string },
  database = studentDatabase,
) {
  const config = studentDashboardFeedConfig();
  if (typeof config === "string") return config;
  const useFeedCount = studentSeatSheetConfig() === null;
  try {
    const sql = database();
    const started = useFeedCount
      ? String((await sql`SELECT clock_timestamp()::text AS started`)[0].started)
      : undefined;
    const response = await fetch(config.url, {
      method: "GET",
      headers: { Authorization: `Bearer ${config.token}` },
      signal: AbortSignal.timeout(8000),
      cache: "no-store",
      redirect: "error",
    });
    if (!response.ok) return "unavailable";
    const feed = await response.json() as {
      version?: unknown;
      entries?: ({ courseId?: unknown; isoDate?: unknown; status?: unknown; seatsLeft?: unknown } | null)[];
    } | null;
    if (feed?.version !== 1 || !Array.isArray(feed.entries)) return "unavailable";
    const entries = feed.entries.filter(
      (row) => row?.courseId === offering.course_id && row.isoDate === offering.course_date,
    );
    if (entries.length > 1) return "unavailable";
    const [entry] = entries;
    if (!entry || entry.status === "full" || entry.seatsLeft === 0) return "full";
    if (entry.status !== "open") return "unavailable";
    const seats = entry.seatsLeft;
    // A count above capacity simply means no offline seats are taken.
    if (seats !== undefined && (typeof seats !== "number" || !Number.isSafeInteger(seats) || seats < 0))
      return "unavailable";
    if (started && typeof seats === "number") {
      const applied = await sql`UPDATE student_enrollment_offerings
        SET external_seats=GREATEST(capacity-${seats}::int,0), reviewed_at=${started}::timestamptz,
          review_reference=${`Class Dates feed (${offering.course_date})`}
        WHERE id=${offering.id}::uuid AND dashboard_state IS NULL AND reviewed_at < ${started}::timestamptz
        RETURNING id`;
      // A newer read may have applied a lower offline count while this fetch was in flight.
      if (!applied.length) {
        const [stored] = await sql`SELECT external_seats, capacity FROM student_enrollment_offerings
          WHERE id=${offering.id}::uuid AND dashboard_state IS NULL`;
        if (!stored || Number(stored.external_seats) < Math.max(Number(stored.capacity) - seats, 0))
          return "unavailable";
      }
    }
    return "open";
  } catch (error) {
    return error instanceof Error && error.message.includes("Inventory exceeds capacity")
      ? "full"
      : "unavailable";
  }
}
