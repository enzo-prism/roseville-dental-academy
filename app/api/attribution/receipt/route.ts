import { createHash } from "node:crypto";

import { isAllowedWebsiteOrigin } from "@/lib/server/attribution-auth";
import { consumeReceiptNonce, hasAttributionDatabase, upsertAttributionReceipt } from "@/lib/server/attribution-db";
import { privateJson, readJsonBody, unavailable } from "@/lib/server/attribution-http";
import { parseAttributionReceipt } from "@/lib/server/attribution-validation";
import { verifyReceiptToken } from "@/lib/server/attribution-receipt-token";

export const runtime = "nodejs";

export async function OPTIONS(request: Request) {
  if (!isAllowedWebsiteOrigin(request)) return new Response(null, { status: 403 });
  const origin = request.headers.get("origin") ?? "";
  return new Response(null, {
    headers: {
      "Access-Control-Allow-Headers": "Content-Type, X-RDA-Receipt-Token",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Origin": origin,
      "Access-Control-Max-Age": "600",
      Vary: "Origin",
    },
    status: 204,
  });
}

export async function POST(request: Request) {
  if (!isAllowedWebsiteOrigin(request)) return privateJson({ error: "Origin not allowed" }, 403);
  if (!hasAttributionDatabase()) return unavailable();

  const receipt = parseAttributionReceipt(await readJsonBody(request));
  if (!receipt) return privateJson({ error: "Invalid attribution receipt" }, 400);
  const claims = verifyReceiptToken(request.headers.get("x-rda-receipt-token") ?? "");
  if (!claims || claims.formId !== receipt.formId || claims.leadEventId !== receipt.leadEventId) {
    return privateJson({ error: "Invalid receipt token" }, 401);
  }

  try {
    const payloadSha256 = createHash("sha256").update(JSON.stringify(receipt)).digest("hex");
    if (!await consumeReceiptNonce({ formId: receipt.formId, leadEventId: receipt.leadEventId,
      nonce: claims.nonce, payloadSha256 })) return privateJson({ error: "Receipt token rejected" }, 401);
    await upsertAttributionReceipt(receipt);
    const response = privateJson({ accepted: true, verificationStatus: "pending" }, 202);
    response.headers.set("Access-Control-Allow-Origin", request.headers.get("origin") ?? "");
    response.headers.set("Vary", "Origin");
    return response;
  } catch {
    return privateJson({ error: "Attribution receipt could not be stored" }, 503);
  }
}
