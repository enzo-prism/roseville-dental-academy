import {
  enrollmentBody,
  enrollmentResponse,
  enrollmentOwner,
  validHoldId,
} from "@/lib/enrollment-http";
import {
  studentWebhookConfig,
  getStudentEnrollment,
  studentDatabase,
} from "@/lib/student-enrollment";
import {
  deliverStudentConfirmation,
  drainStudentConfirmations,
  studentEmailLiveDisabled,
} from "@/lib/student-enrollment-mail";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;
function staffConfirmationDenied(request: Request, owner: string | null) {
  const config = studentWebhookConfig();
  if (
    !config ||
    !owner ||
    request.headers.get("origin") !== config.origin ||
    request.headers.get("content-type")?.split(";")[0].trim() !==
      "application/json" ||
    ["cross-site", "none"].includes(request.headers.get("sec-fetch-site") ?? "")
  )
    return null;
  return config;
}
export async function handleStudentConfirmationRetry(
  request: Request,
  owner: string | null,
) {
  const config = staffConfirmationDenied(request, owner);
  if (!config)
    return enrollmentResponse({ error: "Staff access required." }, 401);
  let body: Record<string, unknown>;
  try {
    body = await enrollmentBody(request);
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (
      message === "Invalid body" ||
      message === "Body too large" ||
      error instanceof SyntaxError
    )
      return enrollmentResponse(
        { error: "Invalid enrollment reference." },
        400,
      );
    return enrollmentResponse(
      { error: "Delivery remains pending or requires operator review." },
      503,
    );
  }
  try {
    if (body.drain === true && Object.keys(body).length === 1) {
      if (studentEmailLiveDisabled(config))
        return enrollmentResponse(
          { processed: false, emailDisabled: true },
          409,
        );
      return enrollmentResponse({
        processed: true,
        ...(await drainStudentConfirmations(config)),
      });
    }
    if (Object.keys(body).length !== 1 || !validHoldId(body.id))
      return enrollmentResponse(
        { error: "Invalid enrollment reference." },
        400,
      );
    const held = await getStudentEnrollment(body.id);
    if (!held || held.status !== "paid")
      return enrollmentResponse({ error: "Paid enrollment required." }, 409);
    const offering =
      await studentDatabase()`SELECT mode FROM student_enrollment_offerings WHERE id=${held.offering_id}::uuid`;
    if (offering[0]?.mode !== config.mode)
      return enrollmentResponse({ error: "Wrong environment." }, 409);
    if (studentEmailLiveDisabled(config))
      return enrollmentResponse(
        { processed: false, emailDisabled: true },
        409,
      );
    await deliverStudentConfirmation(held, config);
    return enrollmentResponse({ processed: true });
  } catch {
    return enrollmentResponse(
      { error: "Delivery remains pending or requires operator review." },
      503,
    );
  }
}
export async function POST(request: Request) {
  return handleStudentConfirmationRetry(request, await enrollmentOwner());
}
