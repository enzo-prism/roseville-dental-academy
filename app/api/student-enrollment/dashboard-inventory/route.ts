import { enrollmentBody, enrollmentResponse } from "@/lib/enrollment-http";
import { hasValidBearer } from "@/lib/server/attribution-auth";
import { studentDatabase } from "@/lib/student-enrollment";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function inventoryMode(request: Request) {
  if (!hasValidBearer(request, "RDA_DASHBOARD_INVENTORY_SECRET")) return null;
  const mode = process.env.RDA_STUDENT_PAYMENTS_MODE;
  return mode === "live" || mode === "test" ? mode : null;
}

// The server selects the mode, course and date. This credential can only manage
// seats for the pilot, with no student identity, pricing, payment or launch access.
export async function GET(request: Request) {
  const mode = inventoryMode(request);
  if (!mode) return enrollmentResponse({error: "Unauthorized"}, 401);
  try {
    const [row] = await studentDatabase()`SELECT cell, COALESCE((
      SELECT jsonb_agg(to_jsonb(a) ORDER BY a.at DESC) FROM (
        SELECT version AS id,changed_at AS at,before_cell->>'status' AS before,after_cell->>'status' AS after,
          before_cell->'seatsLeft' AS "seatsBefore",after_cell->'seatsLeft' AS "seatsAfter"
        FROM student_dashboard_seat_edits WHERE offering_id=i.id ORDER BY changed_at DESC LIMIT 200
      ) a), '[]'::jsonb) AS audit
      FROM student_dashboard_inventory i WHERE mode=${mode} AND course_id='infection-control' AND course_date='2026-12-05'`;
    return row ? enrollmentResponse(row) : enrollmentResponse({error:"Inventory unavailable"},503);
  } catch { return enrollmentResponse({error:"Inventory unavailable"},503); }
}

export async function POST(request: Request) {
  const mode = inventoryMode(request);
  if (!mode) return enrollmentResponse({error:"Unauthorized"},401);
  let body;
  try { body = await enrollmentBody(request); } catch { return enrollmentResponse({error:"Invalid edit"},400); }
  const {expectedVersion, change} = body;
  if (typeof expectedVersion !== "string" || !/^enrollment:[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/.test(expectedVersion) ||
      !(change === null || change === "full" || change === "open" ||
        (typeof change === "number" && Number.isInteger(change) && change >= 0 && change <= 12))) {
    return enrollmentResponse({error:"Invalid edit"},400);
  }
  const state = typeof change === "number" ? "counted" : change === "full" ? "closed" : change === "open" ? "unknown" : "removed";
  try {
    const [row] = await studentDatabase()`SELECT edit_student_dashboard_inventory(id,${expectedVersion.slice(11)}::uuid,
      ${state},${typeof change === "number" ? change : null}::integer) AS result
      FROM student_dashboard_inventory WHERE mode=${mode} AND course_id='infection-control' AND course_date='2026-12-05'`;
    return row?.result ? enrollmentResponse(row.result) : enrollmentResponse({error:"Inventory changed or count exceeds capacity"},409);
  } catch { return enrollmentResponse({error:"Inventory unavailable"},503); }
}
