import { randomUUID } from "node:crypto";
import { PGlite } from "@electric-sql/pglite";
import { test, expect } from "@playwright/test";
import { GET } from "@/app/api/student-enrollment/confirmation-drain/route";
import { CANCELLATION_POLICY_PARAGRAPHS } from "@/lib/academy-policies";
import { STUDENT_POLICY_HASH } from "@/lib/student-enrollment";
import { applyStudentEnrollmentSchema } from "./support/student-enrollment-schema";

// Every request is intercepted: no production database or email provider is used.
async function fixture() {
  const originalEnv = { ...process.env };
  const originalFetch = globalThis.fetch;
  const db = await PGlite.create();
  await applyStudentEnrollmentSchema((sql) => db.exec(sql));
  Object.assign(process.env, {
    CRON_SECRET: "fixture-cron-secret",
    DATABASE_URL: "postgres://fixture:fixture@db.fixture.neon.tech/test",
    RDA_STUDENT_PAYMENTS_MODE: "live",
    RDA_STUDENT_STRIPE_LIVE_KEY: "rk_live_fixture",
    RDA_STUDENT_STRIPE_LIVE_WEBHOOK_SECRET: "whsec_fixture",
    RDA_STUDENT_STRIPE_ACCOUNT_ID: "acct_1UJHgLCOhHjREvRz",
    RDA_STUDENT_PAYMENTS_ORIGIN: "https://example.test",
    RDA_STUDENT_EMAIL_LIVE_ENABLED: "true",
    RDA_STUDENT_EMAIL_API_KEY: "fixture-mail-key",
    RDA_STUDENT_EMAIL_FROM: "Academy <academy@example.test>",
  });
  delete process.env.RDA_STUDENT_PAYMENTS_LIVE_ENABLED;
  delete process.env.RDA_STUDENT_PAYMENTS_PUBLIC_CTA;
  let databaseCalls = 0;
  let providerFails = false;
  const sends: { body: string; key: string | null }[] = [];
  globalThis.fetch = async (input, init = {}) => {
    const url = new URL(input instanceof Request ? input.url : String(input));
    if (["db.fixture.neon.tech", "api.fixture.neon.tech"].includes(url.hostname)) {
      databaseCalls += 1;
      const { query, params } = JSON.parse(String(init.body));
      const result = await db.query<Record<string, unknown>>(query, params);
      return Response.json({
        ...result,
        rows: result.rows.map((row) =>
          result.fields.map(({ name, dataTypeID }) => {
            const value = row[name];
            if (value === null) return null;
            if (dataTypeID === 16) return value ? "t" : "f";
            if ([114, 3802].includes(dataTypeID)) return JSON.stringify(value);
            if (value instanceof Date)
              return dataTypeID === 1082
                ? value.toISOString().slice(0, 10)
                : value.toISOString();
            return String(value);
          }),
        ),
      });
    }
    if (url.href !== "https://api.resend.com/emails")
      throw new Error("External network blocked by cron fixture");
    sends.push({
      body: String(init.body),
      key: new Headers(init.headers).get("Idempotency-Key"),
    });
    if (providerFails)
      return Response.json({ error: "private provider diagnostic" }, { status: 503 });
    return Response.json({ id: "fixture_message" });
  };
  return {
    db,
    sends,
    databaseCalls: () => databaseCalls,
    failProvider: (value: boolean) => { providerFails = value; },
    run(authorization: string | null = "Bearer fixture-cron-secret") {
      return GET(new Request("https://example.test/api/student-enrollment/confirmation-drain", {
        headers: authorization === null ? {} : { authorization },
      }));
    },
    async offering(mode: "live" | "test" = "live") {
      const id = randomUUID();
      await db.query(
        "INSERT INTO student_enrollment_offerings(id,mode,course_id,course_date,amount,external_seats,policy_version,policy_hash,policy_text,reviewed_at,review_reference,enabled) VALUES($1,$2,'infection-control','2026-11-14',39500,0,'2026-09-30',$3,$4,now(),'cron fixture',true)",
        [id, mode, STUDENT_POLICY_HASH, CANCELLATION_POLICY_PARAGRAPHS.join("\n\n")],
      );
      return id;
    },
    async enrollment(offering: string, status = "paid", mailStatus = "pending") {
      const id = randomUUID();
      await db.query(
        "INSERT INTO student_enrollments(id,offering_id,course_date,owner_hash,student_name,email,phone,adult_attested,policy_version,policy_hash,policy_text,amount,currency,status,stripe_session_id,stripe_expires_at) VALUES($1,$2,'2026-11-14',$3,'Synthetic Adult',$4,'916 555 0100',true,'2026-09-30',$5,$6,39500,'usd',$7,$8,$9)",
        [id, offering, "a".repeat(64), `adult-${id}@example.test`, STUDENT_POLICY_HASH,
          CANCELLATION_POLICY_PARAGRAPHS.join("\n\n"), status,
          `cs_live_${id.replaceAll("-", "")}`, Math.floor(Date.now() / 1000) + 3600],
      );
      await db.query("INSERT INTO student_enrollment_mail(enrollment_id,status) VALUES($1,$2)", [id, mailStatus]);
      return id;
    },
    async state(id: string) {
      const rows = await db.query<{ status: string; payload: unknown }>(
        "SELECT status,payload FROM student_enrollment_mail WHERE enrollment_id=$1", [id],
      );
      return rows.rows[0];
    },
    async close() {
      globalThis.fetch = originalFetch;
      process.env = originalEnv;
      await db.close();
    },
  };
}

test("cron rejects missing or incorrect bearer credentials before database or provider access", async () => {
  const f = await fixture();
  try {
    for (const authorization of [null, "Bearer wrong", "fixture-cron-secret"]) {
      const response = await f.run(authorization);
      expect(response.status).toBe(401);
      expect(response.headers.get("cache-control")).toContain("no-store");
      expect(response.headers.get("x-robots-tag")).toContain("noindex");
    }
    delete process.env.CRON_SECRET;
    expect((await f.run()).status).toBe(401);
    expect(f.databaseCalls()).toBe(0);
    expect(f.sends).toHaveLength(0);
  } finally { await f.close(); }
});

test("cron skips test mode and disabled live email without database access", async () => {
  const f = await fixture();
  try {
    process.env.RDA_STUDENT_PAYMENTS_MODE = "test";
    expect(await (await f.run()).json()).toEqual({ processed: false, emailDisabled: true });
    process.env.RDA_STUDENT_PAYMENTS_MODE = "live";
    for (const value of [undefined, "false", "1"]) {
      if (value === undefined) delete process.env.RDA_STUDENT_EMAIL_LIVE_ENABLED;
      else process.env.RDA_STUDENT_EMAIL_LIVE_ENABLED = value;
      expect(await (await f.run()).json()).toEqual({ processed: false, emailDisabled: true });
    }
    expect(f.databaseCalls()).toBe(0);
    expect(f.sends).toHaveLength(0);
  } finally { await f.close(); }
});

test("enabled cron fails closed on missing live configuration without leaking secrets", async () => {
  const f = await fixture();
  try {
    for (const name of ["RDA_STUDENT_STRIPE_LIVE_WEBHOOK_SECRET", "RDA_STUDENT_EMAIL_API_KEY", "RDA_STUDENT_EMAIL_FROM"]) {
      const previous = process.env[name];
      delete process.env[name];
      const response = await f.run();
      expect(response.status).toBe(503);
      expect(await response.json()).toEqual({ error: "Confirmation processing unavailable." });
      process.env[name] = previous;
    }
    expect(f.databaseCalls()).toBe(0);
    expect(f.sends).toHaveLength(0);
  } finally { await f.close(); }
});

test("cron drains only paid live pending mail, works with checkout off, and does not resend", async () => {
  const f = await fixture();
  try {
    const live = await f.offering(), sandbox = await f.offering("test");
    const paid = await f.enrollment(live);
    const refunded = await f.enrollment(live, "refunded");
    const unpaid = await f.enrollment(live, "reserved");
    const review = await f.enrollment(live, "paid", "review");
    const testOnly = await f.enrollment(sandbox);
    const response = await f.run();
    expect(response.status).toBe(200);
    const summary = await response.json();
    expect(summary).toEqual({ processed: true, attempted: 1, remaining: 0, errors: 0 });
    expect(JSON.stringify(summary)).not.toMatch(/Synthetic|adult-|example\.test|916|enrollment_id/);
    expect(f.sends).toHaveLength(1);
    expect(f.sends[0].key).toBe(`rda-confirmation/${paid}`);
    expect((await f.state(paid)).status).toBe("sent");
    for (const id of [refunded, unpaid, testOnly]) expect((await f.state(id)).status).toBe("pending");
    expect((await f.state(review)).status).toBe("review");
    expect(await (await f.run()).json()).toEqual({ processed: true, attempted: 0, remaining: 0, errors: 0 });
    expect(f.sends).toHaveLength(1);
  } finally { await f.close(); }
});

test("overlapping cron runs share atomic claims and only send one confirmation", async () => {
  const f = await fixture();
  try {
    const id = await f.enrollment(await f.offering());
    const responses = await Promise.all([f.run(), f.run(), f.run()]);
    expect(responses.some((response) => response.status === 200)).toBe(true);
    expect(f.sends).toHaveLength(1);
    expect((await f.state(id)).status).toBe("sent");
    expect((await f.run()).status).toBe(200);
    expect(f.sends).toHaveLength(1);
  } finally { await f.close(); }
});

test("provider failures remain queued for the next schedule with the exact payload and key", async () => {
  const f = await fixture();
  try {
    const id = await f.enrollment(await f.offering());
    f.failProvider(true);
    const response = await f.run();
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ processed: true, attempted: 1, remaining: 1, errors: 1 });
    expect((await f.state(id)).status).toBe("sending");
    await f.db.query("UPDATE student_enrollment_mail SET attempted_at=now()-interval '61 seconds' WHERE enrollment_id=$1", [id]);
    f.failProvider(false);
    expect((await f.run()).status).toBe(200);
    expect((await f.state(id)).status).toBe("sent");
    expect(f.sends).toHaveLength(2);
    expect(f.sends[1]).toEqual(f.sends[0]);
  } finally { await f.close(); }
});

test("expired ambiguous sends move to review and cron never resets that state", async () => {
  const f = await fixture();
  try {
    const id = await f.enrollment(await f.offering());
    f.failProvider(true);
    await f.run();
    await f.db.query("UPDATE student_enrollment_mail SET started_at=now()-interval '13 hours',attempted_at=now()-interval '2 minutes' WHERE enrollment_id=$1", [id]);
    const payload = (await f.state(id)).payload;
    f.failProvider(false);
    const response = await f.run();
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ processed: true, attempted: 1, remaining: 0, errors: 1 });
    expect(await f.state(id)).toEqual({ status: "review", payload });
    expect((await f.run()).status).toBe(200);
    expect(f.sends).toHaveLength(1);
    expect(await f.state(id)).toEqual({ status: "review", payload });
  } finally { await f.close(); }
});

test("database failures return a generic private error without provider access", async () => {
  const f = await fixture();
  try {
    globalThis.fetch = async () => { throw new Error("private database diagnostic"); };
    const response = await f.run();
    expect(response.status).toBe(503);
    expect(response.headers.get("cache-control")).toContain("no-store");
    expect(await response.json()).toEqual({ error: "Confirmation processing unavailable." });
    expect(f.sends).toHaveLength(0);
  } finally { await f.close(); }
});
