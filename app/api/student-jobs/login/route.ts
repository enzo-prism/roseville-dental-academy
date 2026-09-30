import { NextRequest, NextResponse } from "next/server";
import { createStudentJobsSession, STUDENT_JOBS_COOKIE, STUDENT_JOBS_PRIVATE_HEADERS,
  studentJobsAuthConfig, studentJobsCookieOptions, studentJobsPasswordMatches, studentJobsSameOrigin } from "@/lib/student-jobs-auth";
import { allowStudentJobsLogin } from "@/lib/student-jobs-rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function back(error?: string) {
  return new NextResponse(null, { status: 303, headers: { ...STUDENT_JOBS_PRIVATE_HEADERS,
    Location: `/student-jobs${error ? `?status=${error}` : ""}` } });
}

async function boundedBody(request: Request) {
  if (!request.body) return "";
  const reader = request.body.getReader();
  const decoder = new TextDecoder();
  let total = 0;
  let text = "";
  try {
    for (;;) {
      const part = await reader.read();
      if (part.done) return text + decoder.decode();
      total += part.value.byteLength;
      if (total > 4096) { await reader.cancel(); throw new Error("Body too large"); }
      text += decoder.decode(part.value, { stream: true });
    }
  } finally { reader.releaseLock(); }
}

export async function POST(request: NextRequest) {
  if (!studentJobsSameOrigin(request)) return back("denied");
  const config = studentJobsAuthConfig();
  if (!config) return back("unavailable");
  if (!(await allowStudentJobsLogin(request, config))) return back("limited");
  if (Number(request.headers.get("content-length") || 0) > 4096
    || !request.headers.get("content-type")?.startsWith("application/x-www-form-urlencoded")) return back("denied");
  try {
    const body = await boundedBody(request);
    if (body.length > 4096) return back("denied");
    const fields = new URLSearchParams(body);
    const passwords = fields.getAll("password");
    if (passwords.length !== 1 || !studentJobsPasswordMatches(passwords[0], config)) return back("denied");
    const response = back();
    response.cookies.set(STUDENT_JOBS_COOKIE, createStudentJobsSession(config), studentJobsCookieOptions());
    return response;
  } catch { return back("denied"); }
}

export async function GET() {
  return new NextResponse(null, { status: 405, headers: { ...STUDENT_JOBS_PRIVATE_HEADERS, Allow: "POST" } });
}
