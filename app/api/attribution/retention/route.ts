import { hasValidBearer } from "@/lib/server/attribution-auth";
import { hasAttributionDatabase, purgeExpiredAttributionData } from "@/lib/server/attribution-db";
import { privateJson, unavailable } from "@/lib/server/attribution-http";

export const runtime = "nodejs";

export async function GET(request: Request) {
  if (!hasValidBearer(request, "CRON_SECRET")) return privateJson({ error: "Unauthorized" }, 401);
  if (!hasAttributionDatabase()) return unavailable();
  try {
    return privateJson(await purgeExpiredAttributionData());
  } catch {
    return privateJson({ error: "Attribution retention pass failed without a partial transaction" }, 503);
  }
}
