import assert from "node:assert/strict";
import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { PGlite } from "@electric-sql/pglite";

import {
  inspectEnrollmentPilot,
  readAttributionMigrations,
} from "./migrate-attribution.mjs";

const OWNER = "a".repeat(64);
const DATE = "2026-10-12";
const POLICY = "2026-09-30";
const FIXTURE_SECRET = "whsec_fixture";

export function signStripeTestEvent(secret, payload, now = Date.now()) {
  const timestamp = String(Math.floor(now / 1000));
  const signature = createHmac("sha256", secret).update(`${timestamp}.${payload}`).digest("hex");
  return { header: `t=${timestamp},v1=${signature}`, payload, timestamp };
}

export function verifyStripeTestSignature(payload, header, secret, now = Date.now()) {
  const pieces = header.split(",");
  const timestamps = pieces.filter((part) => part.startsWith("t="));
  if (timestamps.length !== 1) return false;
  const timestamp = timestamps[0].slice(2);
  if (!/^\d+$/.test(timestamp) || Math.abs(now / 1000 - Number(timestamp)) > 300) return false;
  const expected = createHmac("sha256", secret).update(`${timestamp}.${payload}`).digest();
  return pieces.filter((part) => part.startsWith("v1=")).some((part) => {
    const signature = part.slice(3);
    if (!/^[a-f0-9]{64}$/.test(signature)) return false;
    const actual = Buffer.from(signature, "hex");
    return actual.length === expected.length && timingSafeEqual(expected, actual);
  });
}

function signedOutcomeEvent(type, sessionId, holdId) {
  const event = {
    id: `evt_${randomUUID().replaceAll("-", "")}`,
    livemode: false,
    type,
    data: {
      object: {
        id: sessionId,
        object: "checkout.session",
        livemode: false,
        metadata: { hold_id: holdId, course_date: DATE, policy_version: POLICY, pilot: "test-only" },
      },
    },
  };
  const payload = JSON.stringify(event);
  const signed = signStripeTestEvent(FIXTURE_SECRET, payload);
  assert.equal(verifyStripeTestSignature(payload, signed.header, FIXTURE_SECRET), true);
  assert.equal(verifyStripeTestSignature(`${payload} `, signed.header, FIXTURE_SECRET), false);
  return { ...signed, event };
}

async function reserve(db, id = randomUUID()) {
  const result = await db.query(
    "SELECT hold_id::text AS hold_id FROM reserve_enrollment_test_hold($1::uuid,$2::date,$3,$4)",
    [id, DATE, OWNER, POLICY],
  );
  return result.rows[0] ?? null;
}

async function bind(db, holdId, sessionId) {
  await db.query(
    "UPDATE enrollment_test_holds SET stripe_session_id=$2 WHERE hold_id=$1::uuid",
    [holdId, sessionId],
  );
}

async function applyEvent(db, eventId, sessionId, holdId, outcome) {
  const result = await db.query(
    "SELECT apply_enrollment_test_event($1,$2::uuid,$3,$4) AS accepted",
    [eventId, holdId, sessionId, outcome],
  );
  return result.rows[0].accepted;
}

async function openSeats(db) {
  const result = await db.query(
    "SELECT count(*)::int AS count FROM enrollment_test_holds WHERE course_date=$1::date AND status IN ('reserved','paid')",
    [DATE],
  );
  return 12 - result.rows[0].count;
}

async function apply004(db, root) {
  const sql = await readFile(join(root, "db/migrations/004_enrollment_test_pilot.sql"), "utf8");
  await db.exec(sql);
}

export async function assertMigration004Idempotent(root) {
  const db = await PGlite.create();
  try {
    const empty = await inspectEnrollmentPilot((text) => db.query(text));
    assert.equal(empty.applied, false);
    await apply004(db, root);
    await apply004(db, root);
    const applied = await inspectEnrollmentPilot((text) => db.query(text));
    assert.equal(applied.applied, true);
    assert.deepEqual(applied.missing, []);
    return "idempotent-004";
  } finally {
    await db.close();
  }
}

export async function scenarioPaidPurchase(root) {
  const db = await PGlite.create();
  try {
    await apply004(db, root);
    const hold = await reserve(db);
    assert.ok(hold, "paid scenario must reserve a seat");
    const sessionId = "cs_test_paid4242";
    await bind(db, hold.hold_id, sessionId);
    const signed = signedOutcomeEvent("checkout.session.completed", sessionId, hold.hold_id);
    assert.equal(await applyEvent(db, signed.event.id, sessionId, hold.hold_id, "paid"), true);
    assert.equal(await applyEvent(db, signed.event.id, sessionId, hold.hold_id, "paid"), false);
    const holdRow = await db.query("SELECT status FROM enrollment_test_holds WHERE hold_id=$1::uuid", [hold.hold_id]);
    assert.equal(holdRow.rows[0].status, "paid");
    assert.equal(await openSeats(db), 11);
    return "i-paid";
  } finally {
    await db.close();
  }
}

export async function scenarioExpiredRelease(root) {
  const db = await PGlite.create();
  try {
    await apply004(db, root);
    const hold = await reserve(db);
    assert.ok(hold, "expired scenario must reserve a seat");
    const sessionId = "cs_test_abandoned";
    await bind(db, hold.hold_id, sessionId);
    const signed = signedOutcomeEvent("checkout.session.expired", sessionId, hold.hold_id);
    assert.equal(await applyEvent(db, signed.event.id, sessionId, hold.hold_id, "expired"), true);
    const holdRow = await db.query("SELECT status FROM enrollment_test_holds WHERE hold_id=$1::uuid", [hold.hold_id]);
    assert.equal(holdRow.rows[0].status, "expired");
    assert.equal(await openSeats(db), 12);
    const released = await reserve(db);
    assert.ok(released, "expired checkout must release the seat hold");
    assert.equal(await openSeats(db), 11);
    return "ii-expired";
  } finally {
    await db.close();
  }
}

export async function scenarioFullClassBlocksThirteenth(root) {
  const db = await PGlite.create();
  try {
    await apply004(db, root);
    const accepted = [];
    for (let index = 0; index < 13; index += 1) {
      const hold = await reserve(db);
      if (hold) accepted.push(hold.hold_id);
    }
    assert.equal(accepted.length, 12);
    assert.equal(await openSeats(db), 0);
    assert.equal(await reserve(db), null);
    return "iii-capacity";
  } finally {
    await db.close();
  }
}

export async function runEnrollmentPilotVerify(root = join(dirname(fileURLToPath(import.meta.url)), "..")) {
  const migrations = await readAttributionMigrations(root);
  assert.equal(migrations.some((migration) => migration.name === "004_enrollment_test_pilot.sql"), true);
  const scenarios = [
    await assertMigration004Idempotent(root),
    await scenarioPaidPurchase(root),
    await scenarioExpiredRelease(root),
    await scenarioFullClassBlocksThirteenth(root),
  ];
  return {
    status: "passed",
    applied: true,
    changed: false,
    scenarios,
    testOnly: true,
  };
}

async function main() {
  console.log(JSON.stringify(await runEnrollmentPilotVerify()));
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : "Enrollment pilot verify failed");
    process.exitCode = 1;
  });
}
