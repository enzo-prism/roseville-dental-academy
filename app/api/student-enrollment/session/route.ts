import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { enrollmentResponse } from "@/lib/enrollment-http";
import { ENROLLMENT_PILOT_COOKIE } from "@/lib/enrollment-auth";
import { studentCanStartCheckout } from "@/lib/student-enrollment-access";
import {
  studentConfig,
  studentOwner,
  STUDENT_COOKIE,
} from "@/lib/student-enrollment";
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
