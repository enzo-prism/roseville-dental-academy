import courseScheduleData from "@/data/course-schedule.json";
import { scheduleRevision } from "@/lib/course-schedule-revision.mjs";

export type PublishedScheduleSource = "committed" | "dashboard";

export type PublishedScheduleEntry = {
  courseId: string;
  isoDate: string;
  status: "open" | "full";
};

export type PublishedCourseScheduleStatus = {
  empty: boolean;
  reviewedOn: string;
  revision: string;
  source: PublishedScheduleSource;
  upcoming: PublishedScheduleEntry[];
  upcomingRevision: string;
  version: 1;
};

function isPublishedStatus(status: string): status is PublishedScheduleEntry["status"] {
  return status === "open" || status === "full";
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
    entries: Array<{ courseId: string; isoDate: string; status: string }>;
    reviewedOn: string;
    source: string;
  } = courseScheduleData,
): PublishedCourseScheduleStatus {
  const upcoming = upcomingScheduleEntries(data.entries, data.reviewedOn);

  return {
    version: 1,
    revision: scheduleRevision(data.entries),
    upcomingRevision: scheduleRevision(upcoming),
    reviewedOn: data.reviewedOn,
    source: data.source === "dashboard" ? "dashboard" : "committed",
    upcoming,
    empty: data.entries.length === 0,
  };
}
