import { createHash } from "node:crypto";

// Shared with the dashboard: no timestamps, locale collation, or input-order dependence.
export function scheduleRevision(entries) {
  const rows = entries.map(({ courseId, isoDate, status }) => [courseId, isoDate, status]);
  rows.sort((a, b) => {
    for (let index = 0; index < 3; index += 1) {
      if (a[index] < b[index]) return -1;
      if (a[index] > b[index]) return 1;
    }
    return 0;
  });
  return createHash("sha256").update(JSON.stringify(rows)).digest("hex");
}
