import type {
  StudentConfig,
  StudentEnrollment,
} from "@/lib/student-enrollment";
import {
  getStudentEnrollment,
  releaseUnboundStudentHold,
  studentDatabase,
} from "@/lib/student-enrollment";
import { INFECTION_CONTROL_CHECKOUT_POLICY } from "@/lib/academy-policies";
import { safeTestCheckoutUrl } from "@/lib/enrollment-contract";

type Charge = {
  id: string;
  payment_intent: string;
  amount: number;
  amount_refunded: number;
  currency: string;
  refunded: boolean;
  livemode: boolean;
};
export type StudentSession = {
  object: string;
  id: string;
  livemode: boolean;
  amount_total: number;
  currency: string;
  mode: string;
  status: string;
  payment_status: string;
  expires_at: number;
  client_reference_id: string;
  metadata: Record<string, string>;
  payment_intent: string | { id: string; latest_charge: Charge | null } | null;
  url?: string;
};
const API_VERSION = "2026-08-26.dahlia";
export class StudentProviderError extends Error {
  constructor(
    message: string,
    readonly code?: string,
  ) {
    super(message);
    this.name = "StudentProviderError";
  }
}
export function isStripeIdempotencyConflict(status: number, code?: string) {
  return status === 409 && code === "idempotency_key_in_use";
}
export function isStudentIdempotencyConflict(error: unknown) {
  return (
    error instanceof StudentProviderError &&
    error.code === "idempotency_key_in_use"
  );
}
async function provider(
  config: StudentConfig,
  path: string,
  body?: URLSearchParams,
  idempotency?: string,
) {
  const response = await fetch(`https://api.stripe.com/v1/${path}`, {
    method: body ? "POST" : "GET",
    cache: "no-store",
    signal: AbortSignal.timeout(15000),
    headers: {
      Authorization: `Bearer ${config.key}`,
      "Stripe-Version": API_VERSION,
      ...(body ? { "Content-Type": "application/x-www-form-urlencoded" } : {}),
      ...(idempotency ? { "Idempotency-Key": idempotency } : {}),
    },
    body,
  });
  if (!response.ok) {
    let code: string | undefined;
    try {
      const failure = (await response.json()) as {
        error?: { code?: string };
      };
      code = failure.error?.code;
    } catch {
      /* Status 409 is enough to recover the in-flight Checkout session. */
    }
    if (isStripeIdempotencyConflict(response.status, code))
      throw new StudentProviderError(
        "Payment provider idempotency conflict",
        "idempotency_key_in_use",
      );
    throw new Error("Payment provider unavailable");
  }
  return response.json();
}
export async function verifyStudentMerchant(config: StudentConfig) {
  const account = await provider(config, "account");
  if (
    account.id !== config.account ||
    (config.mode === "live" &&
      (account.charges_enabled !== true || account.payouts_enabled !== true))
  )
    throw new Error("Merchant verification failed");
}
export function studentSessionParameters(
  held: StudentEnrollment,
  config: StudentConfig,
) {
  return new URLSearchParams({
    mode: "payment",
    customer_email: held.email,
    // The integration label is deterministic so every retry uses the identical body.
    integration_identifier: `rda_infection_control_${held.id
      .replaceAll("-", "")
      .slice(0, 8)
      .replace(/[0-9]/g, (c) => String.fromCharCode(97 + Number(c)))}`,
    "line_items[0][price_data][currency]": held.currency,
    "line_items[0][price_data][unit_amount]": String(held.amount),
    "line_items[0][price_data][product_data][name]": `${config.mode === "test" ? "TEST ONLY: " : ""}Infection Control - ${held.course_date}`,
    "line_items[0][quantity]": "1",
    client_reference_id: held.id,
    "metadata[enrollment_id]": held.id,
    "metadata[offering_id]": held.offering_id,
    "metadata[policy_version]": held.policy_version,
    "metadata[policy_hash]": held.policy_hash,
    "metadata[integration]": "rda-student-v1",
    "metadata[environment]": config.mode,
    "metadata[course_date]": held.course_date,
    expires_at: String(held.stripe_expires_at),
    success_url: `${config.origin}/enroll/confirmation?enrollment=${held.id}`,
    cancel_url: `${config.origin}/enroll?cancelled=1`,
    "custom_text[submit][message]": INFECTION_CONTROL_CHECKOUT_POLICY,
  });
}
export function assertStudentSession(
  session: StudentSession,
  held: StudentEnrollment,
  config: StudentConfig,
) {
  const prefix =
    config.mode === "test"
      ? /^cs_test_[A-Za-z0-9]+$/
      : /^cs_live_[A-Za-z0-9]+$/;
  if (
    session.object !== "checkout.session" ||
    !prefix.test(session.id) ||
    session.livemode !== (config.mode === "live") ||
    session.mode !== "payment" ||
    session.amount_total !== held.amount ||
    session.currency !== held.currency ||
    session.client_reference_id !== held.id ||
    session.metadata?.enrollment_id !== held.id ||
    session.metadata?.offering_id !== held.offering_id ||
    session.metadata?.policy_version !== held.policy_version ||
    session.metadata?.policy_hash !== held.policy_hash ||
    session.metadata?.integration !== "rda-student-v1" ||
    session.metadata?.environment !== config.mode ||
    session.metadata?.course_date !== held.course_date ||
    session.expires_at !== Number(held.stripe_expires_at) ||
    (held.stripe_session_id !== null && held.stripe_session_id !== session.id)
  )
    throw new Error("Payment verification failed");
}
export async function retrieveStudentSession(
  id: string,
  config: StudentConfig,
) {
  if (
    !(
      config.mode === "test"
        ? /^cs_test_[A-Za-z0-9]+$/
        : /^cs_live_[A-Za-z0-9]+$/
    ).test(id)
  )
    throw new Error("Invalid session");
  return (await provider(
    config,
    `checkout/sessions/${id}?expand[]=payment_intent.latest_charge`,
  )) as StudentSession;
}
export async function recoverStudentSession(
  held: StudentEnrollment,
  config: StudentConfig,
) {
  let cursor = "",
    found: StudentSession | null = null;
  const start = Number(held.stripe_expires_at) - 3600;
  for (let page = 0; page < 10; page++) {
    const params = new URLSearchParams({
      limit: "100",
      "created[gte]": String(start - 60),
      "created[lte]": String(start + 1800),
      ...(cursor ? { starting_after: cursor } : {}),
    });
    const list = await provider(config, `checkout/sessions?${params}`);
    if (
      list.object !== "list" ||
      !Array.isArray(list.data) ||
      typeof list.has_more !== "boolean"
    )
      throw new Error("Invalid recovery");
    for (const session of list.data as StudentSession[]) {
      if (session.livemode !== (config.mode === "live"))
        throw new Error("Wrong environment");
      if (session.metadata?.enrollment_id === held.id) {
        if (found) throw new Error("Duplicate sessions require review");
        assertStudentSession(session, held, config);
        found = session;
      }
    }
    if (!list.has_more) return found;
    cursor = list.data.at(-1)?.id;
    if (!cursor) throw new Error("Invalid recovery pagination");
  }
  throw new Error("Recovery requires review");
}
export async function startStudentSession(
  held: StudentEnrollment,
  config: StudentConfig,
) {
  await verifyStudentMerchant(config);
  let session: StudentSession;
  if (held.stripe_session_id)
    session = await retrieveStudentSession(held.stripe_session_id, config);
  else if (Number(held.stripe_expires_at) < Date.now() / 1000 + 1800) {
    const recovered = await recoverStudentSession(held, config);
    if (!recovered) throw new Error("Reconciliation required");
    session = recovered;
  } else {
    try {
      session = await provider(
        config,
        "checkout/sessions",
        studentSessionParameters(held, config),
        `rda-student-${held.id}`,
      );
    } catch (error) {
      if (!isStudentIdempotencyConflict(error)) throw error;
      const recovered = await recoverStudentSession(held, config);
      if (!recovered) throw error;
      session = recovered;
    }
  }
  assertStudentSession(session, held, config);
  await bindStudentSession(held, session.id);
  if (session.status !== "open") throw new Error("Session closed");
  return safeTestCheckoutUrl(session.url);
}
export async function bindStudentSession(
  held: StudentEnrollment,
  id: string,
  database: typeof studentDatabase = studentDatabase,
) {
  if (held.status !== "reserved") throw new Error("Session identity conflict");
  const rows =
    await database()`UPDATE student_enrollments SET stripe_session_id=${id},updated_at=now()
    WHERE id=${held.id}::uuid AND status='reserved'
      AND (stripe_session_id IS NULL OR stripe_session_id=${id}) RETURNING id`;
  if (!rows.length) throw new Error("Session identity conflict");
}
export type StudentPaymentEvent =
  | "checkout.session.completed"
  | "checkout.session.expired"
  | "checkout.session.async_payment_succeeded"
  | "checkout.session.async_payment_failed"
  | "charge.refunded"
  | "reconcile";
export async function recordStudentSession(
  session: StudentSession,
  config: StudentConfig,
  eventId: string,
  eventType: StudentPaymentEvent = "reconcile",
) {
  const id = session.metadata?.enrollment_id;
  if (!/^[a-f0-9-]{36}$/i.test(id ?? "")) throw new Error("Invalid enrollment");
  const held = await getStudentEnrollment(id);
  if (!held) throw new Error("Unknown enrollment");
  const mode =
    await studentDatabase()`SELECT mode FROM student_enrollment_offerings WHERE id=${held.offering_id}::uuid`;
  if (mode[0]?.mode !== config.mode)
    throw new Error("Wrong ledger environment");
  assertStudentSession(session, held, config);
  if (held.status === "expired") {
    if (session.status === "complete" && session.payment_status === "paid") {
      await studentDatabase()`SELECT flag_student_enrollment_review(${held.id}::uuid,${session.id},'paid_after_release')`;
      const orphanCharge =
        typeof session.payment_intent === "object"
          ? session.payment_intent?.latest_charge
          : null;
      if (
        orphanCharge &&
        orphanCharge.amount === held.amount &&
        orphanCharge.currency === held.currency &&
        orphanCharge.livemode === (config.mode === "live") &&
        orphanCharge.refunded === true &&
        orphanCharge.amount_refunded === held.amount
      ) {
        await studentDatabase()`SELECT resolve_student_enrollment_review(${held.id}::uuid,${session.id},'refunded','stripe-charge-refunded')`;
      }
    }
    return held;
  }
  if (held.status === "reserved") {
    try {
      await bindStudentSession(held, session.id);
    } catch (error) {
      const current = await getStudentEnrollment(id);
      if (
        current?.status === "expired" &&
        session.status === "complete" &&
        session.payment_status === "paid"
      ) {
        await studentDatabase()`SELECT flag_student_enrollment_review(${current.id}::uuid,${session.id},'paid_after_release')`;
        return current;
      }
      throw error;
    }
  } else if (held.stripe_session_id !== session.id) {
    throw new Error("Session identity conflict");
  }
  let outcome: "paid" | "expired" | "refunded" | null = null;
  const intent =
    typeof session.payment_intent === "string"
      ? session.payment_intent
      : (session.payment_intent?.id ?? null);
  switch (eventType) {
    case "checkout.session.async_payment_failed":
      if (held.status === "paid" || held.status === "refunded")
        return getStudentEnrollment(id);
      if (session.payment_status !== "paid") outcome = "expired";
      break;
    case "checkout.session.completed":
    case "checkout.session.expired":
    case "checkout.session.async_payment_succeeded":
    case "charge.refunded":
    case "reconcile":
      if (session.status === "complete" && session.payment_status === "paid")
        outcome = "paid";
      if (session.status === "expired" && session.payment_status === "unpaid")
        outcome = "expired";
      break;
    default: {
      const _never: never = eventType;
      throw new Error(`Unsupported payment event: ${_never}`);
    }
  }
  const charge =
    typeof session.payment_intent === "object"
      ? session.payment_intent?.latest_charge
      : null;
  if (
    eventType !== "checkout.session.async_payment_failed" &&
    charge &&
    charge.amount === held.amount &&
    charge.currency === held.currency &&
    charge.livemode === (config.mode === "live") &&
    charge.payment_intent === intent
  ) {
    if (
      Number.isInteger(charge.amount_refunded) &&
      charge.amount_refunded > 0 &&
      charge.amount_refunded <= held.amount
    ) {
      await studentDatabase()`UPDATE student_enrollments SET refunded_amount=GREATEST(refunded_amount,${charge.amount_refunded}) WHERE id=${id}::uuid`;
    }
    if (charge.refunded === true && charge.amount_refunded === held.amount)
      outcome = "refunded";
  }
  // The database reconciles monotonically under its row lock, including a stale
  // paid read racing a refund. Receipt identity stays independent of current state.
  if (outcome)
    await studentDatabase()`SELECT apply_student_enrollment_event(${eventId},${id}::uuid,${session.id},${intent},${outcome})`;
  return getStudentEnrollment(id);
}
export async function reconcileStudentSession(
  held: StudentEnrollment,
  config: StudentConfig,
) {
  await verifyStudentMerchant(config);
  const session = held.stripe_session_id
    ? await retrieveStudentSession(held.stripe_session_id, config)
    : await recoverStudentSession(held, config);
  if (!session) {
    if (
      !held.stripe_session_id &&
      Number(held.stripe_expires_at) < Date.now() / 1000
    )
      return releaseUnboundStudentHold(held.id);
    throw new Error("Provider session not found; manual review required");
  }
  assertStudentSession(session, held, config);
  if (held.status === "reserved") await bindStudentSession(held, session.id);
  const verified: StudentSession =
    session.status === "open"
      ? await provider(
          config,
          `checkout/sessions/${session.id}/expire`,
          new URLSearchParams(),
          `rda-student-expire-${held.id}`,
        )
      : session;
  return recordStudentSession(
    verified,
    config,
    `reconcile:${verified.id}:${verified.status}:${verified.payment_status}`,
  );
}
export async function studentSessionForIntent(
  intent: unknown,
  config: StudentConfig,
) {
  if (typeof intent !== "string" || !/^pi_[A-Za-z0-9]+$/.test(intent))
    return null;
  const list = await provider(
    config,
    `checkout/sessions?payment_intent=${intent}&limit=2`,
  );
  if (list.object !== "list" || list.has_more !== false)
    throw new Error("Refund session requires review");
  if (!list.data?.length) return null;
  if (list.data.length !== 1) throw new Error("Refund session requires review");
  return retrieveStudentSession(list.data[0].id, config);
}
