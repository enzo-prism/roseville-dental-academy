import { expect, test } from "@playwright/test";
import { getCourseSchedule } from "@/lib/course-schedule";
import { activeSitePromo, isSitePromoActive } from "@/lib/site-promo";

test("bundled Dental Assisting Nov 20 start is listed and not full", () => {
  const entry = getCourseSchedule("dental-assisting-program").find((item) => item.isoDate === "2026-11-20");

  expect(entry).toBeDefined();
  expect(entry?.status).not.toBe("full");
  expect(activeSitePromo.courseId).toBe("dental-assisting-program");
  expect(activeSitePromo.startDate).toBe("2026-11-20");
  expect(activeSitePromo.id).toBe("rda-promo-da-2026-11-20");
  expect(activeSitePromo.storageKey).toBe("rda-promo-da-2026-11-20");
});

test("promoted seats must exist and be open in the published schedule", () => {
  const now = Date.parse("2026-09-29T12:00:00Z");
  expect(isSitePromoActive(activeSitePromo, now, [])).toBe(false);
  expect(isSitePromoActive(activeSitePromo, now, [{ isoDate: "2026-11-20", status: "full" }])).toBe(false);
  expect(isSitePromoActive(activeSitePromo, now, [{ isoDate: "2026-11-20", status: "available" }])).toBe(true);
});

test("promo expiry follows the academy date, independently of server timezone", () => {
  expect(isSitePromoActive(activeSitePromo, Date.parse("2026-11-21T07:59:59Z"))).toBe(true);
  expect(isSitePromoActive(activeSitePromo, Date.parse("2026-11-21T08:00:00Z"))).toBe(false);
});
