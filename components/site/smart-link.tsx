import * as React from "react";
import Link from "next/link";

import { isInternalHref } from "@/lib/site-routing";

type SmartLinkProps = React.ComponentPropsWithoutRef<"a"> & {
  href: string;
};

export const SmartLink = React.forwardRef<HTMLAnchorElement, SmartLinkProps>(
  ({ href, rel, target, ...props }, ref) => {
    if (isInternalHref(href)) {
      return <Link href={href} ref={ref} {...props} />;
    }

    const safeTarget = target ?? (href.startsWith("http") ? "_blank" : undefined);
    const safeRel =
      rel ?? (safeTarget === "_blank" ? "noreferrer noopener" : undefined);

    return <a href={href} ref={ref} rel={safeRel} target={safeTarget} {...props} />;
  },
);

SmartLink.displayName = "SmartLink";
