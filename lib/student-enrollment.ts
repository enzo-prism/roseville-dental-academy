import { createHash } from "node:crypto";
import { neon } from "@neondatabase/serverless";
import { CANCELLATION_POLICY_PARAGRAPHS } from "@/lib/academy-policies";
import {
  ENROLLMENT_POLICY_VERSION,
  enrollmentDate,
} from "@/lib/enrollment-contract";

export const STUDENT_COOKIE = "__Host-rda-student-checkout";
export const STUDENT_POLICY_HASH = createHash("sha256")
  .update(CANCELLATION_POLICY_PARAGRAPHS.join("\n\n"))
  .digest("hex");
export type StudentConfig = {
  mode: "test" | "live";
  key: string;
  webhookSecret: string;
  origin: string;
  account: string;
};
export type StudentOffering = {
  id: string;
  mode: "test" | "live";
  course_date: string;
  amount: number;
  currency: string;
  policy_version: string;
  policy_hash: string;
  policy_text: string;
  remaining: number;
};
export type StudentEnrollment = {
  id: string;
  offering_id: string;
  course_date: string;
  owner_hash: string;
  student_name: string;
  email: string;
  phone: string;
  amount: number;
  currency: string;
  policy_version: string;
  policy_hash: string;
  policy_text: string;
  status: "reserved" | "paid" | "expired" | "refunded";
  stripe_session_id: string | null;
  stripe_payment_intent: string | null;
  stripe_expires_at: number;
  created_at: string;
};
export function studentConfig(): StudentConfig | null {
  const mode = process.env.RDA_STUDENT_PAYMENTS_MODE;
  if (mode !== "test" && mode !== "live") return null;
  if (
    mode === "live" &&
    process.env.RDA_STUDENT_PAYMENTS_LIVE_ENABLED !== "true"
  )
    return null;
  const key = process.env[`RDA_STUDENT_STRIPE_${mode.toUpperCase()}_KEY`] ?? "";
  const webhookSecret =
    process.env[`RDA_STUDENT_STRIPE_${mode.toUpperCase()}_WEBHOOK_SECRET`] ??
    "";
  const origin = process.env.RDA_STUDENT_PAYMENTS_ORIGIN ?? "";
  const account = process.env.RDA_STUDENT_STRIPE_ACCOUNT_ID ?? "";
  if (
    !new RegExp(`^(sk|rk)_${mode}_[A-Za-z0-9]+$`).test(key) ||
    !/^whsec_[A-Za-z0-9]+$/.test(webhookSecret) ||
    !/^acct_[A-Za-z0-9]+$/.test(account) ||
    !process.env.DATABASE_URL
  )
    return null;
  if (mode === "live" && account !== "acct_1UJHgLCOhHjREvRz") return null;
  try {
    const url = new URL(origin);
    if (
      url.origin !== origin ||
      url.username ||
      url.password ||
      (url.protocol !== "https:" &&
        !(
          mode === "test" &&
          url.protocol === "http:" &&
          url.hostname === "127.0.0.1"
        ))
    )
      return null;
  } catch {
    return null;
  }
  return { mode, key, webhookSecret, origin, account };
}
export function studentDatabase() {
  if (!process.env.DATABASE_URL) throw new Error("Enrollment unavailable");
  return neon(process.env.DATABASE_URL);
}
export function studentOwner(token: string | undefined) {
  return token && /^[a-f0-9]{64}$/.test(token)
    ? createHash("sha256").update(token).digest("hex")
    : null;
}
export async function studentOfferings(
  config: StudentConfig,
): Promise<StudentOffering[]> {
  const rows =
    await studentDatabase()`SELECT o.*, (o.capacity-o.external_seats-(SELECT count(*) FROM student_enrollments e
    WHERE e.offering_id=o.id AND e.status IN ('reserved','paid','refunded')))::int AS remaining
    FROM student_enrollment_offerings o WHERE o.mode=${config.mode} AND o.enabled=true
    AND o.course_date > (now() AT TIME ZONE 'America/Los_Angeles')::date
    AND o.policy_version=${ENROLLMENT_POLICY_VERSION} AND o.policy_hash=${STUDENT_POLICY_HASH} AND o.policy_text IS NOT NULL ORDER BY o.course_date`;
  return rows.map((row) => ({
    ...row,
    course_date: enrollmentDate(row.course_date),
  })) as StudentOffering[];
}
export async function getStudentEnrollment(id: string) {
  const rows =
    await studentDatabase()`SELECT * FROM student_enrollments WHERE id=${id}::uuid`;
  return rows[0]
    ? ({
        ...rows[0],
        course_date: enrollmentDate(rows[0].course_date),
      } as StudentEnrollment)
    : undefined;
}
export function studentInput(body: Record<string, unknown>) {
  if (
    Object.keys(body).some(
      (k) =>
        ![
          "id",
          "offeringId",
          "name",
          "email",
          "phone",
          "adultAccepted",
          "policyAccepted",
          "policyVersion",
        ].includes(k),
    )
  )
    return null;
  const { id, offeringId } = body;
  const uuid =
    /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const email =
    typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const phone = typeof body.phone === "string" ? body.phone.trim() : "";
  if (
    typeof id !== "string" ||
    !uuid.test(id) ||
    typeof offeringId !== "string" ||
    !uuid.test(offeringId) ||
    name.length < 2 ||
    name.length > 100 ||
    /[\x00-\x1f\x7f]/.test(name) ||
    email.length > 254 ||
    !/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(email) ||
    !/^[+\d ()-]{7,30}$/.test(phone) ||
    phone.replace(/\D/g, "").length < 7 ||
    body.adultAccepted !== true ||
    body.policyAccepted !== true ||
    body.policyVersion !== ENROLLMENT_POLICY_VERSION
  )
    return null;
  return { id, offeringId, name, email, phone };
}
