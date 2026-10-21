import {
  enrollmentBody,
  enrollmentResponse,
  validHoldId,
} from "@/lib/enrollment-http";
import {
  studentRequest,
  studentAllowance,
} from "@/lib/student-enrollment-http";
import { getStudentEnrollment } from "@/lib/student-enrollment";
import { reconcileStudentSession } from "@/lib/student-enrollment-stripe";
import { deliverStudentConfirmation } from "@/lib/student-enrollment-mail";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function POST(request: Request) {
  const access = await studentRequest(request);
  if (!access)
    return enrollmentResponse({ error: "Browser session required." }, 401);
  try {
    if (!(await studentAllowance(request)))
      return enrollmentResponse({ error: "Too many attempts." }, 429);
    const body = await enrollmentBody(request);
    if (Object.keys(body).length !== 1 || !validHoldId(body.id))
      return enrollmentResponse({ error: "Invalid checkout reference." }, 400);
    const held = await getStudentEnrollment(body.id);
    if (!held || held.owner_hash !== access.owner)
      return enrollmentResponse(
        { error: "Checkout not found for this browser." },
        404,
      );
    const updated = await reconcileStudentSession(held, access.config);
    if (updated?.status === "paid")
      await deliverStudentConfirmation(updated, access.config);
    return enrollmentResponse({ status: updated?.status });
  } catch {
    return enrollmentResponse(
      {
        error:
          "Checkout remains held until the provider verifies closure. Contact the academy with your reference if this continues.",
      },
      503,
    );
  }
}
