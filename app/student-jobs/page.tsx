import type { Metadata } from "next";
import { cookies } from "next/headers";
import { LiveShell } from "@/components/site/live-shell";
import { StudentJobBoard } from "@/components/site/student-job-board";
import type { LiveRoute } from "@/lib/live-route-data";
import { buildPageMetadata } from "@/lib/site-metadata";
import { STUDENT_JOBS_COOKIE, studentJobsAuthConfig, validStudentJobsSession } from "@/lib/student-jobs-auth";
import { parseStudentJobs, type StudentJob } from "@/lib/student-jobs-data";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
const route: LiveRoute = {
  aliases: [], assetRoot: "", contentBaselinePath: "", htmlPath: "", id: "student-jobs", kind: "mirror",
  route: "/student-jobs", sourcePath: "/student-jobs", shellVariant: "utility", status: 200,
  title: "Student & Alumni Job Board | Roseville Dental Academy",
  description: "Private career opportunities for Roseville Dental Academy students and alumni.",
  noindex: true, sitemap: false, visualBaselines: {}, visualMasks: [], widgetSlots: [],
};
export const metadata: Metadata = { ...buildPageMetadata({ route }),
  robots: { index: false, follow: false, nocache: true, googleBot: { index: false, follow: false, noarchive: true } },
  referrer: "no-referrer" };

export default async function StudentJobsPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const config = studentJobsAuthConfig();
  const authenticated = validStudentJobsSession((await cookies()).get(STUDENT_JOBS_COOKIE)?.value, config);
  let jobs: StudentJob[] = [];
  let dataAvailable = true;
  if (authenticated) {
    try { jobs = parseStudentJobs((await import("@/data/student-jobs.json")).default); }
    catch { dataAvailable = false; }
  }
  return <LiveShell route={route}><StudentJobBoard authenticated={authenticated} available={Boolean(config)}
    jobs={jobs} status={(await searchParams).status} dataAvailable={dataAvailable} /></LiveShell>;
}
