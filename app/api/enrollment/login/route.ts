import { cookies } from "next/headers";
import { createEnrollmentSession, ENROLLMENT_PILOT_COOKIE, enrollmentAuthConfig, enrollmentCookieOptions, enrollmentLoginAllowance, enrollmentPasswordMatches } from "@/lib/enrollment-auth";
import { enrollmentBody, enrollmentResponse } from "@/lib/enrollment-http";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function POST(request: Request) {
  const config = enrollmentAuthConfig();
  if (!config) return enrollmentResponse({ error: "Staff access is awaiting secure configuration." }, 503);
  if (request.headers.get("origin") !== config.origin || request.headers.get("content-type")?.split(";")[0].trim() !== "application/json") return enrollmentResponse({ error: "Invalid origin." }, 403);
  try {
    if (!await enrollmentLoginAllowance(request, config)) return enrollmentResponse({ error: "Too many sign-in attempts. Try again after 15 minutes." }, 429);
    const body = await enrollmentBody(request);
    if (Object.keys(body).length !== 1 || typeof body.password !== "string" || !enrollmentPasswordMatches(body.password, config)) return enrollmentResponse({ error: "Staff password was not accepted." }, 401);
    (await cookies()).set(ENROLLMENT_PILOT_COOKIE, createEnrollmentSession(config), enrollmentCookieOptions());
    return enrollmentResponse({ signedIn: true });
  } catch { return enrollmentResponse({ error: "Staff sign-in unavailable. Try again later." }, 503); }
}
