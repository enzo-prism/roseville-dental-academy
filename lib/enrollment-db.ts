import { neon } from "@neondatabase/serverless";
import type { EnrollmentHold } from "@/lib/enrollment-contract";

function database() {
  if (!process.env.DATABASE_URL) throw new Error("Enrollment database unavailable");
  return neon(process.env.DATABASE_URL);
}
function asHold(row: Record<string, unknown>): EnrollmentHold {
  return { ...row, course_date: String(row.course_date).slice(0, 10) } as EnrollmentHold;
}
export async function reserveTestHold(id: string, date: string, owner: string, policy: string) {
  const rows = await database()`SELECT * FROM reserve_enrollment_test_hold(${id}::uuid, ${date}::date, ${owner}, ${policy})`;
  return rows.length ? asHold(rows[0]) : null;
}
export async function getTestHold(id: string) {
  const rows = await database()`SELECT * FROM enrollment_test_holds WHERE hold_id=${id}::uuid`;
  return rows.length ? asHold(rows[0]) : null;
}
export async function bindTestSession(hold: EnrollmentHold, sessionId: string) {
  const rows = await database()`UPDATE enrollment_test_holds SET stripe_session_id=${sessionId}, updated_at=now()
    WHERE hold_id=${hold.hold_id}::uuid AND (stripe_session_id IS NULL OR stripe_session_id=${sessionId})
    RETURNING hold_id`;
  if (!rows.length) throw new Error("Session binding conflict");
}
export async function recordTestOutcome(event: string, id: string, session: string, outcome: "paid" | "expired") {
  await database()`SELECT apply_enrollment_test_event(${event}, ${id}::uuid, ${session}, ${outcome})`;
}
