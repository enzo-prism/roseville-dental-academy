import { expect, test, type APIRequestContext } from "@playwright/test";
import {
  COURSE_SCHEDULE_REVIEWED_ON,
  HERO_START_DATE_LIMIT,
  buildCourseScheduleMonths,
  formatNextStartsSummary,
  formatStartDatesSummary,
  formatWeekdayShortDate,
  getAvailableCourseDates,
  getHeroStartDates,
  getNextAvailableCourseDate,
  getUpcomingCourseSchedule,
  getUpcomingScheduleMonths,
  selectHeroStartDates,
  selectSummaryStartDates,
  toUpcomingStartDates,
} from "../lib/course-schedule";
import { suppressSitePromo } from "./support/qa-helpers";
import { combinedRenewalDates, getAdLandingPage } from "../lib/ad-landing-pages";
import {
  COURSE_DATE_PATHS,
  COURSE_SCHEDULE_IDS,
  assertServedScheduleContract,
  collectServedScheduleSnapshot,
  courseInstanceStartDates,
  dashboardScheduleWarnings,
  expectedHeroChipLabel,
  expectedHeroStarts,
  formatOpenDateLabel,
  shiftIsoDate,
} from "./support/course-schedule-contract";
import { execFile } from "node:child_process";
import { copyFileSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { scheduleRevision } from "../lib/course-schedule-revision.mjs";
import courseScheduleData from "../data/course-schedule.json";

// The literal dates below come from the committed fixture (data/course-schedule.json).
// Unconfigured previews and the release gate serve that fixture. Production builds
// pull the RDA dashboard schedule, which drops elapsed dates every day, so pinned
// fixture dates cannot hold there. Skip the pins on dashboard targets; the
// date-relative checks further down still cover them.
const FIXTURE_PIN =
  "Pins committed-fixture dates; this target serves the live dashboard schedule.";

async function servesDashboardSchedule(request: APIRequestContext) {
  const response = await request.get("/api/course-schedule-status");
  expect(response.status()).toBe(200);
  return (await response.json()).source === "dashboard";
}

test("reviewed schedule excludes elapsed dates without inventing sold-out history", () => {
  expect(COURSE_SCHEDULE_REVIEWED_ON).toMatch(/^\d{4}-\d{2}-\d{2}$/u);

  for (const month of getUpcomingScheduleMonths()) {
    expect(month.entries.length).toBeGreaterThan(0);
    for (const entry of month.entries) {
      expect(entry.isoDate >= COURSE_SCHEDULE_REVIEWED_ON).toBe(true);
    }
  }

  for (const id of COURSE_SCHEDULE_IDS) {
    const upcoming = getUpcomingCourseSchedule(id);
    const available = getAvailableCourseDates(id);
    expect(available).toEqual(
      upcoming
        .filter((entry) => entry.status !== "full")
        .map((entry) => formatOpenDateLabel(id, entry.isoDate)),
    );
    for (const entry of upcoming) {
      expect(entry.isoDate >= COURSE_SCHEDULE_REVIEWED_ON).toBe(true);
    }
    expect(getNextAvailableCourseDate(id)).toBe(available[0]);
    const last = upcoming.at(-1);
    if (last) {
      expect(getNextAvailableCourseDate(id, shiftIsoDate(last.isoDate, 1))).toBeUndefined();
    }
    const firstOpen = upcoming.find((entry) => entry.status !== "full");
    if (firstOpen) {
      expect(getNextAvailableCourseDate(id, firstOpen.isoDate)).toBe(formatOpenDateLabel(id, firstOpen.isoDate));
    }
  }
});

test("hero and lander start helpers use synthetic dates, not the committed fixture", () => {
  const asOf = "2026-10-14";
  expect(formatWeekdayShortDate("2026-11-20", asOf)).toBe("Fri, Nov 20");
  expect(formatWeekdayShortDate("2026-12-05", asOf)).toBe("Sat, Dec 5");
  expect(formatWeekdayShortDate("2027-01-08", asOf)).toBe("Fri, Jan 8, 2027");
  expect(expectedHeroChipLabel("2026-11-20", asOf)).toBe("Fri, Nov 20");
  expect(expectedHeroChipLabel("2027-01-08", asOf)).toBe("Fri, Jan 8, 2027");

  const synthetic = toUpcomingStartDates(
    [
      { isoDate: "2026-11-13", status: "cancelled" },
      { isoDate: "2026-11-20", status: "full" },
      { isoDate: "2026-12-05", status: "open" },
      { isoDate: "2027-01-08", status: "open" },
      { isoDate: "2027-01-15", status: "open" },
      { isoDate: "2027-01-22", status: "open" },
      { isoDate: "2027-01-29", status: "open" },
      { isoDate: "2026-09-12", status: "open" },
    ],
    asOf,
    "dental-assisting-program",
  );
  expect(synthetic.map((entry) => [entry.isoDate, entry.status, entry.weekdayShort])).toEqual([
    ["2026-11-20", "full", "Fri, Nov 20"],
    ["2026-12-05", "available", "Sat, Dec 5"],
    ["2027-01-08", "available", "Fri, Jan 8, 2027"],
    ["2027-01-15", "available", "Fri, Jan 15, 2027"],
    ["2027-01-22", "available", "Fri, Jan 22, 2027"],
    ["2027-01-29", "available", "Fri, Jan 29, 2027"],
  ]);

  expect(selectHeroStartDates(synthetic)).toHaveLength(HERO_START_DATE_LIMIT);
  expect(selectHeroStartDates(synthetic).map((entry) => entry.isoDate)).toEqual([
    "2026-12-05",
    "2027-01-08",
    "2027-01-15",
  ]);
  expect(formatStartDatesSummary(synthetic)).toBe("Sat, Dec 5 · Fri, Jan 8, 2027 · Fri, Jan 15, 2027");
  expect(selectSummaryStartDates(synthetic)[0]?.isoDate).toBe("2026-12-05");
  expect(selectHeroStartDates(synthetic)[0]?.isoDate).toBe("2026-12-05");

  const allFull = toUpcomingStartDates(
    [
      { isoDate: "2026-11-20", status: "full" },
      { isoDate: "2026-12-05", status: "full" },
    ],
    asOf,
  );
  expect(selectHeroStartDates(allFull)).toEqual([]);
  expect(formatStartDatesSummary(allFull)).toBeUndefined();

  const laterOpen = toUpcomingStartDates(
    [
      { isoDate: "2026-11-20", status: "full" },
      { isoDate: "2026-11-21", status: "full" },
      { isoDate: "2026-11-22", status: "full" },
      { isoDate: "2026-12-05", status: "open" },
    ],
    asOf,
  );
  expect(selectHeroStartDates(laterOpen).map((entry) => entry.isoDate)).toEqual([
    "2026-12-05",
    "2026-11-20",
    "2026-11-21",
  ]);

  expect(
    formatStartDatesSummary([
      { date: "November 20, 2026", isoDate: "2026-11-20", status: "full", weekdayShort: "Fri, Nov 20" },
      { date: "December 5, 2026", isoDate: "2026-12-05", status: "available", weekdayShort: "Sat, Dec 5" },
    ]),
  ).toBe("Sat, Dec 5 · Fri, Nov 20 (Full)");

  const cancelledMonths = buildCourseScheduleMonths(
    [
      { courseId: "dental-assisting-program", isoDate: "2026-11-20", status: "cancelled" },
      { courseId: "dental-assisting-program", isoDate: "2026-12-05", status: "open" },
    ],
    asOf,
  );
  expect(cancelledMonths.flatMap((month) => month.entries.map((entry) => entry.isoDate))).toEqual(["2026-12-05"]);

  expect(formatNextStartsSummary("dental-assisting-program", "9999-01-01")).toBeUndefined();
  expect(getHeroStartDates("dental-assisting-program", "9999-01-01")).toEqual([]);
});

test("dashboard schedule data builds months, labels, and course order", () => {
  const months = buildCourseScheduleMonths(
    [
      { courseId: "dental-assisting-program", isoDate: "2026-12-05", status: "open" },
      { courseId: "bls-cpr-1", isoDate: "2026-12-05", status: "full" },
      { courseId: "sealants", isoDate: "2027-01-09", status: "open" },
      { courseId: "front-office-program", isoDate: "2026-12-05", status: "open" },
    ],
    "2026-11-30",
  );

  expect(months.map((month) => month.month)).toEqual(["December", "January 2027"]);
  expect(months[0].entries[0]).toMatchObject({ date: "December 5, 2026", day: "December 5", isoDate: "2026-12-05" });
  expect(months[0].entries[0].courses.map((course) => [course.id, course.status])).toEqual([
    ["bls-cpr-1", "full"],
    ["dental-assisting-program", undefined],
  ]);
});

test("build accepts intentional empty feeds and refuses stale fallback on feed errors", async () => {
  const good = {
    version: 1,
    generatedAt: "2026-09-28T20:00:00Z",
    reviewedOn: "2026-09-28",
    entries: [{ courseId: "sealants", isoDate: "2026-11-14", status: "full" }],
  };
  const feeds: Record<string, unknown> = {
    "/good": good,
    "/revision": { ...good, revision: scheduleRevision(good.entries) },
    "/wrong-revision": { ...good, revision: "0".repeat(64) },
    "/version": { ...good, version: 2 },
    "/empty": { ...good, entries: [] },
    "/bad-date": { ...good, entries: [{ courseId: "sealants", isoDate: "2026-02-30", status: "open" }] },
    "/bad-status": { ...good, entries: [{ courseId: "sealants", isoDate: "2026-11-14", status: "Full" }] },
    "/bad-course": { ...good, entries: [{ courseId: "front-office-program", isoDate: "2026-11-14", status: "open" }] },
    "/duplicate": { ...good, entries: [...good.entries, ...good.entries] },
  };
  const server = createServer((request, response) => {
    if (request.headers.authorization !== "Bearer test-token") {
      response.statusCode = 401;
      response.end("{}");
      return;
    }
    if (request.url === "/outage") response.statusCode = 503;
    response.setHeader("content-type", "application/json");
    response.end(JSON.stringify(feeds[request.url ?? ""] ?? {}));
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const origin = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  const committed = readFileSync("data/course-schedule.json", "utf8");

  const temporaryDirectories: string[] = [];
  const pull = async (path: string, token = "test-token", environment: Record<string, string> = {}) => {
    const directory = mkdtempSync(join(tmpdir(), "rda-schedule-"));
    temporaryDirectories.push(directory);
    const dataPath = join(directory, "course-schedule.json");
    copyFileSync("data/course-schedule.json", dataPath);
    // Async: a synchronous child would block this process's mock feed server.
    try {
      await promisify(execFile)(process.execPath, ["scripts/pull-course-schedule.mjs"], {
        env: {
          ...process.env,
          VERCEL_ENV: "preview",
          VERCEL_TARGET_ENV: "preview",
          RDA_SCHEDULE_DATA_PATH: dataPath,
          RDA_SCHEDULE_FEED_TOKEN: token,
          RDA_SCHEDULE_FEED_URL: `${origin}${path}`,
          ...environment,
        },
      });
    } catch (error) {
      expect(readFileSync(dataPath, "utf8")).toBe(committed);
      throw error;
    }
    return readFileSync(dataPath, "utf8");
  };

  try {
    expect(JSON.parse(await pull("/good"))).toMatchObject({ source: "dashboard", reviewedOn: "2026-09-28", entries: good.entries });
    expect(JSON.parse(await pull("/revision"))).toMatchObject({ revision: scheduleRevision(good.entries) });
    expect(JSON.parse(await pull("/empty"))).toMatchObject({ source: "dashboard", entries: [], revision: scheduleRevision([]) });
    for (const path of ["/version", "/bad-date", "/bad-status", "/bad-course", "/duplicate", "/wrong-revision", "/outage"]) {
      await expect(pull(path), path).rejects.toThrow("refusing to publish stale availability");
    }
    await expect(pull("/good", "wrong-token")).rejects.toThrow("HTTP 401");
    const unconfigured = { RDA_SCHEDULE_FEED_URL: "", RDA_SCHEDULE_FEED_TOKEN: "" };
    expect(await pull("/good", "", unconfigured)).toBe(committed);
    await expect(pull("/good", "", { ...unconfigured, VERCEL_ENV: "production" })).rejects.toThrow("are required");
    await expect(pull("/good", "", { ...unconfigured, VERCEL_TARGET_ENV: "production" })).rejects.toThrow("are required");
    await expect(pull("/good", "")).rejects.toThrow("are required");
  } finally {
    server.close();
    for (const directory of temporaryDirectories) rmSync(directory, { recursive: true, force: true });
  }
});

test("schedule revisions identify content independently of ordering and timestamps", () => {
  const entries = [
    { courseId: "sealants", isoDate: "2026-12-12", status: "open" },
    { courseId: "bls-cpr-1", isoDate: "2026-10-17", status: "full" },
  ];
  expect(scheduleRevision(entries)).toBe("51adeb1ccd357461fdc5240a06e9563baf2e12d18176ca501159503431371d61");
  expect(scheduleRevision(entries)).toBe(scheduleRevision([...entries].reverse()));
  expect(scheduleRevision(entries)).not.toBe(scheduleRevision([{ ...entries[0], status: "full" }, entries[1]]));
  expect(scheduleRevision([])).toBe("4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945");
  expect(buildCourseScheduleMonths([], "2026-09-28")).toEqual([]);
});

test("publication status describes bundled schedule without caching or credentials", async ({ request }) => {
  const response = await request.get("/api/course-schedule-status");
  expect(response.status()).toBe(200);
  expect(response.headers()["cache-control"]).toContain("no-store");
  const published = await response.json();
  expect(published).toEqual({
    version: 1,
    // A dashboard build publishes the dashboard's own revision, not the fixture's.
    revision: published.source === "dashboard"
      ? expect.stringMatching(/^[0-9a-f]{64}$/u)
      : scheduleRevision(courseScheduleData.entries),
    upcomingRevision: expect.stringMatching(/^[0-9a-f]{64}$/u),
    reviewedOn: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/u),
    builtOn: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/u),
    source: expect.stringMatching(/^(committed|dashboard)$/u),
    upcoming: expect.any(Array),
    empty: expect.any(Boolean),
  });
  expect(published.empty).toBe(published.upcoming.length === 0);
  expect(published.upcomingRevision).toBe(scheduleRevision(published.upcoming));
  // Release-gate and local builds have no PREVIEW_URL and must serve the fixture.
  // verify-preview sets PREVIEW_URL and may hit either branch; log which one.
  console.log(`[course-dates] schedule branch: ${published.source}`);
  if (!process.env.PREVIEW_URL?.trim()) {
    expect(published.source).toBe("committed");
  }
  // Production refreshes the academy-local cutoff daily from the dashboard;
  // unconfigured previews and local builds retain the committed cutoff.
  if (published.source === "dashboard") {
    expect(published.reviewedOn >= courseScheduleData.reviewedOn).toBe(true);
  } else {
    expect(published.reviewedOn).toBe(courseScheduleData.reviewedOn);
  }
});

test.beforeEach(async ({ context }) => {
  await suppressSitePromo(context);
  // This is a read-only check: no synthetic leads may reach a production inbox.
  await context.route("https://formspree.io/**", (route) => route.abort());
});

for (const width of [390, 1280]) {
  test(`Coronal Polish sold-out date stays full across public surfaces at ${width}px`, async ({ page, request }) => {
    test.skip(await servesDashboardSchedule(request), FIXTURE_PIN);
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/coronal-polish");
    const course = page.locator('[data-rda-live-course="coronal-polish"]');
    const october = course.locator('.rda-course-date').filter({
      has: page.locator('time[datetime="2026-10-24"]'),
    });
    await expect(october).toHaveAttribute("data-status", "full");
    await expect(october.getByText("Full", { exact: true })).toBeVisible();
    await expect(course).toContainText("Next available date: November 14, 2026");
    const coronalChoice = page.locator(".rda-interest-option").filter({ hasText: "Coronal Polish" });
    await expect(coronalChoice).toContainText("Next open date: November 14, 2026");
    const schema = JSON.parse(await page.locator("#rda-ld-course-coronal-polish").textContent() ?? "{}");
    expect(schema.hasCourseInstance.map((entry: { startDate: string }) => entry.startDate)).toEqual(["2026-11-14", "2026-12-12"]);

    await page.goto("/");
    const row = page.locator(".rda-home-schedule-date-row").filter({ has: page.locator('time[datetime="2026-10-24"]') });
    const coronal = row.locator(".rda-home-schedule-course-wrap").filter({ has: page.getByRole("link", { name: "Coronal Polish", exact: true }) });
    await expect(coronal).toHaveCount(1);
    await expect(coronal).toHaveAttribute("data-status", "full");
    await expect(coronal.getByText("Full", { exact: true })).toBeVisible();

    await page.goto("/faqs-1");
    await expect(page.locator("body")).toContainText("Coronal Polish: November 14, 2026; December 12, 2026");
    await page.goto("/lp/coronal-polish-office-awareness");
    await expect(page.locator(".rda-ad-date-list")).toContainText("November 14, 2026");
    await expect(page.locator(".rda-ad-date-list")).not.toContainText("October 24, 2026");
  });

  test(`homepage schedule, cards, and request choices agree at ${width}px`, async ({ page, request }) => {
    test.skip(await servesDashboardSchedule(request), FIXTURE_PIN);
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/");
    const schedule = page.locator('[data-rda-home-course-block="schedule"]');
    await expect(schedule.getByRole("heading", { name: "Upcoming Class Schedule" })).toBeVisible();
    expect(await schedule.locator("time").evaluateAll((nodes) => nodes.map((node) => node.getAttribute("datetime")))).toEqual([
      "2026-10-17", "2026-10-24", "2026-11-07", "2026-11-14", "2026-11-20", "2026-12-05", "2026-12-12",
    ]);
    await expect(page.getByText("Next open date: October 17, 2026", { exact: true })).toHaveCount(1);
    await expect(page.getByText("Next open date: November 7, 2026", { exact: true })).toHaveCount(1);
    await expect(page.getByText("Next open date: October 24, 2026", { exact: true })).toHaveCount(0);
    await expect(page.getByText("Next open date: November 14, 2026", { exact: true })).toHaveCount(2);
    await expect(page.getByText("Next open date: November 20, 2026", { exact: true })).toHaveCount(1);
    const octoberSeventeen = schedule.locator(".rda-home-schedule-date-row").filter({
      has: page.locator('time[datetime="2026-10-17"]'),
    });
    await expect(octoberSeventeen.locator('.rda-home-schedule-course-wrap[data-status="full"]').filter({
      has: page.getByRole("link", { name: "Infection Control", exact: true }),
    }).getByText("Full", { exact: true })).toBeVisible();
    await expect(octoberSeventeen.getByRole("link", { name: "BLS / CPR" })).toBeVisible();
    const novemberSeven = schedule.locator(".rda-home-schedule-date-row").filter({
      has: page.locator('time[datetime="2026-11-07"]'),
    });
    await expect(novemberSeven.getByRole("link", { name: "BLS / CPR" })).toBeVisible();
    await expect(novemberSeven.getByRole("link", { name: "X-rays / Radiation Safety" })).toBeVisible();
    await expect(novemberSeven.getByRole("link", { name: "Infection Control" })).toHaveCount(0);
    const novemberFourteen = schedule.locator(".rda-home-schedule-date-row").filter({
      has: page.locator('time[datetime="2026-11-14"]'),
    });
    await expect(novemberFourteen.getByRole("link", { name: "Infection Control" })).toBeVisible();
    const decemberFive = schedule.locator(".rda-home-schedule-date-row").filter({
      has: page.locator('time[datetime="2026-12-05"]'),
    });
    await expect(decemberFive.getByRole("link", { name: "Infection Control" })).toBeVisible();
    expect(await page.locator("body").innerText()).not.toMatch(/(?:June|July|August|September) \d/);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  });
}

test("public date surfaces cover all 17 pages", () => {
  expect(COURSE_DATE_PATHS).toHaveLength(17);
});

for (const path of COURSE_DATE_PATHS) {
  test(`current dates across ${path}`, async ({ page, request }) => {
    const { reviewedOn } = await (await request.get("/api/course-schedule-status")).json();
    expect(reviewedOn).toMatch(/^\d{4}-\d{2}-\d{2}$/u);
    await page.goto(path);
    const body = await page.locator("body").innerText();
    expect(body).not.toMatch(/(?:June|July|August|September) \d/);
    expect(body).not.toContain("next available date is August");
    for (const schema of await page.locator('script[type="application/ld+json"]').allTextContents()) {
      for (const date of courseInstanceStartDates(schema)) {
        expect(date >= reviewedOn).toBe(true);
      }
    }
  });
}

test("infection-control mobile FABs do not cover course copy", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/infection-control");

  const copyOverlapsFabs = async (selector: string) =>
    page.evaluate((sel) => {
      const copy = document.querySelector<HTMLElement>(sel);
      const whatsapp = document.querySelector<HTMLElement>(".rda-whatsapp-fab");
      const copyRect = copy?.getBoundingClientRect();
      const fabRect = whatsapp?.getBoundingClientRect();

      if (!copyRect || !fabRect) {
        return true;
      }

      return (
        copyRect.left < fabRect.right &&
        copyRect.right > fabRect.left &&
        copyRect.top < fabRect.bottom &&
        copyRect.bottom > fabRect.top
      );
    }, selector);

  expect(
    await copyOverlapsFabs('[data-rda-live-course="infection-control"] h1 + p'),
  ).toBe(false);

  const policyNote = page.locator('[data-rda-live-course="infection-control"] .rda-course-policy-note');
  await policyNote.scrollIntoViewIfNeeded();
  await page.waitForTimeout(200);
  expect(
    await copyOverlapsFabs('[data-rda-live-course="infection-control"] .rda-course-policy-note'),
  ).toBe(false);

  const mainClearance = await page.locator('.rda-live-main[data-rda-route="infection-control"]').evaluate((element) => {
    return Number.parseFloat(getComputedStyle(element).paddingBottom);
  });
  expect(mainClearance).toBeGreaterThanOrEqual(120);
});

test("course JSON-LD omits sold-out instances", async ({ page, request }) => {
  test.skip(await servesDashboardSchedule(request), FIXTURE_PIN);
  await page.goto("/radiation-safety");
  const radiationSchema = JSON.parse(
    (await page.locator("#rda-ld-course-radiation-safety").textContent()) ?? "{}",
  ) as { hasCourseInstance?: Array<{ startDate?: string; eventStatus?: string }> };
  const radiationDates = (radiationSchema.hasCourseInstance ?? []).map((entry) => entry.startDate);

  expect(radiationDates).toEqual(["2026-11-07", "2026-12-05"]);
  expect(radiationDates).not.toContain("2026-10-17");

  await page.goto("/sealants");
  const sealantsSchema = JSON.parse(
    (await page.locator("#rda-ld-course-sealants").textContent()) ?? "{}",
  ) as { hasCourseInstance?: Array<{ startDate?: string; eventStatus?: string }> };
  const sealantsDates = (sealantsSchema.hasCourseInstance ?? []).map((entry) => entry.startDate);

  expect(sealantsDates).toEqual(["2026-12-12"]);
  expect(sealantsDates).not.toContain("2026-10-24");

  // The full October Infection Control class remains visible with a badge,
  // but its structured data advertises only the later open dates.
  await page.goto("/infection-control");
  const infectionSchema = JSON.parse(
    (await page.locator("#rda-ld-course-infection-control").textContent()) ?? "{}",
  ) as { hasCourseInstance?: Array<{ startDate?: string }> };
  expect((infectionSchema.hasCourseInstance ?? []).map((entry) => entry.startDate)).toEqual([
    "2026-11-14",
    "2026-12-05",
  ]);
  expect((infectionSchema.hasCourseInstance ?? []).map((entry) => entry.startDate)).not.toContain("2026-11-07");

  await page.goto("/dental-assisting-program");
  const daSchema = JSON.parse(
    (await page.locator("#rda-ld-course-dental-assisting-program").textContent()) ?? "{}",
  ) as { hasCourseInstance?: Array<{ startDate?: string }> };
  expect((daSchema.hasCourseInstance ?? []).map((entry) => entry.startDate)).toEqual([
    "2026-11-20",
    "2026-12-05",
  ]);
});

test("infection-control page and FAQs omit November 7 while keeping later dates", async ({ page, request }) => {
  test.skip(await servesDashboardSchedule(request), FIXTURE_PIN);
  await page.goto("/infection-control");
  const upcomingDates = page.locator('[data-rda-live-course="infection-control"] .rda-course-date');
  await expect(upcomingDates.getByText("October 17, 2026")).toHaveCount(1);
  await expect(upcomingDates.filter({ hasText: "October 17, 2026" })).toHaveAttribute("data-status", "full");
  await expect(upcomingDates.filter({ hasText: "October 17, 2026" }).getByText("Full", { exact: true })).toBeVisible();
  await expect(upcomingDates.getByText("November 7, 2026")).toHaveCount(0);
  await expect(upcomingDates.getByText("November 14, 2026")).toHaveCount(1);
  await expect(upcomingDates.getByText("December 5, 2026")).toHaveCount(1);

  await page.goto("/faqs-1");
  // FAQ answers sit in collapsed <details>; read their text, not just what is expanded.
  const faqBody = await page.locator("body").textContent() ?? "";
  expect(faqBody).toContain("Infection Control: November 14, 2026; December 5, 2026");
  expect(faqBody).not.toContain("Infection Control: October 17, 2026; November 7, 2026");
});

test("DA program hero lists upcoming weekday starts above the fold", async ({ page, request }) => {
  const published = await (await request.get("/api/course-schedule-status")).json();
  expect(published.reviewedOn).toMatch(/^\d{4}-\d{2}-\d{2}$/u);
  const da = published.upcoming.filter((entry: { courseId: string }) => entry.courseId === "dental-assisting-program");
  const expectedStarts = expectedHeroStarts("dental-assisting-program", da, published.reviewedOn);
  const nextOpen = da.find((entry: { status: string }) => entry.status !== "full");

  const assertHero = async (width: number) => {
    await page.setViewportSize({ width, height: 844 });
    await page.goto("/dental-assisting-program");
    const course = page.locator('[data-rda-live-course="dental-assisting-program"]');
    const starts = course.locator('[data-rda-hero-starts="dental-assisting-program"]');
    const nextClass = course.locator(".ac-course-facts > div").filter({ hasText: "Next class" }).locator("dd");

    if (expectedStarts.length > 0) {
      await expect(starts).toBeVisible();
      await expect(starts.getByText("Next starts", { exact: true })).toBeVisible();
      await expect(starts.locator("[data-rda-hero-start]")).toHaveCount(expectedStarts.length);
      await expect(nextClass).toHaveCount(0);
      for (const chip of expectedStarts) {
        await expect(starts.locator(`time[datetime="${chip.isoDate}"]`)).toHaveText(chip.label);
      }
      if (expectedStarts.some((entry) => entry.isoDate === "2026-11-20")) {
        await expect(starts.locator('time[datetime="2026-11-20"]')).toHaveText("Fri, Nov 20");
      }
      if (expectedStarts.some((entry) => entry.isoDate === "2026-12-05")) {
        await expect(starts.locator('time[datetime="2026-12-05"]')).toHaveText("Sat, Dec 5");
      }
    } else {
      await expect(starts).toHaveCount(0);
      await expect(nextClass).toHaveText(nextOpen ? formatOpenDateLabel("dental-assisting-program", nextOpen.isoDate) : "Ask admissions");
    }

    await expect(course.locator('.ac-hero-actions a[href="#quick-sign-up"]')).toHaveText(/Ask about this course/);
    await expect(page.locator("[data-rda-student-enroll-cta]")).toHaveCount(0);

    const geometry = await page.evaluate(() => {
      const startsNode = document.querySelector<HTMLElement>("[data-rda-hero-starts]");
      const ctas = [
        ...document.querySelectorAll<HTMLElement>(
          '[data-rda-live-course="dental-assisting-program"] .ac-hero-actions a',
        ),
      ];
      const fab = document.querySelector<HTMLElement>(".rda-whatsapp-fab");
      const overlaps = (node: HTMLElement | null) => {
        const rect = node?.getBoundingClientRect();
        const fabRect = fab?.getBoundingClientRect();
        return Boolean(
          rect &&
            fabRect &&
            rect.left < fabRect.right &&
            rect.right > fabRect.left &&
            rect.top < fabRect.bottom &&
            rect.bottom > fabRect.top,
        );
      };
      const startsRect = startsNode?.getBoundingClientRect();
      return {
        ctaAboveFold: ctas.every((cta) => {
          const rect = cta.getBoundingClientRect();
          return rect.top >= 0 && rect.bottom <= window.innerHeight;
        }),
        ctaOverlapsFab: ctas.some((cta) => overlaps(cta)),
        startsAboveFold: !startsRect || (startsRect.top >= 0 && startsRect.bottom <= window.innerHeight),
        startsOverlapsFab: overlaps(startsNode),
      };
    });
    expect(geometry.startsAboveFold).toBe(true);
    expect(geometry.startsOverlapsFab).toBe(false);
    expect(geometry.ctaAboveFold).toBe(true);
    expect(geometry.ctaOverlapsFab).toBe(false);
  };

  await assertHero(1280);
  await assertHero(390);
  await assertHero(360);

  await page.goto("/infection-control");
  await expect(page.locator("[data-rda-hero-starts]")).toHaveCount(0);
});

test("AI discovery dates match the reviewed course schedule", async ({ request }) => {
  test.skip(await servesDashboardSchedule(request), FIXTURE_PIN);
  const response = await request.get("/llms.txt");
  expect(response.ok()).toBe(true);
  const text = await response.text();
  expect(text).toContain("October 17, 2026");
  expect(text).toContain("November 20, 2026");
  expect(text).not.toContain("October 12, 2026");
  expect(text).not.toMatch(/(?:June|July|August|September) \d/);
});

// Date-relative and cross-surface consistency: holds for the committed fixture
// and for any day's dashboard schedule. Does not pin October 17 or the fixture hash.
test("served schedule matches the published upcoming revision", async ({ page, request }) => {
  const snapshot = await collectServedScheduleSnapshot(page, request);
  assertServedScheduleContract(snapshot);
  for (const warning of dashboardScheduleWarnings(snapshot)) {
    test.info().annotations.push({ type: "warning", description: warning });
    console.warn(`[course-dates] ${warning}`);
  }
});


test("combined renewal dates keep course identity, Full status and open choices separate", () => {
  const schedule = combinedRenewalDates("2026-10-29");
  expect(schedule.nextDate).toBe("Coronal Polish: November 14, 2026; Sealants: December 12, 2026");
  expect(schedule.dateGroups[0].entries.find((entry) => entry.isoDate === "2026-11-14")?.status).toBe("available");
  expect(schedule.dateGroups[1].entries.find((entry) => entry.isoDate === "2026-11-14")?.status).toBe("full");
  expect(schedule.preferredOptions).toEqual([
    "I'm flexible", "Coronal Polish: November 14, 2026", "Coronal Polish: December 12, 2026", "Sealants: December 12, 2026",
  ]);
  // Once November 14 has elapsed, no old opening or Full row survives.
  const later = combinedRenewalDates("2026-11-15");
  expect(later.nextDate).toBe("Coronal Polish: December 12, 2026; Sealants: December 12, 2026");
  expect(later.preferredOptions).toEqual(["I'm flexible", "Coronal Polish: December 12, 2026", "Sealants: December 12, 2026"]);
  expect(later.dateGroups.flatMap((group) => group.entries.map((entry) => entry.isoDate))).toEqual(["2026-12-12", "2026-12-12"]);
  const empty = combinedRenewalDates("9999-01-01");
  expect(empty.nextDate).toBe("Coronal Polish: Ask admissions; Sealants: Ask admissions");
  expect(empty.preferredOptions).toEqual(["I'm flexible"]);
  expect(empty.dateGroups.every((group) => group.entries.length === 0)).toBe(true);
});

for (const slug of ["coronal-sealants-renewal", "rda-renewal-ready"] as const) {
  for (const width of [390, 1280]) {
    test(`combined renewal ${slug} shows separate availability at ${width}px`, async ({ page, request }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(`/lp/${slug}`);
      const status = await (await request.get("/api/course-schedule-status")).json();
      const longDateFact = page.locator(".rda-ad-fact strong.rda-ad-fact-value-long");
      await expect(longDateFact).toHaveCSS("font-size", "15px");
      await expect(longDateFact).toHaveCSS("line-height", "20.25px");
      const groups = page.locator(".rda-ad-date-group");
      await expect(groups).toHaveCount(2);
      for (const [id, label] of [["coronal-polish", "Coronal Polish"], ["sealants", "Sealants"]] as const) {
        const expected = status.upcoming.filter((entry: { courseId: string }) => entry.courseId === id);
        const group = groups.filter({ has: page.locator(".rda-ad-date-group-label", { hasText: new RegExp(`^${label}$`) }) });
        const actual = await group.locator(".rda-ad-date-list > span").evaluateAll((nodes) => nodes.map((node) => ({
          isoDate: node.querySelector("time")?.getAttribute("datetime"),
          full: node.getAttribute("data-status") === "full",
          badge: node.querySelector(".rda-course-date-flag")?.textContent?.trim() ?? "",
        })));
        expect(actual).toEqual(expected.map((entry: { isoDate: string; status: string }) => ({
          isoDate: entry.isoDate, full: entry.status === "full", badge: entry.status === "full" ? "Full" : "",
        })));
        const firstOpen = expected.find((entry: { status: string }) => entry.status !== "full");
        await expect(page.locator(".rda-ad-fact").filter({ hasText: "Next date" })).toContainText(
          `${label}: ${firstOpen ? formatOpenDateLabel(id, firstOpen.isoDate) : "Ask admissions"}`,
        );
      }
      if (slug === "coronal-sealants-renewal") {
        const options = ["I'm flexible", ...(["coronal-polish", "sealants"] as const).flatMap((id) =>
          status.upcoming.filter((entry: { courseId: string; status: string }) => entry.courseId === id && entry.status !== "full")
            .map((entry: { isoDate: string }) => `${id === "sealants" ? "Sealants" : "Coronal Polish"}: ${formatOpenDateLabel(id, entry.isoDate)}`),
        )];
        expect(await page.locator('select[name="Preferred class date"] option').allTextContents()).toEqual(options);
        // Field names, endpoint identity and route attribution remain the same.
        const definition = getAdLandingPage(slug)!;
        const form = page.locator("form");
        await expect(form).toHaveAttribute("action", definition.formspreeEndpoint!);
        await expect(form.locator('input[name="form_key"]')).toHaveValue(definition.formKey!);
      }
      // The new Full rows must stay readable in both supported themes.
      for (const dark of [false, true]) {
        const contrast = await page.locator('.rda-ad-date-group [data-status="full"]').evaluateAll((nodes, dark) => {
          document.documentElement.classList.toggle("dark", dark);
          const luminance = (color: string) => {
            const channels = color.match(/[\d.]+/g)!.slice(0, 3).map((channel) => Number(channel) / 255)
              .map((channel) => channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4);
            return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
          };
          const ratio = (front: string, back: string) => {
            const values = [luminance(front), luminance(back)].sort((a, b) => b - a);
            return (values[0] + 0.05) / (values[1] + 0.05);
          };
          return nodes.map((node) => {
            const row = getComputedStyle(node), badge = getComputedStyle(node.querySelector(".rda-course-date-flag")!);
            return { date: ratio(row.color, row.backgroundColor), badge: ratio(badge.color, badge.backgroundColor) };
          });
        }, dark);
        for (const value of contrast) {
          expect(value.date).toBeGreaterThanOrEqual(4.5);
          expect(value.badge).toBeGreaterThanOrEqual(4.5);
        }
      }
      await expect(page.locator('[id="rda-ld-course-sealants"]')).toHaveCount(0);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    });
  }
}
