import { expect, test } from "@playwright/test";
import { blockOpenAIAdsPixelNetwork } from "./support/qa-helpers";
import {
  assertServedScheduleContract,
  collectServedScheduleSnapshot,
  servedSnapshotTodayLA,
} from "./support/course-schedule-contract";
import { withIsolatedSchedule } from "./support/isolated-schedule";

// Exercise real consumers in an isolated Next app, not by editing the checkout's
// schedule while another build or developer may be reading it.
test("an intentionally empty feed renders no stale dates or CourseInstances", async ({ page, request }) => {
  test.setTimeout(180_000);
  await blockOpenAIAdsPixelNetwork(page.context());
  await withIsolatedSchedule(
    (data) => ({ ...data, source: "dashboard", entries: [] }),
    async (origin) => {
      const status = await (await request.get(`${origin}/api/course-schedule-status`)).json();
      expect(status).toMatchObject({
        source: "dashboard",
        revision: "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
        upcomingRevision: "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
        upcoming: [],
        empty: true,
      });
      await page.route("https://formspree.io/**", (route) => route.abort());
      await page.goto(origin);
      await expect(page.locator("[data-rda-promo-banner='true']")).toHaveCount(0);
      await expect(page.locator("[data-rda-promo-dialog='true']")).toHaveCount(0);
      const schedule = page.locator('[data-rda-home-course-block="schedule"]');
      await expect(schedule.getByText("Ask admissions for upcoming dates.")).toBeVisible();
      await expect(schedule.locator("time")).toHaveCount(0);
      for (const course of ["bls-cpr-1", "radiation-safety", "coronal-polish", "sealants", "infection-control", "dental-assisting-program"]) {
        await page.goto(`${origin}/${course}`);
        await expect(page.locator(".rda-course-date")).toHaveCount(0);
        await expect(page.locator("[data-rda-hero-starts]")).toHaveCount(0);
        await expect(page.getByText("Ask admissions", { exact: true })).toBeVisible();
        const schemas = await page.locator('script[type="application/ld+json"]').evaluateAll((scripts) => scripts.map((script) => JSON.parse(script.textContent ?? "{}")));
        const courseSchema = schemas.find((schema) => schema["@type"] === "Course");
        expect(courseSchema, course).toBeDefined();
        expect(courseSchema.hasCourseInstance, course).toEqual([]);
      }
    },
  );
});

test("a dashboard build whose stored dates are all in the past publishes empty and asks admissions", async ({ page, request }) => {
  test.setTimeout(180_000);
  await blockOpenAIAdsPixelNetwork(page.context());
  await withIsolatedSchedule(
    (data) => {
      const lastDate = data.entries.reduce((latest, entry) => (entry.isoDate > latest ? entry.isoDate : latest), "0000-01-01");
      const [year, month, day] = lastDate.split("-").map(Number);
      const reviewedOn = new Date(Date.UTC(year, month - 1, day + 1)).toISOString().slice(0, 10);
      return { ...data, source: "dashboard", reviewedOn, builtOn: reviewedOn };
    },
    async (origin) => {
      const status = await (await request.get(`${origin}/api/course-schedule-status`)).json();
      expect(status.empty).toBe(true);
      expect(status.upcoming).toEqual([]);
      expect(status.source).toBe("dashboard");
      await page.route("https://formspree.io/**", (route) => route.abort());
      await page.goto(origin);
      const schedule = page.locator('[data-rda-home-course-block="schedule"]');
      await expect(schedule.getByText("Ask admissions for upcoming dates.")).toBeVisible();
      await expect(schedule.locator("time")).toHaveCount(0);
      await expect(page.locator(".rda-home-schedule-date-row")).toHaveCount(0);
      for (const course of ["bls-cpr-1", "radiation-safety", "coronal-polish", "sealants", "infection-control", "dental-assisting-program"]) {
        await page.goto(`${origin}/${course}`);
        await expect(page.locator(".rda-course-date")).toHaveCount(0);
        await expect(page.locator("[data-rda-hero-starts]")).toHaveCount(0);
        await expect(page.getByText("Ask admissions", { exact: true })).toBeVisible();
        await expect(page.getByText("Call the office for upcoming class dates.")).toBeVisible();
      }
    },
  );
});

test("a fresh dashboard fixture feed satisfies the served contract", async ({ page, request }) => {
  test.setTimeout(180_000);
  await blockOpenAIAdsPixelNetwork(page.context());
  const todayLA = servedSnapshotTodayLA();
  await withIsolatedSchedule(
    (data) => ({
      ...data,
      source: "dashboard",
      reviewedOn: todayLA,
      builtOn: todayLA,
    }),
    async (origin) => {
      await page.route("https://formspree.io/**", (route) => route.abort());
      const snapshot = await collectServedScheduleSnapshot(page, request, { origin, previewUrl: true });
      console.log(`[course-dates] schedule branch: ${snapshot.status.source}`);
      expect(snapshot.status.source).toBe("dashboard");
      expect(snapshot.status.builtOn).toBe(todayLA);
      expect(snapshot.status.reviewedOn).toBe(todayLA);
      expect(snapshot.status.empty).toBe(snapshot.status.upcoming.length === 0);
      assertServedScheduleContract(snapshot);
    },
  );
});
