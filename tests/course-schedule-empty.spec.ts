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

function shiftReviewedDate(isoDate: string, days: number) {
  const [year, month, day] = isoDate.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day + days)).toISOString().slice(0, 10);
}

function markUpcomingDentalAssisting(
  data: {
    entries: Array<{ courseId: string; isoDate: string; status: string }>;
    reviewedOn: string;
    source: string;
  },
  status: "full" | "cancelled",
) {
  const entries = data.entries.map((entry) =>
    entry.courseId === "dental-assisting-program" && entry.isoDate >= data.reviewedOn
      ? { ...entry, status }
      : entry,
  );
  if (!entries.some((entry) => entry.courseId === "dental-assisting-program" && entry.isoDate >= data.reviewedOn)) {
    entries.push(
      { courseId: "dental-assisting-program", isoDate: shiftReviewedDate(data.reviewedOn, 14), status },
      { courseId: "dental-assisting-program", isoDate: shiftReviewedDate(data.reviewedOn, 28), status },
    );
  }
  return entries;
}

for (const source of ["committed", "dashboard"] as const) {
  test(`all-full DA ${source} schedule hides chips and shows Ask admissions`, async ({ page, request }) => {
    test.setTimeout(180_000);
    await blockOpenAIAdsPixelNetwork(page.context());
    await withIsolatedSchedule(
      (data) => ({ ...data, source, entries: markUpcomingDentalAssisting(data, "full") }),
      async (origin) => {
        const status = await (await request.get(`${origin}/api/course-schedule-status`)).json();
        expect(status.source).toBe(source);
        expect(status.upcoming.filter((entry: { courseId: string; status: string }) => entry.courseId === "dental-assisting-program")).toEqual(
          expect.arrayContaining([expect.objectContaining({ status: "full" })]),
        );
        expect(
          status.upcoming.some(
            (entry: { courseId: string; status: string }) =>
              entry.courseId === "dental-assisting-program" && entry.status !== "full",
          ),
        ).toBe(false);
        await page.route("https://formspree.io/**", (route) => route.abort());
        await page.goto(`${origin}/dental-assisting-program`);
        await expect(page.locator("[data-rda-hero-starts]")).toHaveCount(0);
        await expect(page.getByText("Ask admissions", { exact: true })).toBeVisible();
        await expect(page.locator(".ac-course-facts dt", { hasText: "Next class" })).toBeVisible();
        const schema = JSON.parse((await page.locator("#rda-ld-course-dental-assisting-program").textContent()) ?? "{}");
        expect(schema.hasCourseInstance).toEqual([]);
        await page.goto(`${origin}/lp/dental-assisting-enroll`);
        await expect(page.locator("[data-rda-lander-badge]")).toHaveText("Next start: Ask admissions");
        const llms = await (await request.get(`${origin}/llms.txt`)).text();
        expect(llms).toMatch(/Upcoming starts: Ask admissions for current availability/u);
      },
    );
  });
}

test("cancelled DA dates drop off the hero, lander, JSON-LD, and llms.txt", async ({ page, request }) => {
  test.setTimeout(180_000);
  await blockOpenAIAdsPixelNetwork(page.context());
    await withIsolatedSchedule(
    (data) => {
      const cancelledIso = shiftReviewedDate(data.reviewedOn, 7);
      const openIso = shiftReviewedDate(data.reviewedOn, 21);
      const entries = data.entries
        .filter((entry) => !(entry.courseId === "dental-assisting-program" && entry.isoDate >= data.reviewedOn))
        .concat([
          { courseId: "dental-assisting-program", isoDate: cancelledIso, status: "cancelled" },
          { courseId: "dental-assisting-program", isoDate: openIso, status: "open" },
        ]);
      return { ...data, source: "committed", entries };
    },
    async (origin) => {
      const status = await (await request.get(`${origin}/api/course-schedule-status`)).json();
      const cancelledIso = shiftReviewedDate(status.reviewedOn, 7);
      const openIso = shiftReviewedDate(status.reviewedOn, 21);
      const da = status.upcoming.filter((entry: { courseId: string }) => entry.courseId === "dental-assisting-program");
      expect(da).toEqual([expect.objectContaining({ isoDate: openIso, status: "open" })]);
      await page.route("https://formspree.io/**", (route) => route.abort());
      await page.goto(`${origin}/dental-assisting-program`);
      await expect(page.locator(`time[datetime="${cancelledIso}"]`)).toHaveCount(0);
      await expect(page.locator(`[data-rda-hero-starts] time[datetime="${openIso}"]`)).toHaveCount(1);
      const schema = JSON.parse((await page.locator("#rda-ld-course-dental-assisting-program").textContent()) ?? "{}");
      expect((schema.hasCourseInstance ?? []).map((entry: { startDate: string }) => entry.startDate)).toEqual([openIso]);
      await page.goto(`${origin}/lp/dental-assisting-enroll`);
      await expect(page.locator("[data-rda-lander-badge]")).not.toContainText(cancelledIso);
      const llms = await (await request.get(`${origin}/llms.txt`)).text();
      const cancelledLabel = new Date(`${cancelledIso}T00:00:00Z`).toLocaleDateString("en-US", {
        day: "numeric",
        month: "long",
        timeZone: "UTC",
        year: "numeric",
      });
      expect(llms).not.toContain(cancelledLabel);
      expect(llms).toContain(
        new Date(`${openIso}T00:00:00Z`).toLocaleDateString("en-US", {
          day: "numeric",
          month: "long",
          timeZone: "UTC",
          year: "numeric",
        }),
      );
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
