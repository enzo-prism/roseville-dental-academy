import { createHmac, timingSafeEqual } from "node:crypto";

const TOKEN_TTL_MS = 10 * 60 * 1_000;
const EVENT_PATTERN = /^(?:[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}|[a-z0-9]{8,}-[a-z0-9]{8,})$/iu;
const FORM_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]{0,99}$/u;
const NONCE_PATTERN = /^[0-9a-f-]{36}$/iu;

export type ReceiptTokenClaims = {
  expiresAt: string;
  formId: string;
  issuedAt: string;
  leadEventId: string;
  nonce: string;
  version: 1;
};

function secret() {
  const value = process.env.RDA_RECEIPT_SIGNING_SECRET?.trim() ?? "";
  return value.length >= 32 ? value : "";
}

function signature(encoded: string, key = secret()) {
  return createHmac("sha256", key).update(encoded).digest("base64url");
}

export function hasReceiptSigningKey() {
  return Boolean(secret());
}

export function validReceiptTokenIdentity(leadEventId: unknown, formId: unknown) {
  const allowedForms = new Set((process.env.RDA_FORMSPREE_FORM_IDS ?? "xzdkgaeg,mpqgyjjg,mwvdrnrk")
    .split(",").map((value) => value.trim()).filter(Boolean));
  return typeof leadEventId === "string" && EVENT_PATTERN.test(leadEventId) &&
    typeof formId === "string" && FORM_PATTERN.test(formId) && allowedForms.has(formId);
}

export function createReceiptToken(input: { formId: string; leadEventId: string; nonce: string }, now = new Date()) {
  const key = secret();
  if (!key || !validReceiptTokenIdentity(input.leadEventId, input.formId) || !NONCE_PATTERN.test(input.nonce)) return "";
  const claims: ReceiptTokenClaims = { expiresAt: new Date(now.getTime() + TOKEN_TTL_MS).toISOString(),
    formId: input.formId, issuedAt: now.toISOString(), leadEventId: input.leadEventId,
    nonce: input.nonce, version: 1 };
  const encoded = Buffer.from(JSON.stringify(claims)).toString("base64url");
  return `${encoded}.${signature(encoded, key)}`;
}

export function verifyReceiptToken(token: string, now = new Date()): ReceiptTokenClaims | null {
  const key = secret();
  const [encoded, suppliedSignature, extra] = token.split(".");
  if (!key || !encoded || !suppliedSignature || extra) return null;
  const expected = signature(encoded, key);
  const supplied = Buffer.from(suppliedSignature);
  const expectedBuffer = Buffer.from(expected);
  if (supplied.length !== expectedBuffer.length || !timingSafeEqual(supplied, expectedBuffer)) return null;
  try {
    const claims = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8")) as ReceiptTokenClaims;
    if (claims.version !== 1 || !validReceiptTokenIdentity(claims.leadEventId, claims.formId) ||
        !NONCE_PATTERN.test(claims.nonce) || Date.parse(claims.expiresAt) <= now.getTime() ||
        Date.parse(claims.issuedAt) > now.getTime() + 60_000 ||
        Date.parse(claims.expiresAt) - Date.parse(claims.issuedAt) !== TOKEN_TTL_MS) return null;
    return claims;
  } catch {
    return null;
  }
}

export function receiptAbuseBucket(request: Request, now = new Date()) {
  const key = secret();
  if (!key) return null;
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const userAgent = (request.headers.get("user-agent") ?? "unknown").slice(0, 256);
  const windowStart = new Date(Math.floor(now.getTime() / TOKEN_TTL_MS) * TOKEN_TTL_MS);
  return { bucketHash: createHmac("sha256", key).update(`${forwarded}\n${userAgent}`).digest("hex"),
    windowStart: windowStart.toISOString() };
}
