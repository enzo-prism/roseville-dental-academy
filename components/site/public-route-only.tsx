"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

import { isPrivateSiteRoute } from "@/lib/private-site-routes";

/** Keep recording, advertising, and attribution off private academy tools. */
export function PublicRouteOnly({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  return isPrivateSiteRoute(pathname) ? null : children;
}
