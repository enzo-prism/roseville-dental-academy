import { parseArgs } from "node:util";
import { pathToFileURL } from "node:url";
import { readFile } from "node:fs/promises";

export const seedCourses = {
  "infection-control": { amount: 39500, capacity: 12 },
  "bls-cpr-1": { amount: 8500, capacity: 12 },
  "radiation-safety": { amount: 69500, capacity: 12 },
  "coronal-polish": { amount: 50000, capacity: 12 },
  sealants: { amount: 55000, capacity: 12 },
  "dental-assisting-program": { amount: 250000, capacity: 12 },
  "dental-front-desk-program": { amount: 249500, capacity: 12 },
};

function studentOfferingSeedSql(feed, legacy, mode, now = new Date()) {
  if (mode !== "test" && mode !== "live") throw new Error("Use --mode test or --mode live");
  if (feed?.version !== 1 || !Array.isArray(feed.entries)) throw new Error("Invalid schedule");
  const policy = legacy.match(/'(\d{4}-\d{2}-\d{2})',\s*'([a-f0-9]{64})',\s*(\$policy\$[\s\S]*?\$policy\$)/);
  if (!policy) throw new Error("Reviewed policy missing from the existing seed");
  const [, policyVersion, policyHash, policyText] = policy;
  const today = new Intl.DateTimeFormat("sv-SE", { timeZone: "America/Los_Angeles", dateStyle: "short" }).format(now);
  const applicationName = mode === "test" ? "rda-student-offering-seed-isolated" : "rda-student-offering-seed";

  const rows = [];
  for (const { courseId, isoDate, status } of feed.entries) {
    if (status !== "open" || !Object.hasOwn(seedCourses, courseId)) continue;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(isoDate) || new Date(isoDate).toISOString().slice(0, 10) !== isoDate)
      throw new Error("Invalid schedule date");
    if (isoDate <= today) continue;
    const { amount, capacity } = seedCourses[courseId];
    rows.push(`(gen_random_uuid(),'${mode}','${courseId}','${isoDate}',${amount},'usd',${capacity},0,'${policyVersion}','${policyHash}',${policyText},now(),'Generated schedule seed. Confirm offline inventory before live activation',${mode === "test"})`);
  }

  return `-- Review this SQL and follow docs/student-payments.md before applying.
-- SET application_name = '${applicationName}';
BEGIN;
DO $guard$
BEGIN
  IF current_setting('application_name', true) IS DISTINCT FROM '${applicationName}' THEN
    RAISE EXCEPTION 'Refusing to seed student offerings without the reviewed application_name';
  END IF;
END
$guard$;
${rows.length ? `INSERT INTO student_enrollment_offerings
  (id,mode,course_id,course_date,amount,currency,capacity,external_seats,policy_version,policy_hash,policy_text,reviewed_at,review_reference,enabled)
VALUES
${rows.join(",\n")}
ON CONFLICT (mode, course_id, course_date) DO NOTHING;` : "-- No eligible future dates."}
COMMIT;`;
}

async function main() {
  const { values: { mode, schedule } } = parseArgs({
    options: { mode: { type: "string" }, schedule: { type: "string" } },
  });
  const [feed, legacy] = await Promise.all([
    readFile(schedule ?? new URL("../data/course-schedule.json", import.meta.url), "utf8"),
    readFile(new URL("../db/seeds/infection-control-offerings.sql", import.meta.url), "utf8"),
  ]);
  console.log(studentOfferingSeedSql(JSON.parse(feed), legacy, mode));
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
