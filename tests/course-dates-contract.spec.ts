import assert from "node:assert/strict";

import { expect, test } from "@playwright/test";

import { resolvePublishedBuiltOn } from "../lib/published-course-schedule";
import courseScheduleData from "../data/course-schedule.json";
import {
  COURSE_DATE_MUTANTS,
  academyDate,
  applyCourseDateMutant,
  assertServedScheduleContract,
  committedScheduleSnapshot,
  courseInstanceStartDates,
  dashboardScheduleSnapshot,
  dashboardScheduleWarnings,
  elapsedDashboardScheduleSnapshot,
  rolledBackDashboardSnapshot,
} from "./support/course-schedule-contract";

const builds = [
  { name: "committed", snapshot: () => committedScheduleSnapshot() },
  { name: "dashboard", snapshot: () => dashboardScheduleSnapshot() },
] as const;

test("synthesized committed and dashboard snapshots satisfy the served contract", () => {
  assert.doesNotThrow(() => assertServedScheduleContract(committedScheduleSnapshot()));
  assert.doesNotThrow(() => assertServedScheduleContract(dashboardScheduleSnapshot()));
});

test("dashboard build whose stored dates are all in the past is an explicit empty schedule", () => {
  const snapshot = elapsedDashboardScheduleSnapshot();
  assert.equal(snapshot.status.empty, true);
  assert.deepEqual(snapshot.status.upcoming, []);
  assert.doesNotThrow(() => assertServedScheduleContract(snapshot));
});

test("dashboard rollback with reviewedOn matching builtOn still passes", () => {
  const snapshot = rolledBackDashboardSnapshot();
  assert.doesNotThrow(() => assertServedScheduleContract(snapshot));
  assert.match(dashboardScheduleWarnings(snapshot).join(" "), /more than a day older/u);
});

test("dashboard builtOn does not fall back to reviewedOn", () => {
  assert.equal(
    resolvePublishedBuiltOn({ reviewedOn: "2026-10-14", source: "dashboard" }),
    "",
  );
  assert.equal(
    resolvePublishedBuiltOn({
      builtOn: "not-a-date",
      reviewedOn: "2026-10-14",
      source: "dashboard",
    }),
    "",
  );
  assert.equal(
    resolvePublishedBuiltOn({
      builtOn: "2026-10-21",
      reviewedOn: "2026-10-14",
      source: "dashboard",
    }),
    "2026-10-21",
  );
  assert.equal(
    resolvePublishedBuiltOn({ reviewedOn: courseScheduleData.reviewedOn, source: "committed" }),
    courseScheduleData.reviewedOn,
  );
});

test("JSON-LD walker reads pretty-printed hasCourseInstance dates", () => {
  const pretty = JSON.stringify(
    { hasCourseInstance: [{ startDate: "2026-11-14" }, { startDate: "2026-12-12" }] },
    null,
    2,
  );
  expect(pretty).toContain("\n");
  expect(pretty).not.toMatch(/"startDate":"/u);
  expect(courseInstanceStartDates(pretty)).toEqual(["2026-11-14", "2026-12-12"]);
});

for (const build of builds) {
  for (const mutant of COURSE_DATE_MUTANTS) {
    test(`${build.name} mutant ${mutant} fails the served contract`, () => {
      const snapshot = applyCourseDateMutant(build.snapshot(), mutant);
      assert.throws(
        () => assertServedScheduleContract(snapshot),
        (error: unknown) => {
          assert.ok(error instanceof assert.AssertionError, `${mutant} must fail an assertion`);
          console.log(`[mutant] ${build.name} ${mutant}: ${error.message}`);
          return true;
        },
      );
    });
  }
}

test("academy-local today is a calendar date", () => {
  expect(academyDate()).toMatch(/^\d{4}-\d{2}-\d{2}$/u);
});
