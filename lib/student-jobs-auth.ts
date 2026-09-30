import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { getSiteOrigin } from "./site-config";

export const STUDENT_JOBS_COOKIE = "__Host-rda-student-jobs";
export const STUDENT_JOBS_SESSION_SECONDS = 8 * 60 * 60;
export const STUDENT_JOBS_PRIVATE_HEADERS = {
  "Cache-Control": "private, no-store, max-age=0",
  "X-Robots-Tag": "noindex, nofollow, noarchive",
  "Referrer-Policy": "no-referrer",
};

export type StudentJobsAuthConfig = { password: string; secret: string };

export function studentJobsAuthConfig(): StudentJobsAuthConfig | null {
  const password = process.env.RDA_STUDENT_JOBS_PASSWORD;
  const secret = process.env.RDA_STUDENT_JOBS_SESSION_SECRET;
  if (!password || password.length < 20 || password.length > 1024 || !secret || secret.length < 32 || secret === password) return null;
  return { password, secret };
}

function digest(value: string) { return createHash("sha256").update(value).digest(); }
function sign(value: string, config: StudentJobsAuthConfig) {
  return createHmac("sha256", config.secret).update(value).digest("base64url");
}
function equal(a: string, b: string) { return timingSafeEqual(digest(a), digest(b)); }

export function studentJobsPasswordMatches(password: string, config: StudentJobsAuthConfig) {
  return password.length <= 1024 && equal(password, config.password);
}

export function createStudentJobsSession(config: StudentJobsAuthConfig, now = Date.now()) {
  const issued = Math.floor(now / 1000);
  const payload = Buffer.from(JSON.stringify({ v: 1, iat: issued,
    exp: issued + STUDENT_JOBS_SESSION_SECONDS,
    rev: sign(`password:${config.password}`, config), nonce: randomBytes(16).toString("base64url") })).toString("base64url");
  return `${payload}.${sign(payload, config)}`;
}

export function validStudentJobsSession(token: string | undefined, config: StudentJobsAuthConfig | null, now = Date.now()) {
  if (!config || !token || token.length > 1024) return false;
  const parts = token.split(".");
  if (parts.length !== 2 || !equal(sign(parts[0], config), parts[1])) return false;
  try {
    const payload = JSON.parse(Buffer.from(parts[0], "base64url").toString("utf8"));
    const seconds = Math.floor(now / 1000);
    return payload.v === 1 && Number.isInteger(payload.iat) && Number.isInteger(payload.exp)
      && payload.iat <= seconds + 30 && payload.exp > seconds
      && payload.exp === payload.iat + STUDENT_JOBS_SESSION_SECONDS
      && typeof payload.rev === "string" && equal(payload.rev, sign(`password:${config.password}`, config))
      && typeof payload.nonce === "string" && /^[A-Za-z0-9_-]{22}$/.test(payload.nonce);
  } catch { return false; }
}

export function studentJobsCookieOptions(maxAge = STUDENT_JOBS_SESSION_SECONDS) {
  return { httpOnly: true, secure: true, sameSite: "strict" as const, path: "/", maxAge };
}

export function studentJobsSameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return false;
  const fetchSite = request.headers.get("sec-fetch-site");
  if (fetchSite === "cross-site") return false;
  try {
    const requestUrl = new URL(request.url);
    const host = request.headers.get("host");
    const trustedOrigin = getSiteOrigin();
    const trustedUrl = new URL(trustedOrigin);
    const loopback = (hostname: string) => ["localhost", "127.0.0.1", "[::1]"].includes(hostname);
    const localTarget = !process.env.VERCEL && Boolean(host) && loopback(requestUrl.hostname)
      && loopback(new URL(`${requestUrl.protocol}//${host}`).hostname)
      && new URL(`${requestUrl.protocol}//${host}`).port === requestUrl.port;
    // Referrer-Policy:no-referrer makes native form POSTs send Origin:null.
    // Modern browser Fetch Metadata can prove these are same-origin document
    // navigations. Every header must match, and the destination must be the
    // configured canonical host (or a tightly scoped non-Vercel loopback test).
    if (origin === "null") {
      return request.method === "POST" && fetchSite === "same-origin"
        && request.headers.get("sec-fetch-mode") === "navigate"
        && request.headers.get("sec-fetch-dest") === "document"
        && ((trustedUrl.protocol === "https:" && host === trustedUrl.host) || localTarget);
    }
    const originUrl = new URL(origin);
    if (originUrl.origin !== origin) return false;
    // The canonical site configuration is trusted. The internal request URL may
    // use HTTP or an infrastructure host after Vercel terminates public HTTPS.
    // Caller-supplied forwarded host/protocol headers never expand this allowlist.
    if (originUrl.protocol === "https:" && origin === trustedOrigin) return true;
    // Local production builds must remain testable without trusting arbitrary
    // origins. This exception is impossible on Vercel and bounded to loopback.
    if (process.env.VERCEL) return false;
    return localTarget && loopback(originUrl.hostname)
      && originUrl.host === host && originUrl.port === requestUrl.port
      && originUrl.protocol === requestUrl.protocol;
  } catch { return false; }
}
