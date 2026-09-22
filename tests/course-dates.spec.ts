import { expect, test } from "@playwright/test";
import {
  COURSE_SCHEDULE_REVIEWED_ON,
  getAvailableCourseDates,
  getCourseSchedule,
  getNextAvailableCourseDate,
  getUpcomingScheduleMonths,
} from "../lib/course-schedule";
import { adLandingPages } from "../lib/ad-landing-pages";
import { suppressSitePromo } from "./support/qa-helpers";

test("reviewed schedule excludes elapsed dates without inventing sold-out history", () => {
  expect(COURSE_SCHEDULE_REVIEWED_ON).toBe("2026-09-13");
  expect(getUpcomingScheduleMonths().map((month) => month.month)).toEqual(["October", "November", "December"]);
  expect(getAvailableCourseDates("dental-assisting-program")).toEqual(["October 12, 2026", "November 20, 2026"]);
  expect(getAvailableCourseDates("bls-cpr-1")).toEqual(["October 17, 2026", "November 7, 2026", "December 5, 2026"]);
  expect(getNextAvailableCourseDate("bls-cpr-1", "2026-10-18")).toBe("November 7, 2026");
  expect(getNextAvailableCourseDate("bls-cpr-1", "2026-12-06")).toBeUndefined();
  expect(getAvailableCourseDates("infection-control")).toEqual(["November 7, 2026", "November 14, 2026", "December 5, 2026"]);
  expect(getNextAvailableCourseDate("infection-control")).toBe("November 7, 2026");
  expect(getNextAvailableCourseDate("infection-control", "2026-10-18")).toBe("November 7, 2026");
  expect(getNextAvailableCourseDate("infection-control", "2026-12-06")).toBeUndefined();
  expect(getCourseSchedule("infection-control").some((entry) => entry.isoDate === "2026-10-17")).toBe(false);
  expect(getCourseSchedule("infection-control").find((entry) => entry.isoDate === "2026-11-14")?.status).toBe("available");
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

test.beforeEach(async ({ context }) => {
  await suppressSitePromo(context);
  // This is a read-only check: no synthetic leads may reach a production inbox.
  await context.route("https://formspree.io/**", (route) => route.abort());
});

for (const width of [390, 1280]) {
  test(`homepage schedule, cards, and request choices agree at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/");
    const schedule = page.locator('[data-rda-home-course-block="schedule"]');
    await expect(schedule.getByText("Upcoming 2026 Class Schedule")).toBeVisible();
    expect(await schedule.locator("time").evaluateAll((nodes) => nodes.map((node) => node.getAttribute("datetime")))).toEqual([
      "2026-10-12", "2026-10-17", "2026-10-24", "2026-11-07", "2026-11-14", "2026-11-20", "2026-12-05", "2026-12-12",
    ]);
    await expect(page.getByText("Next open date: October 17, 2026", { exact: true })).toHaveCount(1);
    await expect(page.getByText("Next open date: November 7, 2026", { exact: true })).toHaveCount(2);
    await expect(page.getByText("Next open date: October 24, 2026", { exact: true })).toHaveCount(1);
    await expect(page.getByText("Next open date: November 14, 2026", { exact: true })).toHaveCount(1);
    await expect(page.getByText("Next open date: October 12, 2026", { exact: true })).toHaveCount(1);
    expect(await page.locator("body").innerText()).not.toMatch(/(?:June|July|August|September) \d/);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  });
}

for (const path of ["/bls-cpr-1", "/infection-control", "/radiation-safety", "/coronal-polish", "/sealants", "/dental-assisting-program", "/faqs-1", "/contact", ...adLandingPages.map((page) => page.path)]) {
  test(`current dates across ${path}`, async ({ page }) => {
    await page.goto(path);
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
  await page.goto("/infection-control");

  const policyNote = page.locator('[data-rda-live-course="infection-control"] .rda-course-policy-note');
  await policyNote.scrollIntoViewIfNeeded();
  await page.waitForTimeout(200);

  const overlap = await page.evaluate(() => {
    const copy = document.querySelector<HTMLElement>(
      '[data-rda-live-course="infection-control"] .rda-course-policy-note',
    );
    const fabs = [
      document.querySelector<HTMLElement>(".rda-whatsapp-fab"),
      document.querySelector<HTMLElement>(".live-elevenlabs-widget"),
    ].filter((node): node is HTMLElement => Boolean(node));
    const copyRect = copy?.getBoundingClientRect();

    if (!copyRect) {
      return true;
    }

    return fabs.some((fab) => {
      const fabRect = fab.getBoundingClientRect();
      return (
        copyRect.left < fabRect.right &&
        copyRect.right > fabRect.left &&
        copyRect.top < fabRect.bottom &&
        copyRect.bottom > fabRect.top
      );
    });
  });

  expect(overlap).toBe(false);

  const mainClearance = await page.locator(".rda-live-main").evaluate((element) => {
    return Number.parseFloat(getComputedStyle(element).paddingBottom);
  });
  expect(mainClearance).toBeGreaterThanOrEqual(120);
});

test("course JSON-LD omits sold-out October instances", async ({ page }) => {
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

  expect(sealantsDates).toEqual(["2026-11-14", "2026-12-12"]);
  expect(sealantsDates).not.toContain("2026-10-24");
});

test("AI discovery dates match the reviewed course schedule", async ({ request }) => {
  const response = await request.get("/llms.txt");
  expect(response.ok()).toBe(true);
  const text = await response.text();
  expect(text).toContain("October 17, 2026");
  expect(text).toContain("October 12, 2026");
  expect(text).not.toMatch(/(?:June|July|August|September) \d/);
});
