import assert from "node:assert/strict";

import { expect, type APIRequestContext, type Page } from "@playwright/test";

import { adLandingPages } from "../../lib/ad-landing-pages";
import {
  SATURDAY_ACADEMY_START_DATE,
  courseScheduleCourseDetails,
  type CourseScheduleId,
} from "../../lib/course-schedule";
import { scheduleRevision } from "../../lib/course-schedule-revision.mjs";
import liveCourseScheduleData from "../../data/course-schedule.json";
import contractScheduleData from "../fixtures/course-schedule.contract.json";
import {
  buildPublishedCourseScheduleStatus,
  type PublishedCourseScheduleStatus,
} from "../../lib/published-course-schedule";
import { signupInterestOptions } from "../../lib/site-data";
import { getSeasonalLocalDate } from "../../lib/site-seasonal";

export const COURSE_SCHEDULE_IDS = Object.keys(courseScheduleCourseDetails) as CourseScheduleId[];

export const COURSE_DATE_PATHS = [
  "/bls-cpr-1",
  "/infection-control",
  "/radiation-safety",
  "/coronal-polish",
  "/sealants",
  "/dental-assisting-program",
  "/faqs-1",
  "/contact",
  ...adLandingPages.map((page) => page.path),
] as const;

export const COURSE_DATE_MUTANTS = [
  "empty-schedule",
  "stale-cutoff",
  "future-cutoff-empty",
  "wrong-future-date",
  "swapped-ld-dates",
  "dropped-row",
  "duplicated-row",
  "full-in-ld",
  "past-coronal-polish-ld",
  "pretty-printed-ld",
  "faq-full-date",
  "llms-extra-full",
  "lp-full-date",
  "request-choice-wrong",
  "faq-fullA-under-B",
  "llms-fullA-under-B",
  "faq-cross-swap",
  "stale-rollback",
  "builtOn-missing",
  "builtOn-tomorrow",
  "llms-unlabelled-past",
  "faq-abbrev-past",
  "faq-noyear-past",
  "llms-abbrev-past",
  "llms-noyear-past",
  "faq-drop-one",
  "llms-drop-one",
  "faq-unlisted-policy-date",
  "faq-dot-year-past",
  "llms-dot-year-past",
  "faq-dot-noyear-past",
  "llms-dot-noyear-past",
  "faq-numeric-past",
  "llms-numeric-past",
] as const;

export type CourseDateMutant = (typeof COURSE_DATE_MUTANTS)[number];

export type HomeScheduleRow = {
  courses: Array<{ full: boolean; id: CourseScheduleId; label: string }>;
  isoDate: string;
};

export type CoursePageSnapshot = {
  dates: Array<{ full: boolean; isoDate: string; label: string }>;
  ldScripts: string[];
  nextAvailable: string | undefined;
  nextClass: string;
};

export type InterestOptionSnapshot = {
  label: string;
  nextOpen: string;
};

export type ServedScheduleSnapshot = {
  courses: Record<CourseScheduleId, CoursePageSnapshot>;
  faqText: string;
  homeEmptyCopy: string;
  homeRows: HomeScheduleRow[];
  interestOptions: InterestOptionSnapshot[];
  landerDates: Record<string, string[]>;
  llmsText: string;
  pageLdScripts: Record<string, string[]>;
  previewUrl: boolean;
  status: PublishedCourseScheduleStatus;
  todayLA: string;
};

const ACADEMY_TIME_ZONE = "America/Los_Angeles";
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/u;
const REVISION = /^[0-9a-f]{64}$/u;
const MONTH_LONG =
  "January|February|March|April|May|June|July|August|September|October|November|December";
const MONTH_SHORT = "Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec";
const MONTH_DAY_YEAR = new RegExp(`(?:${MONTH_LONG}) \\d{1,2}, \\d{4}`, "gu");
// Long names first so "December 5, 2026" is one match, not a yearless "December 5".
// Short months accept an optional period ("Oct. 12"). Numeric US dates are MM/DD/YYYY.
const COPY_DATE = new RegExp(
  `\\b(?:(?:${MONTH_LONG}) \\d{1,2}(?:, \\d{4})?|(?:${MONTH_SHORT})\\.? \\d{1,2}(?:, \\d{4})?|\\d{1,2}/\\d{1,2}/\\d{4})\\b`,
  "giu",
);
const YEARLESS_COPY_DATE = /^(?:(?:January|February|March|April|May|June|July|August|September|October|November|December)|(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)\.?) \d{1,2}$/iu;
const MONTH_INDEX: Record<string, number> = {
  january: 0,
  jan: 0,
  february: 1,
  feb: 1,
  march: 2,
  mar: 2,
  april: 3,
  apr: 3,
  may: 4,
  june: 5,
  jun: 5,
  july: 6,
  jul: 6,
  august: 7,
  aug: 7,
  september: 8,
  sep: 8,
  sept: 8,
  october: 9,
  oct: 9,
  november: 10,
  nov: 10,
  december: 11,
  dec: 11,
};
const WRONG_FUTURE_DATE = "2027-06-15";
const PAST_CORONAL_DATE = "2026-09-12";
const ABBREV_PAST_DATE = "Oct 12, 2026";
const NOYEAR_PAST_DATE = "October 12";
const DOT_YEAR_PAST_DATE = "Oct. 12, 2026";
const DOT_NOYEAR_PAST_DATE = "Oct. 12";
const NUMERIC_PAST_DATE = "10/12/2026";
export const CONTRACT_SCHEDULE = contractScheduleData;
export const LIVE_COURSE_SCHEDULE = liveCourseScheduleData;
const EMPTY_HOME_COPY = "Ask admissions for upcoming dates.";
const EMPTY_COURSE_COPY = "Ask admissions";
// Exact legal/policy strings only. Class dates do not belong here.
export const POLICY_DATE_ALLOWLIST = ["January 1, 2025"] as const;
const POLICY_DATES = new Set<string>(POLICY_DATE_ALLOWLIST);
const UNLISTED_POLICY_DATE = "January 2, 2025";
export const STALE_DASHBOARD_WARN_DAYS = 1;
export const STALE_DASHBOARD_FAIL_DAYS = 7;
export const CONTRACT_TODAY_LA = "2026-10-22";
export const SEVEN_DAY_STALE_OFFSET = 7;
export const EIGHT_DAY_STALE_OFFSET = 8;
const LANDER_COURSES = {
  coronal_polish: ["coronal-polish"],
  dental_assisting_program: ["dental-assisting-program"],
  infection_control: ["infection-control"],
  pit_fissure_sealants: ["sealants"],
  rda_certification_courses: ["coronal-polish", "sealants"],
} as const satisfies Record<string, readonly CourseScheduleId[]>;

export function academyDate(now = new Date()) {
  return getSeasonalLocalDate(now, ACADEMY_TIME_ZONE);
}

export function contractAcademyDate(now = new Date()) {
  const fakeNow = process.env.COURSE_DATES_FAKE_NOW?.trim();
  const instant = fakeNow ? new Date(fakeNow) : now;
  if (fakeNow && Number.isNaN(instant.getTime())) {
    throw new Error(`COURSE_DATES_FAKE_NOW is not a valid date: ${fakeNow}`);
  }
  return getSeasonalLocalDate(instant, ACADEMY_TIME_ZONE);
}

export function parseCopyDate(raw: string, fallbackYear: string) {
  const numeric = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/u);
  if (numeric) {
    const isoDate = new Date(Date.UTC(Number(numeric[3]), Number(numeric[1]) - 1, Number(numeric[2])))
      .toISOString()
      .slice(0, 10);
    assert.match(isoDate, ISO_DATE);
    return isoDate;
  }
  const match = raw.match(new RegExp(`^(${MONTH_LONG}|${MONTH_SHORT})\\.? (\\d{1,2})(?:, (\\d{4}))?$`, "iu"));
  assert.ok(match, `unrecognized copy date ${raw}`);
  const month = MONTH_INDEX[match[1].toLowerCase().replace(/\.$/u, "")];
  assert.ok(month !== undefined, `unrecognized month in copy date ${raw}`);
  const year = Number(match[3] ?? fallbackYear);
  const day = Number(match[2]);
  const isoDate = new Date(Date.UTC(year, month, day)).toISOString().slice(0, 10);
  assert.match(isoDate, ISO_DATE);
  return isoDate;
}

function isYearlessCopyDate(raw: string) {
  return YEARLESS_COPY_DATE.test(raw);
}

function isAllowlistedCopyDate(raw: string, reviewedOn: string) {
  if (POLICY_DATES.has(raw)) return true;
  const isoDate = parseCopyDate(raw, reviewedOn.slice(0, 4));
  return POLICY_DATE_ALLOWLIST.some((allowed) => parseCopyDate(allowed, reviewedOn.slice(0, 4)) === isoDate);
}

function copyDateListSpans(text: string) {
  const spans: Array<{ end: number; start: number }> = [];
  for (const id of COURSE_SCHEDULE_IDS) {
    const label = courseScheduleCourseDetails[id].label;
    const escaped = label.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
    for (const match of text.matchAll(new RegExp(`${escaped}: ([^.]+)`, "gu"))) {
      if (match.index === undefined) continue;
      spans.push({ start: match.index, end: match.index + match[0].length });
    }
    for (const fragment of llmsCourseDateFragments(text, id)) {
      const start = text.indexOf(fragment);
      if (start >= 0) spans.push({ start, end: start + fragment.length });
    }
  }
  return spans;
}

function inCopyDateList(index: number, spans: Array<{ end: number; start: number }>) {
  return spans.some((span) => index >= span.start && index < span.end);
}

export function shiftIsoDate(isoDate: string, days: number) {
  const [year, month, day] = isoDate.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day + days)).toISOString().slice(0, 10);
}

export function formatScheduleDate(isoDate: string) {
  const [year, month, day] = isoDate.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day)).toLocaleDateString("en-US", {
    day: "numeric",
    month: "long",
    timeZone: "UTC",
    year: "numeric",
  });
}

export function formatOpenDateLabel(courseId: CourseScheduleId, isoDate: string) {
  const label = formatScheduleDate(isoDate);
  return courseId === "dental-assisting-program" && label === SATURDAY_ACADEMY_START_DATE
    ? `${label} (Saturday Academy)`
    : label;
}

export function courseInstanceStartDates(scriptText: string): string[] {
  return walkHasCourseInstance(JSON.parse(scriptText));
}

function walkHasCourseInstance(value: unknown): string[] {
  if (Array.isArray(value)) return value.flatMap((entry) => walkHasCourseInstance(entry));
  if (!value || typeof value !== "object") return [];

  const record = value as Record<string, unknown>;
  const dates: string[] = [];
  if (Array.isArray(record.hasCourseInstance)) {
    for (const instance of record.hasCourseInstance) {
      if (instance && typeof instance === "object" && "startDate" in instance) {
        const startDate = (instance as { startDate?: unknown }).startDate;
        if (typeof startDate === "string") dates.push(startDate);
      }
    }
  }
  for (const [key, child] of Object.entries(record)) {
    if (key === "hasCourseInstance") continue;
    dates.push(...walkHasCourseInstance(child));
  }
  return dates;
}

function labelToCourseId(label: string): CourseScheduleId | undefined {
  return COURSE_SCHEDULE_IDS.find((id) => courseScheduleCourseDetails[id].label === label);
}

function openEntries(status: PublishedCourseScheduleStatus) {
  return status.upcoming.filter((entry) => entry.status !== "full");
}

function entriesForCourse(status: PublishedCourseScheduleStatus, courseId: CourseScheduleId) {
  return status.upcoming.filter((entry) => entry.courseId === courseId);
}

function openLabelsForCourse(status: PublishedCourseScheduleStatus, courseId: CourseScheduleId) {
  return openEntries(status)
    .filter((entry) => entry.courseId === courseId)
    .map((entry) => formatOpenDateLabel(courseId, entry.isoDate));
}

function firstOpenLabel(status: PublishedCourseScheduleStatus, courseId: CourseScheduleId) {
  return openLabelsForCourse(status, courseId)[0];
}

function landerCourseIds(category: string): readonly CourseScheduleId[] {
  const ids = LANDER_COURSES[category as keyof typeof LANDER_COURSES];
  assert.ok(ids, `unknown landing-page category ${category}`);
  return ids;
}

function expectedLanderDates(status: PublishedCourseScheduleStatus, category: string) {
  const lists = landerCourseIds(category).map((id) => openLabelsForCourse(status, id));
  return lists.reduce((shared, dates) => shared.filter((date) => dates.includes(date)));
}

function courseLdScript(courseId: CourseScheduleId, startDates: string[]) {
  return JSON.stringify({
    "@type": "Course",
    hasCourseInstance: startDates.map((startDate) => ({ "@type": "CourseInstance", startDate })),
  });
}

function firstFullEntry(status: PublishedCourseScheduleStatus) {
  const full = status.upcoming.find((entry) => entry.status === "full");
  assert.ok(full, "mutant needs a Full upcoming class");
  return full;
}

function courseListFragments(text: string, label: string) {
  const escaped = label.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
  return [...text.matchAll(new RegExp(`${escaped}: ([^.]+)`, "gu"))].map((match) => match[1]);
}

function llmsCourseDateFragments(text: string, courseId: CourseScheduleId) {
  const escapedHref = courseScheduleCourseDetails[courseId].href.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
  const bullet = text.match(new RegExp(`\\[[^\\]]+\\]\\([^\\n)]*${escapedHref}\\)[^\\n]*`, "u"));
  if (!bullet) return [];
  return [
    ...courseListFragments(bullet[0], "Upcoming dates"),
    ...courseListFragments(bullet[0], "upcoming dates"),
    ...courseListFragments(bullet[0], "Upcoming starts"),
  ];
}

function dateListFragments(text: string, label: string, courseId: CourseScheduleId) {
  return [...courseListFragments(text, label), ...llmsCourseDateFragments(text, courseId)];
}

function listedDateLabels(fragment: string) {
  return [...fragment.matchAll(MONTH_DAY_YEAR)].map((match) => match[0]);
}

function expectedOpenDateLabels(status: PublishedCourseScheduleStatus, courseId: CourseScheduleId) {
  return openLabelsForCourse(status, courseId).flatMap((label) => listedDateLabels(label));
}

function replaceCourseDateList(text: string, label: string, nextDates: string) {
  const escaped = label.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
  return text.replace(new RegExp(`${escaped}: [^.]+`, "u"), `${label}: ${nextDates}`);
}

function appendToCourseDateList(text: string, label: string, extra: string) {
  const escaped = label.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
  return text.replace(new RegExp(`(${escaped}: [^.]+)`, "u"), `$1; ${extra}`);
}

function fullDateMissingFromOtherCourse(status: PublishedCourseScheduleStatus) {
  for (const full of status.upcoming.filter((entry) => entry.status === "full")) {
    const fullId = full.courseId as CourseScheduleId;
    const fullLabel = formatOpenDateLabel(fullId, full.isoDate);
    const extra = listedDateLabels(fullLabel);
    const other = COURSE_SCHEDULE_IDS.find((id) => {
      if (id === fullId) return false;
      const open = expectedOpenDateLabels(status, id);
      return extra.some((label) => !open.includes(label));
    });
    if (other) {
      const extraLabel = extra.find((label) => !expectedOpenDateLabels(status, other).includes(label));
      assert.ok(extraLabel, "mutant needs a Full date label missing from the other course");
      return { extra: extraLabel, other };
    }
  }
  assert.ok(false, "mutant needs a Full date that another course does not list");
}

function twoCoursesWithDifferentOpenDates(status: PublishedCourseScheduleStatus) {
  for (const left of COURSE_SCHEDULE_IDS) {
    for (const right of COURSE_SCHEDULE_IDS) {
      if (left === right) continue;
      const leftLabels = expectedOpenDateLabels(status, left);
      const rightLabels = expectedOpenDateLabels(status, right);
      if (leftLabels.length > 0 && rightLabels.join("\0") !== leftLabels.join("\0")) {
        return { left, leftLabels, right, rightLabels };
      }
    }
  }
  assert.ok(false, "mutant needs two courses with different open dates");
}

function courseWithMultipleOpenDates(status: PublishedCourseScheduleStatus) {
  for (const id of COURSE_SCHEDULE_IDS) {
    const labels = expectedOpenDateLabels(status, id);
    if (labels.length > 1) return { id, labels };
  }
  assert.ok(false, "mutant needs a course with two open dates");
}

function renderedIsoDates(snapshot: ServedScheduleSnapshot) {
  const dates = [
    ...snapshot.homeRows.map((row) => row.isoDate),
    ...COURSE_SCHEDULE_IDS.flatMap((id) => snapshot.courses[id].dates.map((entry) => entry.isoDate)),
  ];
  for (const labels of Object.values(snapshot.landerDates)) {
    for (const label of labels) {
      dates.push(
        ...listedDateLabels(label).map((value) => new Date(`${value} UTC`).toISOString().slice(0, 10)),
      );
    }
  }
  return dates.filter((date) => ISO_DATE.test(date));
}

export function dashboardScheduleWarnings(snapshot: ServedScheduleSnapshot) {
  if (snapshot.status.source !== "dashboard" || !ISO_DATE.test(snapshot.status.builtOn)) return [];
  if (snapshot.status.builtOn < shiftIsoDate(snapshot.todayLA, -STALE_DASHBOARD_WARN_DAYS)) {
    return [
      `dashboard builtOn ${snapshot.status.builtOn} is more than a day older than ${snapshot.todayLA}`,
    ];
  }
  return [];
}

function synthesizeCourse(status: PublishedCourseScheduleStatus, courseId: CourseScheduleId): CoursePageSnapshot {
  const dates = entriesForCourse(status, courseId).map((entry) => ({
    full: entry.status === "full",
    isoDate: entry.isoDate,
    label: formatOpenDateLabel(courseId, entry.isoDate),
  }));
  const open = dates.filter((entry) => !entry.full);
  return {
    dates,
    ldScripts: [courseLdScript(courseId, open.map((entry) => entry.isoDate))],
    nextAvailable: open[0]?.label,
    nextClass: open[0]?.label ?? EMPTY_COURSE_COPY,
  };
}

function synthesizeHomeRows(status: PublishedCourseScheduleStatus): HomeScheduleRow[] {
  const byDate = new Map<string, HomeScheduleRow["courses"]>();
  for (const entry of status.upcoming) {
    const id = entry.courseId as CourseScheduleId;
    if (!COURSE_SCHEDULE_IDS.includes(id)) continue;
    const courses = byDate.get(entry.isoDate) ?? [];
    courses.push({
      full: entry.status === "full",
      id,
      label: courseScheduleCourseDetails[id].label,
    });
    byDate.set(entry.isoDate, courses);
  }
  return [...byDate.entries()]
    .sort(([left], [right]) => (left < right ? -1 : 1))
    .map(([isoDate, courses]) => ({ isoDate, courses }));
}

function synthesizeDiscoveryText(status: PublishedCourseScheduleStatus) {
  return COURSE_SCHEDULE_IDS.map((id) => {
    const dates = openLabelsForCourse(status, id);
    return `${courseScheduleCourseDetails[id].label}: ${dates.join("; ") || "Ask admissions for current availability"}.`;
  }).join(" ");
}

function synthesizeInterestOptions(status: PublishedCourseScheduleStatus): InterestOptionSnapshot[] {
  return signupInterestOptions.map((option) => {
    if (!option.scheduleId) {
      return {
        label: option.label,
        nextOpen: option.availabilityLabel ?? "Ask admissions for current availability",
      };
    }
    const next = firstOpenLabel(status, option.scheduleId);
    return {
      label: option.label,
      nextOpen: next ? `Next open date: ${next}` : "Ask admissions for current availability",
    };
  });
}

function synthesizeLanderDates(status: PublishedCourseScheduleStatus) {
  return Object.fromEntries(
    adLandingPages.map((page) => [page.path, expectedLanderDates(status, page.contentCategory)]),
  );
}

export function snapshotFromPublishedStatus(
  status: PublishedCourseScheduleStatus,
  options: { previewUrl: boolean; todayLA: string },
): ServedScheduleSnapshot {
  const courses = Object.fromEntries(
    COURSE_SCHEDULE_IDS.map((id) => [id, synthesizeCourse(status, id)]),
  ) as Record<CourseScheduleId, CoursePageSnapshot>;
  const discovery = synthesizeDiscoveryText(status);
  const pageLdScripts = Object.fromEntries(
    COURSE_DATE_PATHS.map((path) => {
      const courseId = COURSE_SCHEDULE_IDS.find((id) => courseScheduleCourseDetails[id].href === path);
      return [path, courseId ? courses[courseId].ldScripts : ["{}"]];
    }),
  );

  return {
    courses,
    faqText: discovery,
    homeEmptyCopy: status.empty ? EMPTY_HOME_COPY : "",
    homeRows: synthesizeHomeRows(status),
    interestOptions: synthesizeInterestOptions(status),
    landerDates: synthesizeLanderDates(status),
    llmsText: discovery,
    pageLdScripts,
    previewUrl: options.previewUrl,
    status,
    todayLA: options.todayLA,
  };
}

export function committedScheduleSnapshot(todayLA = CONTRACT_TODAY_LA): ServedScheduleSnapshot {
  return snapshotFromPublishedStatus(buildPublishedCourseScheduleStatus(contractScheduleData), {
    previewUrl: false,
    todayLA,
  });
}

export function dashboardScheduleSnapshot(todayLA = CONTRACT_TODAY_LA): ServedScheduleSnapshot {
  return snapshotFromPublishedStatus(
    buildPublishedCourseScheduleStatus({
      ...contractScheduleData,
      builtOn: todayLA,
      reviewedOn: todayLA,
      source: "dashboard",
    }),
    { previewUrl: true, todayLA },
  );
}

export function eightDayStaleDashboardSnapshot(todayLA = CONTRACT_TODAY_LA): ServedScheduleSnapshot {
  return snapshotFromPublishedStatus(
    buildPublishedCourseScheduleStatus({
      ...contractScheduleData,
      builtOn: shiftIsoDate(todayLA, -EIGHT_DAY_STALE_OFFSET),
      reviewedOn: contractScheduleData.reviewedOn,
      source: "dashboard",
    }),
    { previewUrl: true, todayLA },
  );
}

export function sevenDayStaleDashboardSnapshot(todayLA = CONTRACT_TODAY_LA): ServedScheduleSnapshot {
  return snapshotFromPublishedStatus(
    buildPublishedCourseScheduleStatus({
      ...contractScheduleData,
      builtOn: shiftIsoDate(todayLA, -SEVEN_DAY_STALE_OFFSET),
      reviewedOn: contractScheduleData.reviewedOn,
      source: "dashboard",
    }),
    { previewUrl: true, todayLA },
  );
}

export function elapsedDashboardScheduleSnapshot(todayLA = CONTRACT_TODAY_LA): ServedScheduleSnapshot {
  const lastDate = contractScheduleData.entries.reduce(
    (latest, entry) => (entry.isoDate > latest ? entry.isoDate : latest),
    "0000-01-01",
  );
  const reviewedOn = lastDate > todayLA ? shiftIsoDate(lastDate, 1) : todayLA;
  return snapshotFromPublishedStatus(
    buildPublishedCourseScheduleStatus({
      ...contractScheduleData,
      builtOn: reviewedOn,
      reviewedOn,
      source: "dashboard",
    }),
    { previewUrl: true, todayLA: reviewedOn },
  );
}

export function rolledBackDashboardSnapshot(todayLA = CONTRACT_TODAY_LA): ServedScheduleSnapshot {
  const builtOn = shiftIsoDate(todayLA, -5);
  return snapshotFromPublishedStatus(
    buildPublishedCourseScheduleStatus({
      ...contractScheduleData,
      builtOn,
      reviewedOn: builtOn,
      source: "dashboard",
    }),
    { previewUrl: true, todayLA },
  );
}

function cloneSnapshot(snapshot: ServedScheduleSnapshot): ServedScheduleSnapshot {
  return structuredClone(snapshot);
}

export function applyCourseDateMutant(
  snapshot: ServedScheduleSnapshot,
  mutant: CourseDateMutant,
): ServedScheduleSnapshot {
  const next = cloneSnapshot(snapshot);
  switch (mutant) {
    case "empty-schedule": {
      next.status = { ...next.status, upcoming: [], upcomingRevision: scheduleRevision([]), empty: true };
      next.homeEmptyCopy = "Upcoming Class Schedule";
      next.homeRows = [
        {
          isoDate: WRONG_FUTURE_DATE,
          courses: [{ full: false, id: "bls-cpr-1", label: courseScheduleCourseDetails["bls-cpr-1"].label }],
        },
      ];
      return next;
    }
    case "stale-cutoff": {
      next.previewUrl = true;
      next.status = {
        ...next.status,
        source: "dashboard",
        builtOn: next.todayLA,
        reviewedOn: shiftIsoDate(next.todayLA, -2),
      };
      return next;
    }
    case "future-cutoff-empty": {
      next.status = {
        ...next.status,
        reviewedOn: shiftIsoDate(next.todayLA, 1),
        upcoming: [],
        upcomingRevision: scheduleRevision([]),
        empty: true,
      };
      next.homeRows = [];
      next.homeEmptyCopy = EMPTY_HOME_COPY;
      for (const id of COURSE_SCHEDULE_IDS) {
        next.courses[id] = {
          dates: [],
          ldScripts: [courseLdScript(id, [])],
          nextAvailable: undefined,
          nextClass: EMPTY_COURSE_COPY,
        };
      }
      return next;
    }
    case "wrong-future-date": {
      next.homeRows.push({
        isoDate: WRONG_FUTURE_DATE,
        courses: [{ full: false, id: "bls-cpr-1", label: courseScheduleCourseDetails["bls-cpr-1"].label }],
      });
      next.courses["bls-cpr-1"].dates.push({
        full: false,
        isoDate: WRONG_FUTURE_DATE,
        label: formatOpenDateLabel("bls-cpr-1", WRONG_FUTURE_DATE),
      });
      next.courses["bls-cpr-1"].ldScripts = [
        courseLdScript("bls-cpr-1", [
          ...courseInstanceStartDates(next.courses["bls-cpr-1"].ldScripts[0] ?? "{}"),
          WRONG_FUTURE_DATE,
        ]),
      ];
      next.pageLdScripts["/bls-cpr-1"] = next.courses["bls-cpr-1"].ldScripts;
      return next;
    }
    case "swapped-ld-dates": {
      const left = COURSE_SCHEDULE_IDS.find((id, index) =>
        COURSE_SCHEDULE_IDS.slice(index + 1).some(
          (other) =>
            JSON.stringify(courseInstanceStartDates(next.courses[id].ldScripts[0] ?? "{}")) !==
            JSON.stringify(courseInstanceStartDates(next.courses[other].ldScripts[0] ?? "{}")),
        ),
      );
      const right = left
        ? COURSE_SCHEDULE_IDS.find(
            (other) =>
              other !== left &&
              JSON.stringify(courseInstanceStartDates(next.courses[left].ldScripts[0] ?? "{}")) !==
                JSON.stringify(courseInstanceStartDates(next.courses[other].ldScripts[0] ?? "{}")),
          )
        : undefined;
      assert.ok(left && right, "swapped-ld-dates needs two courses with different LD dates");
      const leftDates = courseInstanceStartDates(next.courses[left].ldScripts[0] ?? "{}");
      const rightDates = courseInstanceStartDates(next.courses[right].ldScripts[0] ?? "{}");
      next.courses[left].ldScripts = [courseLdScript(left, rightDates)];
      next.courses[right].ldScripts = [courseLdScript(right, leftDates)];
      next.pageLdScripts[courseScheduleCourseDetails[left].href] = next.courses[left].ldScripts;
      next.pageLdScripts[courseScheduleCourseDetails[right].href] = next.courses[right].ldScripts;
      return next;
    }
    case "dropped-row": {
      assert.ok(next.homeRows.length > 0, "dropped-row needs a homepage row");
      next.homeRows = next.homeRows.slice(1);
      return next;
    }
    case "duplicated-row": {
      assert.ok(next.homeRows.length > 0, "duplicated-row needs a homepage row");
      next.homeRows = [next.homeRows[0], ...next.homeRows];
      return next;
    }
    case "full-in-ld": {
      const full = firstFullEntry(next.status);
      const courseId = full.courseId as CourseScheduleId;
      const startDates = [...courseInstanceStartDates(next.courses[courseId].ldScripts[0] ?? "{}"), full.isoDate];
      next.courses[courseId].ldScripts = [courseLdScript(courseId, startDates)];
      next.pageLdScripts[courseScheduleCourseDetails[courseId].href] = next.courses[courseId].ldScripts;
      return next;
    }
    case "past-coronal-polish-ld": {
      const startDates = [
        PAST_CORONAL_DATE,
        ...courseInstanceStartDates(next.courses["coronal-polish"].ldScripts[0] ?? "{}"),
      ];
      next.courses["coronal-polish"].ldScripts = [courseLdScript("coronal-polish", startDates)];
      next.pageLdScripts["/coronal-polish"] = next.courses["coronal-polish"].ldScripts;
      return next;
    }
    case "pretty-printed-ld": {
      const startDates = [
        PAST_CORONAL_DATE,
        ...courseInstanceStartDates(next.courses["coronal-polish"].ldScripts[0] ?? "{}"),
      ];
      next.courses["coronal-polish"].ldScripts = [
        JSON.stringify(
          {
            "@type": "Course",
            hasCourseInstance: startDates.map((startDate) => ({
              "@type": "CourseInstance",
              startDate,
            })),
          },
          null,
          2,
        ),
      ];
      next.pageLdScripts["/coronal-polish"] = next.courses["coronal-polish"].ldScripts;
      return next;
    }
    case "faq-full-date": {
      const full = firstFullEntry(next.status);
      const id = full.courseId as CourseScheduleId;
      next.faqText += ` ${courseScheduleCourseDetails[id].label}: ${formatOpenDateLabel(id, full.isoDate)}.`;
      return next;
    }
    case "llms-extra-full": {
      const full = firstFullEntry(next.status);
      const id = full.courseId as CourseScheduleId;
      next.llmsText += ` ${courseScheduleCourseDetails[id].label}: ${formatOpenDateLabel(id, full.isoDate)}.`;
      return next;
    }
    case "lp-full-date": {
      const full = firstFullEntry(next.status);
      const id = full.courseId as CourseScheduleId;
      const page = adLandingPages.find((lander) => landerCourseIds(lander.contentCategory).includes(id));
      assert.ok(page, "lp-full-date needs a lander for a Full class");
      next.landerDates[page.path] = [
        ...(next.landerDates[page.path] ?? []),
        formatOpenDateLabel(id, full.isoDate),
      ];
      return next;
    }
    case "request-choice-wrong": {
      const option = next.interestOptions.find((item) => item.nextOpen.startsWith("Next open date:"));
      assert.ok(option, "request-choice-wrong needs a scheduled interest option");
      option.nextOpen = "Next open date: January 1, 2026";
      return next;
    }
    case "faq-fullA-under-B": {
      const { extra, other } = fullDateMissingFromOtherCourse(next.status);
      next.faqText = appendToCourseDateList(next.faqText, courseScheduleCourseDetails[other].label, extra);
      return next;
    }
    case "llms-fullA-under-B": {
      const { extra, other } = fullDateMissingFromOtherCourse(next.status);
      next.llmsText = appendToCourseDateList(next.llmsText, courseScheduleCourseDetails[other].label, extra);
      return next;
    }
    case "faq-cross-swap": {
      const pair = twoCoursesWithDifferentOpenDates(next.status);
      next.faqText = replaceCourseDateList(
        next.faqText,
        courseScheduleCourseDetails[pair.left].label,
        pair.rightLabels.join("; "),
      );
      // Keep the original dates elsewhere so a global includes() still passes.
      next.faqText += ` Also scheduled ${pair.leftLabels.join("; ")}.`;
      return next;
    }
    case "stale-rollback": {
      return eightDayStaleDashboardSnapshot(next.todayLA);
    }
    case "faq-abbrev-past": {
      next.faqText += ` Also ${ABBREV_PAST_DATE}.`;
      return next;
    }
    case "faq-noyear-past": {
      const { id } = courseWithMultipleOpenDates(next.status);
      next.faqText = appendToCourseDateList(next.faqText, courseScheduleCourseDetails[id].label, NOYEAR_PAST_DATE);
      return next;
    }
    case "llms-abbrev-past": {
      next.llmsText += ` Also ${ABBREV_PAST_DATE}.`;
      return next;
    }
    case "llms-noyear-past": {
      const { id } = courseWithMultipleOpenDates(next.status);
      next.llmsText = appendToCourseDateList(next.llmsText, courseScheduleCourseDetails[id].label, NOYEAR_PAST_DATE);
      return next;
    }
    case "faq-drop-one": {
      const { id, labels } = courseWithMultipleOpenDates(next.status);
      next.faqText = replaceCourseDateList(
        next.faqText,
        courseScheduleCourseDetails[id].label,
        labels.slice(0, -1).join("; "),
      );
      return next;
    }
    case "llms-drop-one": {
      const { id, labels } = courseWithMultipleOpenDates(next.status);
      next.llmsText = replaceCourseDateList(
        next.llmsText,
        courseScheduleCourseDetails[id].label,
        labels.slice(0, -1).join("; "),
      );
      return next;
    }
    case "faq-dot-year-past": {
      next.faqText += ` Also ${DOT_YEAR_PAST_DATE}.`;
      return next;
    }
    case "llms-dot-year-past": {
      next.llmsText += ` Also ${DOT_YEAR_PAST_DATE}.`;
      return next;
    }
    case "faq-dot-noyear-past": {
      const { id } = courseWithMultipleOpenDates(next.status);
      next.faqText = appendToCourseDateList(
        next.faqText,
        courseScheduleCourseDetails[id].label,
        DOT_NOYEAR_PAST_DATE,
      );
      return next;
    }
    case "llms-dot-noyear-past": {
      const { id } = courseWithMultipleOpenDates(next.status);
      next.llmsText = appendToCourseDateList(
        next.llmsText,
        courseScheduleCourseDetails[id].label,
        DOT_NOYEAR_PAST_DATE,
      );
      return next;
    }
    case "faq-numeric-past": {
      next.faqText += ` Also ${NUMERIC_PAST_DATE}.`;
      return next;
    }
    case "llms-numeric-past": {
      next.llmsText += ` Also ${NUMERIC_PAST_DATE}.`;
      return next;
    }
    case "faq-unlisted-policy-date": {
      next.faqText += ` ${UNLISTED_POLICY_DATE}.`;
      return next;
    }
    case "builtOn-missing": {
      next.previewUrl = true;
      next.status = { ...next.status, source: "dashboard", builtOn: "" };
      return next;
    }
    case "builtOn-tomorrow": {
      next.status = { ...next.status, builtOn: shiftIsoDate(next.todayLA, 1) };
      return next;
    }
    case "llms-unlabelled-past": {
      next.llmsText += ` Coronal Polish also: ${formatOpenDateLabel("coronal-polish", PAST_CORONAL_DATE)}.`;
      return next;
    }
    default: {
      const exhaustive: never = mutant;
      throw new Error(`Unhandled course-date mutant: ${exhaustive}`);
    }
  }
}

export function assertServedScheduleContract(snapshot: ServedScheduleSnapshot) {
  const { status, todayLA } = snapshot;
  assert.match(status.reviewedOn, ISO_DATE);
  assert.match(status.builtOn, ISO_DATE);
  assert.match(status.revision, REVISION);
  assert.match(status.upcomingRevision, REVISION);
  assert.equal(status.upcomingRevision, scheduleRevision(status.upcoming));
  assert.match(status.source, /^(committed|dashboard)$/u);
  assert.equal(status.empty, status.upcoming.length === 0);
  assert.ok(status.reviewedOn <= todayLA, `reviewedOn ${status.reviewedOn} is after today ${todayLA} in LA`);
  assert.ok(status.builtOn <= todayLA, `builtOn ${status.builtOn} is after today ${todayLA} in LA`);
  if (status.source === "dashboard") {
    assert.ok(
      status.reviewedOn >= shiftIsoDate(status.builtOn, -1),
      `dashboard reviewedOn ${status.reviewedOn} is stale relative to builtOn ${status.builtOn}`,
    );
    if (status.builtOn < shiftIsoDate(todayLA, -STALE_DASHBOARD_FAIL_DAYS)) {
      const pastShown = [...new Set(renderedIsoDates(snapshot).filter((date) => date < todayLA))];
      assert.deepEqual(
        pastShown,
        [],
        `dashboard builtOn ${status.builtOn} is more than ${STALE_DASHBOARD_FAIL_DAYS} days old and still shows past dates ${pastShown.join(", ")}`,
      );
    }
    for (const warning of dashboardScheduleWarnings(snapshot)) {
      console.warn(`[course-dates] ${warning}`);
    }
  }
  if (!snapshot.previewUrl) {
    assert.equal(status.source, "committed");
  }

  if (status.empty) {
    assert.deepEqual(status.upcoming, []);
    assert.deepEqual(snapshot.homeRows, []);
    assert.match(snapshot.homeEmptyCopy, /Ask admissions/u);
    for (const id of COURSE_SCHEDULE_IDS) {
      assert.deepEqual(snapshot.courses[id].dates, []);
      assert.deepEqual(
        snapshot.courses[id].ldScripts.flatMap((script) => courseInstanceStartDates(script)),
        [],
      );
      assert.match(snapshot.courses[id].nextClass, /Ask admissions|upcoming dates/u);
    }
  } else {
    assert.ok(status.upcoming.length > 0, "published an empty schedule without empty: true");
    assert.ok(snapshot.homeRows.length > 0, "homepage time locator matched no dates");
  }

  for (const entry of status.upcoming) {
    assert.match(entry.isoDate, ISO_DATE);
    assert.ok(entry.isoDate >= status.reviewedOn, `${entry.isoDate} precedes reviewedOn ${status.reviewedOn}`);
    assert.match(entry.status, /^(open|full)$/u);
    assert.deepEqual(Object.keys(entry).sort(), ["courseId", "isoDate", "status"]);
  }

  const homeDates = snapshot.homeRows.map((row) => row.isoDate);
  assert.equal(new Set(homeDates).size, homeDates.length, "homepage has a duplicated date row");
  assert.deepEqual(homeDates, [...new Set(status.upcoming.map((entry) => entry.isoDate))].sort());
  for (const date of homeDates) {
    assert.ok(date >= status.reviewedOn, `homepage ${date} precedes reviewedOn ${status.reviewedOn}`);
  }

  for (const id of COURSE_SCHEDULE_IDS) {
    const published = entriesForCourse(status, id);
    const rendered = snapshot.courses[id];
    assert.deepEqual(
      rendered.dates.map((entry) => [entry.isoDate, entry.full]),
      published.map((entry) => [entry.isoDate, entry.status === "full"]),
    );
    const openDates = published.filter((entry) => entry.status !== "full").map((entry) => entry.isoDate);
    const ldDates = rendered.ldScripts.flatMap((script) => courseInstanceStartDates(script));
    assert.deepEqual(ldDates, openDates, `${id} JSON-LD startDates must equal non-Full dates`);
    assert.equal(rendered.nextAvailable, openDates[0] ? formatOpenDateLabel(id, openDates[0]) : undefined);
    assert.equal(rendered.nextClass, openDates[0] ? formatOpenDateLabel(id, openDates[0]) : EMPTY_COURSE_COPY);

    const homeForCourse = snapshot.homeRows
      .filter((row) => row.courses.some((course) => course.id === id))
      .map((row) => [row.isoDate, row.courses.find((course) => course.id === id)?.full]);
    assert.deepEqual(homeForCourse, published.map((entry) => [entry.isoDate, entry.status === "full"]));

    for (const entry of rendered.dates.filter((item) => item.full)) {
      assert.ok(!ldDates.includes(entry.isoDate), `${id} Full class ${entry.isoDate} leaked into JSON-LD`);
    }
  }

  for (const entry of openEntries(status)) {
    const id = entry.courseId as CourseScheduleId;
    const label = formatOpenDateLabel(id, entry.isoDate);
    assert.ok(snapshot.faqText.includes(label), `FAQ is missing open date ${label}`);
    assert.ok(snapshot.llmsText.includes(label), `llms.txt is missing open date ${label}`);
  }

  for (const id of COURSE_SCHEDULE_IDS) {
    const label = courseScheduleCourseDetails[id].label;
    const expected = expectedOpenDateLabels(status, id);
    const faqFragments = courseListFragments(snapshot.faqText, label);
    assert.ok(faqFragments.length > 0, `FAQ is missing ${label} date list`);
    for (const listed of faqFragments) {
      assert.deepEqual(
        [...new Set(listedDateLabels(listed))].sort(),
        [...new Set(expected)].sort(),
        `${label} FAQ line must list exactly that course's open dates`,
      );
    }
    const llmsFragments = dateListFragments(snapshot.llmsText, label, id);
    assert.ok(llmsFragments.length > 0, `llms.txt is missing ${label} date list`);
    for (const listed of llmsFragments) {
      assert.deepEqual(
        [...new Set(listedDateLabels(listed))].sort(),
        [...new Set(expected)].sort(),
        `${label} llms.txt bullet must list exactly that course's open dates`,
      );
    }
  }

  for (const [source, file, text] of [
    ["FAQ", "/faqs-1", snapshot.faqText],
    ["llms.txt", "/llms.txt", snapshot.llmsText],
  ] as const) {
    const listSpans = copyDateListSpans(text);
    for (const match of text.matchAll(COPY_DATE)) {
      if (isAllowlistedCopyDate(match[0], status.reviewedOn)) continue;
      if (isYearlessCopyDate(match[0]) && !inCopyDateList(match.index ?? -1, listSpans)) continue;
      const isoDate = parseCopyDate(match[0], status.reviewedOn.slice(0, 4));
      assert.ok(
        isoDate >= status.reviewedOn,
        `${source} (${file}) lists past date "${match[0]}" that is not in POLICY_DATE_ALLOWLIST`,
      );
    }
  }

  for (const option of signupInterestOptions) {
    const rendered = snapshot.interestOptions.find((item) => item.label === option.label);
    assert.ok(rendered, `missing interest option ${option.label}`);
    if (!option.scheduleId) {
      assert.equal(rendered.nextOpen, option.availabilityLabel ?? "Ask admissions for current availability");
      continue;
    }
    const next = firstOpenLabel(status, option.scheduleId);
    assert.equal(
      rendered.nextOpen,
      next ? `Next open date: ${next}` : "Ask admissions for current availability",
    );
  }

  for (const page of adLandingPages) {
    assert.deepEqual(
      snapshot.landerDates[page.path] ?? [],
      expectedLanderDates(status, page.contentCategory),
      `${page.path} date list must match open dates`,
    );
  }

  for (const path of COURSE_DATE_PATHS) {
    const scripts = snapshot.pageLdScripts[path] ?? [];
    for (const script of scripts) {
      for (const date of courseInstanceStartDates(script)) {
        assert.ok(date >= status.reviewedOn, `${path} JSON-LD ${date} precedes reviewedOn ${status.reviewedOn}`);
      }
    }
  }
}

export async function collectServedScheduleSnapshot(
  page: Page,
  request: APIRequestContext,
  options: { origin?: string; previewUrl?: boolean } = {},
): Promise<ServedScheduleSnapshot> {
  const origin = options.origin?.replace(/\/$/u, "") ?? "";
  const href = (path: string) => `${origin}${path}`;
  const response = await request.get(href("/api/course-schedule-status"));
  expect(response.status()).toBe(200);
  const status = (await response.json()) as PublishedCourseScheduleStatus;
  const llms = await request.get(href("/llms.txt"));
  expect(llms.ok()).toBe(true);

  await page.goto(href("/"));
  const homeTimes = page.locator('[data-rda-home-course-block="schedule"] time');
  if (!status.empty) await expect(homeTimes).not.toHaveCount(0);
  const homeEmptyCopy = (await page.locator('[data-rda-home-course-block="schedule"]').innerText()) ?? "";
  const homeRows = await page.locator(".rda-home-schedule-date-row").evaluateAll((rows) =>
    rows.map((row) => {
      const isoDate = row.querySelector("time")?.getAttribute("datetime") ?? "";
      const courses = [...row.querySelectorAll(".rda-home-schedule-course-wrap")].map((wrap) => ({
        full: wrap.getAttribute("data-status") === "full",
        label: wrap.querySelector("a")?.textContent?.trim() ?? "",
      }));
      return { isoDate, courses };
    }),
  );
  const interestOptions = await page.locator(".rda-interest-option").evaluateAll((nodes) =>
    nodes.map((node) => ({
      label: node.querySelector(".rda-interest-option-title")?.textContent?.trim() ?? "",
      nextOpen: node.querySelector(".rda-interest-option-date")?.textContent?.trim() ?? "",
    })),
  );

  const courses = {} as Record<CourseScheduleId, CoursePageSnapshot>;
  const pageLdScripts: Record<string, string[]> = {};
  const landerDates: Record<string, string[]> = {};

  for (const path of COURSE_DATE_PATHS) {
    await page.goto(href(path));
    pageLdScripts[path] = await page.locator('script[type="application/ld+json"]').allTextContents();
    if (path.startsWith("/lp/")) {
      landerDates[path] = (await page.locator(".rda-ad-date-list span").allTextContents()).map((date) => date.trim());
    }
    const courseId = COURSE_SCHEDULE_IDS.find((id) => courseScheduleCourseDetails[id].href === path);
    if (!courseId) continue;
    const root = page.locator(`[data-rda-live-course="${courseId}"]`);
    const dates = await root.locator(".rda-course-date").evaluateAll((nodes) =>
      nodes.map((node) => ({
        full: node.getAttribute("data-status") === "full",
        isoDate: node.querySelector("time")?.getAttribute("datetime") ?? "",
        label: node.querySelector("time")?.textContent?.trim() ?? "",
      })),
    );
    const nextClass = await root.evaluate((node) => {
      const dt = [...node.querySelectorAll("dt")].find((item) => item.textContent?.includes("Next class"));
      return dt?.nextElementSibling?.textContent?.trim() ?? "";
    });
    const body = (await root.innerText()) ?? "";
    const nextAvailable = body.match(/Next available date: ([^.]+)/u)?.[1];
    const courseScript = (await page.locator(`#rda-ld-course-${courseId}`).textContent()) ?? "{}";
    courses[courseId] = {
      dates,
      ldScripts: [courseScript],
      nextAvailable,
      nextClass,
    };
  }

  await page.goto(href("/faqs-1"));
  const faqText = (await page.locator("body").textContent()) ?? "";

  return {
    courses,
    faqText,
    homeEmptyCopy,
    homeRows: homeRows.map((row) => ({
      isoDate: row.isoDate,
      courses: row.courses.flatMap((course) => {
        const id = labelToCourseId(course.label);
        return id ? [{ full: course.full, id, label: course.label }] : [];
      }),
    })),
    interestOptions,
    landerDates,
    llmsText: await llms.text(),
    pageLdScripts,
    previewUrl: options.previewUrl ?? Boolean(process.env.PREVIEW_URL?.trim()),
    status,
    todayLA: academyDate(),
  };
}
