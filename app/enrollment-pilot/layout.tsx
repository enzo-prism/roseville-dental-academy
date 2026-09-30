import type { Metadata } from "next";
export const metadata: Metadata = { title: "Private TEST Checkout | Roseville Dental Academy",
  robots: { index: false, follow: false, nocache: true }, referrer: "no-referrer" };
export const dynamic = "force-dynamic";
export default function EnrollmentPilotLayout({ children }: { children: React.ReactNode }) { return children; }
