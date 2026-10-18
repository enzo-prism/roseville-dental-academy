import { CANCELLATION_POLICY_PARAGRAPHS } from "@/lib/academy-policies";
import {
  studentDatabase,
  type StudentConfig,
  type StudentEnrollment,
} from "@/lib/student-enrollment";

export function studentConfirmationText(
  held: StudentEnrollment,
  mode: StudentConfig["mode"],
) {
  return `${mode === "test" ? "TEST ONLY — no real enrollment or charge.\n\n" : ""}Hello ${held.student_name},\n\nYour full payment for Infection Control on ${held.course_date} is confirmed.\nAmount: ${(held.amount / 100).toFixed(2)} USD\nEnrollment reference: ${held.id}\n\n${CANCELLATION_POLICY_PARAGRAPHS.join("\n\n")}\n\nRoseville Dental Academy`;
}
// The durable outbox is inserted in the same transaction as the paid roster entry.
// Retried sends use one provider idempotency key; ambiguity beyond 12h needs operator review.
export async function deliverStudentConfirmation(
  held: StudentEnrollment,
  config: StudentConfig,
) {
  const db = studentDatabase();
  await db`UPDATE student_enrollment_mail SET status='review' WHERE enrollment_id=${held.id}::uuid
    AND status='sending' AND started_at<now()-interval '12 hours'`;
  const rows =
    await db`UPDATE student_enrollment_mail SET status='sending',started_at=COALESCE(started_at,now()),attempted_at=now()
    WHERE enrollment_id=${held.id}::uuid AND (status='pending' OR (status='sending' AND attempted_at<now()-interval '1 minute'))
    AND EXISTS(SELECT 1 FROM student_enrollments WHERE id=${held.id}::uuid AND status='paid') RETURNING enrollment_id`;
  if (!rows.length) {
    const state =
      await db`SELECT status FROM student_enrollment_mail WHERE enrollment_id=${held.id}::uuid`;
    if (state[0]?.status === "sending" || state[0]?.status === "review")
      throw new Error("Delivery pending or requires review");
    return;
  }
  const text = studentConfirmationText(held, config.mode);
  if (config.mode === "test") {
    await db`UPDATE student_enrollment_mail SET status='captured',captured_body=${text},delivered_at=now() WHERE enrollment_id=${held.id}::uuid AND status='sending'`;
    return;
  }
  if (
    process.env.RDA_STUDENT_EMAIL_LIVE_ENABLED !== "true" ||
    !process.env.RDA_STUDENT_EMAIL_API_KEY ||
    !process.env.RDA_STUDENT_EMAIL_FROM
  )
    throw new Error("Confirmation delivery unavailable");
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    signal: AbortSignal.timeout(15000),
    headers: {
      Authorization: `Bearer ${process.env.RDA_STUDENT_EMAIL_API_KEY}`,
      "Content-Type": "application/json",
      "Idempotency-Key": `rda-confirmation/${held.id}`,
    },
    body: JSON.stringify({
      from: process.env.RDA_STUDENT_EMAIL_FROM,
      to: [held.email],
      subject: "Infection Control enrollment confirmation",
      text,
    }),
  });
  if (!response.ok) throw new Error("Confirmation delivery unavailable");
  const result = await response.json();
  if (typeof result.id !== "string")
    throw new Error("Invalid delivery acknowledgement");
  await db`UPDATE student_enrollment_mail SET status='sent',provider_id=${result.id},delivered_at=now() WHERE enrollment_id=${held.id}::uuid AND status='sending'`;
}
