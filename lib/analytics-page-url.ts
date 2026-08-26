/**
 * GA4 page_location / page_path must keep the current query string so Meta
 * and Google paid tags (utm_*, fbclid) survive a 2–3s in-app visit.
 */
export function getAnalyticsPagePath(pathname?: string, search?: string) {
  if (typeof window === "undefined") {
    const query = normalizeSearch(search);
    return `${pathname ?? ""}${query}`;
  }

  return `${pathname ?? window.location.pathname}${normalizeSearch(
    search ?? window.location.search,
  )}`;
}

export function getAnalyticsPageLocation(pathname?: string, search?: string) {
  if (typeof window === "undefined") {
    return getAnalyticsPagePath(pathname, search);
  }

  return `${window.location.origin}${getAnalyticsPagePath(pathname, search)}`;
}

function normalizeSearch(search?: string) {
  if (!search) {
    return "";
  }

  return search.startsWith("?") ? search : `?${search}`;
}
