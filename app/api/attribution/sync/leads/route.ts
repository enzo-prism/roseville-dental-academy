import { hasValidBearer } from "@/lib/server/attribution-auth";
import { hasAttributionDatabase, upsertCanonicalLeads } from "@/lib/server/attribution-db";
import { privateJson, readJsonBody, unavailable } from "@/lib/server/attribution-http";
import { parseCanonicalLead } from "@/lib/server/attribution-validation";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!hasValidBearer(request)) return privateJson({ error: "Unauthorized" }, 401);
  if (!hasAttributionDatabase()) return unavailable();
  const body = await readJsonBody(request);
  const values = Array.isArray(body) ? body : [];
  if (!values.length || values.length > 250) return privateJson({ error: "Invalid lead batch" }, 400);
  const leads = values.map(parseCanonicalLead);
  if (leads.some((lead) => !lead)) return privateJson({ error: "Invalid canonical lead" }, 400);

  try {
    await upsertCanonicalLeads(leads.filter((lead) => lead !== null));
    return privateJson({ applied: leads.length });
  } catch {
    return privateJson({ applied: 0, error: "Lead batch was rejected without a partial write" }, 409);
  }
}
