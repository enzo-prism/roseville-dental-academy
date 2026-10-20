import { expect, type APIRequestContext } from "@playwright/test";
import data from "../../data/course-schedule.json";
import { scheduleRevision } from "../../lib/course-schedule-revision.mjs";
import {
  courseScheduleCourseDetails, getAvailableCourseDates, getNextAvailableCourseDate,
  getUpcomingCourseSchedule, getUpcomingScheduleMonths, type CourseScheduleId,
} from "../../lib/course-schedule";
import { homepageCourseSections } from "../../lib/homepage-course-sections";
import { signupInterestOptions } from "../../lib/site-data";
import { getSeasonalLocalDate } from "../../lib/site-seasonal";

export const scheduleIds = Object.keys(courseScheduleCourseDetails) as CourseScheduleId[];
export const academyDate = (now: Date) => getSeasonalLocalDate(now, "America/Los_Angeles");

export function validatePublishedSchedule(value: unknown, now = new Date()) {
  expect(value).toEqual({
    version: 1, revision: scheduleRevision(data.entries),
    reviewedOn: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/u),
    source: expect.stringMatching(/^(committed|dashboard)$/u),
  });
  const published = value as { reviewedOn: string; source: string };
  expect(new Date(`${published.reviewedOn}T12:00:00Z`).toISOString().slice(0, 10)).toBe(published.reviewedOn);
  if (published.source === "dashboard") {
    expect(published.reviewedOn >= data.reviewedOn).toBe(true);
    expect(published.reviewedOn <= academyDate(now)).toBe(true);
  } else {
    expect(published.reviewedOn).toBe(data.reviewedOn);
  }
  return published.reviewedOn;
}

export async function publishedCutoff(request: APIRequestContext) {
  const response = await request.get("/api/course-schedule-status");
  expect(response.status()).toBe(200);
  expect(response.headers()["cache-control"]).toContain("no-store");
  return validatePublishedSchedule(await response.json());
}

export function nextDateCounts(cutoff: string) {
  const counts = new Map<string, number>();
  for (const id of scheduleIds) {
    const date = getNextAvailableCourseDate(id, cutoff);
    const label = date ? `Next open date: ${date}` : "Ask admissions for current availability";
    counts.set(label, (counts.get(label) ?? 0) + 1);
  }
  return counts;
}

const normalize = (text: string) => text.replace(/\s+/g, " ").trim();
export function homeScheduleText(cutoff: string) {
  const months = getUpcomingScheduleMonths(cutoff);
  return months.length ? months.map(month => `${month.month} ${month.entries.map(entry =>
    `${entry.day} ${entry.courses.map(course => `${course.label}${course.status === "full" ? " FULL" : ""}`).join(" ")}`,
  ).join(" ")}`).join(" ") : "Ask admissions for upcoming dates.";
}

// Project only approved schedule-derived text and the exact homepage schedule
// link subsequence. All other committed parity fields remain byte-for-byte locked.
export function projectScheduleBaseline<T extends { bodyText: string; links: Array<{ href: string; text: string }> }>(baseline: T, cutoff: string, path: string): T {
  if (cutoff === data.reviewedOn) return baseline;
  let bodyText = baseline.bodyText;
  const replacements: Array<[string, string]> = [];
  for (const id of scheduleIds) {
    const before = getUpcomingCourseSchedule(id, data.reviewedOn);
    const after = getUpcomingCourseSchedule(id, cutoff);
    const availableBefore = getAvailableCourseDates(id, data.reviewedOn).join("; ");
    const availableAfter = getAvailableCourseDates(id, cutoff).join("; ") || "Ask admissions for current availability";
    const nextBefore = getNextAvailableCourseDate(id, data.reviewedOn);
    const nextAfter = getNextAvailableCourseDate(id, cutoff);
    if (availableBefore) replacements.push([availableBefore, availableAfter]);
    const dates = (rows: typeof before) => rows.map(row => `${row.date}${row.status === "full" ? " (Full)" : ""}`).join("; ");
    if (dates(before)) replacements.push([`Class date(s) ${dates(before)}.`, `Class date(s) ${dates(after)}.`]);
    const panel = (rows: typeof before) => rows.length ? `Upcoming Class Dates ${rows.map(row => `${row.date}${row.status === "full" ? " FULL" : ""}`).join(" ")} ` : "";
    if (panel(before)) replacements.push([panel(before), panel(after)]);
    if (nextBefore && nextBefore !== nextAfter) {
      const option = signupInterestOptions.find(option => option.scheduleId === id);
      if (option) replacements.push([
        `${option.label} Next open date: ${nextBefore}`,
        `${option.label} ${nextAfter ? `Next open date: ${nextAfter}` : "Ask admissions for current availability"}`,
      ]);
      const decodedPath = decodeURIComponent(path).slice(1);
      if ((decodedPath === "bls/cpr-1" ? "bls-cpr-1" : decodedPath) === id) replacements.push([
        `Next available date: ${nextBefore}.`,
        nextAfter ? `Next available date: ${nextAfter}.` : "Ask admissions for upcoming dates.",
      ]);
      if (path === "/") {
        const card = homepageCourseSections.standaloneGroups.flatMap(group => [...group.courses]).find(card => card.scheduleId === id);
        if (card) replacements.push([
          `${card.title} ${card.price} Next: ${nextBefore}`,
          `${card.title} ${card.price}${nextAfter ? ` Next: ${nextAfter}` : ""}`,
        ]);
      }
    }
  }

  // Lists must be replaced before individual next-date values to avoid partial edits.
  for (const [before, after] of [...new Map(replacements).entries()].sort((a,b) => b[0].length-a[0].length)) bodyText = bodyText.split(before).join(after);
  let links = baseline.links;
  if (path === "/") {
    bodyText = bodyText.replace(homeScheduleText(data.reviewedOn), homeScheduleText(cutoff));
    const scheduleLinks = (date: string) => getUpcomingScheduleMonths(date).flatMap(month => month.entries.flatMap(entry => entry.courses.map(course => ({ href: courseScheduleCourseDetails[course.id].href, text: course.label }))));
    const before = scheduleLinks(data.reviewedOn);
    const start = links.findIndex((_, index) => JSON.stringify(links.slice(index, index + before.length)) === JSON.stringify(before));
    expect(start, "Committed homepage schedule link sequence must remain identifiable").toBeGreaterThanOrEqual(0);
    links = [...links.slice(0, start), ...scheduleLinks(cutoff), ...links.slice(start + before.length)];
  }
  return { ...baseline, bodyText: normalize(bodyText), links };
}
