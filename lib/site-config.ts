const DEFAULT_SITE_URL = "https://www.rosevilledentalacademy.com";

function normalizeSiteUrl(value?: string) {
  const candidate = value?.trim() || DEFAULT_SITE_URL;
  return candidate.replace(/\/+$/g, "");
}

export const SITE_URL = normalizeSiteUrl(process.env.SITE_URL);
export const LIVE_SOURCE_ORIGIN = "https://rosevilledentalacademy.com";

export function getSiteUrl() {
  return SITE_URL;
}

export function getSiteOrigin() {
  return new URL(SITE_URL).origin;
}
