import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { neon } from "@neondatabase/serverless";

export const ENROLLMENT_PILOT_COOKIE = "__Host-rda-enrollment-pilot";
export const ENROLLMENT_PRIVATE_HEADERS = { "Cache-Control": "private, no-store, max-age=0",
  "X-Robots-Tag": "noindex, nofollow, noarchive", "Referrer-Policy": "no-referrer" };
const SESSION_SECONDS = 2 * 60 * 60;
type AuthConfig = { password: string; secret: string; origin: string };
export function enrollmentAuthConfig(): AuthConfig | null {
  const password = process.env.RDA_ENROLLMENT_PILOT_PASSWORD;
  const secret = process.env.RDA_ENROLLMENT_PILOT_SESSION_SECRET;
  const origin = process.env.RDA_ENROLLMENT_TEST_ORIGIN;
  if (!password || password.length < 20 || password.length > 1024 || !secret || secret.length < 32 || !origin) return null;
  try { const url = new URL(origin); if (url.origin !== origin || url.username || url.password
    || (url.protocol !== "https:" && !(url.protocol === "http:" && ["localhost", "127.0.0.1"].includes(url.hostname)))) return null; } catch { return null; }
  return { password, secret, origin };
}
function sign(payload: string, config: AuthConfig) { return createHmac("sha256", config.secret).update(payload).digest("base64url"); }
function equal(a: string, b: string) { return timingSafeEqual(createHash("sha256").update(a).digest(), createHash("sha256").update(b).digest()); }
export function createEnrollmentSession(config: AuthConfig, now = Date.now()) {
  const iat = Math.floor(now / 1000);
  const payload = Buffer.from(JSON.stringify({ v: 1, iat, exp: iat + SESSION_SECONDS,
    rev: sign(`password:${config.password}`, config), nonce: randomBytes(16).toString("base64url") })).toString("base64url");
  return `${payload}.${sign(payload, config)}`;
}
export function validEnrollmentSession(token: string | undefined, config: AuthConfig | null, now = Date.now()) {
  if (!config || !token || token.length > 1024) return false;
  const parts = token.split(".");
  const [payload, signature] = parts;
  if (parts.length !== 2 || !payload || !signature || !equal(sign(payload, config), signature)) return false;
  try { const value = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    return value.v === 1 && Number.isInteger(value.iat) && Number.isInteger(value.exp)
      && value.iat <= now / 1000 + 30 && value.exp > now / 1000 && value.exp === value.iat + SESSION_SECONDS
      && typeof value.rev === "string" && equal(value.rev, sign(`password:${config.password}`, config))
      && typeof value.nonce === "string" && /^[A-Za-z0-9_-]{22}$/.test(value.nonce);
  } catch { return false; }
}
export function enrollmentPasswordMatches(password: string, config: AuthConfig) { return password.length <= 1024 && equal(password, config.password); }
export function enrollmentCookieOptions(maxAge = SESSION_SECONDS) { return { httpOnly: true, secure: true, sameSite: "strict" as const, path: "/", maxAge }; }
export async function enrollmentLoginAllowance(request: Request, config: AuthConfig) {
  if (!process.env.DATABASE_URL) return false;
  const address = process.env.VERCEL ? request.headers.get("x-vercel-forwarded-for")?.split(",")[0].trim().slice(0, 256) ?? "unknown" : "local-shared";
  const bucket = createHmac("sha256", config.secret).update(address).digest("hex");
  const rows = await neon(process.env.DATABASE_URL)`SELECT enrollment_test_login_allowance(${bucket}) AS allowed`;
  return rows[0]?.allowed === true;
}
