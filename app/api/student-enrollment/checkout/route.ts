import { enrollmentBody, enrollmentResponse } from "@/lib/enrollment-http";
import {
  studentInput,
  studentDatabase,
  STUDENT_POLICY_HASH,
  type StudentEnrollment,
} from "@/lib/student-enrollment";
import {
  studentRequest,
  studentAllowance,
} from "@/lib/student-enrollment-http";
import { startStudentSession } from "@/lib/student-enrollment-stripe";
import { ENROLLMENT_POLICY_VERSION } from "@/lib/enrollment-contract";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function POST(request: Request) {
  const access = await studentRequest(request);
  if (!access)
    return enrollmentResponse(
      {
        error: "Enrollment unavailable or browser session invalid.",
        holdCreated: false,
      },
      503,
    );
  try {
    if (!(await studentAllowance(request)))
      return enrollmentResponse(
        {
          error: "Too many attempts. Please try again later.",
          holdCreated: false,
        },
        429,
      );
    const input = studentInput(await enrollmentBody(request));
    if (!input)
      return enrollmentResponse(
        {
          error:
            "Complete the student details, select a date, and accept the policy and adult confirmation.",
          holdCreated: false,
        },
        400,
      );
    const rows =
      await studentDatabase()`SELECT * FROM reserve_student_enrollment(${input.id}::uuid,${input.offeringId}::uuid,${access.owner},${input.name},${input.email},${input.phone},${ENROLLMENT_POLICY_VERSION},${STUDENT_POLICY_HASH},${access.config.mode})`;
    const held = rows[0]
      ? ({
          ...rows[0],
          course_date: String(rows[0].course_date).slice(0, 10),
        } as StudentEnrollment)
      : undefined;
    if (!held)
      return enrollmentResponse(
        {
          error:
            "This date has no available seat or you already have pending checkouts.",
          holdCreated: false,
        },
        409,
      );
    if (held.status !== "reserved")
      return enrollmentResponse(
        { error: "This enrollment is already closed. Check its status." },
        409,
      );
    const url = await startStudentSession(held, access.config);
    return enrollmentResponse({
      url,
      id: held.id,
      testOnly: access.config.mode === "test",
    });
  } catch {
    return enrollmentResponse(
      {
        error:
          "Checkout could not start. Check or close the saved checkout before trying again. Any reserved seat is preserved.",
      },
      503,
    );
  }
}
