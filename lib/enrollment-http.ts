import { createHmac } from "node:crypto";
import { cookies } from "next/headers";
import { getUpcomingCourseSchedule } from "@/lib/course-schedule";
import { ENROLLMENT_PILOT_COOKIE, ENROLLMENT_PRIVATE_HEADERS, enrollmentAuthConfig, validEnrollmentSession } from "@/lib/enrollment-auth";
import { enrollmentConfig } from "@/lib/enrollment-contract";

export function enrollmentResponse(value: unknown, status = 200) {
  return Response.json(value, { status, headers: ENROLLMENT_PRIVATE_HEADERS });
}
export async function enrollmentOwner() {
  const token = (await cookies()).get(ENROLLMENT_PILOT_COOKIE)?.value;
  const config = enrollmentAuthConfig();
  // The shared staff principal is stable across session renewal; token nonces are not customer identities.
  return validEnrollmentSession(token, config) && config
    ? createHmac("sha256", config.secret).update("enrollment-staff-owner-v1").digest("hex") : null;
}
export function availableTestDates(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: "America/Los_Angeles", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(now);
  const part = (type: string) => parts.find((item) => item.type === type)?.value;
  const today = `${part("year")}-${part("month")}-${part("day")}`;
  return getUpcomingCourseSchedule("infection-control", today).filter((entry) => entry.status === "available");
}
export function validHoldId(value: unknown): value is string {
  return typeof value === "string" && /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(value);
}
export function validEnrollmentMutation(request: Request) {
  const config = enrollmentConfig();
  return config && request.headers.get("origin") === config.origin
    && request.headers.get("content-type")?.split(";")[0].trim() === "application/json"
    && !["cross-site", "none"].includes(request.headers.get("sec-fetch-site") ?? "") ? config : null;
}
export async function enrollmentBody(request: Request): Promise<Record<string, unknown>> {
  const text = await boundedEnrollmentText(request, 4096);
  const value: unknown = JSON.parse(text);
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Invalid body");
  return value as Record<string, unknown>;
}
export async function boundedEnrollmentText(request: Request, limit: number) {
  const declared = request.headers.get("content-length");
  if (declared && (!/^\d+$/.test(declared) || Number(declared) > limit)) throw new Error("Body too large");
  if (!request.body) return "";
  const reader = request.body.getReader(), decoder = new TextDecoder("utf-8", { fatal: true });
  let bytes = 0, body = "";
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > limit) { await reader.cancel(); throw new Error("Body too large"); }
      body += decoder.decode(value, { stream: true });
    }
    return body + decoder.decode();
  } finally { reader.releaseLock(); }
}
