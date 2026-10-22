import assert from "node:assert/strict";

import { expect, test } from "@playwright/test";

import {
  COURSE_DATE_MUTANTS,
  academyDate,
  applyCourseDateMutant,
  assertServedScheduleContract,
  committedScheduleSnapshot,
  courseInstanceStartDates,
  dashboardScheduleSnapshot,
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
  assert.doesNotThrow(() => assertServedScheduleContract(rolledBackDashboardSnapshot()));
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
