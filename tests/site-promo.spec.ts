import { expect, test } from "@playwright/test";
import { activeSitePromo, isSitePromoActive } from "@/lib/site-promo";

test("promoted seats must exist and be open in the published schedule", () => {
  const now = Date.parse("2026-09-29T12:00:00Z");
  expect(isSitePromoActive(activeSitePromo, now, [])).toBe(false);
  expect(isSitePromoActive(activeSitePromo, now, [{ isoDate: "2026-10-12", status: "full" }])).toBe(false);
  expect(isSitePromoActive(activeSitePromo, now, [{ isoDate: "2026-10-12", status: "available" }])).toBe(true);
});

test("promo expiry follows the academy date, independently of server timezone", () => {
  expect(isSitePromoActive(activeSitePromo, Date.parse("2026-10-13T06:59:59Z"))).toBe(true);
  expect(isSitePromoActive(activeSitePromo, Date.parse("2026-10-13T07:00:00Z"))).toBe(false);
});
