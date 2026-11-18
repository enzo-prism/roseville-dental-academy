import { enrollmentBody, enrollmentResponse } from "@/lib/enrollment-http";
import { hasValidBearer } from "@/lib/server/attribution-auth";
import { studentDatabase } from "@/lib/student-enrollment";
import { INFECTION_CONTROL_OFFERING_CAPACITY } from "@/lib/student-enrollment-offerings";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const versionPattern = /^enrollment:([0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12})$/;
const courseDate = "2026-12-05";

function inventoryMode(request: Request) {
  if (!hasValidBearer(request, "RDA_DASHBOARD_INVENTORY_SECRET")) return null;
  const mode = process.env.RDA_STUDENT_PAYMENTS_MODE;
  return mode === "live" || mode === "test" ? mode : null;
}

function editState(change: unknown) {
  if (change === null) return "removed";
  if (change === "full") return "closed";
  if (change === "open") return "unknown";
  if (typeof change === "number" && Number.isInteger(change) &&
      change >= 0 && change <= INFECTION_CONTROL_OFFERING_CAPACITY) return "counted";
  return null;
}

// The server selects the mode, course and date. The dashboard credential
// only grants access to the pilot's inventory and its seat-change history.
export async function GET(request: Request) {
  const mode = inventoryMode(request);
  if (!mode) return enrollmentResponse({ error: "Unauthorized" }, 401);
  try {
    const [row] = await studentDatabase()`SELECT cell, COALESCE((
      SELECT jsonb_agg(to_jsonb(a) ORDER BY a.at DESC) FROM (
        SELECT version AS id, changed_at AS at,
          before_cell->>'status' AS before, after_cell->>'status' AS after,
          before_cell->'seatsLeft' AS "seatsBefore", after_cell->'seatsLeft' AS "seatsAfter"
        FROM student_dashboard_seat_edits WHERE offering_id=i.id ORDER BY changed_at DESC LIMIT 200
      ) a), '[]'::jsonb) AS audit
      FROM student_dashboard_inventory i WHERE mode=${mode} AND course_id='infection-control' AND course_date=${courseDate}::date`;
    if (row) return enrollmentResponse(row);
  } catch { /* Report the same error for a missing or unreachable class. */ }
  return enrollmentResponse({ error: "Inventory unavailable" }, 503);
}

export async function POST(request: Request) {
  const mode = inventoryMode(request);
  if (!mode) return enrollmentResponse({ error: "Unauthorized" }, 401);
  let body;
  try {
    body = await enrollmentBody(request);
  } catch {
    return enrollmentResponse({ error: "Invalid edit" }, 400);
  }
  const { expectedVersion, change } = body;
  const version = typeof expectedVersion === "string" && versionPattern.exec(expectedVersion)?.[1];
  const state = editState(change);
  if (!version || !state) return enrollmentResponse({ error: "Invalid edit" }, 400);
  try {
    const [row] = await studentDatabase()`SELECT edit_student_dashboard_inventory(
      id, ${version}::uuid, ${state}, ${typeof change === "number" ? change : null}::integer
    ) AS result FROM student_dashboard_inventory WHERE mode=${mode}
      AND course_id='infection-control' AND course_date=${courseDate}::date`;
    return row?.result
      ? enrollmentResponse(row.result)
      : enrollmentResponse({ error: "Inventory changed or count exceeds capacity" }, 409);
  } catch {
    return enrollmentResponse({ error: "Inventory unavailable" }, 503);
  }
}
