import type { Metadata } from "next";
import "@/app/front-office.css";
import { FrontOfficePage } from "@/components/academy/pages/front-office-page";
import { LiveShell } from "@/components/site/live-shell";
import { BreadcrumbStructuredData } from "@/components/site/structured-data";
import { frontOfficeRoute } from "@/lib/front-office-program";
import { buildPageMetadata } from "@/lib/site-metadata";

export const metadata: Metadata = buildPageMetadata({ route: frontOfficeRoute });

export default function DentalFrontDeskRoute() {
  return <LiveShell route={frontOfficeRoute}><BreadcrumbStructuredData items={[{ name: "Home", path: "/" }, { name: "Dental Front Desk", path: frontOfficeRoute.route }]} /><FrontOfficePage /></LiveShell>;
}
