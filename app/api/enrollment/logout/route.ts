import { cookies } from "next/headers";
import { ENROLLMENT_PILOT_COOKIE, enrollmentAuthConfig, enrollmentCookieOptions } from "@/lib/enrollment-auth";
import { enrollmentResponse } from "@/lib/enrollment-http";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function POST(request: Request) {
  const config = enrollmentAuthConfig();
  if (!config || request.headers.get("origin") !== config.origin) return enrollmentResponse({ error: "Invalid origin." }, 403);
  (await cookies()).set(ENROLLMENT_PILOT_COOKIE, "", enrollmentCookieOptions(0));
  return enrollmentResponse({ signedOut: true });
}
