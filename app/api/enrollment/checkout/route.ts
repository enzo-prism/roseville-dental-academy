import { ENROLLMENT_POLICY_VERSION, safeTestCheckoutUrl } from "@/lib/enrollment-contract";
import { bindTestSession, reserveTestHold } from "@/lib/enrollment-db";
import { availableTestDates, enrollmentBody, enrollmentOwner, enrollmentResponse, validEnrollmentMutation, validHoldId } from "@/lib/enrollment-http";
import { createTestSession, retrieveTestSession } from "@/lib/enrollment-stripe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function POST(request: Request) {
  const owner = await enrollmentOwner();
  if (!owner) return enrollmentResponse({ error: "Private access required." }, 401);
  const config = validEnrollmentMutation(request);
  if (!config) return enrollmentResponse({ error: "Test checkout is unavailable or request origin is invalid." }, 503);
  try {
    const body = await enrollmentBody(request);
    if (Object.keys(body).some((key) => !["holdId", "date", "policyAccepted", "policyVersion"].includes(key))
      || !validHoldId(body.holdId) || typeof body.date !== "string" || body.policyAccepted !== true
      || body.policyVersion !== ENROLLMENT_POLICY_VERSION
      || !availableTestDates().some((date) => date.isoDate === body.date)) {
      return enrollmentResponse({ error: "Choose an available date and accept the current policy.", holdCreated: false }, 400);
    }
    const hold = await reserveTestHold(body.holdId, body.date, owner, ENROLLMENT_POLICY_VERSION);
    if (!hold) return enrollmentResponse({ error: "All 12 test seats for that date are held. Choose another date or reconcile an abandoned test.", holdCreated: false }, 409);
    if (hold.status !== "reserved") return enrollmentResponse({ error: "This test is already completed or expired. Start a new test." }, 409);
    const session = hold.stripe_session_id
      ? await retrieveTestSession(hold.stripe_session_id, config) : await createTestSession(hold, config);
    // Even persisted sessions are revalidated; browser fields can never control amount or session binding.
    const { assertBoundTestSession } = await import("@/lib/enrollment-contract");
    assertBoundTestSession(session, hold);
    if (session.status !== "open") return enrollmentResponse({ error: "The test session has closed. Reconcile it before starting another." }, 409);
    await bindTestSession(hold, session.id);
    return enrollmentResponse({ url: safeTestCheckoutUrl(session.url), holdId: hold.hold_id, testOnly: true });
  } catch {
    return enrollmentResponse({ error: "Test checkout could not start. Your test hold is preserved; retry the same test or reconcile it. No real money was charged." }, 503);
  }
}
