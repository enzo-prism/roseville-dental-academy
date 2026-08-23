import { createHash, timingSafeEqual } from "node:crypto";

function digest(value: string) {
  return createHash("sha256").update(value).digest();
}

export function hasValidBearer(request: Request, envName = "RDA_SYNC_SECRET") {
  const expected = process.env[envName]?.trim();
  const header = request.headers.get("authorization") ?? "";
  const supplied = header.startsWith("Bearer ") ? header.slice(7).trim() : "";

  if (!expected || !supplied) return false;
  return timingSafeEqual(digest(expected), digest(supplied));
}

export function isAllowedWebsiteOrigin(request: Request) {
  const origin = request.headers.get("origin");
  const allowed = new Set(
    (process.env.RDA_ATTRIBUTION_ALLOWED_ORIGINS ??
      "https://www.rosevilledentalacademy.com,https://rosevilledentalacademy.com")
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean),
  );

  if (!origin) return process.env.NODE_ENV !== "production";
  return allowed.has(origin);
}

export const privateJsonHeaders = {
  "Cache-Control": "private, no-store",
  "Content-Type": "application/json",
  "X-Content-Type-Options": "nosniff",
};

export const publicAggregateHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Cache-Control": "public, max-age=0, s-maxage=300, stale-while-revalidate=600",
  "Content-Type": "application/json",
  "X-Content-Type-Options": "nosniff",
};
