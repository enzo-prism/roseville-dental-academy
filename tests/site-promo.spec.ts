import { expect, test } from "@playwright/test";
import { getCourseSchedule, getLastOfYearOpenStart, isLastScheduledStartOfYear } from "@/lib/course-schedule";
import { activeSitePromo, isSitePromoActive } from "@/lib/site-promo";

test("bundled Dental Assisting Dec 5 start is listed, open, and the last 2026 start", () => {
  const schedule = getCourseSchedule("dental-assisting-program");
  const entry = schedule.find((item) => item.isoDate === "2026-12-05");

  expect(entry).toBeDefined();
  expect(entry?.status).not.toBe("full");
  expect(isLastScheduledStartOfYear("2026-12-05", schedule)).toBe(true);
  expect(activeSitePromo.courseId).toBe("dental-assisting-program");
  expect(activeSitePromo.startDate).toBe("2026-12-05");
  expect(activeSitePromo.lastOfYear).toBe(true);
  expect(activeSitePromo.id).toBe("rda-promo-da-2026-12-05-last");
  expect(activeSitePromo.storageKey).toBe("rda-promo-da-2026-12-05-last");
});

test("promoted seats must exist and be open in the published schedule", () => {
  const now = Date.parse("2026-11-13T12:00:00Z");
  expect(isSitePromoActive(activeSitePromo, now, [])).toBe(false);
  expect(isSitePromoActive(activeSitePromo, now, [{ isoDate: "2026-12-05", status: "full" }])).toBe(false);
  expect(isSitePromoActive(activeSitePromo, now, [{ isoDate: "2026-12-05", status: "available" }])).toBe(true);
});

test("the last-class claim switches off when a later start that year is scheduled", () => {
  const now = Date.parse("2026-11-13T12:00:00Z");
  const withLaterStart = [
    { isoDate: "2026-12-05", status: "available" },
    { isoDate: "2026-12-19", status: "full" },
  ];
  expect(isSitePromoActive(activeSitePromo, now, withLaterStart)).toBe(false);
  // A start in the next year does not make Dec 5 any less the last of 2026.
  expect(isSitePromoActive(activeSitePromo, now, [
    { isoDate: "2026-12-05", status: "available" },
    { isoDate: "2027-01-08", status: "available" },
  ])).toBe(true);
  expect(isLastScheduledStartOfYear("2026-11-20", [{ isoDate: "2026-11-20" }, { isoDate: "2026-12-05" }])).toBe(false);
  expect(isLastScheduledStartOfYear("2026-12-05", [{ isoDate: "2026-11-20" }])).toBe(false);
});

test("last-of-year start is the next open start only once earlier starts are past or full", () => {
  // Bundled fixture: Nov 20 open, Dec 5 open. Before Nov 20 the next open start is not the year's last.
  expect(getLastOfYearOpenStart("dental-assisting-program", "2026-11-13")).toBeUndefined();
  expect(getLastOfYearOpenStart("dental-assisting-program", "2026-11-21")).toEqual({ isoDate: "2026-12-05", year: "2026" });
});

test("promo expiry follows the academy date, independently of server timezone", () => {
  expect(isSitePromoActive(activeSitePromo, Date.parse("2026-12-06T07:59:59Z"))).toBe(true);
  expect(isSitePromoActive(activeSitePromo, Date.parse("2026-12-06T08:00:00Z"))).toBe(false);
});
