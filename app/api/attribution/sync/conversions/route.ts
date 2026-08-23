import { hasValidBearer } from "@/lib/server/attribution-auth";
import { hasAttributionDatabase, upsertCanonicalConversions } from "@/lib/server/attribution-db";
import { privateJson, readJsonBody, unavailable } from "@/lib/server/attribution-http";
import { parseCanonicalConversion } from "@/lib/server/attribution-validation";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!hasValidBearer(request)) return privateJson({ error: "Unauthorized" }, 401);
  if (!hasAttributionDatabase()) return unavailable();
  const body = await readJsonBody(request);
  const values = Array.isArray(body) ? body : [];
  if (!values.length || values.length > 250) return privateJson({ error: "Invalid conversion batch" }, 400);
  const conversions = values.map(parseCanonicalConversion);
  if (conversions.some((item) => !item)) return privateJson({ error: "Invalid conversion" }, 400);

  try {
    await upsertCanonicalConversions(conversions.filter((conversion) => conversion !== null));
    return privateJson({ applied: conversions.length });
  } catch {
    return privateJson({ applied: 0, error: "Conversion batch was rejected without a partial write" }, 409);
  }
}
