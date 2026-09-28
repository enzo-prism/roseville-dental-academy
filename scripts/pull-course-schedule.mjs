// Refresh data/course-schedule.json from the RDA dashboard's Class dates feed.
//
// Runs before `next build`. It only pulls when RDA_SCHEDULE_FEED_URL and
// RDA_SCHEDULE_FEED_TOKEN are set (Vercel Production). Everywhere else, and on
// any fetch or validation failure, the committed file is used unchanged, so a
// dashboard outage can never break a deploy; it just ships the last good copy.

import { readFile, rename, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

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
  if (!Array.isArray(feed.entries) || feed.entries.length === 0) throw new Error("feed has no entries");

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

  return { entries, reviewedOn: feed.reviewedOn, generatedAt: typeof feed.generatedAt === "string" ? feed.generatedAt : null };
}

async function main() {
  const url = process.env.RDA_SCHEDULE_FEED_URL?.trim();
  const token = process.env.RDA_SCHEDULE_FEED_TOKEN?.trim();
  if (!url || !token) {
    console.log("[course-schedule] Feed not configured; using committed data/course-schedule.json.");
    return;
  }

  try {
    const response = await fetch(url, {
      headers: { authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const { entries, reviewedOn, generatedAt } = validateFeed(await response.json());

    const committed = JSON.parse(await readFile(DATA_PATH, "utf8"));
    const next = { version: 1, source: "dashboard", generatedAt, reviewedOn, entries };
    const tempPath = `${DATA_PATH}.tmp`;
    await writeFile(tempPath, `${JSON.stringify(next, null, 2)}\n`);
    await rename(tempPath, DATA_PATH);
    console.log(
      `[course-schedule] Pulled ${entries.length} class dates from the dashboard (reviewed ${reviewedOn}; committed copy had ${committed.entries?.length ?? 0}).`,
    );
  } catch (error) {
    console.warn(
      `[course-schedule] WARNING: dashboard feed unavailable (${error instanceof Error ? error.message : error}); using committed data/course-schedule.json.`,
    );
  }
}

main();
