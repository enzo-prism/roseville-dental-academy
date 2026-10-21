import {
  enrollmentResponse,
  boundedEnrollmentText,
} from "@/lib/enrollment-http";
import { verifyEnrollmentSignature } from "@/lib/enrollment-contract";
import { studentConfig } from "@/lib/student-enrollment";
import {
  verifyStudentMerchant,
  retrieveStudentSession,
  recordStudentSession,
  studentSessionForIntent,
  type StudentPaymentEvent,
} from "@/lib/student-enrollment-stripe";
import { deliverStudentConfirmation } from "@/lib/student-enrollment-mail";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function POST(request: Request) {
  const config = studentConfig();
  if (!config)
    return enrollmentResponse(
      { error: "Enrollment webhook unavailable." },
      503,
    );
  let raw: string;
  try {
    raw = await boundedEnrollmentText(request, 65536);
  } catch {
    return enrollmentResponse({ error: "Invalid event." }, 400);
  }
  if (
    !verifyEnrollmentSignature(
      raw,
      request.headers.get("stripe-signature") ?? "",
      config.webhookSecret,
    )
  )
    return enrollmentResponse({ error: "Invalid signature." }, 400);
  try {
    const event = JSON.parse(raw);
    if (
      !/^evt_[A-Za-z0-9]+$/.test(event.id ?? "") ||
      event.livemode !== (config.mode === "live") ||
      (event.account && event.account !== config.account)
    )
      return enrollmentResponse({ error: "Wrong event environment." }, 400);
    if (
      ![
        "checkout.session.completed",
        "checkout.session.expired",
        "checkout.session.async_payment_succeeded",
        "checkout.session.async_payment_failed",
        "charge.refunded",
      ].includes(event.type)
    )
      return enrollmentResponse({ received: true, ignored: true });
    await verifyStudentMerchant(config);
    const session =
      event.type === "charge.refunded"
        ? await studentSessionForIntent(
            event.data?.object?.payment_intent,
            config,
          )
        : await retrieveStudentSession(event.data?.object?.id, config);
    if (!session)
      return enrollmentResponse({ received: true, ignored: true });
    if (session.metadata?.integration !== "rda-student-v1")
      return enrollmentResponse({ received: true, ignored: true });
    const held = await recordStudentSession(
      session,
      config,
      event.id,
      event.type as StudentPaymentEvent,
    );
    if (held?.status === "paid") await deliverStudentConfirmation(held, config);
    return enrollmentResponse({ received: true });
  } catch {
    return enrollmentResponse(
      { error: "Payment event could not be verified. Retry required." },
      503,
    );
  }
}
