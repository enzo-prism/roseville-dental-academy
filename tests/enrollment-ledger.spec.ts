import { readFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { test, expect } from "@playwright/test";
import { PGlite } from "@electric-sql/pglite";

test("durable test capacity, idempotent reservations, replay conflicts, and terminal outcomes", async () => {
  const db = await PGlite.create();
  try {
    await db.exec(await readFile("db/migrations/004_enrollment_test_pilot.sql", "utf8"));
    const owner = "a".repeat(64), date = "2026-10-12", policy = "2026-09-30";
    const ids = Array.from({ length: 24 }, () => randomUUID());
    const results = await Promise.all(ids.map((id) => db.query(
      "SELECT * FROM reserve_enrollment_test_hold($1::uuid,$2::date,$3,$4)", [id,date,owner,policy])));
    expect(results.filter((result) => result.rows.length)).toHaveLength(12);
    const first = ids[0];
    const retry = await db.query("SELECT * FROM reserve_enrollment_test_hold($1::uuid,$2::date,$3,$4)", [first,date,owner,policy]);
    expect(retry.rows).toHaveLength(1);
    await expect(db.query("SELECT * FROM reserve_enrollment_test_hold($1::uuid,$2::date,$3,$4)", [first,date,"b".repeat(64),policy])).rejects.toThrow("Hold identity conflict");
    await db.query("UPDATE enrollment_test_holds SET stripe_expires_at=1 WHERE hold_id=$1", [first]);
    expect((await db.query("SELECT * FROM reserve_enrollment_test_hold($1::uuid,$2::date,$3,$4)", [randomUUID(),date,owner,policy])).rows).toHaveLength(0);
    await expect(db.query("SELECT apply_enrollment_test_event('evt_unbound',$1,'cs_test_fixture','paid')", [first])).rejects.toThrow("Unbound session");
    await db.query("UPDATE enrollment_test_holds SET stripe_session_id='cs_test_fixture' WHERE hold_id=$1", [first]);
    expect((await db.query<{ accepted: boolean }>("SELECT apply_enrollment_test_event('evt_paid',$1,'cs_test_fixture','paid') AS accepted",[first])).rows[0].accepted).toBe(true);
    expect((await db.query<{ accepted: boolean }>("SELECT apply_enrollment_test_event('evt_paid',$1,'cs_test_fixture','paid') AS accepted",[first])).rows[0].accepted).toBe(false);
    await expect(db.query("SELECT apply_enrollment_test_event('evt_paid',$1,'cs_test_fixture','expired')",[first])).rejects.toThrow("Event identity conflict");
    await expect(db.query("SELECT apply_enrollment_test_event('evt_expire',$1,'cs_test_fixture','expired')",[first])).rejects.toThrow("Conflicting terminal state");
    expect((await db.query("SELECT * FROM reserve_enrollment_test_hold($1::uuid,$2::date,$3,$4)", [randomUUID(),date,owner,policy])).rows).toHaveLength(0);
    const second = ids[1];
    await db.query("UPDATE enrollment_test_holds SET stripe_session_id='cs_test_expired' WHERE hold_id=$1", [second]);
    await db.query("SELECT apply_enrollment_test_event('evt_expired',$1,'cs_test_expired','expired')",[second]);
    expect((await db.query("SELECT * FROM reserve_enrollment_test_hold($1::uuid,$2::date,$3,$4)", [randomUUID(),date,owner,policy])).rows).toHaveLength(1);
    await expect(db.query("SELECT apply_enrollment_test_event('evt_late_paid',$1,'cs_test_expired','paid')",[second])).rejects.toThrow("Conflicting terminal state");
    const totals = await db.query<{ status: string; count: number }>("SELECT status,count(*)::int AS count FROM enrollment_test_holds GROUP BY status");
    expect(totals.rows.find((row) => row.status === "paid")?.count).toBe(1);
    expect(totals.rows.find((row) => row.status === "reserved")?.count).toBe(11);
    await expect(db.query("UPDATE enrollment_test_dates SET capacity=13")).rejects.toThrow();
    await expect(db.query("UPDATE enrollment_test_holds SET amount=1 WHERE hold_id=$1",[first])).rejects.toThrow();
  } finally { await db.close(); }
});

test("durable login allowance limits repeated guesses across processes", async () => {
  const db = await PGlite.create();
  try {
    await db.exec(await readFile("db/migrations/004_enrollment_test_pilot.sql", "utf8"));
    for (let attempt = 0; attempt < 8; attempt++) expect((await db.query<{ allowed: boolean }>("SELECT enrollment_test_login_allowance('fixture') AS allowed")).rows[0].allowed).toBe(true);
    expect((await db.query<{ allowed: boolean }>("SELECT enrollment_test_login_allowance('fixture') AS allowed")).rows[0].allowed).toBe(false);
    const attempts = await Promise.all(Array.from({ length: 40 }, (_, index) => db.query<{ allowed: boolean }>("SELECT enrollment_test_login_allowance($1) AS allowed", [`address_${index}`])));
    expect(attempts.filter((result) => result.rows[0].allowed)).toHaveLength(21);
  } finally { await db.close(); }
});
