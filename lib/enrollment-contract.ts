import { createHmac, timingSafeEqual } from "node:crypto";

export const ENROLLMENT_AMOUNT = 39500;
export const ENROLLMENT_POLICY_VERSION = "2026-09-30";
export type EnrollmentConfig = { key: string; webhookSecret: string; origin: string };
export type EnrollmentHold = { hold_id: string; course_date: string; owner_hash: string;
  policy_version: string; status: "reserved" | "paid" | "expired";
  stripe_session_id: string | null; stripe_expires_at: string | number; created_at: string };
export type TestCheckoutSession = { id: string; livemode: boolean; object: string; url?: string | null;
  amount_total: number; currency: string; mode: string; status: string; payment_status: string;
  expires_at: number; client_reference_id: string; metadata: Record<string, string> };

export function enrollmentConfig(): EnrollmentConfig | null {
  const key = process.env.RDA_STRIPE_TEST_SECRET_KEY?.trim() ?? "";
  const webhookSecret = process.env.RDA_STRIPE_TEST_WEBHOOK_SECRET?.trim() ?? "";
  const origin = process.env.RDA_ENROLLMENT_TEST_ORIGIN?.trim() ?? "";
  if (!/^(sk|rk)_test_[A-Za-z0-9]+$/.test(key) || !/^whsec_[A-Za-z0-9]+$/.test(webhookSecret)
    || !process.env.DATABASE_URL) return null;
  try {
    const parsed = new URL(origin);
    if (parsed.origin !== origin || parsed.username || parsed.password
      || (parsed.protocol !== "https:" && !(parsed.protocol === "http:" && ["localhost", "127.0.0.1"].includes(parsed.hostname)))) return null;
  } catch { return null; }
  return { key, webhookSecret, origin };
}

export function verifyEnrollmentSignature(body: string, header: string, secret: string, now = Date.now()) {
  const pieces = header.split(",");
  const timestamps = pieces.filter((part) => part.startsWith("t="));
  if (timestamps.length !== 1) return false;
  const timestamp = timestamps[0].slice(2);
  if (!/^\d+$/.test(timestamp) || Math.abs(now / 1000 - Number(timestamp)) > 300) return false;
  const expected = createHmac("sha256", secret).update(`${timestamp}.${body}`).digest();
  return pieces.filter((part) => part.startsWith("v1=")).some((part) => {
    const signature = part.slice(3);
    return /^[a-f0-9]{64}$/.test(signature) && timingSafeEqual(expected, Buffer.from(signature, "hex"));
  });
}

export function assertBoundTestSession(session: TestCheckoutSession, hold: EnrollmentHold) {
  if (session.object !== "checkout.session" || session.livemode !== false || !/^cs_test_[A-Za-z0-9]+$/.test(session.id)
    || session.mode !== "payment" || session.amount_total !== ENROLLMENT_AMOUNT || session.currency !== "usd"
    || session.client_reference_id !== hold.hold_id || session.metadata?.hold_id !== hold.hold_id
    || session.metadata?.course_date !== hold.course_date || session.metadata?.pilot !== "test-only"
    || session.metadata?.policy_version !== hold.policy_version || session.expires_at !== Number(hold.stripe_expires_at)
    || (hold.stripe_session_id !== null && hold.stripe_session_id !== session.id)) throw new Error("Checkout verification failed");
}

export function safeTestCheckoutUrl(value: string | null | undefined) {
  if (!value) throw new Error("Checkout URL missing");
  const url = new URL(value);
  if (url.protocol !== "https:" || url.hostname !== "checkout.stripe.com" || url.username || url.password) throw new Error("Invalid checkout URL");
  return url.toString();
}
