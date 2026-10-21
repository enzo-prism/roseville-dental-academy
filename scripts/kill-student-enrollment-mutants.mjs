// Applies one source mutant at a time, runs the student suite + lock suite,
// records that the mutant is killed, then restores the file.
import { spawn } from "node:child_process";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const logPath = resolve(root, "evidence/student-enrollment-mutants.log");

const mutants = [
  {
    id: "M24",
    file: "app/api/student-enrollment/checkout/route.ts",
    find: "          if (!recovered && !isStudentIdempotencyConflict(error))\n            await releaseUnboundStudentHold(held.id);",
    replace:
      "          if (!recovered)\n            await releaseUnboundStudentHold(held.id);",
  },
  {
    id: "M26",
    file: "db/migrations/005_student_enrollment.sql",
    find: "  IF held.status<>'reserved' OR held.stripe_session_id IS NOT NULL THEN\n    RETURN NEXT held; RETURN;\n  END IF;\n",
    replace: "",
  },
  {
    id: "M27",
    file: "lib/student-enrollment-stripe.ts",
    find: '      if (held.status === "paid" || held.status === "refunded")\n        return getStudentEnrollment(id);\n',
    replace: "",
  },
  {
    id: "M30",
    file: "lib/student-enrollment.ts",
    find: "        config.mode !== \"live\" || isCanonicalInfectionControlDate(row.course_date),",
    replace: "        true,",
  },
  {
    id: "M32",
    file: "lib/student-enrollment.ts",
    find: "    WHERE e.status='reserved' AND o.mode=${mode} ORDER BY e.created_at LIMIT 500`;",
    replace: "    WHERE e.status='reserved' ORDER BY e.created_at LIMIT 500`;",
  },
  {
    id: "M34",
    file: "db/seeds/infection-control-offerings.test.sql",
    find: "  IF n <> 2 THEN",
    replace: "  IF n < 2 THEN",
  },
  {
    id: "M49",
    file: "db/migrations/005_student_enrollment.sql",
    find: "    SELECT * INTO offer FROM student_enrollment_offerings WHERE id=held.offering_id FOR UPDATE;",
    replace: "    SELECT * INTO offer FROM student_enrollment_offerings WHERE id=held.offering_id;",
  },
  {
    id: "M51b",
    file: "db/migrations/005_student_enrollment.sql",
    find: "    IF offer.external_seats+(SELECT count(*) FROM student_enrollments WHERE offering_id=held.offering_id AND student_enrollment_occupies_seat(status,inventory_released_at))>=offer.capacity THEN",
    replace:
      "    IF offer.external_seats+(SELECT count(*) FROM student_enrollments WHERE offering_id=held.offering_id AND status IN ('reserved','paid'))>=offer.capacity THEN",
  },
  {
    id: "M55",
    file: "db/migrations/005_student_enrollment.sql",
    find: "    IF review.resolution IS DISTINCT FROM p_resolution THEN RAISE EXCEPTION 'Review already resolved'; END IF;\n",
    replace: "",
  },
  {
    id: "M56",
    file: "db/migrations/005_student_enrollment.sql",
    find: "    IF held.status<>'expired' THEN RAISE EXCEPTION 'Review enroll requires an expired enrollment'; END IF;\n",
    replace: "",
  },
  {
    id: "M57b",
    file: "db/seeds/infection-control-offerings.sql",
    find: "BEGIN;\n",
    replace: "",
  },
  {
    id: "N01",
    file: "db/migrations/005_student_enrollment.sql",
    find: "  IF held.status<>'refunded' THEN RAISE EXCEPTION 'Seat release requires a refunded enrollment'; END IF;\n",
    replace: "",
  },
  {
    id: "N02",
    file: "db/migrations/005_student_enrollment.sql",
    find: "  IF held.inventory_released_at IS NOT NULL THEN RETURN false; END IF;\n",
    replace: "",
  },
  {
    id: "N05",
    file: "db/migrations/005_student_enrollment.sql",
    find: "    SET inventory_released_at=now(),inventory_released_by=btrim(p_actor),updated_at=now()",
    replace: "    SET inventory_released_at=now(),updated_at=now()",
  },
  {
    id: "N17",
    file: "db/migrations/005_student_enrollment.sql",
    find: "  UPDATE student_enrollment_reviews SET resolved_at=now(),resolution=p_resolution,resolved_by=btrim(p_actor) WHERE enrollment_id=p_id AND session_id=p_session;",
    replace:
      "  UPDATE student_enrollment_reviews SET resolved_at=now(),resolution=p_resolution WHERE enrollment_id=p_id AND session_id=p_session;",
  },
  {
    id: "N11",
    file: "db/migrations/005_student_enrollment.sql",
    find: "  IF NEW.external_seats+(SELECT count(*) FROM student_enrollments WHERE offering_id=OLD.id AND student_enrollment_occupies_seat(status,inventory_released_at))>NEW.capacity THEN RAISE EXCEPTION 'Inventory exceeds capacity'; END IF;",
    replace:
      "  IF NEW.external_seats+(SELECT count(*) FROM student_enrollments WHERE offering_id=OLD.id AND status IN ('reserved','paid'))>NEW.capacity THEN RAISE EXCEPTION 'Inventory exceeds capacity'; END IF;",
  },
  {
    id: "N12",
    file: "db/migrations/005_student_enrollment.sql",
    find: "  IF EXISTS(SELECT 1 FROM student_enrollments WHERE offering_id=OLD.id) AND\n    (NEW.mode,NEW.course_id,NEW.course_date,NEW.amount,NEW.currency,NEW.policy_version,NEW.policy_hash,NEW.policy_text)\n    IS DISTINCT FROM (OLD.mode,OLD.course_id,OLD.course_date,OLD.amount,OLD.currency,OLD.policy_version,OLD.policy_hash,OLD.policy_text) THEN RAISE EXCEPTION 'Offering already has enrollments'; END IF;\n",
    replace: "",
  },
  {
    id: "N13",
    file: "db/migrations/005_student_enrollment.sql",
    find: "    IF offer.external_seats+(SELECT count(*) FROM student_enrollments WHERE offering_id=held.offering_id AND student_enrollment_occupies_seat(status,inventory_released_at))>=offer.capacity THEN",
    replace:
      "    IF offer.external_seats+(SELECT count(*) FROM student_enrollments WHERE offering_id=held.offering_id AND status IN ('reserved','paid'))>=offer.capacity THEN",
  },
  {
    id: "N14",
    file: "lib/student-enrollment.ts",
    find: "    WHERE e.offering_id=o.id AND student_enrollment_occupies_seat(e.status,e.inventory_released_at)))::int AS remaining",
    replace:
      "    WHERE e.offering_id=o.id AND e.status IN ('reserved','paid')))::int AS remaining",
  },
  {
    id: "N15",
    file: "lib/student-enrollment.ts",
    find: "    await database()`SELECT o.*, (o.capacity-o.external_seats-(SELECT count(*) FROM student_enrollments e\n    WHERE e.offering_id=o.id AND student_enrollment_occupies_seat(e.status,e.inventory_released_at)))::int AS remaining",
    replace:
      "    await database()`SELECT o.*, (o.capacity-o.external_seats)::int AS remaining",
  },
  {
    id: "N19",
    file: "db/migrations/005_student_enrollment.sql",
    find: "CREATE UNIQUE INDEX student_enrollment_duplicate ON student_enrollments(offering_id,lower(email))\n  WHERE status IN ('reserved','paid') OR (status='refunded' AND inventory_released_at IS NULL);",
    replace:
      "CREATE UNIQUE INDEX student_enrollment_duplicate ON student_enrollments(offering_id,lower(email))\n  WHERE status IN ('reserved','paid','refunded');",
  },
  {
    id: "N20",
    file: "db/migrations/005_student_enrollment.sql",
    find: "    e.stripe_session_id,e.stripe_payment_intent,e.inventory_released_at,e.inventory_released_by,o.mode,o.course_id,o.course_date\n  FROM student_enrollments e JOIN student_enrollment_offerings o ON o.id=e.offering_id WHERE e.status IN ('paid','refunded') AND o.mode='test';",
    replace:
      "    e.stripe_session_id,e.stripe_payment_intent,o.mode,o.course_id,o.course_date\n  FROM student_enrollments e JOIN student_enrollment_offerings o ON o.id=e.offering_id WHERE e.status IN ('paid','refunded') AND o.mode='test';",
  },
  {
    id: "N21",
    file: "lib/student-enrollment.ts",
    find: "  if (releasedAt != null && releasedAt !== \"\") {\n    return mode === \"test\"\n      ? \"TEST ONLY · refunded · released\"\n      : \"refunded — seat released\";\n  }\n  return mode === \"test\"\n    ? \"TEST ONLY · refunded\"\n    : \"refunded — not sellable until released\";",
    replace:
      "  return mode === \"test\"\n    ? \"TEST ONLY · refunded\"\n    : \"refunded — not sellable until released\";",
  },
  {
    id: "N22",
    file: "app/enrollment-pilot/roster/page.tsx",
    find: "    rows = roster.filter((row) => row.status === \"paid\");\n    refunded = roster.filter((row) => row.status === \"refunded\");",
    replace:
      "    rows = roster;\n    refunded = roster.filter((row) => row.status === \"refunded\");",
  },
  {
    id: "M52b",
    file: "app/enroll/page.tsx",
    find: "                  {typeof remaining === \"number\"\n                    ? ` · ${Math.max(0, remaining)} seats available`\n                    : ` · ${INFECTION_CONTROL_OFFERING_CAPACITY} seats`}",
    replace:
      "                  {` · ${INFECTION_CONTROL_OFFERING_CAPACITY} seats`}",
  },
];

function run(command, args, extraEnv = {}) {
  return new Promise((resolveExit) => {
    const child = spawn(command, args, {
      cwd: root,
      env: { ...process.env, ...extraEnv },
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => {
      stdout += chunk;
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk;
    });
    child.on("close", (code) => {
      resolveExit({ code: code ?? 1, stdout, stderr });
    });
  });
}

const only = process.argv.slice(2).filter((value) => !value.startsWith("-"));
const selected = only.length
  ? mutants.filter((mutant) => only.includes(mutant.id))
  : mutants;

await mkdir(resolve(root, "evidence"), { recursive: true });
const lines = [
  `student-enrollment mutant kills ${new Date().toISOString()}`,
  `suite: pnpm test:student-enrollment && pnpm test:student-enrollment-locks`,
  "",
];
const restorers = new Map();
const restoreAll = async () => {
  for (const [absolute, original] of restorers) {
    await writeFile(absolute, original);
  }
  restorers.clear();
};
process.on("SIGINT", () => {
  restoreAll().finally(() => process.exit(1));
});
process.on("SIGTERM", () => {
  restoreAll().finally(() => process.exit(1));
});

for (const mutant of selected) {
  const absolute = resolve(root, mutant.file);
  const original = await readFile(absolute, "utf8");
  if (!original.includes(mutant.find)) {
    lines.push(`${mutant.id} SURVIVED (snippet missing in ${mutant.file})`);
    await writeFile(logPath, `${lines.join("\n")}\n`);
    continue;
  }
  restorers.set(absolute, original);
  await writeFile(absolute, original.replace(mutant.find, mutant.replace));
  const needsBuild = !mutant.file.endsWith(".sql");
  const build = needsBuild
    ? await run("bash", ["-lc", "pnpm build"])
    : { code: 0, stdout: "skipped (sql mutant)", stderr: "" };
  const suite =
    build.code === 0
      ? await run("bash", ["-lc", "pnpm test:student-enrollment"])
      : { code: 1, stdout: "", stderr: "build failed; suite skipped" };
  const locks = await run("bash", ["-lc", "pnpm test:student-enrollment-locks"], {
    STUDENT_LOCK_DATABASE_URL:
      process.env.STUDENT_LOCK_DATABASE_URL ??
      "postgres://postgres:postgres@127.0.0.1:5432/rda_locks",
  });
  await writeFile(absolute, original);
  restorers.delete(absolute);
  const killed = suite.code !== 0 || locks.code !== 0;
  const suiteTail = `${suite.stdout}\n${suite.stderr}`
    .trim()
    .split("\n")
    .slice(-8)
    .join("\n");
  const lockTail = `${locks.stdout}\n${locks.stderr}`
    .trim()
    .split("\n")
    .slice(-8)
    .join("\n");
  lines.push(
    `${mutant.id} ${killed ? "KILLED" : "SURVIVED"} file=${mutant.file}`,
    `  build_exit=${build.code} suite_exit=${suite.code} locks_exit=${locks.code}`,
    `  suite_tail:\n${suiteTail}`,
    `  locks_tail:\n${lockTail}`,
    "",
  );
  await writeFile(logPath, `${lines.join("\n")}\n`);
  console.log(`${mutant.id} ${killed ? "KILLED" : "SURVIVED"}`);
  if (!killed) process.exitCode = 1;
}

await restoreAll();
await writeFile(logPath, `${lines.join("\n")}\n`);
console.log(`wrote ${logPath}`);
