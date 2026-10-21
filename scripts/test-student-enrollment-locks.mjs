// Real Postgres concurrency proof. PGlite is one connection and cannot detect
// a missing FOR UPDATE lock. Prints `N passed` so CI/review can count cases.
import { createHash, randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import pg from "pg";

const url = process.env.STUDENT_LOCK_DATABASE_URL ?? "";
if (
  !/^postgres(?:ql)?:\/\/postgres:postgres@(?:localhost|127\.0\.0\.1)(?::\d+)?\/rda_locks(?:\?.*)?$/.test(
    url,
  )
) {
  throw new Error(
    "STUDENT_LOCK_DATABASE_URL must be the local CI lock database postgres://postgres:postgres@127.0.0.1:5432/rda_locks",
  );
}

const source = await readFile(
  new URL("../lib/academy-policies.ts", import.meta.url),
  "utf8",
);
const paragraphs = [
  ...source
    .split("export const CANCELLATION_POLICY_PARAGRAPHS = [")[1]
    .split("] as const")[0]
    .matchAll(/"([^"\n]*)"/g),
].map((match) => match[1]);
const policyText = paragraphs.join("\n\n");
const policyHash = createHash("sha256").update(policyText).digest("hex");
const policyVersion = "2026-09-30";
const reserveSql =
  "SELECT * FROM reserve_student_enrollment($1,$2,$3,$4,$5,$6,$7,$8,$9)";
const reserveParams = (id, offeringId, index, mode) => [
  id,
  offeringId,
  index.toString(16).padStart(64, "0"),
  `Lock Adult ${index}`,
  `lock${index}@example.test`,
  "916 555 0100",
  policyVersion,
  policyHash,
  mode,
];

let passed = 0;
async function test(name, fn) {
  await fn();
  passed += 1;
  console.log(`ok ${passed} - ${name}`);
}

const admin = new pg.Client({ connectionString: url });
await admin.connect();
try {
  await admin.query(
    await readFile(
      new URL("../db/migrations/005_student_enrollment.sql", import.meta.url),
      "utf8",
    ),
  );
  const lastSeat = "55555555-5555-4555-8555-555555555555";
  const liveOffer = "66666666-6666-4666-8666-666666666666";
  const refundOffer = "77777777-7777-4777-8777-777777777777";
  const verifyOffer = "88888888-8888-4888-8888-888888888888";
  await admin.query(
    `INSERT INTO student_enrollment_offerings(
      id,mode,course_id,course_date,amount,external_seats,policy_version,policy_hash,policy_text,reviewed_at,review_reference,enabled
    ) VALUES
      ($1,'test','infection-control','2026-11-14',39500,0,$5,$6,$7,now(),'lock last seat',true),
      ($2,'live','infection-control','2026-11-14',39500,0,$5,$6,$7,now(),'lock live mode',true),
      ($3,'test','infection-control','2026-12-05',39500,0,$5,$6,$7,now(),'lock refunded seats',true),
      ($4,'test','infection-control','2099-09-15',39500,0,$5,$6,$7,now(),'lock verification release',true)`,
    [
      lastSeat,
      liveOffer,
      refundOffer,
      verifyOffer,
      policyVersion,
      policyHash,
      policyText,
    ],
  );

  await test("M49 / M05 last-seat FOR UPDATE admits exactly one winner", async () => {
    for (let index = 0; index < 11; index++) {
      const reserved = await admin.query(
        reserveSql,
        reserveParams(randomUUID(), lastSeat, index, "test"),
      );
      if (!reserved.rows.length) {
        throw new Error(`Failed to fill seat ${index + 1} of 11 before the race`);
      }
    }
    const first = new pg.Client({ connectionString: url });
    const second = new pg.Client({ connectionString: url });
    await Promise.all([first.connect(), second.connect()]);
    try {
      const raced = await Promise.allSettled([
        first.query(reserveSql, reserveParams(randomUUID(), lastSeat, 200, "test")),
        second.query(
          reserveSql,
          reserveParams(randomUUID(), lastSeat, 201, "test"),
        ),
      ]);
      const winners = raced.filter(
        (result) => result.status === "fulfilled" && result.value.rows.length,
      );
      if (winners.length !== 1) {
        throw new Error(
          `Last-seat race expected exactly 1 winner, got ${winners.length} (M49 / missing FOR UPDATE)`,
        );
      }
    } finally {
      await Promise.all([first.end(), second.end()]);
    }
  });

  await test("M49 reserve waits on an exclusive offering lock", async () => {
    const locker = new pg.Client({ connectionString: url });
    const waiter = new pg.Client({ connectionString: url });
    await Promise.all([locker.connect(), waiter.connect()]);
    try {
      await locker.query("BEGIN");
      await locker.query(
        "SELECT id FROM student_enrollment_offerings WHERE id=$1 FOR UPDATE",
        [liveOffer],
      );
      await waiter.query("SET lock_timeout = '400ms'");
      let timedOut = false;
      try {
        await waiter.query(
          reserveSql,
          reserveParams(randomUUID(), liveOffer, 301, "live"),
        );
      } catch (error) {
        timedOut = /lock timeout|canceling statement/i.test(String(error.message));
        if (!timedOut) throw error;
      }
      await locker.query("ROLLBACK");
      if (!timedOut) {
        throw new Error(
          "reserve_student_enrollment did not wait on the offering row lock (M49)",
        );
      }
    } finally {
      await Promise.all([locker.end(), waiter.end()]);
    }
  });

  await test("M05b mode=p_mode rejects a live offering in test mode", async () => {
    try {
      await admin.query(
        reserveSql,
        reserveParams(randomUUID(), liveOffer, 300, "test"),
      );
      throw new Error(
        "Reserving a live offering with mode=test should fail (M05b / mode=p_mode removed)",
      );
    } catch (error) {
      if (!String(error.message).includes("Unknown offering")) throw error;
    }
    const liveHeld = await admin.query(
      reserveSql,
      reserveParams(randomUUID(), liveOffer, 302, "live"),
    );
    if (!liveHeld.rows.length) {
      throw new Error("Live offering should reserve when mode=live");
    }
  });

  // Eggbot M22b is the TypeScript studentOfferings mode filter, not this SQL count.
  await test("M06 refunded seats occupy capacity until released", async () => {
    for (let index = 0; index < 11; index++) {
      const paidId = randomUUID();
      await admin.query(
        reserveSql,
        reserveParams(paidId, refundOffer, 400 + index, "test"),
      );
      await admin.query(
        "UPDATE student_enrollments SET stripe_session_id=$2,status='paid' WHERE id=$1",
        [paidId, `cs_test_lockpaid${index}`],
      );
    }
    const refundedId = randomUUID();
    await admin.query(
      reserveSql,
      reserveParams(refundedId, refundOffer, 411, "test"),
    );
    await admin.query(
      "UPDATE student_enrollments SET stripe_session_id=$2,status='refunded' WHERE id=$1",
      [refundedId, "cs_test_lockrefund"],
    );
    const blocked = await admin.query(
      reserveSql,
      reserveParams(randomUUID(), refundOffer, 412, "test"),
    );
    if (blocked.rows.length) {
      throw new Error(
        "Unreleased refunded seats must count toward capacity (M06); 13th reserve should be empty",
      );
    }
  });

  await test("M1 verification purchase is sellable again after audited release", async () => {
    const verifyId = randomUUID();
    const reserved = await admin.query(
      reserveSql,
      reserveParams(verifyId, verifyOffer, 500, "test"),
    );
    if (!reserved.rows.length) throw new Error("verification reserve failed");
    await admin.query(
      "UPDATE student_enrollments SET stripe_session_id=$2,status='paid' WHERE id=$1",
      [verifyId, "cs_test_verify"],
    );
    await admin.query(
      "UPDATE student_enrollments SET status='refunded' WHERE id=$1",
      [verifyId],
    );
    const beforeRelease = [];
    for (let index = 0; index < 12; index++) {
      beforeRelease.push(
        await admin.query(
          reserveSql,
          reserveParams(randomUUID(), verifyOffer, 501 + index, "test"),
        ),
      );
    }
    const remainingBefore = beforeRelease.filter((result) => result.rows.length).length;
    if (remainingBefore !== 11) {
      throw new Error(
        `After refunded verification, expected 11 sellable seats, got ${remainingBefore}`,
      );
    }
    await admin.query("DELETE FROM student_enrollments WHERE offering_id=$1 AND id<>$2", [
      verifyOffer,
      verifyId,
    ]);
    await admin.query("SELECT release_refunded_student_seat($1,$2)", [
      verifyId,
      "staff@example.test",
    ]);
    const event = await admin.query(
      "SELECT actor,outcome FROM student_enrollment_events WHERE event_id=$1",
      [`release:${verifyId}`],
    );
    if (event.rows[0]?.outcome !== "released" || event.rows[0]?.actor !== "staff@example.test") {
      throw new Error("release_refunded_student_seat must write an actor-audited released event");
    }
    const after = [];
    for (let index = 0; index < 13; index++) {
      after.push(
        await admin.query(
          reserveSql,
          reserveParams(randomUUID(), verifyOffer, 600 + index, "test"),
        ),
      );
    }
    const winners = after.filter((result) => result.rows.length).length;
    if (winners !== 12) {
      throw new Error(
        `After releasing the verification refund, expected 12 sellable seats, got ${winners}`,
      );
    }
  });

  await test("M1 released verification has no overflow under concurrency", async () => {
    await admin.query(
      "UPDATE student_enrollments SET status='expired' WHERE offering_id=$1 AND status='reserved'",
      [verifyOffer],
    );
    const first = new pg.Client({ connectionString: url });
    const second = new pg.Client({ connectionString: url });
    await Promise.all([first.connect(), second.connect()]);
    try {
      const raced = await Promise.all(
        Array.from({ length: 20 }, (_, index) => {
          const client = index % 2 === 0 ? first : second;
          return client.query(
            reserveSql,
            reserveParams(randomUUID(), verifyOffer, 700 + index, "test"),
          );
        }),
      );
      const winners = raced.filter((result) => result.rows.length).length;
      const occupying = await admin.query(
        "SELECT count(*)::int AS n FROM student_enrollments WHERE offering_id=$1 AND student_enrollment_occupies_seat(status,inventory_released_at)",
        [verifyOffer],
      );
      if (winners !== 12 || occupying.rows[0].n !== 12) {
        throw new Error(
          `After release, concurrent reserves must fill exactly 12 seats (winners=${winners}, occupying=${occupying.rows[0].n})`,
        );
      }
    } finally {
      await Promise.all([first.end(), second.end()]);
    }
  });

  await test("M57 / M57b failed seed verify rolls back Dec 5", async () => {
    await admin.query("BEGIN");
    await admin.query("SET LOCAL application_name = 'rda-student-offering-seed-isolated'");
    await admin.query(
      "INSERT INTO student_enrollment_offerings(id,mode,course_id,course_date,amount,external_seats,policy_version,policy_hash,policy_text,reviewed_at,review_reference,enabled) VALUES($1,'test','infection-control','2026-11-14',39500,0,$2,$3,$4,now(),'stale lock',false)",
      [
        "c1111111-1111-4111-8111-202611140088",
        policyVersion,
        policyHash,
        policyText,
      ],
    );
    await admin.query("COMMIT");
    const seed = await readFile(
      new URL("../db/seeds/infection-control-offerings.test.sql", import.meta.url),
      "utf8",
    );
    if (!/^\s*BEGIN;/m.test(seed) || !/COMMIT;\s*$/.test(seed.trim())) {
      throw new Error("TEST seed must wrap guard/insert/verify in BEGIN/COMMIT (M57)");
    }
    const seeder = new pg.Client({ connectionString: url });
    await seeder.connect();
    try {
      await seeder.query("SET application_name = 'rda-student-offering-seed-on-live-data'");
      let failed = false;
      try {
        await seeder.query(seed);
      } catch (error) {
        failed = /stale or unexpected/i.test(String(error.message));
        try {
          await seeder.query("ROLLBACK");
        } catch {
          /* already aborted */
        }
        if (!failed) throw error;
      }
      if (!failed) throw new Error("stale TEST seed should fail verify (M57b)");
      const leftover = await admin.query(
        "SELECT 1 FROM student_enrollment_offerings WHERE mode='test' AND course_date='2026-12-05'",
      );
      if (leftover.rows.length) {
        throw new Error("Failed TEST seed left a Dec 5 row (M57 / transaction removed)");
      }
    } finally {
      await seeder.end();
    }
  });

  await test("M55 / M56 resolve records actor and writes an events row", async () => {
    const reviewId = randomUUID();
    await admin.query(
      "INSERT INTO student_enrollments(id,offering_id,course_date,owner_hash,student_name,email,phone,adult_attested,policy_version,policy_hash,policy_text,amount,currency,status) VALUES($1,$2,'2026-11-14',$3,$4,$5,$6,true,$7,$8,$9,39500,'usd','expired')",
      [
        reviewId,
        lastSeat,
        "d".repeat(64),
        "Resolve Adult",
        "resolve-lock@example.test",
        "916 555 0100",
        policyVersion,
        policyHash,
        policyText,
      ],
    );
    await admin.query(
      "SELECT flag_student_enrollment_review($1,'cs_test_resolve','paid_after_release')",
      [reviewId],
    );
    try {
      await admin.query(
        "SELECT resolve_student_enrollment_review($1,'cs_test_resolve','dismissed',$2)",
        [reviewId, ""],
      );
      throw new Error("resolve without actor should fail (M55)");
    } catch (error) {
      if (!String(error.message).includes("Actor required")) throw error;
    }
    await admin.query(
      "SELECT resolve_student_enrollment_review($1,'cs_test_resolve','dismissed',$2)",
      [reviewId, "staff@example.test"],
    );
    const event = await admin.query(
      "SELECT actor,outcome FROM student_enrollment_events WHERE event_id=$1",
      [`resolve:${reviewId}:cs_test_resolve:dismissed`],
    );
    if (event.rows[0]?.actor !== "staff@example.test" || event.rows[0]?.outcome !== "dismissed") {
      throw new Error("resolve_student_enrollment_review must write an actor event (M56)");
    }
  });

  console.log(`student-enrollment-locks: ${passed} passed`);
} finally {
  await admin.end();
}
