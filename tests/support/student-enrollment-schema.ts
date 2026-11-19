import { readFile } from "node:fs/promises";

export const STUDENT_ENROLLMENT_MIGRATION_PATHS = [
  "db/migrations/005_student_enrollment.sql",
  "db/migrations/006_student_enrollment_review.sql",
  "db/migrations/008_dashboard_inventory.sql",
  "db/migrations/009_student_enrollment_all_courses.sql",
] as const;

export async function applyStudentEnrollmentSchema(
  exec: (sql: string) => Promise<unknown>,
) {
  for (const path of STUDENT_ENROLLMENT_MIGRATION_PATHS) {
    await exec(await readFile(path, "utf8"));
  }
}
