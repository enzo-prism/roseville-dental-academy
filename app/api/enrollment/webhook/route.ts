import { enrollmentConfig, verifyEnrollmentSignature, type TestCheckoutSession } from "@/lib/enrollment-contract";
import { boundedEnrollmentText, enrollmentResponse } from "@/lib/enrollment-http";
import { retrieveTestSession } from "@/lib/enrollment-stripe";
import { verifyAndRecordSession } from "@/lib/enrollment-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function POST(request: Request) {
  const config = enrollmentConfig();
  if (!config) return enrollmentResponse({ error: "Test webhook unavailable." }, 503);
  let raw: string;
  try { raw = await boundedEnrollmentText(request, 65536); } catch { return enrollmentResponse({ error: "Invalid event." }, 400); }
  if (!verifyEnrollmentSignature(raw, request.headers.get("stripe-signature") ?? "", config.webhookSecret)) {
    return enrollmentResponse({ error: "Invalid signature." }, 400);
  }
  try {
    const event = JSON.parse(raw) as { id: string; livemode: boolean; type: string; data: { object: TestCheckoutSession } };
    if (event.livemode !== false || !/^evt_[A-Za-z0-9]+$/.test(event.id)) return enrollmentResponse({ error: "Non-test event rejected." }, 400);
    if (!["checkout.session.completed", "checkout.session.expired", "checkout.session.async_payment_succeeded"].includes(event.type)) return enrollmentResponse({ received: true, ignored: true });
    if (event.data?.object?.livemode !== false || !/^cs_test_[A-Za-z0-9]+$/.test(event.data.object.id)) return enrollmentResponse({ error: "Non-test session rejected." }, 400);
    // Retrieve current Stripe truth; a valid signature is insufficient to mark a different or malformed session paid.
    const session = await retrieveTestSession(event.data.object.id, config);
    await verifyAndRecordSession(session, event.id);
    return enrollmentResponse({ received: true, testOnly: true });
  } catch {
    // Retryable: session binding may race the initial create response, or Stripe/Neon may be temporarily unavailable.
    return enrollmentResponse({ error: "Test event could not be verified." }, 503);
  }
}
