import { randomUUID } from "node:crypto";

import { isAllowedWebsiteOrigin } from "@/lib/server/attribution-auth";
import { hasAttributionDatabase, issueReceiptNonce } from "@/lib/server/attribution-db";
import { privateJson, readJsonBody, unavailable } from "@/lib/server/attribution-http";
import { createReceiptToken, hasReceiptSigningKey, receiptAbuseBucket,
  validReceiptTokenIdentity } from "@/lib/server/attribution-receipt-token";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!isAllowedWebsiteOrigin(request)) return privateJson({ error: "Origin not allowed" }, 403);
  if (!hasAttributionDatabase() || !hasReceiptSigningKey()) return unavailable();
  const body = await readJsonBody(request);
  if (!body || typeof body !== "object" || Array.isArray(body)) return privateJson({ error: "Invalid token request" }, 400);
  const { formId, leadEventId } = body as Record<string, unknown>;
  if (!validReceiptTokenIdentity(leadEventId, formId)) return privateJson({ error: "Invalid token identity" }, 400);
  const bucket = receiptAbuseBucket(request);
  if (!bucket) return unavailable();
  const nonce = randomUUID();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1_000).toISOString();
  try {
    const issued = await issueReceiptNonce({ ...bucket, expiresAt, formId: formId as string,
      leadEventId: leadEventId as string, nonce });
    if (!issued) return privateJson({ error: "Receipt token rate limit exceeded" }, 429);
    const token = createReceiptToken({ formId: formId as string, leadEventId: leadEventId as string, nonce });
    if (!token) return unavailable();
    return privateJson({ expiresAt, token }, 201);
  } catch {
    return privateJson({ error: "Receipt token could not be issued" }, 503);
  }
}
