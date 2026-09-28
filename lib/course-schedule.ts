import courseScheduleData from "@/data/course-schedule.json";

export type CourseScheduleId =
  | "bls-cpr-1"
  | "coronal-polish"
  | "dental-assisting-program"
  | "infection-control"
  | "radiation-safety"
  | "sealants";

export type CourseScheduleStatus = "available" | "full";

export type CourseScheduleCourse = {
  id: CourseScheduleId;
  label: string;
  status?: CourseScheduleStatus;
};

export type CourseScheduleEntry = {
  courses: CourseScheduleCourse[];
  date: string;
  day: string;
  isoDate: string;
};

export type CourseScheduleMonth = {
  entries: CourseScheduleEntry[];
  month: string;
};

export const courseScheduleNote =
  "Dates are penciled in and may change; admissions will confirm current availability.";

// One reviewed cutoff for static HTML, metadata, and client hydration. It comes
// from the schedule data: the committed copy's review date, or the academy-local
// build date when production pulls from the dashboard. Do not use separate wall
// clocks in client/server modules. Elapsed dates are not evidence a class sold out.
export const COURSE_SCHEDULE_REVIEWED_ON = courseScheduleData.reviewedOn;

export const courseScheduleCourseDetails: Record<
  CourseScheduleId,
  {
    href: string;
    label: string;
    shortLabel: string;
  }
> = {
  "bls-cpr-1": {
    href: "/bls-cpr-1",
    label: "BLS / CPR",
    shortLabel: "BLS",
  },
  "coronal-polish": {
    href: "/coronal-polish",
    label: "Coronal Polish",
    shortLabel: "Coronal",
  },
  "dental-assisting-program": {
    href: "/dental-assisting-program",
    label: "Dental Assisting Training",
    shortLabel: "Dental Assisting",
  },
  "infection-control": {
    href: "/infection-control",
    label: "Infection Control",
    shortLabel: "Infection Control",
  },
  "radiation-safety": {
    href: "/radiation-safety",
    label: "X-rays / Radiation Safety",
    shortLabel: "X-rays",
  },
  sealants: {
    href: "/sealants",
    label: "Pit and Fissure Sealants",
    shortLabel: "Sealants",
  },
};

function course(id: CourseScheduleId, status?: CourseScheduleStatus): CourseScheduleCourse {
  return {
    id,
    label: courseScheduleCourseDetails[id].label,
    status,
  };
}

// Dates and open/full status live in data/course-schedule.json. Production
// builds refresh that file from the RDA dashboard's Class dates editor
// (scripts/pull-course-schedule.mjs); every other build, CI, and local run uses
// the committed copy. Course order within a date follows this list.
const courseDisplayOrder: CourseScheduleId[] = [
  "bls-cpr-1",
  "radiation-safety",
  "coronal-polish",
  "sealants",
  "infection-control",
  "dental-assisting-program",
];

type CourseScheduleDataEntry = {
  courseId: string;
  isoDate: string;
  status: string;
};

function isCourseScheduleId(value: string): value is CourseScheduleId {
  return (courseDisplayOrder as string[]).includes(value);
}

function isoDateParts(isoDate: string) {
  const [year, month, day] = isoDate.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

function formatIsoDate(isoDate: string, options: Intl.DateTimeFormatOptions) {
  return isoDateParts(isoDate).toLocaleDateString("en-US", { ...options, timeZone: "UTC" });
}

export function buildCourseScheduleMonths(
  entries: CourseScheduleDataEntry[],
  reviewedOn: string,
): CourseScheduleMonth[] {
  const byDate = new Map<string, CourseScheduleCourse[]>();

  for (const entry of entries) {
    if (!isCourseScheduleId(entry.courseId) || !/^\d{4}-\d{2}-\d{2}$/.test(entry.isoDate)) {
      continue;
    }
    const courses = byDate.get(entry.isoDate) ?? [];
    courses.push(course(entry.courseId, entry.status === "full" ? "full" : undefined));
    byDate.set(entry.isoDate, courses);
  }

  const reviewedYear = reviewedOn.slice(0, 4);
  const months = new Map<string, CourseScheduleMonth>();

  for (const isoDate of [...byDate.keys()].sort()) {
    const monthKey = isoDate.slice(0, 7);
    const monthName = formatIsoDate(isoDate, { month: "long" });
    const month = months.get(monthKey) ?? {
      month: isoDate.startsWith(reviewedYear) ? monthName : `${monthName} ${isoDate.slice(0, 4)}`,
      entries: [],
    };
    const courses = (byDate.get(isoDate) ?? []).sort(
      (a, b) => courseDisplayOrder.indexOf(a.id) - courseDisplayOrder.indexOf(b.id),
    );

    month.entries.push({
      date: formatIsoDate(isoDate, { month: "long", day: "numeric", year: "numeric" }),
      day: formatIsoDate(isoDate, { month: "long", day: "numeric" }),
      isoDate,
      courses,
    });
    months.set(monthKey, month);
  }

  return [...months.values()];
}

export const courseScheduleMonths = buildCourseScheduleMonths(
  courseScheduleData.entries,
  COURSE_SCHEDULE_REVIEWED_ON,
);

export const courseScheduleEntries = courseScheduleMonths.flatMap((month) =>
  month.entries.map((entry) => ({
    ...entry,
    month: month.month,
  })),
);

export function getCourseSchedule(courseId: CourseScheduleId) {
  return courseScheduleEntries
    .filter((entry) => entry.courses.some((item) => item.id === courseId))
    .map((entry) => {
      const course = entry.courses.find((item) => item.id === courseId);

      return {
        ...entry,
        course,
        status: course?.status ?? "available",
      };
    });
}

export const SATURDAY_ACADEMY_START_DATE = "September 12, 2026";

export function formatCourseDateLabel(courseId: CourseScheduleId, date: string) {
  if (courseId === "dental-assisting-program" && date === SATURDAY_ACADEMY_START_DATE) {
    return `${date} (Saturday Academy)`;
  }

  return date;
}

export function getUpcomingCourseSchedule(
  courseId: CourseScheduleId,
  asOf = COURSE_SCHEDULE_REVIEWED_ON,
) {
  return getCourseSchedule(courseId).filter((entry) => entry.isoDate >= asOf);
}

export function getUpcomingScheduleMonths(asOf = COURSE_SCHEDULE_REVIEWED_ON) {
  return courseScheduleMonths
    .map((month) => ({ ...month, entries: month.entries.filter((entry) => entry.isoDate >= asOf) }))
    .filter((month) => month.entries.length > 0);
}

export function getAvailableCourseDates(courseId: CourseScheduleId, asOf = COURSE_SCHEDULE_REVIEWED_ON) {
  return getUpcomingCourseSchedule(courseId, asOf)
    .filter((entry) => entry.status !== "full")
    .map((entry) => formatCourseDateLabel(courseId, entry.date));
}

export function getAvailableCourseDateList(courseId: CourseScheduleId) {
  return getAvailableCourseDates(courseId).join("; ") || "Ask admissions for current availability";
}

export function getNextCourseDateSentence(courseId: CourseScheduleId) {
  const date = getNextAvailableCourseDate(courseId);
  return date ? `Next available date: ${date}.` : "Ask admissions for upcoming dates.";
}

export function getNextAvailableCourseDate(courseId: CourseScheduleId, asOf = COURSE_SCHEDULE_REVIEWED_ON) {
  const date = getUpcomingCourseSchedule(courseId, asOf).find((entry) => entry.status !== "full")?.date;

  return date ? formatCourseDateLabel(courseId, date) : undefined;
}

export function getCourseScheduleDateList(courseId: CourseScheduleId) {
  return getUpcomingCourseSchedule(courseId)
    .map((entry) => {
      const labeledDate = formatCourseDateLabel(courseId, entry.date);

      return entry.status === "full" ? `${labeledDate} (Full)` : labeledDate;
    })
    .join("; ");
}
