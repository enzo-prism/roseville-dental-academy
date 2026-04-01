import type { NavGroup } from "@/lib/site-types";

function stripQueryAndHash(href: string) {
  return href.split("#")[0]?.split("?")[0] ?? href;
}

export function isInternalHref(href: string) {
  return href.startsWith("/");
}

export function isActivePath(pathname: string, href?: string) {
  if (!href) {
    return false;
  }

  const target = stripQueryAndHash(href);

  if (!target || target === "#") {
    return false;
  }

  if (target === "/") {
    return pathname === "/";
  }

  return pathname === target || pathname.startsWith(`${target}/`);
}

export function navGroupIsActive(pathname: string, group: NavGroup) {
  if (group.href && isActivePath(pathname, group.href)) {
    return true;
  }

  return group.children?.some((child) => isActivePath(pathname, child.href)) ?? false;
}
