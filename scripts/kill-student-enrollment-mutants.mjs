// Applies one source mutant at a time, runs the student suite + lock suite,
// records that the mutant is killed, then restores the file.
import { spawn } from "node:child_process";
import { access, readFile, writeFile, mkdir, rm } from "node:fs/promises";
import { constants } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const logPath = resolve(
  root,
  "dogfood-output/student-enrollment-mutants.log",
);

const mutants = [
  {
    id: "CONTROL",
    file: "lib/student-enrollment.ts",
    find: "export function studentConfig(): StudentConfig | null {\n  return readStudentConfig(true);\n}",
    replace:
      "export function studentConfig(): StudentConfig | null {\n  return readStudentConfig(true); // CONTROL no-op\n}",
    control: true,
  },
  {
    id: "M24",
    file: "app/api/student-enrollment/checkout/route.ts",
    find: "          if (!recovered && !isStudentIdempotencyConflict(error))\n            await releaseUnboundStudentHold(held.id);",
    replace:
      "          if (!isStudentIdempotencyConflict(error))\n            await releaseUnboundStudentHold(held.id);",
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
    find: "  IF n <> 2 THEN\n    RAISE EXCEPTION 'TEST offering seed verify failed: expected 2 rows, found %', n;\n  END IF;\n",
    replace: "",
  },
  {
    id: "M34L",
    file: "db/seeds/infection-control-offerings.sql",
    find: "  IF n <> 2 THEN\n    RAISE EXCEPTION 'Live offering seed verify failed: expected 2 rows, found %', n;\n  END IF;\n",
    replace: "",
  },
  {
    id: "M49",
    file: "db/migrations/006_student_enrollment_review.sql",
    find: "    SELECT * INTO offer FROM student_enrollment_offerings WHERE id=held.offering_id FOR UPDATE;",
    replace: "    SELECT * INTO offer FROM student_enrollment_offerings WHERE id=held.offering_id;",
  },
  {
    id: "M51b",
    file: "db/migrations/006_student_enrollment_review.sql",
    find: "    IF offer.external_seats+(SELECT count(*) FROM student_enrollments WHERE offering_id=held.offering_id AND id<>p_id AND student_enrollment_occupies_seat(status,inventory_released_at))>=offer.capacity THEN",
    replace:
      "    IF offer.external_seats+(SELECT count(*) FROM student_enrollments WHERE offering_id=held.offering_id AND status IN ('reserved','paid'))>=offer.capacity THEN",
  },
  {
    id: "M52",
    file: "app/enroll/page.tsx",
    find: "              const remaining = live?.remaining;",
    replace: "              const remaining = INFECTION_CONTROL_OFFERING_CAPACITY;",
  },
  {
    id: "M52b",
    file: "lib/student-enrollment-stripe.ts",
    find: "        orphanCharge.refunded === true &&\n        orphanCharge.amount_refunded === held.amount",
    replace: "        orphanCharge.refunded === true",
  },
  {
    id: "M55",
    file: "db/migrations/006_student_enrollment_review.sql",
    find: "    IF review.resolution IS DISTINCT FROM p_resolution THEN RAISE EXCEPTION 'Review already resolved'; END IF;\n",
    replace: "",
  },
  {
    id: "M56",
    file: "db/migrations/006_student_enrollment_review.sql",
    find: "    ELSIF held.status<>'expired' THEN RAISE EXCEPTION 'Review enroll requires an expired enrollment'; END IF;",
    replace: "    END IF;",
  },
  {
    id: "M57",
    file: "db/seeds/infection-control-offerings.test.sql",
    find: "BEGIN;\n",
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
    file: "db/migrations/006_student_enrollment_review.sql",
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
    id: "N12a",
    file: "db/migrations/005_student_enrollment.sql",
    find: "    (NEW.mode,NEW.course_id,NEW.course_date,NEW.amount,NEW.currency,NEW.policy_version,NEW.policy_hash,NEW.policy_text)\n    IS DISTINCT FROM (OLD.mode,OLD.course_id,OLD.course_date,OLD.amount,OLD.currency,OLD.policy_version,OLD.policy_hash,OLD.policy_text)",
    replace:
      "    (NEW.mode,NEW.course_id,NEW.course_date,NEW.amount,NEW.currency,NEW.policy_version,NEW.policy_hash)\n    IS DISTINCT FROM (OLD.mode,OLD.course_id,OLD.course_date,OLD.amount,OLD.currency,OLD.policy_version,OLD.policy_hash)",
  },
  {
    id: "N12",
    file: "db/migrations/005_student_enrollment.sql",
    find: "  IF NEW.external_seats+(SELECT count(*) FROM student_enrollments WHERE offering_id=OLD.id AND student_enrollment_occupies_seat(status,inventory_released_at))>NEW.capacity THEN RAISE EXCEPTION 'Inventory exceeds capacity'; END IF;",
    replace:
      "  IF NEW.external_seats+(SELECT count(*) FROM student_enrollments WHERE offering_id=OLD.id AND student_enrollment_occupies_seat(status,NULL))>NEW.capacity THEN RAISE EXCEPTION 'Inventory exceeds capacity'; END IF;",
  },
  {
    id: "N13",
    file: "db/migrations/006_student_enrollment_review.sql",
    find: "    IF offer.external_seats+(SELECT count(*) FROM student_enrollments WHERE offering_id=held.offering_id AND id<>p_id AND student_enrollment_occupies_seat(status,inventory_released_at))>=offer.capacity THEN",
    replace:
      "    IF offer.external_seats+(SELECT count(*) FROM student_enrollments WHERE offering_id=held.offering_id AND id<>p_id AND student_enrollment_occupies_seat(status,NULL))>=offer.capacity THEN",
  },
  {
    id: "N14",
    file: "lib/student-enrollment.ts",
    find: "    WHERE e.offering_id=o.id AND student_enrollment_occupies_seat(e.status,e.inventory_released_at)))::int AS remaining",
    replace:
      "    WHERE e.offering_id=o.id AND student_enrollment_occupies_seat(e.status,NULL)))::int AS remaining",
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
    id: "N22a",
    file: "app/enrollment-pilot/roster/page.tsx",
    find: "    rows = roster.filter((row) => row.status === \"paid\");",
    replace: "    rows = roster.filter((row) => row.status !== \"refunded\");",
  },
  {
    id: "N22",
    file: "app/enrollment-pilot/roster/page.tsx",
    find: "                  config?.mode === \"test\" ? \"TEST ONLY · paid\" : \"paid\",",
    replace: "                  \"paid\",",
  },
  {
    id: "W03",
    file: "lib/student-enrollment-stripe.ts",
    find: "    charge.refunded === true &&\n    charge.amount_refunded === charge.amount &&\n    charge.amount === session.amount_total",
    replace: "    charge.amount_refunded > 0",
  },
  {
    id: "W04",
    file: "app/api/student-enrollment/webhook/route.ts",
    find: "      if (existing?.status === \"paid\") {",
    replace: "      if (existing) {",
  },
  {
    id: "W05",
    file: "app/api/student-enrollment/webhook/route.ts",
    find: "  const paymentsEnabled = studentConfig() !== null;",
    replace: "  const paymentsEnabled = true;",
  },
  {
    id: "W06",
    file: "lib/student-enrollment-stripe.ts",
    find: "    allowExpiredOrphan: held.status === \"expired\",",
    replace: "    allowExpiredOrphan: true,",
  },
  {
    id: "W08",
    file: "db/migrations/005_student_enrollment.sql",
    find: "DROP FUNCTION IF EXISTS resolve_student_enrollment_review(uuid, text, text);\n",
    replace: "",
  },
  {
    id: "W09",
    file: "app/api/student-enrollment/webhook/route.ts",
    find: "        boundToSession,",
    replace: "        false,",
  },
  {
    id: "W10",
    file: "app/api/student-enrollment/webhook/route.ts",
    find: "      if (existing?.status === \"paid\") {\n        try {\n          await deliverStudentConfirmation(existing, config);\n        } catch {\n          /* Mail stays queued; payment state is already durable. */\n        }\n      }\n",
    replace: "",
  },
  {
    id: "X06",
    file: "app/api/student-enrollment/webhook/route.ts",
    find: "      studentWebhookPaidCompletionEvent(event.type) &&\n      session.status === \"complete\" &&\n      session.payment_status === \"paid\";",
    replace:
      "      studentWebhookPaidCompletionEvent(event.type) &&\n      session.status === \"complete\";",
  },
  {
    id: "X08",
    file: "app/api/student-enrollment/webhook/route.ts",
    find: "    try {\n      if (held?.status === \"paid\") await deliverStudentConfirmation(held, config);\n    } catch {\n      /* Mail stays queued; payment state is already durable. */\n    }\n",
    replace:
      "    if (held?.status === \"paid\") await deliverStudentConfirmation(held, config);\n",
  },
  {
    id: "X09",
    file: "lib/student-enrollment-mail.ts",
    find: "    AND EXISTS(SELECT 1 FROM student_enrollments WHERE id=${held.id}::uuid AND status='paid') RETURNING payload`;",
    replace: "    RETURNING payload`;",
  },
  {
    id: "R01",
    file: "app/api/student-enrollment/retry-confirmation/route.ts",
    find: "import {\n  studentWebhookConfig,\n  getStudentEnrollment,\n  studentDatabase,\n} from \"@/lib/student-enrollment\";",
    replace:
      "import {\n  studentConfig as studentWebhookConfig,\n  getStudentEnrollment,\n  studentDatabase,\n} from \"@/lib/student-enrollment\";",
  },
  {
    id: "R02",
    file: "app/api/student-enrollment/retry-confirmation/route.ts",
    find: "    !config ||\n    !owner ||\n    request.headers.get(\"origin\") !== config.origin ||",
    replace:
      "    !config ||\n    request.headers.get(\"origin\") !== config.origin ||",
  },
  {
    id: "R03",
    file: "app/api/student-enrollment/retry-confirmation/route.ts",
    find: "    request.headers.get(\"origin\") !== config.origin ||\n    request.headers.get(\"content-type\")?.split(\";\")[0].trim() !==",
    replace:
      "    request.headers.get(\"content-type\")?.split(\";\")[0].trim() !==",
  },
  {
    id: "R04",
    file: "app/api/student-enrollment/retry-confirmation/route.ts",
    find: "    if (body.drain === true && Object.keys(body).length === 1) {",
    replace: "    if (body.drain && Object.keys(body).length === 1) {",
  },
  {
    id: "V03",
    file: "db/migrations/006_student_enrollment_review.sql",
    find: "      IF held.status NOT IN ('reserved','expired') THEN RAISE EXCEPTION 'Review enroll requires a reserved or expired enrollment'; END IF;",
    replace:
      "      IF held.status NOT IN ('reserved','expired','paid') THEN RAISE EXCEPTION 'Review enroll requires a reserved or expired enrollment'; END IF;",
  },
  {
    id: "V05",
    file: "lib/student-enrollment-stripe.ts",
    find: "      if (studentSessionIsFullyRefunded(session)) {\n        await resolveOpenStudentRefundReview(held.id, session.id);\n      }",
    replace: "      await resolveOpenStudentRefundReview(held.id, session.id);",
  },
  {
    id: "V12",
    file: "lib/student-enrollment-mail.ts",
    find: "export const STUDENT_CONFIRMATION_DRAIN_MS = 20_000;",
    replace: "export const STUDENT_CONFIRMATION_DRAIN_MS = 200_000;",
  },
  {
    id: "R06",
    file: "app/api/student-enrollment/retry-confirmation/route.ts",
    find: "    if (!held || held.status !== \"paid\")\n      return enrollmentResponse({ error: \"Paid enrollment required.\" }, 409);",
    replace:
      "    if (!held)\n      return enrollmentResponse({ error: \"Paid enrollment required.\" }, 409);",
  },
  {
    id: "R07",
    file: "app/api/student-enrollment/retry-confirmation/route.ts",
    find: "    if (offering[0]?.mode !== config.mode)\n      return enrollmentResponse({ error: \"Wrong environment.\" }, 409);\n",
    replace: "",
  },
  {
    id: "D01",
    file: "lib/student-enrollment-mail.ts",
    find: "    WHERE e.status='paid' AND m.status IN ('pending','sending') AND o.mode=${mode}\n    ORDER BY e.created_at LIMIT 100`;",
    replace:
      "    WHERE m.status IN ('pending','sending') AND o.mode=${mode}\n    ORDER BY e.created_at LIMIT 100`;",
  },
  {
    id: "D02",
    file: "lib/student-enrollment-mail.ts",
    find: "    WHERE e.status='paid' AND m.status IN ('pending','sending') AND o.mode=${mode}\n    ORDER BY e.created_at LIMIT 100`;",
    replace:
      "    WHERE e.status='paid' AND m.status IN ('pending','sending')\n    ORDER BY e.created_at LIMIT 100`;",
  },
  {
    id: "D03",
    file: "lib/student-enrollment-mail.ts",
    find: "    WHERE e.status='paid' AND m.status IN ('pending','sending') AND o.mode=${mode}\n    ORDER BY e.created_at LIMIT 100`;",
    replace:
      "    WHERE e.status='paid' AND m.status IN ('pending','sending','review') AND o.mode=${mode}\n    ORDER BY e.created_at LIMIT 100`;",
  },
  {
    id: "D05",
    file: "lib/student-enrollment-mail.ts",
    find: "    } catch {\n      errors += 1;\n    }",
    replace: "    } catch (error) {\n      throw error;\n    }",
  },
  {
    id: "D10",
    file: "lib/student-enrollment-mail.ts",
    find: "    ORDER BY e.created_at LIMIT 100`;",
    replace: "    ORDER BY e.created_at`;",
  },
  {
    id: "S01",
    file: "lib/student-enrollment-stripe.ts",
    find: "    session.status === \"complete\" &&\n    session.payment_status === \"paid\" &&\n    (eventType === \"checkout.session.completed\" ||\n      eventType === \"checkout.session.async_payment_succeeded\");",
    replace:
      "    session.status === \"complete\" &&\n    (eventType === \"checkout.session.completed\" ||\n      eventType === \"checkout.session.async_payment_succeeded\");",
  },
  {
    id: "S05",
    file: "lib/student-enrollment-stripe.ts",
    find: "    assertStudentSession(session, held, config, { allowSessionMismatch: true });\n    await studentDatabase()`SELECT flag_student_enrollment_review(${held.id}::uuid,${session.id},'session_mismatch')`;",
    replace:
      "    await studentDatabase()`SELECT flag_student_enrollment_review(${held.id}::uuid,${session.id},'session_mismatch')`;",
  },
  {
    id: "S07",
    file: "db/migrations/006_student_enrollment_review.sql",
    find: "  IF p_reason='session_mismatch' AND held.status NOT IN ('reserved','paid') THEN RAISE EXCEPTION 'Session mismatch review requires a reserved or paid enrollment'; END IF;",
    replace: "",
  },
  {
    id: "S09",
    file: "lib/student-enrollment-stripe.ts",
    find: "    (eventType === \"checkout.session.completed\" ||\n      eventType === \"checkout.session.async_payment_succeeded\");",
    replace: "    (eventType === \"checkout.session.completed\");",
  },
  {
    id: "S10",
    file: "lib/student-enrollment.ts",
    find: "    studentWebhookPaidCompletionEvent(eventType) &&\n    (existing?.status === \"reserved\" || existing?.status === \"paid\") &&",
    replace:
      "    (existing?.status === \"reserved\" || existing?.status === \"paid\") &&",
  },
];

function killProcessGroup(pid) {
  try {
    process.kill(-pid, "SIGKILL");
  } catch {
    try {
      process.kill(pid, "SIGKILL");
    } catch {
      /* already exited */
    }
  }
}

function run(command, args, extraEnv = {}, timeoutMs = 0) {
  return new Promise((resolveExit) => {
    const child = spawn(command, args, {
      cwd: root,
      env: { ...process.env, ...extraEnv },
      stdio: ["ignore", "pipe", "pipe"],
      detached: true,
    });
    let stdout = "";
    let stderr = "";
    let timedOut = false;
    child.stdout.on("data", (chunk) => {
      stdout += chunk;
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk;
    });
    const timer =
      timeoutMs > 0
        ? setTimeout(() => {
            timedOut = true;
            killProcessGroup(child.pid);
          }, timeoutMs)
        : null;
    child.on("close", (code) => {
      if (timer) clearTimeout(timer);
      killProcessGroup(child.pid);
      resolveExit({
        code: timedOut ? 1 : (code ?? 1),
        stdout,
        stderr,
        timedOut,
      });
    });
  });
}

function failingNames(stdout, stderr) {
  const names = [];
  for (const line of `${stdout}\n${stderr}`.split("\n")) {
    const play = line.match(
      /✘\s+\d+\s+.*?›\s+(.+?)(?:\s+\(\d[\d.]*\s*m?s\))?$/,
    );
    if (play) names.push(play[1].trim());
    const numbered = line.match(/^\s*\d+\)\s+(?:\[.*?\]\s+›\s+)?(.+)$/);
    if (numbered) names.push(numbered[1].trim());
    const lock = line.match(/^Error: (.+)$/);
    if (lock) names.push(lock[1].trim());
  }
  return [...new Set(names)];
}

function lockDbUnreachable(result) {
  return /ECONNREFUSED|Connection refused|connect ENOENT|the database system is starting|must be the local CI lock database|password authentication failed|database \"rda_locks\" does not exist/i.test(
    `${result.stdout}\n${result.stderr}`,
  );
}

function fixtureStartFailed(result) {
  return /Could not find a production build|Fixture server exited|EADDRINUSE|listen EADDRINUSE|Local fixture server did not become ready|Invalid local fixture port/i.test(
    `${result.stdout}\n${result.stderr}`,
  );
}

async function nextBuildExists() {
  try {
    await access(resolve(root, ".next"), constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

const only = process.argv.slice(2).filter((value) => !value.startsWith("-"));
const selected = only.length
  ? mutants.filter((mutant) => only.includes(mutant.id))
  : mutants;

await mkdir(resolve(root, "dogfood-output"), { recursive: true });
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

const cleanBuild = async () => {
  await rm(resolve(root, ".next"), { recursive: true, force: true });
  return run("bash", ["-lc", "pnpm build"]);
};

if (!(await nextBuildExists())) {
  const prepared = await run("bash", ["-lc", "pnpm build"]);
  if (prepared.code !== 0 || !(await nextBuildExists())) {
    lines.push(
      `ERROR reason=initial production build missing`,
      `  build_exit=${prepared.code}`,
      "",
    );
    await writeFile(logPath, `${lines.join("\n")}\n`);
    process.exitCode = 1;
  }
}

for (const mutant of selected) {
  const absolute = resolve(root, mutant.file);
  const original = await readFile(absolute, "utf8");
  if (!original.includes(mutant.find)) {
    lines.push(`${mutant.id} ERROR (snippet missing in ${mutant.file})`);
    await writeFile(logPath, `${lines.join("\n")}\n`);
    process.exitCode = 1;
    continue;
  }
  restorers.set(absolute, original);
  await writeFile(absolute, original.replace(mutant.find, mutant.replace));
  const needsBuild = !mutant.file.endsWith(".sql");
  const build = needsBuild
    ? await run("bash", ["-lc", "pnpm build"])
    : { code: 0, stdout: "skipped (sql mutant)", stderr: "" };
  if (build.code !== 0) {
    await writeFile(absolute, original);
    restorers.delete(absolute);
    if (needsBuild) {
      const rebuilt = await cleanBuild();
      if (rebuilt.code !== 0) {
        lines.push(
          `${mutant.id} ERROR file=${mutant.file}`,
          `  reason=build failure after restore`,
          `  build_exit=${build.code} restore_build_exit=${rebuilt.code}`,
          "",
        );
        await writeFile(logPath, `${lines.join("\n")}\n`);
        process.exitCode = 1;
        continue;
      }
    }
    lines.push(
      `${mutant.id} ERROR file=${mutant.file}`,
      `  reason=build failure`,
      `  build_exit=${build.code}`,
      "",
    );
    await writeFile(logPath, `${lines.join("\n")}\n`);
    process.exitCode = 1;
    console.log(`${mutant.id} ERROR`);
    continue;
  }
  const suite = await run(
    "bash",
    ["-lc", "pnpm test:student-enrollment"],
    {},
    240000,
  );
  const locks = await run(
    "bash",
    ["-lc", "pnpm test:student-enrollment-locks"],
    {
      STUDENT_LOCK_DATABASE_URL:
        process.env.STUDENT_LOCK_DATABASE_URL ??
        "postgres://postgres:postgres@127.0.0.1:5432/rda_locks",
    },
    120000,
  );
  await writeFile(absolute, original);
  restorers.delete(absolute);
  if (needsBuild) {
    const rebuilt = await cleanBuild();
    if (rebuilt.code !== 0) {
      lines.push(
        `${mutant.id} ERROR file=${mutant.file}`,
        `  reason=clean rebuild after restore failed`,
        `  restore_build_exit=${rebuilt.code}`,
        "",
      );
      await writeFile(logPath, `${lines.join("\n")}\n`);
      process.exitCode = 1;
      console.log(`${mutant.id} ERROR`);
      continue;
    }
  }
  if (lockDbUnreachable(locks)) {
    lines.push(
      `${mutant.id} ERROR file=${mutant.file}`,
      `  reason=lock database unreachable`,
      `  build_exit=${build.code} suite_exit=${suite.code} locks_exit=${locks.code}`,
      "",
    );
    await writeFile(logPath, `${lines.join("\n")}\n`);
    process.exitCode = 1;
    console.log(`${mutant.id} ERROR`);
    continue;
  }
  if (suite.timedOut || locks.timedOut) {
    lines.push(
      `${mutant.id} ERROR file=${mutant.file}`,
      `  reason=per-mutant timeout`,
      `  build_exit=${build.code} suite_exit=${suite.code} locks_exit=${locks.code}`,
      "",
    );
    await writeFile(logPath, `${lines.join("\n")}\n`);
    process.exitCode = 1;
    console.log(`${mutant.id} ERROR`);
    continue;
  }
  if (fixtureStartFailed(suite) || fixtureStartFailed(locks)) {
    const fixtureTail = `${suite.stdout}\n${suite.stderr}`
      .split("\n")
      .slice(-12)
      .join("\n");
    lines.push(
      `${mutant.id} ERROR file=${mutant.file}`,
      `  reason=fixture start failure`,
      `  build_exit=${build.code} suite_exit=${suite.code} locks_exit=${locks.code}`,
      `  suite_tail:\n${fixtureTail}`,
      "",
    );
    await writeFile(logPath, `${lines.join("\n")}\n`);
    process.exitCode = 1;
    console.log(`${mutant.id} ERROR`);
    continue;
  }
  const killed = suite.code !== 0 || locks.code !== 0;
  const status = mutant.control
    ? killed
      ? "ERROR"
      : "SURVIVED"
    : killed
      ? "KILLED"
      : "SURVIVED";
  const suiteFails = failingNames(suite.stdout, suite.stderr);
  const lockFails = failingNames(locks.stdout, locks.stderr);
  const failedTests = [...suiteFails, ...lockFails];
  const suiteLines = `${suite.stdout}\n${suite.stderr}`.split("\n");
  const suiteHits = suiteLines.filter((line) =>
    /✘|failed|Error:|ELIFECYCLE|expected|toContain|toBe|toHaveLength|toThrow/.test(
      line,
    ),
  );
  const suiteTail = (suiteHits.length ? suiteHits.slice(-12) : suiteLines.slice(-8))
    .join("\n");
  const lockLines = `${locks.stdout}\n${locks.stderr}`.split("\n");
  const lockHits = lockLines.filter((line) =>
    /not wait|must fail|must refuse|left a Dec|expected|Error|ELIFECYCLE/.test(
      line,
    ),
  );
  const lockTail = (lockHits.length ? lockHits.slice(-12) : lockLines.slice(-8))
    .join("\n");
  lines.push(
    `${mutant.id} ${status} file=${mutant.file}`,
    `  build_exit=${build.code} suite_exit=${suite.code} locks_exit=${locks.code}`,
    killed
      ? `  failed_tests: ${failedTests.length ? failedTests.join(" | ") : "(see tail)"}`
      : "  failed_tests: none",
    `  suite_tail:\n${suiteTail}`,
    `  locks_tail:\n${lockTail}`,
    "",
  );
  await writeFile(logPath, `${lines.join("\n")}\n`);
  console.log(`${mutant.id} ${status}`);
  if (mutant.control && killed) process.exitCode = 1;
  if (!mutant.control && !killed) process.exitCode = 1;
}

await restoreAll();
const killedIds = selected
  .filter((mutant) => !mutant.control)
  .map((mutant) => mutant.id)
  .filter((id) => lines.some((line) => line.startsWith(`${id} KILLED`)));
const survivedIds = selected
  .filter((mutant) => !mutant.control)
  .map((mutant) => mutant.id)
  .filter((id) => lines.some((line) => line.startsWith(`${id} SURVIVED`)));
const errorIds = selected
  .map((mutant) => mutant.id)
  .filter((id) => lines.some((line) => line.startsWith(`${id} ERROR`)));
const controlLine = lines.find((line) => line.startsWith("CONTROL "));
lines.push(
  `summary: ${killedIds.length} KILLED, ${survivedIds.length} SURVIVED, ${errorIds.length} ERROR`,
  killedIds.join(" "),
  survivedIds.length ? `survivors: ${survivedIds.join(" ")}` : "",
  errorIds.length ? `errors: ${errorIds.join(" ")}` : "",
  controlLine ?? "CONTROL missing",
  "reproduce: STUDENT_LOCK_DATABASE_URL=postgres://postgres:postgres@127.0.0.1:5432/rda_locks pnpm test:student-enrollment-mutants",
  "",
);
await writeFile(logPath, `${lines.join("\n")}\n`);
console.log(`wrote ${logPath}`);
