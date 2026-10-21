// Real Postgres concurrency proof for reserve_student_enrollment.
// PGlite is one connection and cannot detect a missing FOR UPDATE lock.
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
  await admin.query(
    `INSERT INTO student_enrollment_offerings(
      id,mode,course_id,course_date,amount,external_seats,policy_version,policy_hash,policy_text,reviewed_at,review_reference,enabled
    ) VALUES
      ($1,'test','infection-control','2026-11-14',39500,0,$4,$5,$6,now(),'lock last seat',true),
      ($2,'live','infection-control','2026-11-14',39500,0,$4,$5,$6,now(),'lock live mode',true),
      ($3,'test','infection-control','2026-12-05',39500,0,$4,$5,$6,now(),'lock refunded seats',true)`,
    [lastSeat, liveOffer, refundOffer, policyVersion, policyHash, policyText],
  );

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
  const reserveSql =
    "SELECT * FROM reserve_student_enrollment($1,$2,$3,$4,$5,$6,$7,$8,$9)";

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
      first.query(
        reserveSql,
        reserveParams(randomUUID(), lastSeat, 200, "test"),
      ),
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
        `Last-seat race expected exactly 1 winner, got ${winners.length} (M05 / missing FOR UPDATE)`,
      );
    }
  } finally {
    await Promise.all([first.end(), second.end()]);
  }

  const counted = await admin.query(
    "SELECT count(*)::int AS n FROM student_enrollments WHERE offering_id=$1 AND status IN ('reserved','paid','refunded')",
    [lastSeat],
  );
  if (counted.rows[0].n !== 12) {
    throw new Error(
      `Last-seat offering should hold 12 counted seats, got ${counted.rows[0].n}`,
    );
  }

  try {
    await admin.query(
      reserveSql,
      reserveParams(randomUUID(), liveOffer, 300, "test"),
    );
    throw new Error(
      "Reserving a live offering with mode=test should fail (M05b / mode=p_mode removed)",
    );
  } catch (error) {
    if (!String(error.message).includes("Unknown offering")) {
      throw error;
    }
  }

  const liveHeld = await admin.query(
    reserveSql,
    reserveParams(randomUUID(), liveOffer, 301, "live"),
  );
  if (!liveHeld.rows.length) {
    throw new Error("Live offering should reserve when mode=live");
  }

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
      "Refunded seats must count toward capacity (M22b); 13th reserve should be empty",
    );
  }

  console.log(
    "student-enrollment-locks: last-seat FOR UPDATE, mode=p_mode, and refunded inventory all held",
  );
} finally {
  await admin.end();
}
