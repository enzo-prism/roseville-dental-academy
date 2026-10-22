import { createHash } from "node:crypto";
import { enrollmentDate } from "@/lib/enrollment-contract";
import {
  studentDatabase,
  type StudentConfig,
  type StudentEnrollment,
} from "@/lib/student-enrollment";

export function studentConfirmationText(
  held: StudentEnrollment,
  mode: StudentConfig["mode"],
) {
  if (
    !held.policy_text ||
    createHash("sha256").update(held.policy_text).digest("hex") !==
      held.policy_hash
  )
    throw new Error("Accepted policy snapshot unavailable");
  return `${mode === "test" ? "TEST ONLY — no real enrollment or charge.\n\n" : ""}Hello ${held.student_name},\n\nYour full payment for Infection Control on ${held.course_date} is confirmed.\nAmount: ${(held.amount / 100).toFixed(2)} USD\nEnrollment reference: ${held.id}\n\n${held.policy_text}\n\nRoseville Dental Academy`;
}
type ConfirmationPayload = {
  from: string;
  to: string[];
  subject: string;
  text: string;
};
// The durable outbox is inserted in the same transaction as the paid roster entry.
// Retried sends use one provider idempotency key; ambiguity beyond 12h needs operator review.
export async function deliverStudentConfirmation(
  held: StudentEnrollment,
  config: StudentConfig,
) {
  const db = studentDatabase();
  const existing =
    await db`SELECT payload,status FROM student_enrollment_mail WHERE enrollment_id=${held.id}::uuid`;
  if (!existing.length) return;
  if (["sent", "captured"].includes(existing[0].status)) return;
  if (existing[0].status === "review")
    throw new Error("Delivery requires review");
  if (config.mode === "live" && process.env.RDA_STUDENT_EMAIL_LIVE_ENABLED !== "true")
    return;
  if (
    config.mode === "live" &&
    (!process.env.RDA_STUDENT_EMAIL_API_KEY || !process.env.RDA_STUDENT_EMAIL_FROM)
  )
    throw new Error("Confirmation delivery unavailable");
  if (existing[0].payload === null) {
    const payload: ConfirmationPayload = {
      from:
        config.mode === "test"
          ? "RDA test capture <no-reply@example.test>"
          : process.env.RDA_STUDENT_EMAIL_FROM!,
      to: [held.email],
      subject: "Infection Control enrollment confirmation",
      text: studentConfirmationText(held, config.mode),
    };
    // Concurrent initializers race through one conditional UPDATE. Every send,
    // including the first, reads the winning immutable JSON payload from storage.
    await db`UPDATE student_enrollment_mail SET payload=${JSON.stringify(payload)}::jsonb,
      template_version='rda-student-confirmation-v1',payload_created_at=now()
      WHERE enrollment_id=${held.id}::uuid AND payload IS NULL`;
  }
  await db`UPDATE student_enrollment_mail SET status='review' WHERE enrollment_id=${held.id}::uuid
    AND status='sending' AND started_at<now()-interval '12 hours'`;
  const rows =
    await db`UPDATE student_enrollment_mail SET status='sending',started_at=COALESCE(started_at,now()),attempted_at=now()
    WHERE enrollment_id=${held.id}::uuid AND (status='pending' OR (status='sending' AND attempted_at<now()-interval '1 minute'))
    AND payload IS NOT NULL
    AND EXISTS(SELECT 1 FROM student_enrollments WHERE id=${held.id}::uuid AND status='paid') RETURNING payload`;
  if (!rows.length) {
    const state =
      await db`SELECT status FROM student_enrollment_mail WHERE enrollment_id=${held.id}::uuid`;
    if (state[0]?.status === "sending" || state[0]?.status === "review")
      throw new Error("Delivery pending or requires review");
    return;
  }
  const payload = rows[0].payload as ConfirmationPayload;
  if (config.mode === "test") {
    await db`UPDATE student_enrollment_mail SET status='captured',captured_body=${payload.text},delivered_at=now() WHERE enrollment_id=${held.id}::uuid AND status='sending'`;
    return;
  }
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    signal: AbortSignal.timeout(15000),
    headers: {
      Authorization: `Bearer ${process.env.RDA_STUDENT_EMAIL_API_KEY}`,
      "Content-Type": "application/json",
      "Idempotency-Key": `rda-confirmation/${held.id}`,
    },
    body: JSON.stringify(payload),
  });
  if (!response.ok) throw new Error("Confirmation delivery unavailable");
  const result = await response.json();
  if (typeof result.id !== "string")
    throw new Error("Invalid delivery acknowledgement");
  await db`UPDATE student_enrollment_mail SET status='sent',provider_id=${result.id},delivered_at=now() WHERE enrollment_id=${held.id}::uuid AND status='sending'`;
}
export async function listStudentPendingConfirmations(
  mode: StudentConfig["mode"],
) {
  return studentDatabase()`SELECT e.id,e.offering_id,e.course_date,e.owner_hash,e.student_name,e.email,e.phone,e.amount,e.currency,e.policy_version,e.policy_hash,e.policy_text,e.status,e.stripe_session_id,e.stripe_payment_intent,e.stripe_expires_at,e.created_at
    FROM student_enrollments e
    JOIN student_enrollment_mail m ON m.enrollment_id=e.id
    JOIN student_enrollment_offerings o ON o.id=e.offering_id
    WHERE e.status='paid' AND m.status IN ('pending','sending') AND o.mode=${mode}
    ORDER BY e.created_at LIMIT 100`;
}
export async function drainStudentConfirmations(config: StudentConfig) {
  const rows = await listStudentPendingConfirmations(config.mode);
  let errors = 0;
  for (const row of rows) {
    try {
      await deliverStudentConfirmation(
        {
          ...row,
          course_date: enrollmentDate(row.course_date),
        } as StudentEnrollment,
        config,
      );
    } catch {
      errors += 1;
    }
  }
  const remaining = await listStudentPendingConfirmations(config.mode);
  return {
    attempted: rows.length,
    remaining: remaining.length,
    errors,
  };
}
