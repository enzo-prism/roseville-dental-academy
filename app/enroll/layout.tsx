import { EnrollFunnelAnalytics } from "@/components/site/enroll-funnel-analytics";
import type { Metadata } from "next";
export const metadata: Metadata = {
  title: "Enroll and pay | Roseville Dental Academy",
  robots: { index: false, follow: false, nocache: true },
  referrer: "no-referrer",
};
export const dynamic = "force-dynamic";
export default function EnrollmentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <EnrollFunnelAnalytics>{children}</EnrollFunnelAnalytics>;
}
