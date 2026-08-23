import { hasValidBearer } from "@/lib/server/attribution-auth";
import { hasAttributionDatabase, upsertDailyAdDeliveries } from "@/lib/server/attribution-db";
import { privateJson, readJsonBody, unavailable } from "@/lib/server/attribution-http";
import { parseDailyAdDelivery } from "@/lib/server/attribution-validation";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!hasValidBearer(request)) return privateJson({ error: "Unauthorized" }, 401);
  if (!hasAttributionDatabase()) return unavailable();
  const body = await readJsonBody(request);
  const values = Array.isArray(body) ? body : [];
  if (!values.length || values.length > 1_000) return privateJson({ error: "Invalid delivery batch" }, 400);
  const rows = values.map(parseDailyAdDelivery);
  if (rows.some((row) => !row)) return privateJson({ error: "Invalid delivery row" }, 400);

  try {
    await upsertDailyAdDeliveries(rows.filter((row) => row !== null));
    return privateJson({ applied: rows.length });
  } catch {
    return privateJson({ applied: 0, error: "Delivery batch was rejected without a partial write" }, 409);
  }
}
