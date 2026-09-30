import { enrollmentBody, enrollmentOwner, enrollmentResponse, validEnrollmentMutation, validHoldId } from "@/lib/enrollment-http";
import { assertBoundTestSession } from "@/lib/enrollment-contract";
import { getTestHold, bindTestSession } from "@/lib/enrollment-db";
import { createTestSession, expireTestSession, retrieveTestSession } from "@/lib/enrollment-stripe";
import { verifyAndRecordSession } from "@/lib/enrollment-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function POST(request: Request) {
  const owner = await enrollmentOwner();
  if (!owner) return enrollmentResponse({ error: "Private access required." }, 401);
  const config = validEnrollmentMutation(request);
  if (!config) return enrollmentResponse({ error: "Test checkout unavailable or invalid origin." }, 503);
  try {
    const body = await enrollmentBody(request);
    if (!validHoldId(body.holdId) || Object.keys(body).some((key) => key !== "holdId")) return enrollmentResponse({ error: "Invalid test hold." }, 400);
    const hold = await getTestHold(body.holdId);
    if (!hold || hold.owner_hash !== owner) return enrollmentResponse({ error: "Test hold not found." }, 404);
    if (hold.status !== "reserved") return enrollmentResponse({ status: hold.status, testOnly: true });
    let session = hold.stripe_session_id ? await retrieveTestSession(hold.stripe_session_id, config) : await createTestSession(hold, config);
    assertBoundTestSession(session, hold);
    await bindTestSession(hold, session.id);
    if (session.status === "open") session = await expireTestSession(session.id, config);
    const verified = await verifyAndRecordSession(session, `reconcile:${session.id}:${session.status}`);
    return enrollmentResponse({ status: verified?.status, testOnly: true });
  } catch {
    return enrollmentResponse({ error: "Stripe could not verify closure. The test seat remains held. An administrator must investigate the hold; it is never released from local time alone." }, 503);
  }
}
