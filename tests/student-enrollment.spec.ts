import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import { test, expect } from "@playwright/test";
import { enrollmentDate } from "@/lib/enrollment-contract";
import {
  studentConfig,
  studentInput,
  STUDENT_POLICY_HASH,
  type StudentEnrollment,
} from "@/lib/student-enrollment";
import {
  assertStudentSession,
  studentSessionParameters,
  type StudentSession,
} from "@/lib/student-enrollment-stripe";
const offer = "11111111-1111-4111-8111-111111111111",
  policy = "2026-09-30";
test("database course dates preserve their calendar day and reject null", () => {
  expect(enrollmentDate(new Date(2099,10,14))).toBe("2099-11-14");
  expect(enrollmentDate("2099-11-14")).toBe("2099-11-14");
  expect(() => enrollmentDate(null)).toThrow();
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
    expect(studentConfig()).toBeNull();
    process.env.RDA_STUDENT_PAYMENTS_LIVE_ENABLED = "true";
    expect(studentConfig()?.mode).toBe("live");
    process.env.RDA_STUDENT_STRIPE_ACCOUNT_ID = "acct_prism";
    expect(studentConfig()).toBeNull();
    process.env.RDA_STUDENT_STRIPE_ACCOUNT_ID = "acct_1UJHgLCOhHjREvRz";
    process.env.RDA_STUDENT_PAYMENTS_ORIGIN = "http://127.0.0.1:3117";
    expect(studentConfig()).toBeNull();
    process.env.RDA_STUDENT_PAYMENTS_MODE = "test";
    process.env.RDA_STUDENT_STRIPE_TEST_KEY = "rk_live_wrongmode";
    expect(studentConfig()).toBeNull();
  } finally {
    process.env = before;
  }
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
    course_date: "2099-11-14",
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
    { metadata: { ...session.metadata, course_date: "2099-11-15" } },
    { metadata: { ...session.metadata, environment: "live" } },
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
    expect(
      (await db.query("SELECT * FROM student_enrollment_offerings")).rows,
    ).toHaveLength(0);
    await db.query(
      "INSERT INTO student_enrollment_offerings(id,mode,course_id,course_date,amount,external_seats,policy_version,policy_hash,reviewed_at,review_reference,enabled) VALUES($1,'test','infection-control','2099-11-14',39500,2,$2,$3,now(),'fixture',true)",
      [offer, policy, STUDENT_POLICY_HASH],
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
    await expect(event("evt_latepaid", "paid")).rejects.toThrow(
      "Conflicting terminal state",
    );
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
  } finally {
    await db.close();
  }
});
