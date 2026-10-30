import { test, expect } from "@playwright/test";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { scheduleRevision } from "../lib/course-schedule-revision.mjs";
import registry from "./baselines/live/visual/calendar/registry.json";
import { selectVisualCalendarBaseline } from "./support/visual-calendar-baseline";

const reference = registry.baselines[0];
const published = reference.publicationAtCapture;
const fallback = "tests/baselines/live/visual/linux/home-mobile.png";
function select(publication: unknown = published, overrides: Record<string, unknown> = {}) {
  return selectVisualCalendarBaseline({ baselinePath: fallback, localPath: "/", viewportLabel: "mobile", platform: "linux", remote: true, publication, registry, ...overrides });
}

test("committed-data remote page keeps the existing platform reference", () => {
  expect(select({ ...published, source: "committed" })).toEqual({ baselinePath: fallback });
});
test("local and non-home/mobile checks retain the existing platform reference without a publication read", () => {
  for (const overrides of [{ remote: false }, { localPath: "/photos" }, { viewportLabel: "desktop" }]) {
    expect(select(undefined, overrides)).toEqual({ baselinePath: fallback });
  }
});
test("reviewed dashboard publication selects only its exact Linux reference and verifies stored image integrity", () => {
  expect(select()).toEqual({ baselinePath: reference.baselinePath, imageSha256: reference.imageSha256 });
  expect(createHash("sha256").update(readFileSync(reference.baselinePath)).digest("hex")).toBe(reference.imageSha256);
});
test("same visible publication does not need a new image for another cutoff or entry order", () => {
  expect(select({ ...published, reviewedOn: "2026-10-30", builtOn: "2026-10-30", upcoming: [...published.upcoming].reverse() })).toEqual(select());
});
test("an unreviewed platform cannot silently use a different platform or the frozen image", () => {
  expect(() => select(published, { platform: "darwin" })).toThrow(/No unique reviewed darwin/);
});
test("a valid but changed dashboard publication fails for explicit review", () => {
  const changed = structuredClone(published);
  changed.upcoming[0].status = changed.upcoming[0].status === "open" ? "full" : "open";
  changed.upcomingRevision = scheduleRevision(changed.upcoming);
  expect(() => select(changed)).toThrow(/No unique reviewed linux/);
});
test("a declared known revision cannot hide changed rows", () => {
  const changed = structuredClone(published);
  changed.upcoming[0].status = "full";
  expect(() => select(changed)).toThrow(/revision does not match/);
});
test("missing remote publication fails closed", () => {
  expect(() => select(undefined, { publication: undefined })).toThrow(/Invalid published/);
});
for (const [name, mutate] of [
  ["unknown source", () => ({ ...published, source: "unknown" })],
  ["invalid calendar date", () => ({ ...published, reviewedOn: "2026-02-30" })],
  ["missing build cutoff", () => ({ ...published, builtOn: "" })],
  ["malformed revision", () => ({ ...published, upcomingRevision: "not-a-hash" })],
  ["wrong empty flag", () => ({ ...published, empty: true })],
  ["unexpected course", () => ({ ...published, upcoming: [{ ...published.upcoming[0], courseId: "unknown-course" }] })],
  ["invalid status", () => ({ ...published, upcoming: [{ ...published.upcoming[0], status: "available" }] })],
  ["duplicate class", () => ({ ...published, upcoming: [...published.upcoming, published.upcoming[0]] })],
] as const) {
  test(`malformed published schedule fails closed: ${name}`, () => {
    expect(() => select(mutate())).toThrow(/Invalid|Duplicate/);
  });
}
test("ambiguous registrations and unsafe image paths fail closed", () => {
  expect(() => select(published, { registry: { ...registry, baselines: [reference, reference] } })).toThrow(/No unique reviewed/);
  expect(() => select(published, { registry: { ...registry, baselines: [{ ...reference, baselinePath: "../other.png" }] } })).toThrow(/Invalid reviewed/);
});
