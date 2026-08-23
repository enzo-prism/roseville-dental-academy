import { getAttributionDashboard, hasAttributionDatabase } from "@/lib/server/attribution-db";
import { publicAggregateHeaders } from "@/lib/server/attribution-auth";

export const runtime = "nodejs";

export async function GET() {
  if (!hasAttributionDatabase()) {
    return Response.json(
      { error: "Attribution aggregate is not configured" },
      { headers: { "Cache-Control": "public, max-age=60" }, status: 503 },
    );
  }

  try {
    const body = JSON.stringify(await getAttributionDashboard());
    if (new TextEncoder().encode(body).byteLength > 512_000) {
      throw new Error("Aggregate response exceeded the public size cap");
    }
    return new Response(body, {
      headers: publicAggregateHeaders,
    });
  } catch {
    return Response.json(
      { error: "Attribution aggregate is temporarily unavailable" },
      { headers: { "Cache-Control": "no-store" }, status: 503 },
    );
  }
}
