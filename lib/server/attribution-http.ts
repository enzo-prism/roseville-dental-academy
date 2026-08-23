import { privateJsonHeaders } from "@/lib/server/attribution-auth";

const MAX_BODY_BYTES = 256_000;

export async function readJsonBody(request: Request) {
  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().includes("application/json")) return null;
  const declaredLength = Number(request.headers.get("content-length") ?? 0);
  if (declaredLength > MAX_BODY_BYTES) return null;

  const raw = await request.text();
  if (!raw || new TextEncoder().encode(raw).byteLength > MAX_BODY_BYTES) return null;
  try {
    return JSON.parse(raw) as unknown;
  } catch {
    return null;
  }
}

export function privateJson(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { headers: privateJsonHeaders, status });
}

export function unavailable() {
  return privateJson({ error: "Attribution service is not configured" }, 503);
}
