import { createHash } from "node:crypto";
import { cookies } from "next/headers";
import { ENROLLMENT_PILOT_COOKIE } from "@/lib/enrollment-auth";
import { studentCanStartCheckout } from "@/lib/student-enrollment-access";
import {
  studentConfig,
  studentOwner,
  studentDatabase,
  STUDENT_COOKIE,
} from "@/lib/student-enrollment";
export async function studentRequest(request: Request) {
  const config = studentConfig();
  if (
    !config ||
    request.headers.get("origin") !== config.origin ||
    request.headers.get("content-type")?.split(";")[0].trim() !==
      "application/json" ||
    ["cross-site", "none"].includes(request.headers.get("sec-fetch-site") ?? "")
  )
    return null;
  const owner = studentOwner((await cookies()).get(STUDENT_COOKIE)?.value);
  return owner ? { config, owner } : null;
}
export async function studentCheckoutRequest(request: Request) {
  const access = await studentRequest(request);
  if (!access) return null;
  const staffSession = (await cookies()).get(ENROLLMENT_PILOT_COOKIE)?.value;
  return studentCanStartCheckout(access.config, staffSession) ? access : null;
}
export async function studentAllowance(request: Request) {
  // Vercel replaces this header. Generic forwarding headers are deliberately ignored.
  const address = process.env.VERCEL
    ? (request.headers
        .get("x-vercel-forwarded-for")
        ?.split(",")[0]
        .trim()
        .slice(0, 256) ?? "unknown")
    : "local-shared";
  const bucket = createHash("sha256")
    .update(`student-checkout:${address}`)
    .digest("hex");
  const rows =
    await studentDatabase()`SELECT student_enrollment_allowance(${bucket}) AS allowed`;
  return rows[0]?.allowed === true;
}
