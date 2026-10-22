import assert from "node:assert/strict";

import { expect, type APIRequestContext, type Page } from "@playwright/test";

import { adLandingPages } from "../../lib/ad-landing-pages";
import {
  SATURDAY_ACADEMY_START_DATE,
  courseScheduleCourseDetails,
  type CourseScheduleId,
} from "../../lib/course-schedule";
import { scheduleRevision } from "../../lib/course-schedule-revision.mjs";
import courseScheduleData from "../../data/course-schedule.json";
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
const MONTH_DAY_YEAR =
  /(?:January|February|March|April|May|June|July|August|September|October|November|December) \d{1,2}, \d{4}/gu;
const WRONG_FUTURE_DATE = "2027-06-15";
const PAST_CORONAL_DATE = "2026-09-12";
const EMPTY_HOME_COPY = "Ask admissions for upcoming dates.";
const EMPTY_COURSE_COPY = "Ask admissions";
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

function dateListFragments(text: string, label: string) {
  return [
    ...courseListFragments(text, label),
    ...courseListFragments(text, "Upcoming dates"),
    ...courseListFragments(text, "upcoming dates"),
    ...courseListFragments(text, "Upcoming starts"),
  ];
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

export function committedScheduleSnapshot(todayLA = academyDate()): ServedScheduleSnapshot {
  return snapshotFromPublishedStatus(buildPublishedCourseScheduleStatus(courseScheduleData), {
    previewUrl: false,
    todayLA,
  });
}

export function dashboardScheduleSnapshot(todayLA = academyDate()): ServedScheduleSnapshot {
  return snapshotFromPublishedStatus(
    buildPublishedCourseScheduleStatus({
      ...courseScheduleData,
      builtOn: todayLA,
      reviewedOn: todayLA,
      source: "dashboard",
    }),
    { previewUrl: true, todayLA },
  );
}

export function elapsedDashboardScheduleSnapshot(todayLA = academyDate()): ServedScheduleSnapshot {
  const lastDate = courseScheduleData.entries.reduce(
    (latest, entry) => (entry.isoDate > latest ? entry.isoDate : latest),
    "0000-01-01",
  );
  const reviewedOn = lastDate > todayLA ? shiftIsoDate(lastDate, 1) : todayLA;
  return snapshotFromPublishedStatus(
    buildPublishedCourseScheduleStatus({
      ...courseScheduleData,
      builtOn: reviewedOn,
      reviewedOn,
      source: "dashboard",
    }),
    { previewUrl: true, todayLA: reviewedOn },
  );
}

export function rolledBackDashboardSnapshot(todayLA = academyDate()): ServedScheduleSnapshot {
  const builtOn = shiftIsoDate(todayLA, -5);
  return snapshotFromPublishedStatus(
    buildPublishedCourseScheduleStatus({
      ...courseScheduleData,
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
  if (status.source === "dashboard") {
    assert.ok(
      status.reviewedOn >= shiftIsoDate(status.builtOn, -1),
      `dashboard reviewedOn ${status.reviewedOn} is stale relative to builtOn ${status.builtOn}`,
    );
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
    for (const text of [snapshot.faqText, snapshot.llmsText]) {
      for (const listed of dateListFragments(text, label)) {
        for (const match of listed.matchAll(MONTH_DAY_YEAR)) {
          const isoDate = new Date(`${match[0]} UTC`).toISOString().slice(0, 10);
          assert.ok(isoDate >= status.reviewedOn, `${label} lists past date ${match[0]}`);
        }
        for (const entry of entriesForCourse(status, id).filter((item) => item.status === "full")) {
          assert.ok(
            !listed.includes(formatOpenDateLabel(id, entry.isoDate)),
            `${label} lists Full date ${entry.isoDate}`,
          );
        }
      }
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
): Promise<ServedScheduleSnapshot> {
  const response = await request.get("/api/course-schedule-status");
  expect(response.status()).toBe(200);
  const status = (await response.json()) as PublishedCourseScheduleStatus;
  const llms = await request.get("/llms.txt");
  expect(llms.ok()).toBe(true);

  await page.goto("/");
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
    await page.goto(path);
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

  await page.goto("/faqs-1");
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
    previewUrl: Boolean(process.env.PREVIEW_URL?.trim()),
    status,
    todayLA: academyDate(),
  };
}
