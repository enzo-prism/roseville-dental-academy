import { hasValidBearer } from "@/lib/server/attribution-auth";
import {
  claimPendingPostbacks,
  hasAttributionDatabase,
  updatePostbackStatus,
} from "@/lib/server/attribution-db";
import { privateJson, unavailable } from "@/lib/server/attribution-http";
import { sendPlatformPostback } from "@/lib/server/platform-postbacks";
import { approvedConsentPolicyVersions } from "@/lib/server/postback-config";
import { processPostbackBatch } from "@/lib/server/postback-worker";
import type { PostbackOutcome } from "@/lib/server/attribution-db";

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
    await processPostbackBatch({
      claim: async (excludedKeys) => (await claimPendingPostbacks(1, excludedKeys))[0],
      key: (job) => `${job.platform}:${job.conversionEventId}`,
      send: sendPlatformPostback,
      acknowledge: (job, result) => updatePostbackStatus(job, result as PostbackOutcome),
      summary,
    });
    return privateJson(summary);
  } catch {
    return privateJson({ ...summary, error: "Postback processing stopped" }, 503);
  }
}
