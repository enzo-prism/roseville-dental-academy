import { scheduleRevision } from "../../lib/course-schedule-revision.mjs";

type Selection = { baselinePath: string; imageSha256?: string };
type Options = {
  baselinePath: string;
  localPath: string;
  viewportLabel: string;
  platform: string;
  remote: boolean;
  publication?: unknown;
  registry: unknown;
};
const COURSES = new Set(["bls-cpr-1", "radiation-safety", "coronal-polish", "sealants", "infection-control", "dental-assisting-program"]);
const HASH = /^[a-f0-9]{64}$/;
function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Invalid published schedule for visual baseline selection.");
  return value as Record<string, unknown>;
}
function date(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}
function publication(value: unknown) {
  const input = object(value);
  if (input.version !== 1 || (input.source !== "committed" && input.source !== "dashboard")
    || !date(input.reviewedOn) || !date(input.builtOn)
    || typeof input.revision !== "string" || !HASH.test(input.revision)
    || typeof input.upcomingRevision !== "string" || !HASH.test(input.upcomingRevision)
    || !Array.isArray(input.upcoming) || input.upcoming.length > 1000
    || input.empty !== (input.upcoming.length === 0)) throw new Error("Invalid published schedule metadata for visual baseline selection.");
  const reviewedOn = input.reviewedOn;
  const seen = new Set<string>();
  const entries = input.upcoming.map((value) => {
    const row = object(value);
    if (Object.keys(row).length !== 3 || typeof row.courseId !== "string" || !COURSES.has(row.courseId)
      || !date(row.isoDate) || row.isoDate < reviewedOn
      || (row.status !== "open" && row.status !== "full")) throw new Error("Invalid upcoming schedule row for visual baseline selection.");
    const identity = `${row.courseId}|${row.isoDate}`;
    if (seen.has(identity)) throw new Error("Duplicate upcoming schedule row for visual baseline selection.");
    seen.add(identity);
    return { courseId: row.courseId, isoDate: row.isoDate, status: row.status };
  });
  if (scheduleRevision(entries) !== input.upcomingRevision) throw new Error("Published upcoming schedule revision does not match its rows.");
  return { source: input.source, upcomingRevision: input.upcomingRevision };
}

/** Only the remote mobile homepage varies with the bundled calendar publication. */
export function selectVisualCalendarBaseline(options: Options): Selection {
  const { baselinePath, localPath, viewportLabel, platform } = options;
  if (!options.remote || localPath !== "/" || viewportLabel !== "mobile") return { baselinePath };
  const status = publication(options.publication);
  if (status.source === "committed") return { baselinePath };
  const registry = object(options.registry);
  if (registry.schemaVersion !== 1 || !Array.isArray(registry.baselines)) throw new Error("Invalid reviewed visual calendar registry.");
  const matching = registry.baselines.map(object).filter((entry) => entry.source === "dashboard"
    && entry.upcomingRevision === status.upcomingRevision && entry.platform === platform);
  if (matching.length !== 1) throw new Error(`No unique reviewed ${platform} mobile homepage baseline for published upcoming revision ${status.upcomingRevision}. Review the calendar and capture a platform reference; do not increase tolerances.`);
  const entry = matching[0];
  const expectedPath = `tests/baselines/live/visual/calendar/${status.upcomingRevision}/${platform}/home-mobile.png`;
  if (entry.baselinePath !== expectedPath || typeof entry.imageSha256 !== "string" || !HASH.test(entry.imageSha256)) throw new Error("Invalid reviewed visual calendar baseline registration.");
  return { baselinePath: expectedPath, imageSha256: entry.imageSha256 };
}
