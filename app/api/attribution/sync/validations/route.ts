import { hasValidBearer } from "@/lib/server/attribution-auth";
import {
  hasAttributionDatabase,
  upsertPlatformAttributionValidations,
} from "@/lib/server/attribution-db";
import { privateJson, readJsonBody, unavailable } from "@/lib/server/attribution-http";
import { parsePlatformAttributionValidation } from "@/lib/server/attribution-validation";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!hasValidBearer(request)) return privateJson({ error: "Unauthorized" }, 401);
  if (!hasAttributionDatabase()) return unavailable();
  const body = await readJsonBody(request);
  const values = Array.isArray(body) ? body : [];
  if (!values.length || values.length > 250) return privateJson({ error: "Invalid validation batch" }, 400);
  const rows = values.map(parsePlatformAttributionValidation);
  if (rows.some((row) => !row)) return privateJson({ error: "Invalid validation row" }, 400);

  try {
    await upsertPlatformAttributionValidations(rows.filter((row) => row !== null));
    return privateJson({ applied: rows.length });
  } catch {
    return privateJson({ applied: 0, error: "Validation batch was rejected without a partial write" }, 409);
  }
}
