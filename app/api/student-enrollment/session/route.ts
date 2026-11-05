import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { isCourseScheduleOfferingSellable } from "@/lib/course-schedule";
import { enrollmentBody, enrollmentResponse } from "@/lib/enrollment-http";
import { ENROLLMENT_PILOT_COOKIE } from "@/lib/enrollment-auth";
import { studentCanStartCheckout } from "@/lib/student-enrollment-access";
import {
  studentConfig,
  studentOfferingById,
  studentOwner,
  STUDENT_COOKIE,
} from "@/lib/student-enrollment";
import { studentClassFullRefusal } from "@/lib/student-enrollment-offerings";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function POST(request: Request) {
  const config = studentConfig();
  if (
    !config ||
    request.headers.get("origin") !== config.origin ||
    ["cross-site", "none"].includes(request.headers.get("sec-fetch-site") ?? "")
  )
    return enrollmentResponse({ error: "Enrollment unavailable." }, 503);
  const jar = await cookies();
  if (!studentCanStartCheckout(config, jar.get(ENROLLMENT_PILOT_COOKIE)?.value))
    return enrollmentResponse({ error: "Enrollment unavailable." }, 503);
  if (request.headers.get("content-type")?.split(";")[0].trim() === "application/json") {
    try {
      const offeringId = (await enrollmentBody(request)).offeringId;
      if (typeof offeringId === "string") {
        const offering = await studentOfferingById(offeringId, config);
        if (
          !offering ||
          !isCourseScheduleOfferingSellable(offering.course_id, offering.course_date)
        )
          return enrollmentResponse(studentClassFullRefusal(), 409);
      }
    } catch {
      /* Cookie bootstrap stays available when no offering is named. */
    }
  }
  if (!studentOwner(jar.get(STUDENT_COOKIE)?.value))
    jar.set(STUDENT_COOKIE, randomBytes(32).toString("hex"), {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/",
      maxAge: 7 * 24 * 3600,
    });
  return enrollmentResponse({ ready: true, testOnly: config.mode === "test" });
}
