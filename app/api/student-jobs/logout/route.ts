import { NextRequest, NextResponse } from "next/server";
import { STUDENT_JOBS_COOKIE, STUDENT_JOBS_PRIVATE_HEADERS, studentJobsCookieOptions, studentJobsSameOrigin } from "@/lib/student-jobs-auth";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  if (!studentJobsSameOrigin(request)) {
    return new NextResponse(null, { status: 403, headers: STUDENT_JOBS_PRIVATE_HEADERS });
  }
  const response = new NextResponse(null, { status: 303,
    headers: { ...STUDENT_JOBS_PRIVATE_HEADERS, Location: "/student-jobs?status=signed-out" } });
  response.cookies.set(STUDENT_JOBS_COOKIE, "", studentJobsCookieOptions(0));
  return response;
}

export async function GET() {
  return new NextResponse(null, { status: 405, headers: { ...STUDENT_JOBS_PRIVATE_HEADERS, Allow: "POST" } });
}
