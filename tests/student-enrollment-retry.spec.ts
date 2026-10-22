import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import { test, expect } from "@playwright/test";
import { handleStudentConfirmationRetry } from "@/app/api/student-enrollment/retry-confirmation/route";
import { CANCELLATION_POLICY_PARAGRAPHS } from "@/lib/academy-policies";
import {
  STUDENT_POLICY_HASH,
  studentWebhookConfig,
} from "@/lib/student-enrollment";
import {
  STUDENT_CONFIRMATION_DRAIN_MS,
  drainStudentConfirmations,
} from "@/lib/student-enrollment-mail";

const LIVE_ACCOUNT = "acct_1UJHgLCOhHjREvRz";
const POLICY = CANCELLATION_POLICY_PARAGRAPHS.join("\n\n");
const OWNER = "staff-owner";

async function retryFixture() {
  const originalEnv = { ...process.env };
  const originalFetch = globalThis.fetch;
  const db = await PGlite.create();
  await db.exec(
    await readFile("db/migrations/005_student_enrollment.sql", "utf8"),
  );
  Object.assign(process.env, {
    DATABASE_URL: "postgres://fixture:fixture@db.fixture.neon.tech/test",
    RDA_STUDENT_PAYMENTS_MODE: "live",
    RDA_STUDENT_STRIPE_LIVE_KEY: "rk_live_fixture",
    RDA_STUDENT_STRIPE_LIVE_WEBHOOK_SECRET: "whsec_fixture",
    RDA_STUDENT_STRIPE_ACCOUNT_ID: LIVE_ACCOUNT,
    RDA_STUDENT_PAYMENTS_ORIGIN: "https://example.test",
  });
  delete process.env.RDA_STUDENT_PAYMENTS_LIVE_ENABLED;
  delete process.env.RDA_STUDENT_EMAIL_LIVE_ENABLED;
  delete process.env.RDA_STUDENT_PAYMENTS_PUBLIC_CTA;
  globalThis.fetch = async (input, init = {}) => {
    const url = new URL(input instanceof Request ? input.url : String(input));
    const requestInit =
      input instanceof Request
        ? {
            method: input.method,
            headers: input.headers,
            body:
              input.method !== "GET" && input.method !== "HEAD"
                ? await input.clone().text()
                : undefined,
            ...init,
          }
        : init;
    if (
      ["db.fixture.neon.tech", "api.fixture.neon.tech"].includes(url.hostname)
    ) {
      const { query, params } = JSON.parse(String(requestInit.body));
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
                : value
                    .toISOString()
                    .replace("T", " ")
                    .replace("Z", "+00");
            return String(value);
          }),
        ),
      });
    }
    if (url.href === "https://api.resend.com/emails") {
      return Response.json({ id: "fixture_message" });
    }
    throw new Error(`Retry fixture blocked ${url.href}`);
  };
  return {
    db,
    enableEmail() {
      process.env.RDA_STUDENT_EMAIL_LIVE_ENABLED = "true";
      process.env.RDA_STUDENT_EMAIL_API_KEY = "fixture-mail-key";
      process.env.RDA_STUDENT_EMAIL_FROM = "Academy <academy@example.test>";
    },
    async plantOffering(mode: "live" | "test" = "live") {
      const id = randomUUID();
      await db.query(
        "INSERT INTO student_enrollment_offerings(id,mode,course_id,course_date,amount,external_seats,policy_version,policy_hash,policy_text,reviewed_at,review_reference,enabled) VALUES($1,$2,'infection-control','2026-11-14',39500,0,$3,$4,$5,now(),'retry fixture',true)",
        [id, mode, "2026-09-30", STUDENT_POLICY_HASH, POLICY],
      );
      return id;
    },
    async plantEnrollment(
      offeringId: string,
      extras: {
        status?: string;
        mailStatus?: string;
        policyHash?: string;
      } = {},
    ) {
      const id = randomUUID();
      await db.query(
        "INSERT INTO student_enrollments(id,offering_id,course_date,owner_hash,student_name,email,phone,adult_attested,policy_version,policy_hash,policy_text,amount,currency,status,stripe_session_id,stripe_expires_at) VALUES($1,$2,'2026-11-14',$3,$4,$5,$6,true,'2026-09-30',$7,$8,39500,'usd',$9,$10,$11)",
        [
          id,
          offeringId,
          "ab".repeat(32),
          "Retry Adult",
          `retry-${id}@example.test`,
          "916 555 0100",
          extras.policyHash ?? STUDENT_POLICY_HASH,
          POLICY,
          extras.status ?? "paid",
          `cs_live_r${id.replaceAll("-", "")}`,
          Math.floor(Date.now() / 1000) + 3600,
        ],
      );
      if (extras.mailStatus !== "none") {
        await db.query(
          "INSERT INTO student_enrollment_mail(enrollment_id,status) VALUES($1,$2)",
          [id, extras.mailStatus ?? "pending"],
        );
      }
      return id;
    },
    retry(
      body: unknown,
      extra: {
        owner?: string | null;
        origin?: string;
        contentType?: string;
        raw?: string;
      } = {},
    ) {
      const raw =
        extra.raw ??
        (typeof body === "string" ? body : JSON.stringify(body));
      return handleStudentConfirmationRetry(
        new Request(
          "https://example.test/api/student-enrollment/retry-confirmation",
          {
            method: "POST",
            headers: {
              origin: extra.origin ?? "https://example.test",
              "content-type": extra.contentType ?? "application/json",
            },
            body: raw,
          },
        ),
        extra.owner === undefined ? OWNER : extra.owner,
      );
    },
    async close() {
      globalThis.fetch = originalFetch;
      process.env = originalEnv;
      await db.close();
    },
  };
}

test("retry drain works with payments off and refuses missing staff, origin, or webhook config", async () => {
  const f = await retryFixture();
  try {
    expect(studentWebhookConfig()?.mode).toBe("live");
    const drain = await f.retry({ drain: true });
    expect(drain.status).toBe(200);
    expect(await drain.json()).toEqual({
      processed: true,
      attempted: 0,
      remaining: 0,
      errors: 0,
    });
    expect((await f.retry({ drain: true }, { owner: null })).status).toBe(401);
    expect(
      (await f.retry({ drain: true }, { origin: "https://evil.test" })).status,
    ).toBe(401);
    delete process.env.RDA_STUDENT_PAYMENTS_MODE;
    expect((await f.retry({ drain: true })).status).toBe(401);
  } finally {
    await f.close();
  }
});

test("retry {id} reports email off, paid-only, and matching mode", async () => {
  const f = await retryFixture();
  try {
    const live = await f.plantOffering("live");
    const testOffer = await f.plantOffering("test");
    const paid = await f.plantEnrollment(live);
    const reserved = await f.plantEnrollment(live, { status: "reserved" });
    const otherMode = await f.plantEnrollment(testOffer);
    const off = await f.retry({ id: paid });
    expect(off.status).toBe(409);
    expect(await off.json()).toEqual({
      processed: false,
      emailDisabled: true,
    });
    f.enableEmail();
    expect((await f.retry({ id: reserved })).status).toBe(409);
    expect(await (await f.retry({ id: reserved })).json()).toEqual({
      error: "Paid enrollment required.",
    });
    expect((await f.retry({ id: otherMode })).status).toBe(409);
    expect(await (await f.retry({ id: otherMode })).json()).toEqual({
      error: "Wrong environment.",
    });
    const sent = await f.retry({ id: paid });
    expect(sent.status).toBe(200);
    expect(await sent.json()).toEqual({ processed: true });
  } finally {
    await f.close();
  }
});

test("retry rejects an array body or a body over 4KB with 400", async () => {
  const f = await retryFixture();
  try {
    const array = await f.retry([1]);
    expect(array.status).toBe(400);
    expect(await array.json()).toEqual({
      error: "Invalid enrollment reference.",
    });
    const oversized = await f.retry(
      {},
      { raw: JSON.stringify({ id: "x".repeat(5000) }) },
    );
    expect(oversized.status).toBe(400);
    expect(await oversized.json()).toEqual({
      error: "Invalid enrollment reference.",
    });
  } finally {
    await f.close();
  }
});

test("drain remaining is the true backlog, bounded to 100 rows, and honors a time budget", async () => {
  const f = await retryFixture();
  try {
    const live = await f.plantOffering("live");
    const testOffer = await f.plantOffering("test");
    await f.plantEnrollment(live, { status: "reserved" });
    await f.plantEnrollment(testOffer);
    await f.plantEnrollment(live, { mailStatus: "review" });
    const empty = await drainStudentConfirmations(studentWebhookConfig()!);
    expect(empty.attempted).toBe(0);
    expect(empty.remaining).toBe(0);
    expect(empty.errors).toBe(0);

    for (let i = 0; i < 101; i++) await f.plantEnrollment(live);
    const queued = await drainStudentConfirmations(studentWebhookConfig()!);
    expect(queued.attempted).toBe(100);
    expect(queued.remaining).toBe(101);
    expect(queued.errors).toBe(0);

    const realNow = Date.now;
    let calls = 0;
    const origin = realNow();
    try {
      Date.now = () => {
        calls += 1;
        return calls === 1 ? origin : origin + STUDENT_CONFIRMATION_DRAIN_MS;
      };
      const timed = await drainStudentConfirmations(studentWebhookConfig()!);
      expect(timed.attempted).toBe(0);
      expect(timed.remaining).toBe(101);
    } finally {
      Date.now = realNow;
    }
  } finally {
    await f.close();
  }
});

test("drain records row errors instead of 503ing the staff retry", async () => {
  const f = await retryFixture();
  try {
    f.enableEmail();
    const live = await f.plantOffering("live");
    const broken = await f.plantEnrollment(live, {
      policyHash: "ab".repeat(32),
    });
    const viaRoute = await f.retry({ drain: true });
    expect(viaRoute.status).toBe(200);
    expect(await viaRoute.json()).toMatchObject({
      processed: true,
      attempted: 1,
      remaining: 1,
      errors: 1,
    });
    expect(
      (
        await f.db.query<{ status: string }>(
          "SELECT status FROM student_enrollment_mail WHERE enrollment_id=$1",
          [broken],
        )
      ).rows[0].status,
    ).toBe("pending");
  } finally {
    await f.close();
  }
});
