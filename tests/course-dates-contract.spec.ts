import assert from "node:assert/strict";

import { expect, test } from "@playwright/test";

import { buildPublishedCourseScheduleStatus, resolvePublishedBuiltOn } from "../lib/published-course-schedule";
import {
  CONTRACT_FIXTURE_PIN,
  CONTRACT_SCHEDULE,
  CONTRACT_SCHEDULE_MODULE,
  CONTRACT_TODAY_LA,
  COURSE_DATE_MUTANTS,
  EIGHT_DAY_STALE_OFFSET,
  LIVE_COURSE_SCHEDULE,
  POLICY_DATE_ALLOWLIST,
  SEVEN_DAY_STALE_OFFSET,
  STALE_DASHBOARD_FAIL_DAYS,
  STALE_DASHBOARD_WARN_DAYS,
  academyDate,
  applyCourseDateMutant,
  assertContractTracksLiveShape,
  assertServedScheduleContract,
  assertValidIsoDate,
  collectServedScheduleSnapshot,
  committedScheduleSnapshot,
  contractAcademyDate,
  courseInstanceStartDates,
  dashboardScheduleSnapshot,
  dashboardScheduleWarnings,
  eightDayStaleDashboardSnapshot,
  elapsedDashboardScheduleSnapshot,
  parseCopyDate,
  publishedScheduleInput,
  rolledBackDashboardSnapshot,
  servedSnapshotTodayLA,
  sevenDayStaleDashboardSnapshot,
  shiftIsoDate,
} from "./support/course-schedule-contract";

/**
 * Course-date contract.
 *
 * Synthetic snapshots are built from tests/fixtures/course-schedule.contract.json
 * and contractAcademyDate() (COURSE_DATES_FAKE_NOW, else CONTRACT_TODAY_LA
 * "2026-10-22"). This spec never reads the real calendar and never writes
 * data/course-schedule.json. Live served checks stay relative to whatever the
 * live file publishes.
 *
 * COURSE_DATES_FAKE_NOW is honoured by contractAcademyDate() and the
 * synthetic builders that default to it. Fixture-relationship tests pass
 * CONTRACT_TODAY_LA so clock cells stay on the frozen snapshot. The dedicated
 * FAKE_NOW test uses the defaults, so unpin mutants die. collectServedScheduleSnapshot
 * uses servedSnapshotTodayLA() / academyDate(), so a shifted clock cannot mask a
 * stale dashboard. CI runs this spec with COURSE_DATES_FAKE_NOW set to
 * 2026-11-20 and 2026-12-20 in America/Los_Angeles and UTC.
 *
 * POLICY_DATE_ALLOWLIST is the exact canonical set of policy/legal dates
 * (currently January 1, 2025). Equivalent spellings of those ISO dates are
 * accepted. A different day in the same month is not. To add a date: confirm
 * it is a policy or legal fact, not a class date, then add the exact canonical
 * string. The scan compares against reviewedOn, not todayLA.
 *
 * Year-less dates are flagged inside a course date list, on the rest of that
 * FAQ line after the first period, and anywhere on an llms.txt course bullet.
 * Dated copy is scanned everywhere. Unrelated prose such as "the January 9
 * class" or "June 30 each year" is allowed.
 *
 * Dashboard staleness fails when builtOn is more than 7 days old and a rendered
 * date is already past. The 8-day fixture uses the frozen rows (October 17 is
 * already past on the pin) and does not inject a leftover home row.
 */

const builds = [
  { name: "committed", snapshot: () => committedScheduleSnapshot(CONTRACT_TODAY_LA) },
  { name: "dashboard", snapshot: () => dashboardScheduleSnapshot(CONTRACT_TODAY_LA) },
] as const;

const PAST_COPY_FORMATS = [
  { raw: "Sept 12, 2026", yearless: false },
  { raw: "Sept 12", yearless: true },
  { raw: "Sep 12, 2026", yearless: false },
  { raw: "Oct. 12, 2026", yearless: false },
  { raw: "Oct. 12", yearless: true },
  { raw: "10/12/2026", yearless: false },
  { raw: "OCT 12, 2026", yearless: false },
  { raw: "2026-10-12", yearless: false },
  { raw: "Oct 12th, 2026", yearless: false },
  { raw: "October 12th, 2026", yearless: false },
  { raw: "10/12", yearless: true },
  { raw: "10/12/26", yearless: false },
  { raw: "12 October 2026", yearless: false },
  { raw: "October 12 2026", yearless: false },
] as const;

const COPY_PROBES = [
  { name: "phone", text: "Call 916-888-9821 for dates.", expect: "pass" },
  { name: "price", text: "PRICE $395 for the course.", expect: "pass" },
  { name: "section", text: "Business and Professions Code section 1750(c).", expect: "pass" },
  { name: "month-year-may", text: "the May 2026 session.", expect: "pass" },
  { name: "month-year-december", text: "December 2026 catalog.", expect: "pass" },
  { name: "future-short", text: "Next open date Dec 12, 2026.", expect: "pass" },
  { name: "policy-long", text: "required since January 1, 2025.", expect: "pass" },
  { name: "future-long", text: "November 20, 2026 is the next start.", expect: "pass" },
  { name: "next-year-yearless-faq", text: "Ask about the January 9 class.", expect: "pass" },
  { name: "annual-yearless-faq", text: "The window closes June 30 each year.", expect: "pass" },
  { name: "policy-short", text: "effective Jan 1, 2025 under the statute.", expect: "pass" },
  { name: "next-year-yearless-llms", text: "Ask about the January 9 class.", expect: "pass", surface: "llms" },
  { name: "annual-yearless-llms", text: "The window closes June 30 each year.", expect: "pass", surface: "llms" },
  { name: "policy-short-llms", text: "effective Jan 1, 2025 under the statute.", expect: "pass", surface: "llms" },
] as const;

function withFakeNow<T>(value: string, run: () => T): T {
  const previous = process.env.COURSE_DATES_FAKE_NOW;
  process.env.COURSE_DATES_FAKE_NOW = value;
  try {
    return run();
  } finally {
    if (previous === undefined) delete process.env.COURSE_DATES_FAKE_NOW;
    else process.env.COURSE_DATES_FAKE_NOW = previous;
  }
}

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
  assert.equal(snapshot.status.reviewedOn, CONTRACT_SCHEDULE.reviewedOn);
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
    resolvePublishedBuiltOn({ reviewedOn: String(LIVE_COURSE_SCHEDULE.reviewedOn), source: "committed" }),
    LIVE_COURSE_SCHEDULE.reviewedOn,
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

test("equivalent allowlist spelling does not accept a different day in the same month", () => {
  const snapshot = committedScheduleSnapshot(CONTRACT_TODAY_LA);
  snapshot.faqText += " January 15, 2025.";
  assert.throws(
    () => assertServedScheduleContract(snapshot),
    (error: unknown) => {
      assert.ok(error instanceof assert.AssertionError);
      assert.match(error.message, /January 15, 2025/u);
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

test("llms.txt date lists must match the course open dates exactly, not a subset", () => {
  const snapshot = applyCourseDateMutant(committedScheduleSnapshot(CONTRACT_TODAY_LA), "llms-drop-one");
  assert.throws(
    () => assertServedScheduleContract(snapshot),
    (error: unknown) => {
      assert.ok(error instanceof assert.AssertionError);
      assert.match(error.message, /llms.txt bullet must list exactly that course's open dates/u);
      return true;
    },
  );
});

test("copy-date parser reads ISO, ordinals, day-first, dotted, numeric, and yearless dates", () => {
  assert.equal(parseCopyDate("Oct 12, 2026", "2026"), "2026-10-12");
  assert.equal(parseCopyDate("October 12", "2026"), "2026-10-12");
  assert.equal(parseCopyDate("December 5, 2026", "2026"), "2026-12-05");
  assert.equal(parseCopyDate("Oct. 12, 2026", "2026"), "2026-10-12");
  assert.equal(parseCopyDate("Oct. 12", "2026"), "2026-10-12");
  assert.equal(parseCopyDate("10/12/2026", "2026"), "2026-10-12");
  assert.equal(parseCopyDate("OCT 12, 2026", "2026"), "2026-10-12");
  assert.equal(parseCopyDate("Jan 1, 2025", "2026"), "2025-01-01");
  assert.equal(parseCopyDate("2026-10-12", "2026"), "2026-10-12");
  assert.equal(parseCopyDate("Oct 12th, 2026", "2026"), "2026-10-12");
  assert.equal(parseCopyDate("October 12th, 2026", "2026"), "2026-10-12");
  assert.equal(parseCopyDate("10/12", "2026"), "2026-10-12");
  assert.equal(parseCopyDate("10/12/26", "2026"), "2026-10-12");
  assert.equal(parseCopyDate("12 October 2026", "2026"), "2026-10-12");
  assert.equal(parseCopyDate("October 12 2026", "2026"), "2026-10-12");
  assert.throws(() => parseCopyDate("November 31, 2026", "2026"));
  assert.throws(() => assertValidIsoDate("2026-11-31"));
});

test("synthetic contract stays green when a fixture feed is refreshed in memory", () => {
  const mutated = structuredClone(CONTRACT_SCHEDULE);
  mutated.reviewedOn = "2026-10-23";
  const open = mutated.entries.find((entry) => entry.status === "open" && String(entry.isoDate) >= "2026-10-23");
  assert.ok(open, "fixture must have an open class to mark full");
  open.status = "full";
  const removedIso = mutated.entries.find((entry) => String(entry.isoDate) < "2026-10-20" && String(entry.isoDate) > "2000-01-01")?.isoDate;
  mutated.entries = mutated.entries.filter((entry) => entry.isoDate !== removedIso);
  mutated.entries.push({ courseId: String(open.courseId), isoDate: "2027-01-09", status: "open" });

  assert.doesNotThrow(() => assertServedScheduleContract(committedScheduleSnapshot(CONTRACT_TODAY_LA)));
  assert.doesNotThrow(() => assertServedScheduleContract(dashboardScheduleSnapshot(CONTRACT_TODAY_LA)));
  assert.throws(() => assertServedScheduleContract(eightDayStaleDashboardSnapshot(CONTRACT_TODAY_LA)));

  const refreshed = buildPublishedCourseScheduleStatus(publishedScheduleInput(mutated));
  assert.equal(refreshed.reviewedOn, "2026-10-23");
  assert.equal(refreshed.empty, refreshed.upcoming.length === 0);
  assert.ok(refreshed.upcoming.every((entry) => entry.isoDate >= refreshed.reviewedOn));
  assert.equal(
    resolvePublishedBuiltOn({ reviewedOn: String(mutated.reviewedOn), source: "committed" }),
    mutated.reviewedOn,
  );
  assert.ok(refreshed.upcoming.some((entry) => entry.isoDate === "2027-01-09"));
  assert.equal(
    refreshed.upcoming.find((entry) => entry.courseId === open.courseId && entry.isoDate === open.isoDate)?.status,
    "full",
  );
});

test("a new live entry field does not break the published status builder", () => {
  const mutated = structuredClone(CONTRACT_SCHEDULE);
  mutated.entries = mutated.entries.map((entry) => ({ ...entry, location: "Roseville" }));
  mutated.entries.push({ courseId: "bls-cpr-1", isoDate: "2027-01-09", status: "open" });
  assert.doesNotThrow(() => buildPublishedCourseScheduleStatus(publishedScheduleInput(mutated)));
});

test("builders read the frozen fixture, not the live file", () => {
  assertContractTracksLiveShape();
  assert.equal(CONTRACT_SCHEDULE.contractFixture, CONTRACT_FIXTURE_PIN);
  assert.equal(CONTRACT_SCHEDULE_MODULE, "../fixtures/course-schedule.contract.json");
  const fixtureStatus = buildPublishedCourseScheduleStatus(publishedScheduleInput(CONTRACT_SCHEDULE));
  const liveStatus = buildPublishedCourseScheduleStatus(publishedScheduleInput(LIVE_COURSE_SCHEDULE));
  assert.notEqual(fixtureStatus.revision, liveStatus.revision);
  assert.equal(committedScheduleSnapshot(CONTRACT_TODAY_LA).status.revision, fixtureStatus.revision);
  assert.equal(committedScheduleSnapshot(CONTRACT_TODAY_LA).status.reviewedOn, CONTRACT_SCHEDULE.reviewedOn);
});

test("COURSE_DATES_FAKE_NOW drives snapshot today and stale offsets", () => {
  withFakeNow("2026-11-20T20:00:00Z", () => {
    assert.equal(contractAcademyDate(), "2026-11-20");
    assert.equal(committedScheduleSnapshot().todayLA, "2026-11-20");
    assert.equal(eightDayStaleDashboardSnapshot().todayLA, "2026-11-20");
    assert.equal(eightDayStaleDashboardSnapshot().status.builtOn, "2026-11-12");
    assert.throws(() => assertServedScheduleContract(eightDayStaleDashboardSnapshot()));
  });
  assert.equal(contractAcademyDate() === CONTRACT_TODAY_LA || Boolean(process.env.COURSE_DATES_FAKE_NOW), true);
});

test("collect today ignores COURSE_DATES_FAKE_NOW", () => {
  const now = new Date("2031-06-15T19:00:00.000Z");
  withFakeNow("2026-10-20T12:00:00-07:00", () => {
    assert.equal(servedSnapshotTodayLA(now), "2031-06-15");
    assert.equal(academyDate(now), "2031-06-15");
    assert.equal(contractAcademyDate(), "2026-10-20");
    assert.match(collectServedScheduleSnapshot.toString(), /servedSnapshotTodayLA\(/u);
    assert.doesNotMatch(collectServedScheduleSnapshot.toString(), /contractAcademyDate\(/u);
  });
});

test("year-less dates after the first period of a FAQ line fail", () => {
  const snapshot = applyCourseDateMutant(committedScheduleSnapshot(CONTRACT_TODAY_LA), "faq-after-period-noyear");
  assert.throws(() => assertServedScheduleContract(snapshot));
});

test("year-less dates on an llms bullet outside Upcoming dates fail", () => {
  const snapshot = applyCourseDateMutant(committedScheduleSnapshot(CONTRACT_TODAY_LA), "llms-outside-upcoming-noyear");
  assert.throws(() => assertServedScheduleContract(snapshot));
});

test("llms span logic flags year-less dates on a markdown course bullet", () => {
  const snapshot = committedScheduleSnapshot(CONTRACT_TODAY_LA);
  snapshot.llmsText = "[BLS / CPR](/bls-cpr-1) Upcoming dates: October 12; November 7, 2026.\n";
  assert.throws(() => assertServedScheduleContract(snapshot));
});

test("impossible calendar dates fail the served contract", () => {
  const snapshot = committedScheduleSnapshot(CONTRACT_TODAY_LA);
  snapshot.status.upcoming.push({ courseId: "bls-cpr-1", isoDate: "2026-11-31", status: "open" });
  assert.throws(
    () => assertServedScheduleContract(snapshot),
    (error: unknown) => {
      assert.ok(error instanceof assert.AssertionError);
      assert.match(error.message, /impossible calendar date 2026-11-31/u);
      return true;
    },
  );
});

for (const probe of COPY_PROBES) {
  test(`copy probe ${probe.name} does not false-fail current-style copy`, () => {
    const snapshot = committedScheduleSnapshot(CONTRACT_TODAY_LA);
    if ("surface" in probe && probe.surface === "llms") snapshot.llmsText += `\n${probe.text}`;
    else snapshot.faqText += `\n${probe.text}`;
    assert.doesNotThrow(() => assertServedScheduleContract(snapshot));
  });
}

for (const format of PAST_COPY_FORMATS) {
  for (const surface of ["faq", "llms"] as const) {
    test(`${surface} past format ${format.raw} fails the served contract`, () => {
      const snapshot = committedScheduleSnapshot(CONTRACT_TODAY_LA);
      if (format.yearless) {
        const mutated = applyCourseDateMutant(
          snapshot,
          surface === "faq" ? "faq-dot-noyear-past" : "llms-dot-noyear-past",
        );
        if (surface === "faq") mutated.faqText = mutated.faqText.replace("Oct. 12", format.raw);
        else mutated.llmsText = mutated.llmsText.replace("Oct. 12", format.raw);
        assert.throws(() => assertServedScheduleContract(mutated));
        return;
      }
      if (surface === "faq") snapshot.faqText += ` Also ${format.raw}.`;
      else snapshot.llmsText += ` Also ${format.raw}.`;
      assert.throws(
        () => assertServedScheduleContract(snapshot),
        (error: unknown) => {
          assert.ok(error instanceof assert.AssertionError);
          assert.match(error.message, new RegExp(format.raw.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&"), "u"));
          return true;
        },
      );
    });
  }
}

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

test("contractAcademyDate honors COURSE_DATES_FAKE_NOW and otherwise uses the pin", () => {
  withFakeNow("2026-11-20T12:00:00-08:00", () => {
    assert.equal(contractAcademyDate(), "2026-11-20");
  });
  withFakeNow("2026-11-21T07:30:00Z", () => {
    assert.equal(contractAcademyDate(), "2026-11-20");
  });
  withFakeNow("2026-11-21T08:30:00Z", () => {
    assert.equal(contractAcademyDate(), "2026-11-21");
  });
  if (!process.env.COURSE_DATES_FAKE_NOW) {
    assert.equal(contractAcademyDate(), CONTRACT_TODAY_LA);
  }
});
