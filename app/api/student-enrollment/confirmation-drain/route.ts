import { enrollmentResponse } from "@/lib/enrollment-http";
import { hasValidBearer } from "@/lib/server/attribution-auth";
import { studentWebhookConfig } from "@/lib/student-enrollment";
import { drainStudentConfirmations } from "@/lib/student-enrollment-mail";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(request: Request) {
  if (!hasValidBearer(request, "CRON_SECRET"))
    return enrollmentResponse({ error: "Unauthorized" }, 401);
  if (
    process.env.RDA_STUDENT_PAYMENTS_MODE !== "live" ||
    process.env.RDA_STUDENT_EMAIL_LIVE_ENABLED !== "true"
  )
    return enrollmentResponse({ processed: false, emailDisabled: true });
  try {
    // Webhook configuration remains available while new payments are disabled.
    // Existing paid students must still receive their queued confirmations.
    const config = studentWebhookConfig();
    if (
      !config ||
      !process.env.RDA_STUDENT_EMAIL_API_KEY?.trim() ||
      !process.env.RDA_STUDENT_EMAIL_FROM?.trim()
    )
      return enrollmentResponse(
        { error: "Confirmation processing unavailable." },
        503,
      );
    const summary = await drainStudentConfirmations(config);
    return enrollmentResponse(
      { processed: true, ...summary },
      summary.errors ? 503 : 200,
    );
  } catch {
    return enrollmentResponse(
      { error: "Confirmation processing unavailable." },
      503,
    );
  }
}
