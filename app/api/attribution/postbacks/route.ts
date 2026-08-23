import { hasValidBearer } from "@/lib/server/attribution-auth";
import {
  claimPendingPostbacks,
  hasAttributionDatabase,
  updatePostbackStatus,
} from "@/lib/server/attribution-db";
import { privateJson, unavailable } from "@/lib/server/attribution-http";
import { sendPlatformPostback } from "@/lib/server/platform-postbacks";
import { approvedConsentPolicyVersions } from "@/lib/server/postback-config";

export const maxDuration = 300;
export const runtime = "nodejs";

export async function GET(request: Request) {
  if (!hasValidBearer(request, "CRON_SECRET")) return privateJson({ error: "Unauthorized" }, 401);
  if (!hasAttributionDatabase()) return unavailable();
  if (process.env.RDA_PLATFORM_POSTBACKS_ENABLED !== "true") {
    return privateJson({ accepted: 0, disabled: 0, failed: 0, retry: 0, validated: 0,
      processing: false, reason: "Platform postbacks are disabled" });
  }
  if (approvedConsentPolicyVersions().size === 0) {
    return privateJson({ accepted: 0, disabled: 0, failed: 0, retry: 0, validated: 0,
      processing: false, reason: "No consent policy version is approved for platform sharing" });
  }

  const summary = { accepted: 0, disabled: 0, failed: 0, retry: 0, validated: 0 };
  try {
    for (const job of await claimPendingPostbacks()) {
      const result = await sendPlatformPostback(job);
      await updatePostbackStatus(job, result);
      summary[result.status] += 1;
    }
    return privateJson(summary);
  } catch {
    return privateJson({ ...summary, error: "Postback processing stopped" }, 503);
  }
}
