"use client";

import NextLink from "next/link";
import { usePathname } from "next/navigation";
import { forwardRef, type AnchorHTMLAttributes } from "react";
import { isPrivateSiteRoute } from "@/lib/private-site-routes";

// Crossing a private boundary uses a fresh document. Public tracking libraries
// cannot be unloaded reliably by unmounting their React bootstrap components.
export const SiteLink = forwardRef<HTMLAnchorElement, AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }>(
  function SiteLink({ href, children, ...props }, ref) {
    const pathname = usePathname();
    if (isPrivateSiteRoute(pathname || "") || isPrivateSiteRoute(href)) {
      return <a {...props} href={href} ref={ref}>{children}</a>;
    }
    return <NextLink {...props} href={href} ref={ref}>{children}</NextLink>;
  },
);
