import { expect, type APIRequestContext } from "@playwright/test";
import type { PublishedCourseScheduleStatus } from "@/lib/published-course-schedule";
import { activeSitePromo, isSitePromoActive } from "@/lib/site-promo";
import { localOrigin } from "./qa-helpers";

export async function publishedPromoActive(request: APIRequestContext) {
  const response = await request.get(`${localOrigin}/api/course-schedule-status`);
  expect(response.ok()).toBe(true);
  const publication: PublishedCourseScheduleStatus = await response.json();
  const course = publication.upcoming.filter((entry) => entry.courseId === activeSitePromo.courseId);
  return isSitePromoActive(activeSitePromo, Date.now(), course);
}
