import assert from "node:assert/strict";

import { expect, test } from "@playwright/test";

import { resolvePublishedBuiltOn } from "../lib/published-course-schedule";
import courseScheduleData from "../data/course-schedule.json";
import {
  CONTRACT_TODAY_LA,
  COURSE_DATE_MUTANTS,
  EIGHT_DAY_STALE_OFFSET,
  POLICY_DATE_ALLOWLIST,
  SEVEN_DAY_STALE_OFFSET,
  STALE_DASHBOARD_FAIL_DAYS,
  STALE_DASHBOARD_WARN_DAYS,
  academyDate,
  applyCourseDateMutant,
  assertServedScheduleContract,
  committedScheduleSnapshot,
  courseInstanceStartDates,
  dashboardScheduleSnapshot,
  dashboardScheduleWarnings,
  eightDayStaleDashboardSnapshot,
  elapsedDashboardScheduleSnapshot,
  parseCopyDate,
  rolledBackDashboardSnapshot,
  sevenDayStaleDashboardSnapshot,
  shiftIsoDate,
} from "./support/course-schedule-contract";

/**
 * Course-date contract.
 *
 * Snapshots use CONTRACT_TODAY_LA ("2026-10-22"), not academyDate() / the wall
 * clock. Mutant builders that need a remaining Full class stay valid after
 * November 14 and after the last stored date. CI runs this spec with
 * COURSE_DATES_FAKE_NOW set to 2026-11-20 and 2026-12-20 in America/Los_Angeles
 * and UTC so an unpinned spec would go red while this pin stays green.
 *
 * POLICY_DATE_ALLOWLIST is the exact set of past Month D, YYYY (or short-month /
 * yearless) strings that may appear in FAQ or llms.txt. Today that is the
 * January 1, 2025 Infection Control statute date. To add a date: confirm it is a
 * policy or legal fact, not a class date, then add the exact string. Any other
 * past date fails with a message that names the string and file. The scan
 * compares against reviewedOn, not todayLA.
 *
 * Dashboard staleness fails when builtOn is more than 7 days old and a rendered
 * date is already past. The 8-day fixture uses the committed rows (October 17
 * is already past on the pin) and does not inject a leftover home row.
 * Release-gate and verify-preview serve the committed fixture; the dashboard
 * path is exercised by an isolated fixture feed. Real production staleness is
 * not observed on fresh PR builds — a scheduled workflow against production is
 * the right check and is proposed on the PR, not added as a cron here.
 */

const builds = [
  { name: "committed", snapshot: () => committedScheduleSnapshot(CONTRACT_TODAY_LA) },
  { name: "dashboard", snapshot: () => dashboardScheduleSnapshot(CONTRACT_TODAY_LA) },
] as const;

test("synthesized committed and dashboard snapshots satisfy the served contract", () => {
  assert.doesNotThrow(() => assertServedScheduleContract(committedScheduleSnapshot(CONTRACT_TODAY_LA)));
  assert.doesNotThrow(() => assertServedScheduleContract(dashboardScheduleSnapshot(CONTRACT_TODAY_LA)));
});

test("dashboard build whose stored dates are all in the past is an explicit empty schedule", () => {
  const snapshot = elapsedDashboardScheduleSnapshot(CONTRACT_TODAY_LA);
  assert.equal(snapshot.status.empty, true);
  assert.deepEqual(snapshot.status.upcoming, []);
  assert.doesNotThrow(() => assertServedScheduleContract(snapshot));
});

test("dashboard rollback with reviewedOn matching builtOn still passes", () => {
  const snapshot = rolledBackDashboardSnapshot(CONTRACT_TODAY_LA);
  assert.doesNotThrow(() => assertServedScheduleContract(snapshot));
  assert.match(dashboardScheduleWarnings(snapshot).join(" "), /more than a day older/u);
});

test("dashboard builtOn older than 7 days still showing a fixture past date fails", () => {
  const snapshot = eightDayStaleDashboardSnapshot(CONTRACT_TODAY_LA);
  assert.equal(snapshot.status.builtOn, shiftIsoDate(CONTRACT_TODAY_LA, -EIGHT_DAY_STALE_OFFSET));
  assert.equal(snapshot.status.reviewedOn, courseScheduleData.reviewedOn);
  assert.ok(
    snapshot.homeRows.some((row) => row.isoDate < CONTRACT_TODAY_LA),
    "8-day stale fixture must keep a naturally past row, not inject one",
  );
  assert.throws(
    () => assertServedScheduleContract(snapshot),
    (error: unknown) => {
      assert.ok(error instanceof assert.AssertionError);
      assert.match(error.message, /more than 7 days old and still shows past dates 2026-10-17/u);
      return true;
    },
  );
});

test("dashboard builtOn exactly 7 days old still showing a fixture past date passes", () => {
  const snapshot = sevenDayStaleDashboardSnapshot(CONTRACT_TODAY_LA);
  assert.equal(snapshot.status.builtOn, shiftIsoDate(CONTRACT_TODAY_LA, -SEVEN_DAY_STALE_OFFSET));
  assert.doesNotThrow(() => assertServedScheduleContract(snapshot));
});

test("stale dashboard fail threshold is 7 days", () => {
  assert.equal(STALE_DASHBOARD_FAIL_DAYS, 7);
  assert.equal(SEVEN_DAY_STALE_OFFSET, 7);
  assert.equal(EIGHT_DAY_STALE_OFFSET, 8);
  assert.equal(STALE_DASHBOARD_WARN_DAYS, 1);
  assert.equal(shiftIsoDate(CONTRACT_TODAY_LA, -STALE_DASHBOARD_FAIL_DAYS), "2026-10-15");
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

test("policy date allowlist is the exact January 1, 2025 statute string", () => {
  assert.deepEqual([...POLICY_DATE_ALLOWLIST], ["January 1, 2025"]);
  const snapshot = committedScheduleSnapshot(CONTRACT_TODAY_LA);
  snapshot.faqText += " January 2, 2025.";
  assert.throws(
    () => assertServedScheduleContract(snapshot),
    (error: unknown) => {
      assert.ok(error instanceof assert.AssertionError);
      assert.match(
        error.message,
        /FAQ \(\/faqs-1\) lists past date "January 2, 2025" that is not in POLICY_DATE_ALLOWLIST/u,
      );
      return true;
    },
  );
});

test("FAQ date lists must match the course open dates exactly, not a subset", () => {
  const snapshot = applyCourseDateMutant(committedScheduleSnapshot(CONTRACT_TODAY_LA), "faq-drop-one");
  assert.throws(
    () => assertServedScheduleContract(snapshot),
    (error: unknown) => {
      assert.ok(error instanceof assert.AssertionError);
      assert.match(error.message, /FAQ line must list exactly that course's open dates/u);
      return true;
    },
  );
});

test("copy-date parser reads short months and yearless dates", () => {
  assert.equal(parseCopyDate("Oct 12, 2026", "2026"), "2026-10-12");
  assert.equal(parseCopyDate("October 12", "2026"), "2026-10-12");
  assert.equal(parseCopyDate("December 5, 2026", "2026"), "2026-12-05");
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

test("academyDate honors COURSE_DATES_FAKE_NOW", () => {
  const previous = process.env.COURSE_DATES_FAKE_NOW;
  process.env.COURSE_DATES_FAKE_NOW = "2026-11-20T12:00:00-08:00";
  try {
    assert.equal(academyDate(), "2026-11-20");
  } finally {
    if (previous === undefined) delete process.env.COURSE_DATES_FAKE_NOW;
    else process.env.COURSE_DATES_FAKE_NOW = previous;
  }
});
