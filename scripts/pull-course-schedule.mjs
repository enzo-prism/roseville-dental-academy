// Refresh the bundled schedule before next build. A configured feed is authoritative:
// never publish committed availability when the feed cannot be read or validated.
// Only unconfigured nonproduction builds may use the committed development fixture.

import { rename, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { scheduleRevision } from "../lib/course-schedule-revision.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const DATA_PATH = process.env.RDA_SCHEDULE_DATA_PATH
  ? resolve(process.env.RDA_SCHEDULE_DATA_PATH)
  : resolve(ROOT, "data/course-schedule.json");
const COURSE_IDS = new Set([
  "bls-cpr-1",
  "radiation-safety",
  "coronal-polish",
  "sealants",
  "infection-control",
  "dental-assisting-program",
]);

function isIsoDate(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

function validateFeed(feed) {
  if (!feed || typeof feed !== "object") throw new Error("feed is not an object");
  if (feed.version !== 1) throw new Error(`unsupported feed version ${feed.version}`);
  if (!isIsoDate(feed.reviewedOn)) throw new Error("feed reviewedOn is not a date");
  if (!Array.isArray(feed.entries)) throw new Error("feed entries is not an array");

  const seen = new Set();
  const entries = feed.entries.map((entry, index) => {
    if (!COURSE_IDS.has(entry?.courseId)) throw new Error(`entry ${index}: unknown course ${entry?.courseId}`);
    if (!isIsoDate(entry.isoDate)) throw new Error(`entry ${index}: bad date ${entry.isoDate}`);
    if (entry.status !== "open" && entry.status !== "full") throw new Error(`entry ${index}: bad status ${entry.status}`);
    const key = `${entry.courseId}|${entry.isoDate}`;
    if (seen.has(key)) throw new Error(`entry ${index}: duplicate ${key}`);
    seen.add(key);
    return { courseId: entry.courseId, isoDate: entry.isoDate, status: entry.status };
  });

  const revision = scheduleRevision(entries);
  if (feed.revision !== undefined && feed.revision !== revision) {
    throw new Error("feed revision does not match its entries");
  }
  return { entries, revision, reviewedOn: feed.reviewedOn, generatedAt: typeof feed.generatedAt === "string" ? feed.generatedAt : null };
}

async function main() {
  const url = process.env.RDA_SCHEDULE_FEED_URL?.trim();
  const token = process.env.RDA_SCHEDULE_FEED_TOKEN?.trim();
  const production = process.env.VERCEL_ENV === "production" || process.env.VERCEL_TARGET_ENV === "production";
  if (!url || !token) {
    if (production || url || token) {
      throw new Error("both RDA_SCHEDULE_FEED_URL and RDA_SCHEDULE_FEED_TOKEN are required for production or a configured feed");
    }
    console.log("[course-schedule] Feed not configured; using committed data/course-schedule.json.");
    return;
  }

  try {
    const response = await fetch(url, {
      headers: { authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const { entries, revision, reviewedOn, generatedAt } = validateFeed(await response.json());

    const next = { version: 1, source: "dashboard", revision, generatedAt, reviewedOn, entries };
    const tempPath = `${DATA_PATH}.tmp`;
    await writeFile(tempPath, `${JSON.stringify(next, null, 2)}\n`);
    await rename(tempPath, DATA_PATH);
    console.log(
      `[course-schedule] Pulled ${entries.length} class dates from the dashboard (reviewed ${reviewedOn}).`,
    );
  } catch (error) {
    throw new Error(`dashboard feed unavailable or invalid (${error instanceof Error ? error.message : "unknown error"}); refusing to publish stale availability`);
  }
}

main().catch((error) => {
  console.error(`[course-schedule] ${error.message}`);
  process.exitCode = 1;
});
