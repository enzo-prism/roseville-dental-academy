import { assertBoundTestSession, type EnrollmentConfig, type TestCheckoutSession } from "@/lib/enrollment-contract";
import { bindTestSession, getTestHold, recordTestOutcome } from "@/lib/enrollment-db";
import { retrieveTestSession } from "@/lib/enrollment-stripe";

export async function verifyAndRecordSession(session: TestCheckoutSession, eventId: string) {
  const id = session.metadata?.hold_id;
  if (typeof id !== "string" || !/^[a-f0-9-]{36}$/i.test(id)) throw new Error("Invalid hold");
  const hold = await getTestHold(id);
  if (!hold) throw new Error("Unknown hold");
  assertBoundTestSession(session, hold);
  await bindTestSession(hold, session.id);
  if (session.status === "complete" && session.payment_status === "paid") {
    await recordTestOutcome(eventId, hold.hold_id, session.id, "paid");
  } else if (session.status === "expired" && session.payment_status === "unpaid") {
    await recordTestOutcome(eventId, hold.hold_id, session.id, "expired");
  }
  return getTestHold(id);
}
export async function verifyTestConfirmation(id: string, owner: string, config: EnrollmentConfig) {
  const hold = await getTestHold(id);
  if (!hold || hold.owner_hash !== owner || !hold.stripe_session_id) return null;
  const session = await retrieveTestSession(hold.stripe_session_id, config);
  assertBoundTestSession(session, hold);
  if (session.status !== "complete" || session.payment_status !== "paid") return null;
  const verified = await verifyAndRecordSession(session, `confirmation:${session.id}:paid`);
  return verified?.status === "paid" ? verified : null;
}
