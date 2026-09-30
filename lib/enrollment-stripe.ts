import { assertBoundTestSession, type EnrollmentConfig, type EnrollmentHold, type TestCheckoutSession } from "@/lib/enrollment-contract";

async function stripe(config: EnrollmentConfig, path: string, body?: URLSearchParams, idempotency?: string) {
  if (!/^(sk|rk)_test_/.test(config.key)) throw new Error("Test credentials required");
  const response = await fetch(`https://api.stripe.com/v1/${path}`, {
    method: body ? "POST" : "GET", cache: "no-store", signal: AbortSignal.timeout(15000),
    headers: { Authorization: `Bearer ${config.key}`, "Stripe-Version": "2025-02-24.acacia",
      ...(body ? { "Content-Type": "application/x-www-form-urlencoded" } : {}),
      ...(idempotency ? { "Idempotency-Key": idempotency } : {}) }, body,
  });
  if (!response.ok) throw new Error("Test payment provider unavailable");
  const session = await response.json() as TestCheckoutSession;
  if (session.livemode !== false || !/^cs_test_[A-Za-z0-9]+$/.test(session.id)) throw new Error("Non-test response rejected");
  return session;
}
export function testSessionParameters(hold: EnrollmentHold, config: EnrollmentConfig) {
  return new URLSearchParams({ mode: "payment", "payment_method_types[0]": "card",
    "line_items[0][price_data][currency]": "usd", "line_items[0][price_data][unit_amount]": "39500",
    "line_items[0][price_data][product_data][name]": "TEST ONLY: Infection Control ($395) - no real enrollment",
    "line_items[0][quantity]": "1", client_reference_id: hold.hold_id,
    "metadata[hold_id]": hold.hold_id, "metadata[course_date]": hold.course_date,
    "metadata[policy_version]": hold.policy_version, "metadata[pilot]": "test-only",
    expires_at: String(hold.stripe_expires_at),
    success_url: `${config.origin}/enrollment-pilot/confirmation?hold=${hold.hold_id}`,
    cancel_url: `${config.origin}/enrollment-pilot?cancelled=1`,
    "custom_text[submit][message]": "TEST ONLY. No real money is charged and no actual course seat is reserved.",
  });
}
export async function createTestSession(hold: EnrollmentHold, config: EnrollmentConfig) {
  // Persisted expiry and request body make every retry identical. Unknown Stripe failures keep the seat held.
  if (Number(hold.stripe_expires_at) < Date.now() / 1000 + 1800) {
    const recovered = await recoverTestSession(hold, config);
    if (recovered) return recovered;
    throw new Error("Hold needs administrator reconciliation");
  }
  const session = await stripe(config, "checkout/sessions", testSessionParameters(hold, config), `rda-test-${hold.hold_id}`);
  assertBoundTestSession(session, hold);
  return session;
}
export async function recoverTestSession(hold: EnrollmentHold, config: EnrollmentConfig) {
  if (!/^(sk|rk)_test_/.test(config.key)) throw new Error("Test credentials required");
  const start = Number(hold.stripe_expires_at) - 3600;
  let cursor = "";
  let recovered: TestCheckoutSession | null = null;
  // A lost POST response can outlive Stripe's idempotency retention. Recover by the immutable hold metadata,
  // never by creating a second session or assuming local expiry proves a session is closed.
  for (let page = 0; page < 10; page += 1) {
    const query = new URLSearchParams({ limit: "100", "created[gte]": String(start - 60), "created[lte]": String(start + 1800), ...(cursor ? { starting_after: cursor } : {}) });
    const response = await fetch(`https://api.stripe.com/v1/checkout/sessions?${query}`, { cache: "no-store", signal: AbortSignal.timeout(15000),
      headers: { Authorization: `Bearer ${config.key}`, "Stripe-Version": "2025-02-24.acacia" } });
    if (!response.ok) throw new Error("Test session recovery unavailable");
    const list = await response.json() as { object: string; data: TestCheckoutSession[]; has_more: boolean };
    if (list.object !== "list" || !Array.isArray(list.data) || typeof list.has_more !== "boolean"
      || list.data.some((session) => session.livemode !== false || !/^cs_test_[A-Za-z0-9]+$/.test(session.id))) throw new Error("Invalid test recovery response");
    const matches = list.data.filter((session) => session.metadata?.hold_id === hold.hold_id);
    if (matches.length > 1 || (matches.length === 1 && recovered)) throw new Error("Duplicate test sessions require administrator review");
    if (matches.length === 1) { assertBoundTestSession(matches[0], hold); recovered = matches[0]; }
    if (!list.has_more) return recovered;
    cursor = list.data.at(-1)?.id ?? "";
    if (!cursor) throw new Error("Invalid test recovery pagination");
  }
  throw new Error("Test recovery requires administrator review");
}
export async function retrieveTestSession(id: string, config: EnrollmentConfig) {
  if (!/^cs_test_[A-Za-z0-9]+$/.test(id)) throw new Error("Invalid test session");
  return stripe(config, `checkout/sessions/${encodeURIComponent(id)}`);
}
export async function expireTestSession(id: string, config: EnrollmentConfig) {
  if (!/^cs_test_[A-Za-z0-9]+$/.test(id)) throw new Error("Invalid test session");
  return stripe(config, `checkout/sessions/${encodeURIComponent(id)}/expire`, new URLSearchParams(), `rda-test-expire-${id}`);
}
