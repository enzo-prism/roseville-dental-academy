import courseScheduleData from "@/data/course-schedule.json";
import { scheduleRevision } from "@/lib/course-schedule-revision.mjs";

export type PublishedScheduleSource = "committed" | "dashboard";

export type PublishedScheduleEntry = {
  courseId: string;
  isoDate: string;
  status: "open" | "full";
};

export type PublishedCourseScheduleStatus = {
  builtOn: string;
  empty: boolean;
  reviewedOn: string;
  revision: string;
  source: PublishedScheduleSource;
  upcoming: PublishedScheduleEntry[];
  upcomingRevision: string;
  version: 1;
};

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/u;

function isPublishedStatus(status: string): status is PublishedScheduleEntry["status"] {
  return status === "open" || status === "full";
}

function isIsoDate(value: unknown): value is string {
  return typeof value === "string" && ISO_DATE.test(value);
}

export function resolvePublishedBuiltOn(data: {
  builtOn?: string;
  reviewedOn: string;
  source: string;
}): string {
  const stamped = isIsoDate(data.builtOn) ? data.builtOn : "";
  // Dashboard freshness is builtOn vs reviewedOn. A missing stamp must not
  // silently become reviewedOn, or the stale-feed check is a no-op.
  if (data.source === "dashboard") return stamped;
  return stamped || data.reviewedOn;
}

export function upcomingScheduleEntries(
  entries: Array<{ courseId: string; isoDate: string; status: string }>,
  reviewedOn: string,
): PublishedScheduleEntry[] {
  return entries
    .filter((entry): entry is { courseId: string; isoDate: string; status: PublishedScheduleEntry["status"] } =>
      entry.isoDate >= reviewedOn && isPublishedStatus(entry.status),
    )
    .map((entry) => ({
      courseId: entry.courseId,
      isoDate: entry.isoDate,
      status: entry.status,
    }))
    .sort((left, right) => {
      if (left.isoDate !== right.isoDate) return left.isoDate < right.isoDate ? -1 : 1;
      if (left.courseId !== right.courseId) return left.courseId < right.courseId ? -1 : 1;
      return 0;
    });
}

export function buildPublishedCourseScheduleStatus(
  data: {
    builtOn?: string;
    entries: Array<{ courseId: string; isoDate: string; status: string }>;
    reviewedOn: string;
    source: string;
  } = courseScheduleData,
): PublishedCourseScheduleStatus {
  const upcoming = upcomingScheduleEntries(data.entries, data.reviewedOn);
  const builtOn = resolvePublishedBuiltOn(data);

  return {
    version: 1,
    revision: scheduleRevision(data.entries),
    upcomingRevision: scheduleRevision(upcoming),
    reviewedOn: data.reviewedOn,
    builtOn,
    source: data.source === "dashboard" ? "dashboard" : "committed",
    upcoming,
    empty: upcoming.length === 0,
  };
}
