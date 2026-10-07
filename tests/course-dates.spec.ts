import { expect, test, type Page } from "@playwright/test";
import {
  COURSE_SCHEDULE_REVIEWED_ON,
  buildCourseScheduleMonths,
  getAvailableCourseDates,
  getCourseSchedule,
  getNextAvailableCourseDate,
  getUpcomingScheduleMonths,
} from "../lib/course-schedule";
import { adLandingPages } from "../lib/ad-landing-pages";
import { suppressSitePromo } from "./support/qa-helpers";
import { execFile } from "node:child_process";
import { copyFileSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { scheduleRevision } from "../lib/course-schedule-revision.mjs";
import courseScheduleData from "../data/course-schedule.json";

test("reviewed schedule excludes elapsed dates without inventing sold-out history", () => {
  expect(COURSE_SCHEDULE_REVIEWED_ON).toBe("2026-09-23");
  expect(getUpcomingScheduleMonths().map((month) => month.month)).toEqual(["October", "November", "December"]);
  expect(getAvailableCourseDates("dental-assisting-program")).toEqual(["October 12, 2026", "November 20, 2026", "December 5, 2026"]);
  expect(getAvailableCourseDates("bls-cpr-1")).toEqual(["October 17, 2026", "November 7, 2026", "December 5, 2026"]);
  expect(getNextAvailableCourseDate("bls-cpr-1", "2026-10-18")).toBe("November 7, 2026");
  expect(getNextAvailableCourseDate("bls-cpr-1", "2026-12-06")).toBeUndefined();
  expect(getAvailableCourseDates("infection-control")).toEqual([
    "October 17, 2026",
    "November 14, 2026",
    "December 5, 2026",
  ]);
  expect(getNextAvailableCourseDate("infection-control")).toBe("October 17, 2026");
  expect(getNextAvailableCourseDate("infection-control", "2026-10-18")).toBe("November 14, 2026");
  expect(getNextAvailableCourseDate("infection-control", "2026-12-06")).toBeUndefined();
  expect(getCourseSchedule("infection-control").find((entry) => entry.isoDate === "2026-10-17")?.status).toBe("available");
  expect(getCourseSchedule("infection-control").find((entry) => entry.isoDate === "2026-11-07")).toBeUndefined();
  expect(getCourseSchedule("infection-control").find((entry) => entry.isoDate === "2026-11-14")?.status).toBe("available");
  expect(getCourseSchedule("infection-control").find((entry) => entry.isoDate === "2026-12-05")?.status).toBe("available");
  expect(getCourseSchedule("bls-cpr-1").find((entry) => entry.isoDate === "2026-11-07")?.status).toBe("available");
  expect(getCourseSchedule("radiation-safety").find((entry) => entry.isoDate === "2026-11-07")?.status).toBe("available");
  expect(getAvailableCourseDates("radiation-safety")).toEqual(["November 7, 2026", "December 5, 2026"]);
  expect(getNextAvailableCourseDate("radiation-safety", "2026-10-18")).toBe("November 7, 2026");
  expect(getNextAvailableCourseDate("radiation-safety", "2026-12-06")).toBeUndefined();
  expect(getAvailableCourseDates("coronal-polish")).toEqual(["October 24, 2026", "November 14, 2026", "December 12, 2026"]);
  expect(getAvailableCourseDates("sealants")).toEqual(["November 14, 2026", "December 12, 2026"]);
  expect(getNextAvailableCourseDate("dental-assisting-program", "2026-09-12")).toBe("October 12, 2026");
  expect(getNextAvailableCourseDate("bls-cpr-1", "2026-10-17")).toBe("October 17, 2026");
  expect(getNextAvailableCourseDate("radiation-safety", "2026-10-17")).toBe("November 7, 2026");
  expect(getNextAvailableCourseDate("sealants", "2026-10-24")).toBe("November 14, 2026");
  expect(getCourseSchedule("bls-cpr-1").find((entry) => entry.isoDate === "2026-08-01")?.status).toBe("available");
  expect(getCourseSchedule("sealants").find((entry) => entry.isoDate === "2026-10-24")?.status).toBe("full");
  expect(getCourseSchedule("coronal-polish").find((entry) => entry.isoDate === "2026-10-24")?.status).toBe("available");
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
  expect(await response.json()).toEqual({
    version: 1,
    revision: scheduleRevision(courseScheduleData.entries),
    reviewedOn: courseScheduleData.reviewedOn,
    source: courseScheduleData.source,
  });
});

test.beforeEach(async ({ context }) => {
  await suppressSitePromo(context);
  // This is a read-only check: no synthetic leads may reach a production inbox.
  await context.route("https://formspree.io/**", (route) => route.abort());
});

async function gotoPage(page: Page, path: string) {
  // Ad landers and public pages can stall on third-party `load` (pixels, fonts).
  // Date assertions only need DOM + JSON-LD, matching smoke/preview navigation.
  await page.goto(path, { timeout: 120_000, waitUntil: "domcontentloaded" });
}

for (const width of [390, 1280]) {
  test(`homepage schedule, cards, and request choices agree at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await gotoPage(page, "/");
    const schedule = page.locator('[data-rda-home-course-block="schedule"]');
    await expect(schedule.getByText("Upcoming 2026 Class Schedule")).toBeVisible();
    expect(await schedule.locator("time").evaluateAll((nodes) => nodes.map((node) => node.getAttribute("datetime")))).toEqual([
      "2026-10-12", "2026-10-17", "2026-10-24", "2026-11-07", "2026-11-14", "2026-11-20", "2026-12-05", "2026-12-12",
    ]);
    await expect(page.getByText("Next open date: October 17, 2026", { exact: true })).toHaveCount(2);
    await expect(page.getByText("Next open date: November 7, 2026", { exact: true })).toHaveCount(1);
    await expect(page.getByText("Next open date: October 24, 2026", { exact: true })).toHaveCount(1);
    await expect(page.getByText("Next open date: November 14, 2026", { exact: true })).toHaveCount(1);
    await expect(page.getByText("Next open date: October 12, 2026", { exact: true })).toHaveCount(1);
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

for (const path of ["/bls-cpr-1", "/infection-control", "/radiation-safety", "/coronal-polish", "/sealants", "/dental-assisting-program", "/faqs-1", "/contact", ...adLandingPages.map((page) => page.path)]) {
  test(`current dates across ${path}`, async ({ page }) => {
    await gotoPage(page, path);
    const body = await page.locator("body").innerText();
    expect(body).not.toMatch(/(?:June|July|August|September) \d/);
    expect(body).not.toContain("next available date is August");
    const schemaDates = await page.locator('script[type="application/ld+json"]').allTextContents();
    for (const schema of schemaDates) {
      for (const match of schema.matchAll(/"startDate":"([^"]+)"/g)) {
        expect(match[1] >= COURSE_SCHEDULE_REVIEWED_ON).toBe(true);
      }
    }
  });
}

test("infection-control mobile FABs do not cover course copy", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await gotoPage(page, "/infection-control");

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
    await copyOverlapsFabs('[data-rda-live-course="infection-control"] h1 + .rounded-lg p'),
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

test("course JSON-LD omits sold-out October instances", async ({ page }) => {
  await gotoPage(page, "/radiation-safety");
  const radiationSchema = JSON.parse(
    (await page.locator("#rda-ld-course-radiation-safety").textContent()) ?? "{}",
  ) as { hasCourseInstance?: Array<{ startDate?: string; eventStatus?: string }> };
  const radiationDates = (radiationSchema.hasCourseInstance ?? []).map((entry) => entry.startDate);

  expect(radiationDates).toEqual(["2026-11-07", "2026-12-05"]);
  expect(radiationDates).not.toContain("2026-10-17");

  await gotoPage(page, "/sealants");
  const sealantsSchema = JSON.parse(
    (await page.locator("#rda-ld-course-sealants").textContent()) ?? "{}",
  ) as { hasCourseInstance?: Array<{ startDate?: string; eventStatus?: string }> };
  const sealantsDates = (sealantsSchema.hasCourseInstance ?? []).map((entry) => entry.startDate);

  expect(sealantsDates).toEqual(["2026-11-14", "2026-12-12"]);
  expect(sealantsDates).not.toContain("2026-10-24");

  // Open dates on a shared day stay listed: Infection Control keeps October 17
  // even though X-rays / Radiation Safety is full that day.
  await gotoPage(page, "/infection-control");
  const infectionSchema = JSON.parse(
    (await page.locator("#rda-ld-course-infection-control").textContent()) ?? "{}",
  ) as { hasCourseInstance?: Array<{ startDate?: string }> };
  expect((infectionSchema.hasCourseInstance ?? []).map((entry) => entry.startDate)).toEqual([
    "2026-10-17",
    "2026-11-14",
    "2026-12-05",
  ]);
  expect((infectionSchema.hasCourseInstance ?? []).map((entry) => entry.startDate)).not.toContain("2026-11-07");
});

test("infection-control page and FAQs omit November 7 while keeping later dates", async ({ page }) => {
  await gotoPage(page, "/infection-control");
  const upcomingDates = page.locator('[data-rda-live-course="infection-control"] .rda-course-date');
  await expect(upcomingDates.getByText("October 17, 2026")).toHaveCount(1);
  await expect(upcomingDates.getByText("November 7, 2026")).toHaveCount(0);
  await expect(upcomingDates.getByText("November 14, 2026")).toHaveCount(1);
  await expect(upcomingDates.getByText("December 5, 2026")).toHaveCount(1);

  await gotoPage(page, "/faqs-1");
  const faqBody = await page.locator("body").innerText();
  expect(faqBody).toContain("Infection Control: October 17, 2026; November 14, 2026; December 5, 2026");
  expect(faqBody).not.toContain("Infection Control: October 17, 2026; November 7, 2026");
});

test("AI discovery dates match the reviewed course schedule", async ({ request }) => {
  const response = await request.get("/llms.txt");
  expect(response.ok()).toBe(true);
  const text = await response.text();
  expect(text).toContain("October 17, 2026");
  expect(text).toContain("October 12, 2026");
  expect(text).not.toMatch(/(?:June|July|August|September) \d/);
});
