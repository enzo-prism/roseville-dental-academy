import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import { test, expect } from "@playwright/test";
import { enrollmentDate } from "@/lib/enrollment-contract";
import {
  CANCELLATION_POLICY_PARAGRAPHS,
  INFECTION_CONTROL_CHECKOUT_POLICY,
} from "@/lib/academy-policies";
import {
  INFECTION_CONTROL_FIXTURE_OFFERING_ID_BY_SLOT,
  INFECTION_CONTROL_OFFERING_AMOUNT,
  INFECTION_CONTROL_OFFERING_CAPACITY,
  INFECTION_CONTROL_OFFLINE_SEATS,
  INFECTION_CONTROL_SELLABLE_SESSIONS,
  infectionControlFixtureCourseDates,
  isCanonicalInfectionControlDate,
} from "@/lib/student-enrollment-offerings";
import {
  listStudentReservedHolds,
  refundedRosterPaymentLabel,
  studentConfig,
  studentDatabase,
  studentEnrollmentOccupiesSeat,
  studentInput,
  studentOfferings,
  studentPublicEnrollCtaEnabled,
  studentPublicEnrollCtas,
  studentWebhookConfig,
  studentWebhookProcessesWhilePaymentsOff,
  STUDENT_POLICY_HASH,
  type StudentEnrollment,
} from "@/lib/student-enrollment";
import {
  assertStudentSession,
  bindStudentSession,
  isStripeIdempotencyConflict,
  isStudentIdempotencyConflict,
  StudentProviderError,
  studentSessionParameters,
  type StudentSession,
} from "@/lib/student-enrollment-stripe";
const offer = INFECTION_CONTROL_FIXTURE_OFFERING_ID_BY_SLOT[0],
  policy = "2026-09-30",
  [fixtureFirstDate, fixtureSecondDate] = infectionControlFixtureCourseDates();
async function allowLiveOfferingSeed(db: PGlite) {
  await db.exec("SET application_name = 'rda-student-offering-seed'");
}
async function allowIsolatedTestOfferingSeed(db: PGlite) {
  await db.exec("SET application_name = 'rda-student-offering-seed-isolated'");
}
async function allowTestOfferingSeedOnLiveData(db: PGlite) {
  await db.exec(
    "SET application_name = 'rda-student-offering-seed-on-live-data'",
  );
}
function pgliteStudentDatabase(db: PGlite): typeof studentDatabase {
  const tagged = (strings: TemplateStringsArray, ...values: unknown[]) => {
    let text = strings[0];
    const params: unknown[] = [];
    for (let i = 0; i < values.length; i++) {
      params.push(values[i]);
      text += `$${params.length}${strings[i + 1]}`;
    }
    return db.query(text, params).then((result) => result.rows);
  };
  return (() => tagged) as typeof studentDatabase;
}
async function applyOfferingSeed(db: PGlite, path: string) {
  try {
    await db.exec(await readFile(path, "utf8"));
  } catch (error) {
    try {
      await db.exec("ROLLBACK");
    } catch {
      /* The failed seed already aborted its transaction. */
    }
    throw error;
  }
}
test("database course dates preserve their calendar day and reject null", () => {
  expect(enrollmentDate(new Date(2099, 10, 14))).toBe("2099-11-14");
  expect(enrollmentDate("2099-11-14")).toBe("2099-11-14");
  expect(enrollmentDate(new Date("2026-11-14T00:00:00.000Z"))).toBe(
    "2026-11-14",
  );
  expect(() => enrollmentDate(null)).toThrow();
});
test("checkout inventory is only the confirmed November 14 and December 5 sessions at 39500", () => {
  expect(INFECTION_CONTROL_SELLABLE_SESSIONS).toEqual([
    { courseDate: "2026-11-14", label: "November 14, 2026" },
    { courseDate: "2026-12-05", label: "December 5, 2026" },
  ]);
  expect(INFECTION_CONTROL_OFFERING_AMOUNT).toBe(39500);
  expect(INFECTION_CONTROL_OFFERING_CAPACITY).toBe(12);
  expect(INFECTION_CONTROL_OFFLINE_SEATS).toBe(0);
  expect(INFECTION_CONTROL_CHECKOUT_POLICY).toBe(
    "Payment in full required. Course fees are non-refundable and student enrollment cannot be moved to another date. If Roseville Dental Academy cancels, students may choose another available course date or a refund.",
  );
  expect(
    INFECTION_CONTROL_SELLABLE_SESSIONS.map((session) => session.courseDate),
  ).not.toContain("2026-11-07");
  expect(STUDENT_POLICY_HASH).toBe(
    "af24daa14cf51c382bcdc9cb567f2b4de29886ccd4d980d62ca1a46ee7fd53ae",
  );
  const afterClose = infectionControlFixtureCourseDates(
    new Date("2027-01-15T18:00:00Z"),
  );
  expect(afterClose[0] > "2027-01-15").toBe(true);
  expect(afterClose[1] > afterClose[0]).toBe(true);
});
test("student configuration fails closed and never mixes live keys, wrong merchants or origins", () => {
  const before = { ...process.env };
  try {
    Object.assign(process.env, {
      RDA_STUDENT_PAYMENTS_MODE: "live",
      RDA_STUDENT_STRIPE_LIVE_KEY: "rk_live_fixture",
      RDA_STUDENT_STRIPE_LIVE_WEBHOOK_SECRET: "whsec_fixture",
      RDA_STUDENT_STRIPE_ACCOUNT_ID: "acct_1UJHgLCOhHjREvRz",
      RDA_STUDENT_PAYMENTS_ORIGIN: "https://example.test",
      DATABASE_URL: "fixture",
    });
    delete process.env.RDA_STUDENT_PAYMENTS_LIVE_ENABLED;
    delete process.env.RDA_STUDENT_PAYMENTS_PUBLIC_CTA;
    expect(studentConfig()).toBeNull();
    expect(studentWebhookConfig()?.mode).toBe("live");
    expect(studentWebhookProcessesWhilePaymentsOff("charge.refunded")).toBe(
      true,
    );
    expect(
      studentWebhookProcessesWhilePaymentsOff("checkout.session.completed"),
    ).toBe(false);
    expect(studentPublicEnrollCtaEnabled()).toBe(false);
    expect(studentPublicEnrollCtas()).toHaveLength(0);
    process.env.RDA_STUDENT_PAYMENTS_LIVE_ENABLED = "true";
    expect(studentConfig()?.mode).toBe("live");
    expect(studentPublicEnrollCtaEnabled()).toBe(false);
    expect(studentPublicEnrollCtas()).toHaveLength(0);
    process.env.RDA_STUDENT_STRIPE_ACCOUNT_ID = "acct_prism";
    expect(studentConfig()).toBeNull();
    process.env.RDA_STUDENT_STRIPE_ACCOUNT_ID = "acct_1UJHgLCOhHjREvRz";
    process.env.RDA_STUDENT_PAYMENTS_ORIGIN = "http://127.0.0.1:3117";
    expect(studentConfig()).toBeNull();
    process.env.RDA_STUDENT_PAYMENTS_MODE = "test";
    process.env.RDA_STUDENT_STRIPE_TEST_KEY = "rk_live_wrongmode";
    expect(studentConfig()).toBeNull();
    expect(studentPublicEnrollCtas()).toHaveLength(0);
  } finally {
    process.env = before;
  }
});
test("live flags without the public CTA flag render 0 Infection Control Enroll CTAs", async () => {
  const before = { ...process.env };
  try {
    Object.assign(process.env, {
      RDA_STUDENT_PAYMENTS_MODE: "live",
      RDA_STUDENT_STRIPE_LIVE_KEY: "rk_live_fixture",
      RDA_STUDENT_STRIPE_LIVE_WEBHOOK_SECRET: "whsec_fixture",
      RDA_STUDENT_STRIPE_ACCOUNT_ID: "acct_1UJHgLCOhHjREvRz",
      RDA_STUDENT_PAYMENTS_ORIGIN: "https://example.test",
      RDA_STUDENT_PAYMENTS_LIVE_ENABLED: "true",
      DATABASE_URL: "fixture",
    });
    delete process.env.RDA_STUDENT_PAYMENTS_PUBLIC_CTA;
    expect(studentConfig()?.mode).toBe("live");
    expect(studentPublicEnrollCtaEnabled()).toBe(false);
    expect(studentPublicEnrollCtas()).toHaveLength(0);
    process.env.RDA_STUDENT_PAYMENTS_PUBLIC_CTA = "false";
    expect(studentPublicEnrollCtas()).toHaveLength(0);
    process.env.RDA_STUDENT_PAYMENTS_PUBLIC_CTA = "true";
    expect(studentPublicEnrollCtaEnabled()).toBe(true);
    expect(studentPublicEnrollCtas()).toEqual([
      { href: "/enroll", label: "Enroll and pay in full" },
    ]);
    process.env.RDA_STUDENT_PAYMENTS_MODE = "test";
    process.env.RDA_STUDENT_STRIPE_TEST_KEY = "sk_test_fixture";
    process.env.RDA_STUDENT_STRIPE_TEST_WEBHOOK_SECRET = "whsec_fixture";
    process.env.RDA_STUDENT_STRIPE_ACCOUNT_ID = "acct_fixture";
    process.env.RDA_STUDENT_PAYMENTS_ORIGIN = "http://127.0.0.1:3117";
    delete process.env.RDA_STUDENT_PAYMENTS_LIVE_ENABLED;
    expect(studentConfig()?.mode).toBe("test");
    expect(studentPublicEnrollCtaEnabled()).toBe(false);
    expect(studentPublicEnrollCtas()).toHaveLength(0);
    process.env.RDA_STUDENT_PAYMENTS_MODE = "live";
    process.env.RDA_STUDENT_STRIPE_LIVE_KEY = "rk_live_fixture";
    process.env.RDA_STUDENT_STRIPE_LIVE_WEBHOOK_SECRET = "whsec_fixture";
    process.env.RDA_STUDENT_STRIPE_ACCOUNT_ID = "acct_1UJHgLCOhHjREvRz";
    process.env.RDA_STUDENT_PAYMENTS_ORIGIN = "https://example.test";
    delete process.env.RDA_STUDENT_PAYMENTS_LIVE_ENABLED;
    process.env.RDA_STUDENT_PAYMENTS_PUBLIC_CTA = "true";
    expect(studentConfig()).toBeNull();
    expect(studentPublicEnrollCtaEnabled()).toBe(false);
    expect(studentPublicEnrollCtas()).toHaveLength(0);
    const page = await readFile("components/site/live-course-page.tsx", "utf8");
    expect(page).toContain("studentPublicEnrollCtas()");
    expect(page).toContain("data-rda-student-enroll-cta");
    expect(page).not.toContain('studentConfig()?.mode === "live"');
    const enroll = await readFile("app/enroll/page.tsx", "utf8");
    expect(enroll).toContain("studentConfig()");
    expect(enroll).toContain("studentOfferings(config)");
    expect(enroll).not.toContain("RDA_STUDENT_PAYMENTS_PUBLIC_CTA");
    expect(enroll).not.toContain("studentPublicEnrollCta");
  } finally {
    process.env = before;
  }
});
test("idempotency conflicts require both HTTP 409 and idempotency_key_in_use", () => {
  expect(isStripeIdempotencyConflict(409, "idempotency_key_in_use")).toBe(true);
  expect(isStripeIdempotencyConflict(409, undefined)).toBe(false);
  expect(isStripeIdempotencyConflict(409, "lock_timeout")).toBe(false);
  expect(isStripeIdempotencyConflict(500, "idempotency_key_in_use")).toBe(false);
  expect(isStripeIdempotencyConflict(400, "idempotency_key_in_use")).toBe(false);
  expect(isStudentIdempotencyConflict(new Error("Payment provider unavailable"))).toBe(
    false,
  );
  expect(
    isStudentIdempotencyConflict(
      new StudentProviderError(
        "Payment provider idempotency conflict",
        "idempotency_key_in_use",
      ),
    ),
  ).toBe(true);
  expect(
    isStudentIdempotencyConflict(
      new StudentProviderError("Payment provider unavailable", "lock_timeout"),
    ),
  ).toBe(false);
  expect(
    isStudentIdempotencyConflict(new StudentProviderError("Payment provider unavailable")),
  ).toBe(false);
});
test("bindStudentSession refuses expired rows even before the SQL filter", async () => {
  await expect(
    bindStudentSession(
      { id: randomUUID(), status: "expired" } as StudentEnrollment,
      "cs_test_expired",
    ),
  ).rejects.toThrow("Session identity conflict");
});
test("bindStudentSession SQL still refuses a stale reserved object against an expired row", async () => {
  const db = await PGlite.create();
  const bindId = randomUUID();
  try {
    await db.exec(
      await readFile("db/migrations/005_student_enrollment.sql", "utf8"),
    );
    await db.query(
      "INSERT INTO student_enrollment_offerings(id,mode,course_id,course_date,amount,external_seats,policy_version,policy_hash,policy_text,reviewed_at,review_reference,enabled) VALUES($1,'test','infection-control',$5,39500,0,$2,$3,$4,now(),'bind filter',true)",
      [
        offer,
        policy,
        STUDENT_POLICY_HASH,
        CANCELLATION_POLICY_PARAGRAPHS.join("\n\n"),
        fixtureFirstDate,
      ],
    );
    await db.query(
      "INSERT INTO student_enrollments(id,offering_id,course_date,owner_hash,student_name,email,phone,adult_attested,policy_version,policy_hash,policy_text,amount,currency,status) VALUES($1,$2,$3,$4,$5,$6,$7,true,$8,$9,$10,39500,'usd','expired')",
      [
        bindId,
        offer,
        fixtureFirstDate,
        "c".repeat(64),
        "Stale Bind Adult",
        "stale-bind@example.test",
        "916 555 0100",
        policy,
        STUDENT_POLICY_HASH,
        CANCELLATION_POLICY_PARAGRAPHS.join("\n\n"),
      ],
    );
    await expect(
      bindStudentSession(
        { id: bindId, status: "reserved" } as StudentEnrollment,
        "cs_test_stale_reserved",
        pgliteStudentDatabase(db),
      ),
    ).rejects.toThrow("Session identity conflict");
    const bound = await db.query<{
      stripe_session_id: string | null;
      status: string;
    }>("SELECT stripe_session_id,status FROM student_enrollments WHERE id=$1", [
      bindId,
    ]);
    expect(bound.rows[0].status).toBe("expired");
    expect(bound.rows[0].stripe_session_id).toBeNull();
  } finally {
    await db.close();
  }
});
test("refunded seats occupy inventory until an actor-audited release", () => {
  expect(studentEnrollmentOccupiesSeat("reserved", null)).toBe(true);
  expect(studentEnrollmentOccupiesSeat("paid", null)).toBe(true);
  expect(studentEnrollmentOccupiesSeat("refunded", null)).toBe(true);
  expect(studentEnrollmentOccupiesSeat("refunded", "2026-10-21T00:00:00Z")).toBe(
    false,
  );
  expect(studentEnrollmentOccupiesSeat("expired", null)).toBe(false);
});
test("student consent and immutable checkout contract reject tampering", () => {
  const input = {
    id: randomUUID(),
    offeringId: offer,
    name: "Synthetic Adult",
    email: " SYNTHETIC@example.test ",
    phone: "916 555 0100",
    adultAccepted: true,
    policyAccepted: true,
    policyVersion: policy,
  };
  expect(studentInput(input)?.email).toBe("synthetic@example.test");
  for (const extra of [
    { adultAccepted: false },
    { policyVersion: "old" },
    { amount: 1 },
    { email: "invalid" },
    { name: "bad\nheader" },
  ])
    expect(studentInput({ ...input, ...extra })).toBeNull();
  const held = {
    id: input.id,
    offering_id: offer,
    course_date: "2026-11-14",
    email: "synthetic@example.test",
    amount: 39500,
    currency: "usd",
    policy_version: policy,
    policy_hash: STUDENT_POLICY_HASH,
    stripe_expires_at: 1234567890,
    stripe_session_id: null,
  } as StudentEnrollment;
  const config = {
    mode: "test" as const,
    key: "rk_test_fixture",
    webhookSecret: "whsec_fixture",
    origin: "http://127.0.0.1:3117",
    account: "acct_fixture",
  };
  const params = studentSessionParameters(held, config);
  expect(params.get("line_items[0][price_data][unit_amount]")).toBe("39500");
  expect(params.get("custom_text[submit][message]")).toBe(
    INFECTION_CONTROL_CHECKOUT_POLICY,
  );
  expect(params.has("payment_method_types[0]")).toBe(false);
  expect(params.toString()).toBe(
    studentSessionParameters(held, config).toString(),
  );
  const session = {
    object: "checkout.session",
    id: "cs_test_fixture",
    livemode: false,
    mode: "payment",
    amount_total: 39500,
    currency: "usd",
    expires_at: 1234567890,
    client_reference_id: held.id,
    metadata: Object.fromEntries(
      [...params.entries()]
        .filter(([k]) => k.startsWith("metadata["))
        .map(([k, v]) => [k.slice(9, -1), v]),
    ),
  } as StudentSession;
  expect(() => assertStudentSession(session, held, config)).not.toThrow();
  for (const extra of [
    { livemode: true },
    { amount_total: 1 },
    { currency: "eur" },
    { expires_at: 1 },
    { metadata: { ...session.metadata, course_date: "2026-11-15" } },
    { metadata: { ...session.metadata, environment: "live" } },
    { metadata: { ...session.metadata, integration: "other" } },
  ])
    expect(() =>
      assertStudentSession({ ...session, ...extra }, held, config),
    ).toThrow();
});
test("student database enforces shared inventory, separate modes, replay, roster and atomic mail", async () => {
  const db = await PGlite.create();
  try {
    const migration = await readFile(
      "db/migrations/005_student_enrollment.sql",
      "utf8",
    );
    await db.exec(migration);
    await db.exec(migration);
    expect(migration).toContain("AND o.mode='live'");
    expect(migration).toContain("AND mode=p_mode FOR UPDATE");
    expect(migration).toContain("resolve_student_enrollment_review");
    expect(migration).toContain("RAISE EXCEPTION 'Class is full'");
    expect(await readFile("lib/student-enrollment.ts", "utf8")).toContain(
      "FROM student_enrollment_offerings o WHERE o.mode=${config.mode} AND o.enabled=true",
    );
    const lockSuite = await readFile(
      "scripts/test-student-enrollment-locks.mjs",
      "utf8",
    );
    expect(lockSuite).toContain(
      "M06 refunded seats occupy capacity until released",
    );
    expect(lockSuite).not.toMatch(/M22b refunded/);
    expect(lockSuite).toContain("student-enrollment-locks: ${passed} passed");
    const releaseGate = await readFile(
      ".github/workflows/release-gate.yml",
      "utf8",
    );
    const requiredLockStep = releaseGate.indexOf(
      "Verify student enrollment locks on real Postgres",
    );
    expect(requiredLockStep).toBeGreaterThan(releaseGate.indexOf("release-gate:"));
    expect(requiredLockStep).toBeLessThan(
      releaseGate.lastIndexOf("student-enrollment-locks:"),
    );
    expect(releaseGate).toContain("pnpm test:student-enrollment-locks");
    expect(await readFile("lib/student-enrollment.ts", "utf8")).toContain(
      "WHERE o.mode=${mode} AND r.resolved_at IS NULL",
    );
    expect(await readFile("lib/student-enrollment-stripe.ts", "utf8")).toContain(
      "account.id !== config.account ||",
    );
    expect(await readFile("lib/student-enrollment-stripe.ts", "utf8")).toContain(
      "charge.refunded === true && charge.amount_refunded === held.amount",
    );
    expect(await readFile("lib/student-enrollment-stripe.ts", "utf8")).toContain(
      'status === 409 && code === "idempotency_key_in_use"',
    );
    expect(await readFile("lib/student-enrollment-stripe.ts", "utf8")).toContain(
      "isStripeIdempotencyConflict(response.status, code)",
    );
    expect(await readFile("lib/student-enrollment-stripe.ts", "utf8")).toContain(
      "WHERE id=${held.id}::uuid AND status='reserved'",
    );
    expect(
      await readFile("app/api/student-enrollment/webhook/route.ts", "utf8"),
    ).toContain("studentWebhookConfig()");
    expect(
      await readFile("app/api/student-enrollment/webhook/route.ts", "utf8"),
    ).toContain("studentWebhookProcessesWhilePaymentsOff(event.type)");
    expect(
      await readFile("app/api/student-enrollment/webhook/route.ts", "utf8"),
    ).toContain("!verifyEnrollmentSignature(");
    expect(
      await readFile("app/api/student-enrollment/webhook/route.ts", "utf8"),
    ).toContain("(event.account && event.account !== config.account)");
    expect(isCanonicalInfectionControlDate("2026-11-14")).toBe(true);
    expect(isCanonicalInfectionControlDate("2026-11-07")).toBe(false);
    expect(
      (
        await db.query(
          "SELECT 1 FROM pg_constraint WHERE conrelid='student_enrollment_offerings'::regclass AND contype='c' AND pg_get_constraintdef(oid) ILIKE '%39500%'",
        )
      ).rows,
    ).toHaveLength(1);
    const amountChecks = (
      await db.query<{ conname: string }>(
        "SELECT conname FROM pg_constraint WHERE conrelid='student_enrollment_offerings'::regclass AND contype='c' AND pg_get_constraintdef(oid) ILIKE '%amount%39500%'",
      )
    ).rows;
    for (const check of amountChecks) {
      await db.exec(
        `ALTER TABLE student_enrollment_offerings DROP CONSTRAINT ${check.conname}`,
      );
    }
    await db.exec(migration);
    await expect(
      db.query(
        "INSERT INTO student_enrollment_offerings(id,mode,course_id,course_date,amount,external_seats,policy_version,policy_hash,policy_text,reviewed_at,review_reference,enabled) VALUES($1,'test','infection-control','2099-12-31',1,0,$2,$3,$4,now(),'amount',true)",
        [
          randomUUID(),
          policy,
          STUDENT_POLICY_HASH,
          CANCELLATION_POLICY_PARAGRAPHS.join("\n\n"),
        ],
      ),
    ).rejects.toThrow();
    expect(
      (
        await db.query(
          "SELECT 1 FROM pg_constraint WHERE conrelid='student_enrollment_offerings'::regclass AND contype='c' AND pg_get_constraintdef(oid) ILIKE '%amount%39500%'",
        )
      ).rows.length,
    ).toBeGreaterThan(0);
    expect(
      (await db.query("SELECT * FROM student_enrollment_offerings")).rows,
    ).toHaveLength(0);
    await expect(
      applyOfferingSeed(db, "db/seeds/infection-control-offerings.sql"),
    ).rejects.toThrow("Refusing to seed");
    await expect(
      applyOfferingSeed(db, "db/seeds/infection-control-offerings.test.sql"),
    ).rejects.toThrow("Refusing to seed TEST");
    await allowLiveOfferingSeed(db);
    await expect(
      applyOfferingSeed(db, "db/seeds/infection-control-offerings.test.sql"),
    ).rejects.toThrow("live-seed name is not enough");
    expect(
      (
        await db.query(
          "SELECT 1 FROM student_enrollment_offerings WHERE mode='test'",
        )
      ).rows,
    ).toHaveLength(0);
    await allowIsolatedTestOfferingSeed(db);
    await applyOfferingSeed(
      db,
      "db/seeds/infection-control-offerings.test.sql",
    );
    await db.query("DELETE FROM student_enrollment_offerings WHERE mode='test'");
    await allowLiveOfferingSeed(db);
    await applyOfferingSeed(db, "db/seeds/infection-control-offerings.sql");
    const seeded = (
      await db.query<{
        course_date: string | Date;
        amount: number;
        capacity: number;
        external_seats: number;
        enabled: boolean | string;
        mode: string;
      }>(
        "SELECT mode, course_date, amount, capacity, external_seats, enabled FROM student_enrollment_offerings ORDER BY course_date",
      )
    ).rows;
    expect(
      seeded.map((row) => ({
        mode: row.mode,
        course_date: enrollmentDate(row.course_date),
        amount: Number(row.amount),
        capacity: Number(row.capacity),
        external_seats: Number(row.external_seats),
        enabled: row.enabled === true || row.enabled === "t",
      })),
    ).toEqual([
      {
        mode: "live",
        course_date: "2026-11-14",
        amount: 39500,
        capacity: 12,
        external_seats: 0,
        enabled: false,
      },
      {
        mode: "live",
        course_date: "2026-12-05",
        amount: 39500,
        capacity: 12,
        external_seats: 0,
        enabled: false,
      },
    ]);
    await allowIsolatedTestOfferingSeed(db);
    await expect(
      applyOfferingSeed(db, "db/seeds/infection-control-offerings.test.sql"),
    ).rejects.toThrow("against live/prod data");
    await allowLiveOfferingSeed(db);
    await expect(
      applyOfferingSeed(db, "db/seeds/infection-control-offerings.test.sql"),
    ).rejects.toThrow("live-seed name is not enough");
    await db.query(
      "INSERT INTO student_enrollment_offerings(id,mode,course_id,course_date,amount,external_seats,policy_version,policy_hash,policy_text,reviewed_at,review_reference,enabled) VALUES($1,'test','infection-control','2026-11-14',39500,0,$2,$3,$4,now(),'stale isolated',false)",
      [
        "c1111111-1111-4111-8111-202611140099",
        policy,
        STUDENT_POLICY_HASH,
        CANCELLATION_POLICY_PARAGRAPHS.join("\n\n"),
      ],
    );
    await allowTestOfferingSeedOnLiveData(db);
    await expect(
      applyOfferingSeed(db, "db/seeds/infection-control-offerings.test.sql"),
    ).rejects.toThrow("stale or unexpected");
    expect(
      (
        await db.query(
          "SELECT 1 FROM student_enrollment_offerings WHERE mode='test' AND course_date='2026-12-05'",
        )
      ).rows,
    ).toHaveLength(0);
    await db.query("DELETE FROM student_enrollment_offerings WHERE mode='test'");
    await allowTestOfferingSeedOnLiveData(db);
    await applyOfferingSeed(
      db,
      "db/seeds/infection-control-offerings.test.sql",
    );
    await applyOfferingSeed(
      db,
      "db/seeds/infection-control-offerings.test.sql",
    );
    const testSeeded = (
      await db.query<{
        course_date: string | Date;
        amount: number;
        capacity: number;
        external_seats: number;
        enabled: boolean | string;
        mode: string;
        policy_hash: string;
      }>(
        "SELECT mode, course_date, amount, capacity, external_seats, enabled, policy_hash FROM student_enrollment_offerings WHERE mode='test' ORDER BY course_date",
      )
    ).rows;
    expect(
      testSeeded.map((row) => ({
        mode: row.mode,
        course_date: enrollmentDate(row.course_date),
        amount: Number(row.amount),
        capacity: Number(row.capacity),
        external_seats: Number(row.external_seats),
        enabled: row.enabled === true || row.enabled === "t",
        policy_hash: row.policy_hash,
      })),
    ).toEqual([
      {
        mode: "test",
        course_date: "2026-11-14",
        amount: 39500,
        capacity: 12,
        external_seats: 0,
        enabled: true,
        policy_hash: STUDENT_POLICY_HASH,
      },
      {
        mode: "test",
        course_date: "2026-12-05",
        amount: 39500,
        capacity: 12,
        external_seats: 0,
        enabled: true,
        policy_hash: STUDENT_POLICY_HASH,
      },
    ]);
    await db.query(
      "UPDATE student_enrollment_offerings SET enabled=true WHERE mode='live'",
    );
    const listed = await studentOfferings(
      {
        mode: "test",
        key: "sk_test_fixture",
        webhookSecret: "whsec_fixture",
        origin: "http://127.0.0.1:3117",
        account: "acct_fixture",
      },
      pgliteStudentDatabase(db),
    );
    expect(listed).toHaveLength(2);
    expect(listed.map((row) => row.mode)).toEqual(["test", "test"]);
    await db.query(
      "UPDATE student_enrollment_offerings SET enabled=false WHERE mode='live'",
    );
    await db.query("DELETE FROM student_enrollment_offerings WHERE mode='test'");
    await db.query(
      "INSERT INTO student_enrollment_offerings(id,mode,course_id,course_date,amount,external_seats,policy_version,policy_hash,policy_text,reviewed_at,review_reference,enabled) VALUES($1,'test','infection-control',$5,39500,2,$2,$3,$4,now(),'fixture',true)",
      [
        offer,
        policy,
        STUDENT_POLICY_HASH,
        CANCELLATION_POLICY_PARAGRAPHS.join("\n\n"),
        fixtureFirstDate,
      ],
    );
    const reserve = (id: string, index: number, mode = "test") =>
      db.query(
        "SELECT * FROM reserve_student_enrollment($1,$2,$3,$4,$5,$6,$7,$8,$9)",
        [
          id,
          offer,
          index.toString(16).padStart(64, "0"),
          `Synthetic Adult ${index}`,
          `adult${index}@example.test`,
          "916 555 0100",
          policy,
          STUDENT_POLICY_HASH,
          mode,
        ],
      );
    await expect(reserve(randomUUID(), 90, "live")).rejects.toThrow(
      "Unknown offering",
    );
    const ids = Array.from({ length: 24 }, () => randomUUID());
    const allocations = await Promise.all(ids.map((id, i) => reserve(id, i)));
    expect(allocations.filter((r) => r.rows.length)).toHaveLength(10);
    expect((await reserve(ids[0], 0)).rows).toHaveLength(1);
    await expect(reserve(ids[0], 99)).rejects.toThrow(
      "Enrollment identity conflict",
    );
    await expect(
      db.query("UPDATE student_enrollment_offerings SET amount=1 WHERE id=$1", [
        offer,
      ]),
    ).rejects.toThrow("Offering already has enrollments");
    await expect(
      db.query(
        "UPDATE student_enrollment_offerings SET external_seats=3 WHERE id=$1",
        [offer],
      ),
    ).rejects.toThrow("Inventory exceeds capacity");
    await db.query(
      "UPDATE student_enrollments SET stripe_session_id='cs_test_fixture' WHERE id=$1",
      [ids[0]],
    );
    const event = (name: string, outcome: string) =>
      db.query(
        "SELECT apply_student_enrollment_event($1,$2,'cs_test_fixture','pi_fixture',$3)",
        [name, ids[0], outcome],
      );
    await event("evt_paid", "paid");
    await event("evt_paid", "paid");
    expect(
      (await db.query("SELECT * FROM student_enrollment_roster")).rows,
    ).toHaveLength(0);
    expect(
      (await db.query("SELECT * FROM student_enrollment_roster_test")).rows,
    ).toHaveLength(1);
    expect(
      (await db.query("SELECT * FROM student_enrollment_mail")).rows,
    ).toHaveLength(1);
    await expect(event("evt_paid", "expired")).rejects.toThrow(
      "Event identity conflict",
    );
    await event("evt_refund", "refunded");
    expect(
      (
        await db.query<{ status: string }>(
          "SELECT status FROM student_enrollment_mail",
        )
      ).rows[0].status,
    ).toBe("review");
    expect((await reserve(randomUUID(), 100)).rows).toHaveLength(0);
    await event("evt_latepaid", "paid");
    await event("evt_paid", "refunded");
    expect(
      (
        await db.query<{ status: string }>(
          "SELECT status FROM student_enrollments WHERE id=$1",
          [ids[0]],
        )
      ).rows[0].status,
    ).toBe("refunded");
    expect(
      (await db.query("SELECT * FROM student_enrollment_mail")).rows,
    ).toHaveLength(1);
    expect(
      (
        await db.query<{ outcome: string }>(
          "SELECT outcome FROM student_enrollment_events WHERE event_id='evt_paid'",
        )
      ).rows[0].outcome,
    ).toBe("paid");
    const raced = ids[2];
    await db.query(
      "UPDATE student_enrollments SET stripe_session_id='cs_test_order' WHERE id=$1",
      [raced],
    );
    await Promise.all(
      [
        ["evt_racepaid", "paid"],
        ["evt_racerefund", "refunded"],
        ["evt_racestale", "paid"],
      ].map(([eventId, outcome]) =>
        db.query(
          "SELECT apply_student_enrollment_event($1,$2,'cs_test_order','pi_order',$3)",
          [eventId, raced, outcome],
        ),
      ),
    );
    expect(
      (
        await db.query<{ status: string }>(
          "SELECT status FROM student_enrollments WHERE id=$1",
          [raced],
        )
      ).rows[0].status,
    ).toBe("refunded");
    expect(
      (
        await db.query(
          "SELECT * FROM student_enrollment_mail WHERE enrollment_id=$1",
          [raced],
        )
      ).rows.length,
    ).toBeLessThanOrEqual(1);
    await expect(
      db.query(
        "SELECT apply_student_enrollment_event('evt_paid',$1,'cs_test_order','pi_order','paid')",
        [raced],
      ),
    ).rejects.toThrow("Event identity conflict");
    await db.query(
      "UPDATE student_enrollments SET stripe_session_id='cs_test_expire',stripe_expires_at=1 WHERE id=$1",
      [ids[1]],
    );
    expect((await reserve(randomUUID(), 101)).rows).toHaveLength(0);
    await db.query(
      "SELECT apply_student_enrollment_event('evt_expire',$1,'cs_test_expire',null,'expired')",
      [ids[1]],
    );
    expect((await reserve(randomUUID(), 102)).rows).toHaveLength(1);
    const stray = randomUUID();
    await db.query(
      "INSERT INTO student_enrollment_offerings(id,mode,course_id,course_date,amount,external_seats,policy_version,policy_hash,policy_text,reviewed_at,review_reference,enabled) VALUES($1,'live','infection-control','2099-01-15',39500,0,$2,$3,$4,now(),'noncanonical',true)",
      [
        stray,
        policy,
        STUDENT_POLICY_HASH,
        CANCELLATION_POLICY_PARAGRAPHS.join("\n\n"),
      ],
    );
    await expect(
      db.query(
        "SELECT * FROM reserve_student_enrollment($1,$2,$3,$4,$5,$6,$7,$8,$9)",
        [
          randomUUID(),
          stray,
          "f".repeat(64),
          "Synthetic Adult Live",
          "live@example.test",
          "916 555 0100",
          policy,
          STUDENT_POLICY_HASH,
          "live",
        ],
      ),
    ).rejects.toThrow("Offering unavailable");
    const unbound = ids[3];
    expect(
      (
        await db.query<{ status: string }>(
          "SELECT status FROM release_sessionless_student_enrollment($1)",
          [unbound],
        )
      ).rows[0].status,
    ).toBe("expired");
    expect(
      (
        await db.query(
          "UPDATE student_enrollments SET stripe_session_id='cs_test_released' WHERE id=$1 AND status='reserved' AND stripe_session_id IS NULL RETURNING id",
          [unbound],
        )
      ).rows,
    ).toHaveLength(0);
    const reservedBind = ids[4];
    expect(
      (
        await db.query(
          "UPDATE student_enrollments SET stripe_session_id='cs_test_reserved' WHERE id=$1 AND status='reserved' AND (stripe_session_id IS NULL OR stripe_session_id='cs_test_reserved') RETURNING id",
          [reservedBind],
        )
      ).rows,
    ).toHaveLength(1);
    await expect(
      db.query(
        "SELECT flag_student_enrollment_review($1,'cs_test_orphan','paid_after_release')",
        [reservedBind],
      ),
    ).rejects.toThrow("expired enrollment");
    await db.query(
      "SELECT flag_student_enrollment_review($1,'cs_test_orphan','paid_after_release')",
      [unbound],
    );
    await db.query(
      "SELECT flag_student_enrollment_review($1,'cs_test_orphan','paid_after_release')",
      [unbound],
    );
    expect(
      (
        await db.query(
          "SELECT session_id FROM student_enrollment_reviews WHERE enrollment_id=$1 ORDER BY session_id",
          [unbound],
        )
      ).rows,
    ).toEqual([{ session_id: "cs_test_orphan" }]);
    await db.query(
      "SELECT flag_student_enrollment_review($1,'cs_test_other','paid_after_release')",
      [unbound],
    );
    expect(
      (
        await db.query(
          "SELECT session_id FROM student_enrollment_reviews WHERE enrollment_id=$1 ORDER BY session_id",
          [unbound],
        )
      ).rows,
    ).toEqual([
      { session_id: "cs_test_orphan" },
      { session_id: "cs_test_other" },
    ]);
    await db.query(
      "SELECT resolve_student_enrollment_review($1,'cs_test_orphan','refunded',$2)",
      [unbound, "staff@example.test"],
    );
    expect(
      (
        await db.query<{ resolution: string }>(
          "SELECT resolution FROM student_enrollment_reviews WHERE enrollment_id=$1 AND session_id='cs_test_orphan'",
          [unbound],
        )
      ).rows[0].resolution,
    ).toBe("refunded");
    const fullOffer = "44444444-4444-4444-8444-444444444444";
    await db.query(
      "INSERT INTO student_enrollment_offerings(id,mode,course_id,course_date,amount,external_seats,policy_version,policy_hash,policy_text,reviewed_at,review_reference,enabled) VALUES($1,'test','infection-control',$5,39500,12,$2,$3,$4,now(),'full resolve',true)",
      [
        fullOffer,
        policy,
        STUDENT_POLICY_HASH,
        CANCELLATION_POLICY_PARAGRAPHS.join("\n\n"),
        fixtureSecondDate > fixtureFirstDate
          ? fixtureSecondDate
          : "2099-06-15",
      ],
    );
    const fullExpired = randomUUID();
    await db.query(
      "INSERT INTO student_enrollments(id,offering_id,course_date,owner_hash,student_name,email,phone,adult_attested,policy_version,policy_hash,policy_text,amount,currency,status) VALUES($1,$2,$3,$4,$5,$6,$7,true,$8,$9,$10,39500,'usd','expired')",
      [
        fullExpired,
        fullOffer,
        fixtureSecondDate > fixtureFirstDate
          ? fixtureSecondDate
          : "2099-06-15",
        "e".repeat(64),
        "Full Class Adult",
        "full-class@example.test",
        "916 555 0199",
        policy,
        STUDENT_POLICY_HASH,
        CANCELLATION_POLICY_PARAGRAPHS.join("\n\n"),
      ],
    );
    await db.query(
      "SELECT flag_student_enrollment_review($1,'cs_test_full','paid_after_release')",
      [fullExpired],
    );
    await expect(
      db.query(
        "SELECT resolve_student_enrollment_review($1,'cs_test_full','enrolled',$2)",
        [fullExpired, "staff@example.test"],
      ),
    ).rejects.toThrow("Class is full");
    await expect(
      db.query(
        "SELECT resolve_student_enrollment_review($1,'cs_test_full','dismissed',$2)",
        [fullExpired, ""],
      ),
    ).rejects.toThrow("Actor required");
    await db.query(
      "SELECT resolve_student_enrollment_review($1,'cs_test_full','dismissed',$2)",
      [fullExpired, "staff@example.test"],
    );
    expect(
      (
        await db.query<{ actor: string; outcome: string }>(
          "SELECT actor,outcome FROM student_enrollment_events WHERE event_id=$1",
          [`resolve:${fullExpired}:cs_test_full:dismissed`],
        )
      ).rows[0],
    ).toEqual({ actor: "staff@example.test", outcome: "dismissed" });
    const cleanup = await readFile("docs/student-payments.md", "utf8");
    expect(cleanup.indexOf("DELETE FROM student_enrollment_reviews")).toBeGreaterThan(
      -1,
    );
    expect(cleanup.indexOf("DELETE FROM student_enrollment_reviews")).toBeLessThan(
      cleanup.indexOf("DELETE FROM student_enrollments\n WHERE offering_id"),
    );
    await db.query(
      "UPDATE student_enrollments SET status='expired' WHERE offering_id=$1 AND status='reserved'",
      [offer],
    );
    await db.query(
      "UPDATE student_enrollment_offerings SET external_seats=9 WHERE id=$1",
      [offer],
    );
    const lastIds = Array.from({ length: 8 }, () => randomUUID());
    const lastAllocations = await Promise.all(
      lastIds.map((id, index) => reserve(id, 300 + index)),
    );
    expect(lastAllocations.filter((row) => row.rows.length)).toHaveLength(1);
    expect(lastAllocations.filter((row) => !row.rows.length).length).toBe(7);
    const releaseOffer = "55555555-5555-4555-8555-555555555501";
    await db.query(
      "INSERT INTO student_enrollment_offerings(id,mode,course_id,course_date,amount,external_seats,policy_version,policy_hash,policy_text,reviewed_at,review_reference,enabled) VALUES($1,'test','infection-control','2099-08-15',39500,11,$2,$3,$4,now(),'release seat',true)",
      [
        releaseOffer,
        policy,
        STUDENT_POLICY_HASH,
        CANCELLATION_POLICY_PARAGRAPHS.join("\n\n"),
      ],
    );
    const releaseId = randomUUID();
    expect(
      (
        await db.query(
          "SELECT * FROM reserve_student_enrollment($1,$2,$3,$4,$5,$6,$7,$8,$9)",
          [
            releaseId,
            releaseOffer,
            "a".repeat(64),
            "Release Adult",
            "release-seat@example.test",
            "916 555 0100",
            policy,
            STUDENT_POLICY_HASH,
            "test",
          ],
        )
      ).rows,
    ).toHaveLength(1);
    await db.query(
      "UPDATE student_enrollments SET status='refunded',stripe_session_id='cs_test_release' WHERE id=$1",
      [releaseId],
    );
    expect(
      (
        await db.query(
          "SELECT * FROM reserve_student_enrollment($1,$2,$3,$4,$5,$6,$7,$8,$9)",
          [
            randomUUID(),
            releaseOffer,
            "b".repeat(64),
            "Blocked Adult",
            "blocked-seat@example.test",
            "916 555 0100",
            policy,
            STUDENT_POLICY_HASH,
            "test",
          ],
        )
      ).rows,
    ).toHaveLength(0);
    await expect(
      db.query("SELECT release_refunded_student_seat($1,$2)", [releaseId, "x"]),
    ).rejects.toThrow("Actor required");
    await db.query("SELECT release_refunded_student_seat($1,$2)", [
      releaseId,
      "staff@example.test",
    ]);
    expect(
      (
        await db.query<{ actor: string; outcome: string }>(
          "SELECT actor,outcome FROM student_enrollment_events WHERE event_id=$1",
          [`release:${releaseId}`],
        )
      ).rows[0],
    ).toEqual({ actor: "staff@example.test", outcome: "released" });
    expect(
      (
        await db.query(
          "SELECT * FROM reserve_student_enrollment($1,$2,$3,$4,$5,$6,$7,$8,$9)",
          [
            randomUUID(),
            releaseOffer,
            "c".repeat(64),
            "Freed Adult",
            "freed-seat@example.test",
            "916 555 0100",
            policy,
            STUDENT_POLICY_HASH,
            "test",
          ],
        )
      ).rows,
    ).toHaveLength(1);
    const cleanupDocs = await readFile("docs/student-payments.md", "utf8");
    const cleanupSql = cleanupDocs.match(
      /DELETE FROM student_enrollment_reviews[\s\S]+DELETE FROM student_enrollment_offerings WHERE mode = 'test';/,
    )?.[0];
    expect(cleanupSql).toBeTruthy();
    expect(cleanupSql!.startsWith("DELETE FROM student_enrollment_reviews")).toBe(
      true,
    );
    expect(
      cleanupSql!.indexOf("DELETE FROM student_enrollment_reviews"),
    ).toBeLessThan(cleanupSql!.indexOf("DELETE FROM student_enrollments"));
    const openReview = randomUUID();
    await db.query(
      "INSERT INTO student_enrollments(id,offering_id,course_date,owner_hash,student_name,email,phone,adult_attested,policy_version,policy_hash,policy_text,amount,currency,status) VALUES($1,$2,$3,$4,$5,$6,$7,true,$8,$9,$10,39500,'usd','expired')",
      [
        openReview,
        offer,
        fixtureFirstDate,
        "f".repeat(64),
        "Cleanup Order Adult",
        "cleanup-order@example.test",
        "916 555 0100",
        policy,
        STUDENT_POLICY_HASH,
        CANCELLATION_POLICY_PARAGRAPHS.join("\n\n"),
      ],
    );
    await db.query(
      "SELECT flag_student_enrollment_review($1,'cs_test_cleanup','paid_after_release')",
      [openReview],
    );
    await db.exec(cleanupSql!);
    expect(
      (
        await db.query(
          "SELECT 1 FROM student_enrollments e JOIN student_enrollment_offerings o ON o.id=e.offering_id WHERE o.mode='test'",
        )
      ).rows,
    ).toHaveLength(0);
  } finally {
    await db.close();
  }
});
test("each confirmed date has a 12-seat cap, blocks the 13th, and a sold-out date cannot be purchased", async () => {
  const db = await PGlite.create();
  const december = "22222222-2222-4222-8222-222222222222";
  const soldOut = "33333333-3333-4333-8333-333333333333";
  try {
    await db.exec(
      await readFile("db/migrations/005_student_enrollment.sql", "utf8"),
    );
    await db.query(
      "INSERT INTO student_enrollment_offerings(id,mode,course_id,course_date,amount,external_seats,policy_version,policy_hash,policy_text,reviewed_at,review_reference,enabled) VALUES($1,'test','infection-control',$5,39500,0,$2,$3,$4,now(),'fixture',true)",
      [
        december,
        policy,
        STUDENT_POLICY_HASH,
        CANCELLATION_POLICY_PARAGRAPHS.join("\n\n"),
        fixtureSecondDate,
      ],
    );
    await db.query(
      "INSERT INTO student_enrollment_offerings(id,mode,course_id,course_date,amount,external_seats,policy_version,policy_hash,policy_text,reviewed_at,review_reference,enabled) VALUES($1,'test','infection-control',$5,39500,12,$2,$3,$4,now(),'fixture',true)",
      [
        soldOut,
        policy,
        STUDENT_POLICY_HASH,
        CANCELLATION_POLICY_PARAGRAPHS.join("\n\n"),
        fixtureFirstDate,
      ],
    );
    const reserve = (id: string, offeringId: string, index: number) =>
      db.query(
        "SELECT * FROM reserve_student_enrollment($1,$2,$3,$4,$5,$6,$7,$8,$9)",
        [
          id,
          offeringId,
          index.toString(16).padStart(64, "0"),
          `Synthetic Adult ${index}`,
          `adult${index}@example.test`,
          "916 555 0100",
          policy,
          STUDENT_POLICY_HASH,
          "test",
        ],
      );
    const ids = Array.from({ length: 13 }, () => randomUUID());
    const allocations = await Promise.all(
      ids.map((id, index) => reserve(id, december, index)),
    );
    expect(allocations.filter((row) => row.rows.length)).toHaveLength(12);
    expect(allocations[12].rows).toHaveLength(0);
    expect((await reserve(randomUUID(), soldOut, 200)).rows).toHaveLength(0);
    expect(
      (
        await db.query(
          "SELECT course_date FROM student_enrollment_offerings WHERE course_date='2026-11-07'",
        )
      ).rows,
    ).toHaveLength(0);
  } finally {
    await db.close();
  }
});
test("claimed enrollment mutants fail when applied at their source lines", async () => {
  const db = await PGlite.create();
  try {
    await db.exec(
      await readFile("db/migrations/005_student_enrollment.sql", "utf8"),
    );
    const threeArg = await db.query(
      "SELECT 1 FROM pg_proc WHERE proname='resolve_student_enrollment_review' AND pronargs=3",
    );
    expect(threeArg.rows).toHaveLength(0);
    await db.query(
      "INSERT INTO student_enrollment_offerings(id,mode,course_id,course_date,amount,external_seats,policy_version,policy_hash,policy_text,reviewed_at,review_reference,enabled) VALUES($1,'test','infection-control',$5,39500,0,$2,$3,$4,now(),'mutants',true)",
      [
        offer,
        policy,
        STUDENT_POLICY_HASH,
        CANCELLATION_POLICY_PARAGRAPHS.join("\n\n"),
        fixtureFirstDate,
      ],
    );
    const bound = randomUUID();
    await db.query(
      "INSERT INTO student_enrollments(id,offering_id,course_date,owner_hash,student_name,email,phone,adult_attested,policy_version,policy_hash,policy_text,amount,currency,status,stripe_session_id) VALUES($1,$2,$3,$4,$5,$6,$7,true,$8,$9,$10,39500,'usd','reserved','cs_test_bound')",
      [
        bound,
        offer,
        fixtureFirstDate,
        "21".repeat(32),
        "Bound Adult",
        "bound-mutant@example.test",
        "916 555 0100",
        policy,
        STUDENT_POLICY_HASH,
        CANCELLATION_POLICY_PARAGRAPHS.join("\n\n"),
      ],
    );
    expect(
      (
        await db.query<{ status: string }>(
          "SELECT status FROM release_sessionless_student_enrollment($1)",
          [bound],
        )
      ).rows[0].status,
    ).toBe("reserved");
    await expect(
      db.query(
        "UPDATE student_enrollment_offerings SET policy_version='old' WHERE id=$1",
        [offer],
      ),
    ).rejects.toThrow("Offering already has enrollments");
    const leftover = randomUUID();
    await db.query(
      "INSERT INTO student_enrollment_offerings(id,mode,course_id,course_date,amount,external_seats,policy_version,policy_hash,policy_text,reviewed_at,review_reference,enabled) VALUES($1,'test','infection-control','2026-10-10',39500,0,$2,$3,$4,now(),'extra leftover',true)",
      [
        leftover,
        policy,
        STUDENT_POLICY_HASH,
        CANCELLATION_POLICY_PARAGRAPHS.join("\n\n"),
      ],
    );
    await allowIsolatedTestOfferingSeed(db);
    await expect(
      applyOfferingSeed(db, "db/seeds/infection-control-offerings.test.sql"),
    ).rejects.toThrow(/expected 2 rows/i);
    expect(
      (
        await db.query(
          "SELECT 1 FROM student_enrollment_offerings WHERE mode='test' AND course_date='2026-12-05'",
        )
      ).rows,
    ).toHaveLength(0);
    await db.query(
      "DELETE FROM student_enrollment_offerings WHERE id=$1",
      [leftover],
    );
    const liveNoncanonical = randomUUID();
    await db.query(
      "INSERT INTO student_enrollment_offerings(id,mode,course_id,course_date,amount,external_seats,policy_version,policy_hash,policy_text,reviewed_at,review_reference,enabled) VALUES($1,'live','infection-control','2099-01-15',39500,0,$2,$3,$4,now(),'noncanonical live',true)",
      [
        liveNoncanonical,
        policy,
        STUDENT_POLICY_HASH,
        CANCELLATION_POLICY_PARAGRAPHS.join("\n\n"),
      ],
    );
    const liveListed = await studentOfferings(
      {
        mode: "live",
        key: "sk_live_fixture",
        webhookSecret: "whsec_fixture",
        origin: "https://example.test",
        account: "acct_1UJHgLCOhHjREvRz",
      },
      pgliteStudentDatabase(db),
    );
    expect(liveListed.map((row) => row.course_date)).not.toContain("2099-01-15");
    const liveHold = randomUUID();
    const liveOffer = randomUUID();
    await db.query(
      "INSERT INTO student_enrollment_offerings(id,mode,course_id,course_date,amount,external_seats,policy_version,policy_hash,policy_text,reviewed_at,review_reference,enabled) VALUES($1,'live','infection-control','2026-11-14',39500,0,$2,$3,$4,now(),'live holds',true)",
      [
        liveOffer,
        policy,
        STUDENT_POLICY_HASH,
        CANCELLATION_POLICY_PARAGRAPHS.join("\n\n"),
      ],
    );
    await db.query(
      "INSERT INTO student_enrollments(id,offering_id,course_date,owner_hash,student_name,email,phone,adult_attested,policy_version,policy_hash,policy_text,amount,currency,status) VALUES($1,$2,'2026-11-14',$3,$4,$5,$6,true,$7,$8,$9,39500,'usd','reserved')",
      [
        liveHold,
        liveOffer,
        "22".repeat(32),
        "Live Hold Adult",
        "live-hold@example.test",
        "916 555 0100",
        policy,
        STUDENT_POLICY_HASH,
        CANCELLATION_POLICY_PARAGRAPHS.join("\n\n"),
      ],
    );
    const testHolds = await listStudentReservedHolds(
      "test",
      pgliteStudentDatabase(db),
    );
    expect(testHolds.some((row) => row.id === liveHold)).toBe(false);
    expect(testHolds.some((row) => row.id === bound)).toBe(true);
    const remainingOffer = randomUUID();
    await db.query(
      "INSERT INTO student_enrollment_offerings(id,mode,course_id,course_date,amount,external_seats,policy_version,policy_hash,policy_text,reviewed_at,review_reference,enabled) VALUES($1,'test','infection-control','2099-07-15',39500,11,$2,$3,$4,now(),'remaining drift',true)",
      [
        remainingOffer,
        policy,
        STUDENT_POLICY_HASH,
        CANCELLATION_POLICY_PARAGRAPHS.join("\n\n"),
      ],
    );
    const refundedId = randomUUID();
    await db.query(
      "INSERT INTO student_enrollments(id,offering_id,course_date,owner_hash,student_name,email,phone,adult_attested,policy_version,policy_hash,policy_text,amount,currency,status) VALUES($1,$2,'2099-07-15',$3,$4,$5,$6,true,$7,$8,$9,39500,'usd','refunded')",
      [
        refundedId,
        remainingOffer,
        "23".repeat(32),
        "Remaining Drift Adult",
        "remaining-drift@example.test",
        "916 555 0100",
        policy,
        STUDENT_POLICY_HASH,
        CANCELLATION_POLICY_PARAGRAPHS.join("\n\n"),
      ],
    );
    const listed = await studentOfferings(
      {
        mode: "test",
        key: "sk_test_fixture",
        webhookSecret: "whsec_fixture",
        origin: "http://127.0.0.1:3117",
        account: "acct_fixture",
      },
      pgliteStudentDatabase(db),
    );
    expect(listed.find((row) => row.id === remainingOffer)?.remaining).toBe(0);
    expect(
      (
        await db.query(
          "SELECT * FROM reserve_student_enrollment($1,$2,$3,$4,$5,$6,$7,$8,$9)",
          [
            randomUUID(),
            remainingOffer,
            "24".repeat(32),
            "Blocked Remaining Adult",
            "blocked-remaining@example.test",
            "916 555 0100",
            policy,
            STUDENT_POLICY_HASH,
            "test",
          ],
        )
      ).rows,
    ).toHaveLength(0);
    await db.query("SELECT release_refunded_student_seat($1,$2)", [
      refundedId,
      "staff@example.test",
    ]);
    const roster = await db.query<{
      inventory_released_at: string | null;
      status: string;
    }>(
      "SELECT status,inventory_released_at FROM student_enrollment_roster_test WHERE id=$1",
      [refundedId],
    );
    expect(roster.rows[0].status).toBe("refunded");
    expect(roster.rows[0].inventory_released_at).toBeTruthy();
    expect(refundedRosterPaymentLabel("test", roster.rows[0].inventory_released_at)).toBe(
      "TEST ONLY · refunded · released",
    );
    expect(refundedRosterPaymentLabel("live", null)).toBe(
      "refunded — not sellable until released",
    );
    const docs = await readFile("docs/student-payments.md", "utf8");
    expect(docs).toContain("reserved + paid + unreleased refunded");
    expect(docs).not.toContain(
      "when reserved + paid + refunded already fill the offering",
    );
    expect(docs.indexOf("Refund any verification charge")).toBeGreaterThan(-1);
    expect(docs.indexOf("Refund any verification charge")).toBeLessThan(
      docs.indexOf("Set `RDA_STUDENT_PAYMENTS_LIVE_ENABLED` back"),
    );
    const page = await readFile("app/enrollment-pilot/roster/page.tsx", "utf8");
    expect(page).toContain("listStudentReservedHolds(config.mode)");
    expect(page).toContain("refundedRosterPaymentLabel");
    expect(page).toContain("r.inventory_released_at");
    const enroll = await readFile("app/enroll/page.tsx", "utf8");
    expect(enroll).toContain("live?.remaining");
    expect(enroll).toContain("${Math.max(0, remaining)} seats available");
  } finally {
    await db.close();
  }
});
