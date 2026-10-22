import { createHmac, randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import { test, expect } from "@playwright/test";
import { CANCELLATION_POLICY_PARAGRAPHS } from "@/lib/academy-policies";
import { STUDENT_POLICY_HASH } from "@/lib/student-enrollment";
import {
  studentWebhookConfig,
} from "@/lib/student-enrollment";
import { drainStudentConfirmations } from "@/lib/student-enrollment-mail";
import { POST } from "@/app/api/student-enrollment/webhook/route";

const LIVE_ACCOUNT = "acct_1UJHgLCOhHjREvRz";
const POLICY = CANCELLATION_POLICY_PARAGRAPHS.join("\n\n");

type SessionSpec = {
  id: string;
  enrollmentId: string;
  offeringId: string;
  courseDate: string;
  expiresAt: number;
  status?: string;
  paymentStatus?: string;
  amountTotal?: number;
  amountRefunded?: number;
  fullyRefunded?: boolean;
  chargeRefunded?: boolean;
};

async function liveOffFixture() {
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
  const sessions = new Map<string, Record<string, unknown>>();
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
    if (url.hostname !== "api.stripe.com")
      throw new Error(`Webhook-off fixture blocked ${url.href}`);
    if (url.pathname === "/v1/account") {
      return Response.json({
        id: LIVE_ACCOUNT,
        charges_enabled: true,
        payouts_enabled: true,
      });
    }
    if (url.pathname === "/v1/checkout/sessions") {
      const intent = url.searchParams.get("payment_intent");
      const data = [...sessions.values()].filter((session) => {
        const paymentIntent = session.payment_intent as
          | { id?: string }
          | null
          | undefined;
        return !intent || paymentIntent?.id === intent;
      });
      return Response.json({ object: "list", data, has_more: false });
    }
    const id = url.pathname.split("/")[4];
    const session = id ? sessions.get(id) : undefined;
    if (!session) return Response.json({ error: "not found" }, { status: 404 });
    return Response.json(session);
  };
  return {
    db,
    sessions,
    setPaymentsEnabled(enabled: boolean) {
      if (enabled) process.env.RDA_STUDENT_PAYMENTS_LIVE_ENABLED = "true";
      else delete process.env.RDA_STUDENT_PAYMENTS_LIVE_ENABLED;
    },
    plantSession(spec: SessionSpec) {
      const amount = spec.amountTotal ?? 39500;
      const refunded =
        spec.fullyRefunded === true ? amount : (spec.amountRefunded ?? 0);
      const paid = (spec.paymentStatus ?? "paid") === "paid";
      const session = {
        object: "checkout.session",
        id: spec.id,
        livemode: true,
        mode: "payment",
        amount_total: amount,
        currency: "usd",
        status: spec.status ?? "complete",
        payment_status: spec.paymentStatus ?? "paid",
        expires_at: spec.expiresAt,
        client_reference_id: spec.enrollmentId,
        url: `https://checkout.stripe.com/c/pay/${spec.id}`,
        payment_intent: paid
          ? {
              id: `pi_${spec.id.slice(8)}`,
              latest_charge: {
                id: `ch_${spec.id.slice(8)}`,
                payment_intent: `pi_${spec.id.slice(8)}`,
                amount,
                currency: "usd",
                livemode: true,
                amount_refunded: refunded,
                refunded: spec.chargeRefunded ?? refunded === amount,
              },
            }
          : null,
        metadata: {
          enrollment_id: spec.enrollmentId,
          offering_id: spec.offeringId,
          policy_version: "2026-09-30",
          policy_hash: STUDENT_POLICY_HASH,
          integration: "rda-student-v1",
          environment: "live",
          course_date: spec.courseDate,
        },
      };
      sessions.set(spec.id, session);
      return session;
    },
    async plantOffering() {
      const id = randomUUID();
      await db.query(
        "INSERT INTO student_enrollment_offerings(id,mode,course_id,course_date,amount,external_seats,policy_version,policy_hash,policy_text,reviewed_at,review_reference,enabled) VALUES($1,'live','infection-control','2026-11-14',39500,0,$2,$3,$4,now(),'webhook off',true)",
        [id, "2026-09-30", STUDENT_POLICY_HASH, POLICY],
      );
      return { id, courseDate: "2026-11-14" };
    },
    async plantHold(
      offeringId: string,
      courseDate: string,
      extras: { sessionId?: string | null; expiresAt?: number } = {},
    ) {
      const id = randomUUID();
      const expiresAt = extras.expiresAt ?? Math.floor(Date.now() / 1000) + 3600;
      await db.query(
        "INSERT INTO student_enrollments(id,offering_id,course_date,owner_hash,student_name,email,phone,adult_attested,policy_version,policy_hash,policy_text,amount,currency,status,stripe_session_id,stripe_expires_at) VALUES($1,$2,$3,$4,$5,$6,$7,true,'2026-09-30',$8,$9,39500,'usd','reserved',$10,$11)",
        [
          id,
          offeringId,
          courseDate,
          "ab".repeat(32),
          "Webhook Off Adult",
          `off-${id}@example.test`,
          "916 555 0100",
          STUDENT_POLICY_HASH,
          POLICY,
          extras.sessionId === undefined ? null : extras.sessionId,
          expiresAt,
        ],
      );
      return { id, expiresAt, email: `off-${id}@example.test` };
    },
    async enrollment(id: string) {
      return (
        await db.query<Record<string, unknown>>(
          "SELECT * FROM student_enrollments WHERE id=$1",
          [id],
        )
      ).rows[0];
    },
    async mail(id: string) {
      return (
        await db.query<Record<string, unknown>>(
          "SELECT * FROM student_enrollment_mail WHERE enrollment_id=$1",
          [id],
        )
      ).rows;
    },
    async reviews(id: string) {
      return (
        await db.query<Record<string, unknown>>(
          "SELECT * FROM student_enrollment_reviews WHERE enrollment_id=$1",
          [id],
        )
      ).rows;
    },
    async occupying(offeringId: string) {
      return Number(
        (
          await db.query<{ n: number }>(
            "SELECT count(*)::int AS n FROM student_enrollments WHERE offering_id=$1 AND student_enrollment_occupies_seat(status,inventory_released_at)",
            [offeringId],
          )
        ).rows[0].n,
      );
    },
    async webhook(
      type: string,
      sessionId: string,
      extra: Record<string, unknown> = {},
    ) {
      const raw = JSON.stringify({
        id: `evt_${randomUUID().replaceAll("-", "")}`,
        livemode: true,
        type,
        data: { object: { id: sessionId } },
        ...extra,
      });
      const t = Math.floor(Date.now() / 1000);
      const sig = createHmac("sha256", "whsec_fixture")
        .update(`${t}.${raw}`)
        .digest("hex");
      return POST(
        new Request("https://example.test/api/student-enrollment/webhook", {
          method: "POST",
          headers: { "stripe-signature": `t=${t},v1=${sig}` },
          body: raw,
        }),
      );
    },
    async close() {
      globalThis.fetch = originalFetch;
      process.env = originalEnv;
      await db.close();
    },
  };
}

test("payments off records a bound paid completion and 503s anything it cannot record", async () => {
  const f = await liveOffFixture();
  try {
    const offer = await f.plantOffering();
    const bound = await f.plantHold(offer.id, offer.courseDate, {
      sessionId: `cs_live_bound${randomUUID().replaceAll("-", "").slice(0, 8)}`,
    });
    const boundSession = `cs_live_bound${bound.id.replaceAll("-", "").slice(0, 8)}`;
    await f.db.query(
      "UPDATE student_enrollments SET stripe_session_id=$2 WHERE id=$1",
      [bound.id, boundSession],
    );
    f.plantSession({
      id: boundSession,
      enrollmentId: bound.id,
      offeringId: offer.id,
      courseDate: offer.courseDate,
      expiresAt: bound.expiresAt,
    });
    const completed = await f.webhook(
      "checkout.session.completed",
      boundSession,
    );
    expect(completed.status).toBe(200);
    expect(await completed.json()).toEqual({ received: true });
    expect((await f.enrollment(bound.id)).status).toBe("paid");
    expect(await f.mail(bound.id)).toHaveLength(1);
    expect((await f.mail(bound.id))[0].status).toBe("pending");

    const asyncHold = await f.plantHold(offer.id, offer.courseDate, {
      sessionId: null,
    });
    const asyncSession = `cs_live_async${asyncHold.id.replaceAll("-", "").slice(0, 8)}`;
    await f.db.query(
      "UPDATE student_enrollments SET stripe_session_id=$2 WHERE id=$1",
      [asyncHold.id, asyncSession],
    );
    f.plantSession({
      id: asyncSession,
      enrollmentId: asyncHold.id,
      offeringId: offer.id,
      courseDate: offer.courseDate,
      expiresAt: asyncHold.expiresAt,
    });
    expect(
      (
        await f.webhook(
          "checkout.session.async_payment_succeeded",
          asyncSession,
        )
      ).status,
    ).toBe(200);
    expect((await f.enrollment(asyncHold.id)).status).toBe("paid");

    const unbound = await f.plantHold(offer.id, offer.courseDate);
    const unboundSession = `cs_live_unbound${unbound.id.replaceAll("-", "").slice(0, 8)}`;
    f.plantSession({
      id: unboundSession,
      enrollmentId: unbound.id,
      offeringId: offer.id,
      courseDate: offer.courseDate,
      expiresAt: unbound.expiresAt,
    });
    const ignored = await f.webhook(
      "checkout.session.completed",
      unboundSession,
    );
    expect(ignored.status).toBe(503);
    expect(await ignored.json()).not.toMatchObject({ ignored: true });
    expect((await f.enrollment(unbound.id)).status).toBe("reserved");
    expect((await f.enrollment(unbound.id)).stripe_session_id).toBeNull();
    expect(await f.mail(unbound.id)).toHaveLength(0);
  } finally {
    await f.close();
  }
});

test("payments off keeps partial refunds on reserved rows and refuses unbound full refunds", async () => {
  const f = await liveOffFixture();
  try {
    const offer = await f.plantOffering();
    const reserved = await f.plantHold(offer.id, offer.courseDate);
    const boundSession = `cs_live_partial${reserved.id.replaceAll("-", "").slice(0, 8)}`;
    await f.db.query(
      "UPDATE student_enrollments SET stripe_session_id=$2 WHERE id=$1",
      [reserved.id, boundSession],
    );
    f.plantSession({
      id: boundSession,
      enrollmentId: reserved.id,
      offeringId: offer.id,
      courseDate: offer.courseDate,
      expiresAt: reserved.expiresAt,
      amountRefunded: 10000,
    });
    expect(
      (
        await f.webhook("charge.refunded", "ignored", {
          data: { object: { payment_intent: `pi_${boundSession.slice(8)}` } },
        })
      ).status,
    ).toBe(200);
    const partial = await f.enrollment(reserved.id);
    expect(partial.status).toBe("reserved");
    expect(Number(partial.refunded_amount)).toBe(10000);
    expect(partial.stripe_session_id).toBe(boundSession);

    const unbound = await f.plantHold(offer.id, offer.courseDate);
    const unboundSession = `cs_live_fullunb${unbound.id.replaceAll("-", "").slice(0, 8)}`;
    f.plantSession({
      id: unboundSession,
      enrollmentId: unbound.id,
      offeringId: offer.id,
      courseDate: offer.courseDate,
      expiresAt: unbound.expiresAt,
      fullyRefunded: true,
    });
    expect(
      (
        await f.webhook("charge.refunded", "ignored", {
          data: { object: { payment_intent: `pi_${unboundSession.slice(8)}` } },
        })
      ).status,
    ).toBe(503);
    const after = await f.enrollment(unbound.id);
    expect(after.status).toBe("reserved");
    expect(after.stripe_session_id).toBeNull();
  } finally {
    await f.close();
  }
});

test("partial refund handling matches whether payments are on or off", async () => {
  const f = await liveOffFixture();
  try {
    f.setPaymentsEnabled(true);
    const offer = await f.plantOffering();
    const reserved = await f.plantHold(offer.id, offer.courseDate);
    const sessionId = `cs_live_onpart${reserved.id.replaceAll("-", "").slice(0, 8)}`;
    await f.db.query(
      "UPDATE student_enrollments SET stripe_session_id=$2 WHERE id=$1",
      [reserved.id, sessionId],
    );
    f.plantSession({
      id: sessionId,
      enrollmentId: reserved.id,
      offeringId: offer.id,
      courseDate: offer.courseDate,
      expiresAt: reserved.expiresAt,
      amountRefunded: 10000,
    });
    expect(
      (
        await f.webhook("charge.refunded", "ignored", {
          data: { object: { payment_intent: `pi_${sessionId.slice(8)}` } },
        })
      ).status,
    ).toBe(200);
    const row = await f.enrollment(reserved.id);
    expect(row.status).toBe("reserved");
    expect(Number(row.refunded_amount)).toBe(10000);
  } finally {
    await f.close();
  }
});

test("payments off expires nothing, drains only paid mail, and rejects mismatched reserved orphans", async () => {
  const f = await liveOffFixture();
  try {
    const offer = await f.plantOffering();
    const reserved = await f.plantHold(offer.id, offer.courseDate);
    const sessionId = `cs_live_exp${reserved.id.replaceAll("-", "").slice(0, 8)}`;
    await f.db.query(
      "UPDATE student_enrollments SET stripe_session_id=$2 WHERE id=$1",
      [reserved.id, sessionId],
    );
    f.plantSession({
      id: sessionId,
      enrollmentId: reserved.id,
      offeringId: offer.id,
      courseDate: offer.courseDate,
      expiresAt: reserved.expiresAt,
      status: "expired",
      paymentStatus: "unpaid",
    });
    const expired = await f.webhook("checkout.session.expired", sessionId);
    expect(expired.status).toBe(200);
    expect(await expired.json()).toEqual({ received: true, ignored: true });
    expect((await f.enrollment(reserved.id)).status).toBe("reserved");
    expect(await f.mail(reserved.id)).toHaveLength(0);

    const paid = await f.plantHold(offer.id, offer.courseDate);
    const paidSession = `cs_live_paidex${paid.id.replaceAll("-", "").slice(0, 8)}`;
    await f.db.query(
      "UPDATE student_enrollments SET stripe_session_id=$2,status='paid' WHERE id=$1",
      [paid.id, paidSession],
    );
    await f.db.query(
      "INSERT INTO student_enrollment_mail(enrollment_id) VALUES($1)",
      [paid.id],
    );
    await f.db.query(
      "INSERT INTO student_enrollment_mail(enrollment_id) VALUES($1)",
      [reserved.id],
    );
    process.env.RDA_STUDENT_EMAIL_LIVE_ENABLED = "true";
    process.env.RDA_STUDENT_EMAIL_API_KEY = "fixture-mail-key";
    process.env.RDA_STUDENT_EMAIL_FROM = "Academy <academy@example.test>";
    f.plantSession({
      id: paidSession,
      enrollmentId: paid.id,
      offeringId: offer.id,
      courseDate: offer.courseDate,
      expiresAt: paid.expiresAt,
      status: "expired",
      paymentStatus: "unpaid",
    });
    expect(
      (await f.webhook("checkout.session.expired", paidSession)).status,
    ).toBe(200);
    expect((await f.mail(paid.id))[0].status).toBe("sent");
    expect((await f.webhook("checkout.session.expired", sessionId)).status).toBe(
      200,
    );
    expect((await f.mail(reserved.id))[0].payload).toBeNull();
    delete process.env.RDA_STUDENT_EMAIL_LIVE_ENABLED;

    const mismatch = await f.plantHold(offer.id, offer.courseDate, {
      expiresAt: 1_700_000_000,
    });
    const mismatchSession = `cs_live_mis${mismatch.id.replaceAll("-", "").slice(0, 8)}`;
    await f.db.query(
      "UPDATE student_enrollments SET stripe_session_id=$2 WHERE id=$1",
      [mismatch.id, mismatchSession],
    );
    f.plantSession({
      id: mismatchSession,
      enrollmentId: mismatch.id,
      offeringId: offer.id,
      courseDate: offer.courseDate,
      expiresAt: 1_800_000_000,
    });
    expect(
      (await f.webhook("checkout.session.completed", mismatchSession)).status,
    ).toBe(503);
    expect((await f.enrollment(mismatch.id)).status).toBe("reserved");
  } finally {
    await f.close();
  }
});

test("email off still records later webhooks on a paid row and queues mail", async () => {
  const f = await liveOffFixture();
  try {
    const offer = await f.plantOffering();
    const paid = await f.plantHold(offer.id, offer.courseDate);
    const sessionId = `cs_live_mailoff${paid.id.replaceAll("-", "").slice(0, 8)}`;
    await f.db.query(
      "UPDATE student_enrollments SET stripe_session_id=$2 WHERE id=$1",
      [paid.id, sessionId],
    );
    f.plantSession({
      id: sessionId,
      enrollmentId: paid.id,
      offeringId: offer.id,
      courseDate: offer.courseDate,
      expiresAt: paid.expiresAt,
    });
    expect((await f.webhook("checkout.session.completed", sessionId)).status).toBe(
      200,
    );
    expect((await f.enrollment(paid.id)).status).toBe("paid");
    expect((await f.mail(paid.id))[0].status).toBe("pending");
    f.plantSession({
      id: sessionId,
      enrollmentId: paid.id,
      offeringId: offer.id,
      courseDate: offer.courseDate,
      expiresAt: paid.expiresAt,
      fullyRefunded: true,
    });
    const refunded = await f.webhook("charge.refunded", "ignored", {
      data: { object: { payment_intent: `pi_${sessionId.slice(8)}` } },
    });
    expect(refunded.status).toBe(200);
    expect(await refunded.json()).not.toMatchObject({
      error: expect.anything(),
    });
    expect((await f.enrollment(paid.id)).status).toBe("refunded");
  } finally {
    await f.close();
  }
});

test("rollback refunds and releases before the kill switch, then bound leftover payments still record", async () => {
  const f = await liveOffFixture();
  try {
    f.setPaymentsEnabled(true);
    const offer = await f.plantOffering();
    const held = await f.plantHold(offer.id, offer.courseDate);
    const sessionId = `cs_live_roll${held.id.replaceAll("-", "").slice(0, 8)}`;
    await f.db.query(
      "UPDATE student_enrollments SET stripe_session_id=$2 WHERE id=$1",
      [held.id, sessionId],
    );
    f.plantSession({
      id: sessionId,
      enrollmentId: held.id,
      offeringId: offer.id,
      courseDate: offer.courseDate,
      expiresAt: held.expiresAt,
    });
    expect((await f.webhook("checkout.session.completed", sessionId)).status).toBe(
      200,
    );
    expect((await f.enrollment(held.id)).status).toBe("paid");
    f.plantSession({
      id: sessionId,
      enrollmentId: held.id,
      offeringId: offer.id,
      courseDate: offer.courseDate,
      expiresAt: held.expiresAt,
      fullyRefunded: true,
    });
    expect(
      (
        await f.webhook("charge.refunded", "ignored", {
          data: { object: { payment_intent: `pi_${sessionId.slice(8)}` } },
        })
      ).status,
    ).toBe(200);
    expect((await f.enrollment(held.id)).status).toBe("refunded");
    await f.db.query("SELECT release_refunded_student_seat($1,$2)", [
      held.id,
      "staff@example.test",
    ]);
    f.setPaymentsEnabled(false);
    await f.db.query(
      "UPDATE student_enrollment_offerings SET enabled=false WHERE id=$1",
      [offer.id],
    );
    const leftover = await f.plantHold(offer.id, offer.courseDate);
    const leftoverSession = `cs_live_left${leftover.id.replaceAll("-", "").slice(0, 8)}`;
    await f.db.query(
      "UPDATE student_enrollments SET stripe_session_id=$2 WHERE id=$1",
      [leftover.id, leftoverSession],
    );
    f.plantSession({
      id: leftoverSession,
      enrollmentId: leftover.id,
      offeringId: offer.id,
      courseDate: offer.courseDate,
      expiresAt: leftover.expiresAt,
    });
    expect(
      (await f.webhook("checkout.session.completed", leftoverSession)).status,
    ).toBe(200);
    expect((await f.enrollment(leftover.id)).status).toBe("paid");
    const counts = await f.db.query<{
      reserved: string;
      unreleased: string;
      enabled: boolean;
    }>(
      `SELECT
        (SELECT count(*) FROM student_enrollments WHERE status='reserved')::text AS reserved,
        (SELECT count(*) FROM student_enrollments WHERE status='refunded' AND inventory_released_at IS NULL)::text AS unreleased,
        (SELECT enabled FROM student_enrollment_offerings WHERE id=$1) AS enabled`,
      [offer.id],
    );
    expect(counts.rows[0].reserved).toBe("0");
    expect(counts.rows[0].unreleased).toBe("0");
    expect(counts.rows[0].enabled).toBe(false);
  } finally {
    await f.close();
  }
});

test("staff drain sends queued paid mail while live payments stay off", async () => {
  const f = await liveOffFixture();
  try {
    const offer = await f.plantOffering();
    const paid = await f.plantHold(offer.id, offer.courseDate);
    const sessionId = `cs_live_drain${paid.id.replaceAll("-", "").slice(0, 8)}`;
    await f.db.query(
      "UPDATE student_enrollments SET stripe_session_id=$2 WHERE id=$1",
      [paid.id, sessionId],
    );
    f.plantSession({
      id: sessionId,
      enrollmentId: paid.id,
      offeringId: offer.id,
      courseDate: offer.courseDate,
      expiresAt: paid.expiresAt,
    });
    expect((await f.webhook("checkout.session.completed", sessionId)).status).toBe(
      200,
    );
    expect((await f.mail(paid.id))[0].status).toBe("pending");
    expect(studentWebhookConfig()?.mode).toBe("live");
    const queued = await drainStudentConfirmations(studentWebhookConfig()!);
    expect(queued.attempted).toBe(1);
    expect(queued.remaining).toBe(1);
    process.env.RDA_STUDENT_EMAIL_LIVE_ENABLED = "true";
    process.env.RDA_STUDENT_EMAIL_API_KEY = "fixture-mail-key";
    process.env.RDA_STUDENT_EMAIL_FROM = "Academy <academy@example.test>";
    const drained = await drainStudentConfirmations(studentWebhookConfig()!);
    expect(drained.attempted).toBe(1);
    expect(drained.remaining).toBe(0);
    expect(drained.errors).toBe(0);
    expect((await f.mail(paid.id))[0].status).toBe("sent");
    const again = await drainStudentConfirmations(studentWebhookConfig()!);
    expect(again.attempted).toBe(0);
    expect(again.remaining).toBe(0);
  } finally {
    await f.close();
  }
});

test("reserved row bound to one session and paid on another is flagged, not 503", async () => {
  const f = await liveOffFixture();
  try {
    const offer = await f.plantOffering();
    const held = await f.plantHold(offer.id, offer.courseDate);
    const bound = `cs_live_s1${held.id.replaceAll("-", "").slice(0, 8)}`;
    const paidOther = `cs_live_s2${held.id.replaceAll("-", "").slice(0, 8)}`;
    await f.db.query(
      "UPDATE student_enrollments SET stripe_session_id=$2 WHERE id=$1",
      [held.id, bound],
    );
    f.plantSession({
      id: paidOther,
      enrollmentId: held.id,
      offeringId: offer.id,
      courseDate: offer.courseDate,
      expiresAt: held.expiresAt + 1800,
    });
    const first = await f.webhook("checkout.session.completed", paidOther);
    expect(first.status).toBe(200);
    expect(await first.json()).toEqual({ received: true });
    expect((await f.enrollment(held.id)).status).toBe("reserved");
    expect((await f.enrollment(held.id)).stripe_session_id).toBe(bound);
    const reviews = await f.reviews(held.id);
    expect(reviews).toHaveLength(1);
    expect(reviews[0].reason).toBe("session_mismatch");
    expect(reviews[0].session_id).toBe(paidOther);
    expect(reviews[0].resolved_at).toBeNull();
    expect((await f.webhook("checkout.session.completed", paidOther)).status).toBe(
      200,
    );
    expect(await f.reviews(held.id)).toHaveLength(1);
    f.setPaymentsEnabled(true);
    expect((await f.webhook("checkout.session.completed", paidOther)).status).toBe(
      200,
    );
    expect((await f.enrollment(held.id)).status).toBe("reserved");
  } finally {
    await f.close();
  }
});

test("unpaid completed sessions are ignored, not treated as paid completions", async () => {
  const f = await liveOffFixture();
  try {
    const offer = await f.plantOffering();
    const unbound = await f.plantHold(offer.id, offer.courseDate);
    const sessionId = `cs_live_unpaid${unbound.id.replaceAll("-", "").slice(0, 8)}`;
    f.plantSession({
      id: sessionId,
      enrollmentId: unbound.id,
      offeringId: offer.id,
      courseDate: offer.courseDate,
      expiresAt: unbound.expiresAt,
      paymentStatus: "unpaid",
    });
    const ignored = await f.webhook("checkout.session.completed", sessionId);
    expect(ignored.status).toBe(200);
    expect(await ignored.json()).toEqual({ received: true, ignored: true });
    expect((await f.enrollment(unbound.id)).status).toBe("reserved");
    expect((await f.enrollment(unbound.id)).stripe_session_id).toBeNull();
  } finally {
    await f.close();
  }
});

test("record-path mail failure stays 200 after a durable paid record", async () => {
  const f = await liveOffFixture();
  try {
    const offer = await f.plantOffering();
    const paid = await f.plantHold(offer.id, offer.courseDate);
    const sessionId = `cs_live_mailerr${paid.id.replaceAll("-", "").slice(0, 8)}`;
    await f.db.query(
      "UPDATE student_enrollments SET stripe_session_id=$2 WHERE id=$1",
      [paid.id, sessionId],
    );
    f.plantSession({
      id: sessionId,
      enrollmentId: paid.id,
      offeringId: offer.id,
      courseDate: offer.courseDate,
      expiresAt: paid.expiresAt,
    });
    process.env.RDA_STUDENT_EMAIL_LIVE_ENABLED = "true";
    delete process.env.RDA_STUDENT_EMAIL_API_KEY;
    delete process.env.RDA_STUDENT_EMAIL_FROM;
    const completed = await f.webhook("checkout.session.completed", sessionId);
    expect(completed.status).toBe(200);
    expect(await completed.json()).toEqual({ received: true });
    expect((await f.enrollment(paid.id)).status).toBe("paid");
    expect((await f.mail(paid.id))[0].status).toBe("pending");
  } finally {
    await f.close();
  }
});

test("expired orphan with a partial refund stays in review", async () => {
  const f = await liveOffFixture();
  try {
    f.setPaymentsEnabled(true);
    const offer = await f.plantOffering();
    const expired = await f.plantHold(offer.id, offer.courseDate, {
      expiresAt: 1_700_000_000,
    });
    await f.db.query(
      "UPDATE student_enrollments SET status='expired',stripe_session_id=NULL WHERE id=$1",
      [expired.id],
    );
    const sessionId = `cs_live_orpart${expired.id.replaceAll("-", "").slice(0, 8)}`;
    f.plantSession({
      id: sessionId,
      enrollmentId: expired.id,
      offeringId: offer.id,
      courseDate: offer.courseDate,
      expiresAt: 1_800_000_000,
      amountRefunded: 10000,
      chargeRefunded: true,
    });
    expect((await f.webhook("checkout.session.completed", sessionId)).status).toBe(
      200,
    );
    expect((await f.enrollment(expired.id)).status).toBe("expired");
    const reviews = await f.reviews(expired.id);
    expect(reviews).toHaveLength(1);
    expect(reviews[0].reason).toBe("paid_after_release");
    expect(reviews[0].resolved_at).toBeNull();
    expect(reviews[0].resolution).toBeNull();
  } finally {
    await f.close();
  }
});

test("resolving a session mismatch as enrolled binds the paying session so a refund can free the seat", async () => {
  const f = await liveOffFixture();
  try {
    const offer = await f.plantOffering();
    const held = await f.plantHold(offer.id, offer.courseDate);
    const bound = `cs_live_a1${held.id.replaceAll("-", "").slice(0, 8)}`;
    const paid = `cs_live_a2${held.id.replaceAll("-", "").slice(0, 8)}`;
    await f.db.query(
      "UPDATE student_enrollments SET stripe_session_id=$2 WHERE id=$1",
      [held.id, bound],
    );
    f.plantSession({
      id: paid,
      enrollmentId: held.id,
      offeringId: offer.id,
      courseDate: offer.courseDate,
      expiresAt: held.expiresAt + 1800,
    });
    expect((await f.webhook("checkout.session.completed", paid)).status).toBe(
      200,
    );
    expect((await f.enrollment(held.id)).status).toBe("reserved");
    expect((await f.enrollment(held.id)).stripe_session_id).toBe(bound);
    expect((await f.reviews(held.id))[0].reason).toBe("session_mismatch");
    expect(await f.occupying(offer.id)).toBe(1);
    await f.db.query(
      "SELECT resolve_student_enrollment_review($1,$2,'enrolled',$3)",
      [held.id, paid, "staff@example.test"],
    );
    expect((await f.enrollment(held.id)).status).toBe("paid");
    expect((await f.enrollment(held.id)).stripe_session_id).toBe(paid);
    expect((await f.mail(held.id))[0].status).toBe("pending");
    f.plantSession({
      id: paid,
      enrollmentId: held.id,
      offeringId: offer.id,
      courseDate: offer.courseDate,
      expiresAt: held.expiresAt + 1800,
      fullyRefunded: true,
    });
    const refunded = await f.webhook("charge.refunded", "ignored", {
      data: { object: { payment_intent: `pi_${paid.slice(8)}` } },
    });
    expect(refunded.status).toBe(200);
    expect((await f.enrollment(held.id)).status).toBe("refunded");
    await f.db.query("SELECT release_refunded_student_seat($1,$2)", [
      held.id,
      "staff@example.test",
    ]);
    expect(
      (await f.enrollment(held.id)).inventory_released_at,
    ).toBeTruthy();
    expect(await f.occupying(offer.id)).toBe(0);
  } finally {
    await f.close();
  }
});

test("refunding a mismatched or duplicate charge is acknowledged instead of 503", async () => {
  const f = await liveOffFixture();
  try {
    const offer = await f.plantOffering();
    const reserved = await f.plantHold(offer.id, offer.courseDate);
    const bound = `cs_live_r1${reserved.id.replaceAll("-", "").slice(0, 8)}`;
    const other = `cs_live_r2${reserved.id.replaceAll("-", "").slice(0, 8)}`;
    await f.db.query(
      "UPDATE student_enrollments SET stripe_session_id=$2 WHERE id=$1",
      [reserved.id, bound],
    );
    f.plantSession({
      id: other,
      enrollmentId: reserved.id,
      offeringId: offer.id,
      courseDate: offer.courseDate,
      expiresAt: reserved.expiresAt + 1800,
      fullyRefunded: true,
    });
    const reservedRefund = await f.webhook("charge.refunded", "ignored", {
      data: { object: { payment_intent: `pi_${other.slice(8)}` } },
    });
    expect(reservedRefund.status).toBe(200);
    expect((await f.enrollment(reserved.id)).status).toBe("reserved");
    expect((await f.enrollment(reserved.id)).stripe_session_id).toBe(bound);
    const reservedReview = await f.reviews(reserved.id);
    expect(reservedReview).toHaveLength(1);
    expect(reservedReview[0].reason).toBe("session_mismatch");
    expect(reservedReview[0].resolution).toBe("refunded");

    const paidHold = await f.plantHold(offer.id, offer.courseDate);
    const paidBound = `cs_live_p1${paidHold.id.replaceAll("-", "").slice(0, 8)}`;
    const duplicate = `cs_live_p2${paidHold.id.replaceAll("-", "").slice(0, 8)}`;
    await f.db.query(
      "UPDATE student_enrollments SET stripe_session_id=$2 WHERE id=$1",
      [paidHold.id, paidBound],
    );
    f.plantSession({
      id: paidBound,
      enrollmentId: paidHold.id,
      offeringId: offer.id,
      courseDate: offer.courseDate,
      expiresAt: paidHold.expiresAt,
    });
    expect(
      (await f.webhook("checkout.session.completed", paidBound)).status,
    ).toBe(200);
    expect((await f.enrollment(paidHold.id)).status).toBe("paid");
    f.plantSession({
      id: duplicate,
      enrollmentId: paidHold.id,
      offeringId: offer.id,
      courseDate: offer.courseDate,
      expiresAt: paidHold.expiresAt + 1800,
    });
    const late = await f.webhook("checkout.session.completed", duplicate);
    expect(late.status).toBe(200);
    expect((await f.enrollment(paidHold.id)).status).toBe("paid");
    expect((await f.enrollment(paidHold.id)).stripe_session_id).toBe(paidBound);
    expect(
      (await f.reviews(paidHold.id)).some(
        (row) =>
          row.session_id === duplicate && row.reason === "session_mismatch",
      ),
    ).toBe(true);
    f.plantSession({
      id: duplicate,
      enrollmentId: paidHold.id,
      offeringId: offer.id,
      courseDate: offer.courseDate,
      expiresAt: paidHold.expiresAt + 1800,
      fullyRefunded: true,
    });
    const duplicateRefund = await f.webhook("charge.refunded", "ignored", {
      data: { object: { payment_intent: `pi_${duplicate.slice(8)}` } },
    });
    expect(duplicateRefund.status).toBe(200);
    expect((await f.enrollment(paidHold.id)).status).toBe("paid");
    expect(
      (await f.reviews(paidHold.id)).find((row) => row.session_id === duplicate)
        ?.resolution,
    ).toBe("refunded");
  } finally {
    await f.close();
  }
});

test("foreign unpaid completions are ignored and unverified mismatch charges stay 503", async () => {
  const f = await liveOffFixture();
  try {
    const offer = await f.plantOffering();
    const held = await f.plantHold(offer.id, offer.courseDate);
    const bound = `cs_live_u1${held.id.replaceAll("-", "").slice(0, 8)}`;
    const unpaid = `cs_live_u2${held.id.replaceAll("-", "").slice(0, 8)}`;
    const wrong = `cs_live_u3${held.id.replaceAll("-", "").slice(0, 8)}`;
    const asyncPaid = `cs_live_u4${held.id.replaceAll("-", "").slice(0, 8)}`;
    const expired = `cs_live_u5${held.id.replaceAll("-", "").slice(0, 8)}`;
    await f.db.query(
      "UPDATE student_enrollments SET stripe_session_id=$2 WHERE id=$1",
      [held.id, bound],
    );
    f.plantSession({
      id: unpaid,
      enrollmentId: held.id,
      offeringId: offer.id,
      courseDate: offer.courseDate,
      expiresAt: held.expiresAt + 1800,
      paymentStatus: "unpaid",
    });
    const ignored = await f.webhook("checkout.session.completed", unpaid);
    expect(ignored.status).toBe(200);
    expect(await ignored.json()).toEqual({ received: true, ignored: true });
    expect(await f.reviews(held.id)).toHaveLength(0);
    expect((await f.enrollment(held.id)).status).toBe("reserved");

    f.setPaymentsEnabled(true);
    expect((await f.webhook("checkout.session.completed", unpaid)).status).toBe(
      503,
    );
    expect(await f.reviews(held.id)).toHaveLength(0);
    f.setPaymentsEnabled(false);

    f.plantSession({
      id: wrong,
      enrollmentId: held.id,
      offeringId: offer.id,
      courseDate: offer.courseDate,
      expiresAt: held.expiresAt + 1800,
      amountTotal: 1,
    });
    expect((await f.webhook("checkout.session.completed", wrong)).status).toBe(
      503,
    );
    expect(await f.reviews(held.id)).toHaveLength(0);

    f.plantSession({
      id: asyncPaid,
      enrollmentId: held.id,
      offeringId: offer.id,
      courseDate: offer.courseDate,
      expiresAt: held.expiresAt + 1800,
    });
    expect(
      (
        await f.webhook(
          "checkout.session.async_payment_succeeded",
          asyncPaid,
        )
      ).status,
    ).toBe(200);
    expect(
      (await f.reviews(held.id)).some(
        (row) =>
          row.session_id === asyncPaid && row.reason === "session_mismatch",
      ),
    ).toBe(true);

    f.plantSession({
      id: expired,
      enrollmentId: held.id,
      offeringId: offer.id,
      courseDate: offer.courseDate,
      expiresAt: held.expiresAt + 1800,
      status: "expired",
      paymentStatus: "unpaid",
    });
    const expiredEvent = await f.webhook("checkout.session.expired", expired);
    expect(expiredEvent.status).toBe(200);
    expect(await expiredEvent.json()).toEqual({
      received: true,
      ignored: true,
    });
    expect(
      (await f.reviews(held.id)).some((row) => row.session_id === expired),
    ).toBe(false);
  } finally {
    await f.close();
  }
});

test("resolve enrolled on a paid-after-release orphan binds the paying session", async () => {
  const f = await liveOffFixture();
  try {
    f.setPaymentsEnabled(true);
    const offer = await f.plantOffering();
    const held = await f.plantHold(offer.id, offer.courseDate, {
      expiresAt: 1_700_000_000,
    });
    const stale = `cs_live_o1${held.id.replaceAll("-", "").slice(0, 8)}`;
    const orphan = `cs_live_o2${held.id.replaceAll("-", "").slice(0, 8)}`;
    await f.db.query(
      "UPDATE student_enrollments SET status='expired',stripe_session_id=$2 WHERE id=$1",
      [held.id, stale],
    );
    f.plantSession({
      id: orphan,
      enrollmentId: held.id,
      offeringId: offer.id,
      courseDate: offer.courseDate,
      expiresAt: 1_800_000_000,
    });
    expect((await f.webhook("checkout.session.completed", orphan)).status).toBe(
      200,
    );
    expect((await f.enrollment(held.id)).status).toBe("expired");
    expect((await f.enrollment(held.id)).stripe_session_id).toBe(stale);
    expect((await f.reviews(held.id))[0].reason).toBe("paid_after_release");
    await f.db.query(
      "SELECT resolve_student_enrollment_review($1,$2,'enrolled',$3)",
      [held.id, orphan, "staff@example.test"],
    );
    expect((await f.enrollment(held.id)).status).toBe("paid");
    expect((await f.enrollment(held.id)).stripe_session_id).toBe(orphan);
    f.plantSession({
      id: orphan,
      enrollmentId: held.id,
      offeringId: offer.id,
      courseDate: offer.courseDate,
      expiresAt: 1_800_000_000,
      fullyRefunded: true,
    });
    expect(
      (
        await f.webhook("charge.refunded", "ignored", {
          data: { object: { payment_intent: `pi_${orphan.slice(8)}` } },
        })
      ).status,
    ).toBe(200);
    expect((await f.enrollment(held.id)).status).toBe("refunded");
    await f.db.query("SELECT release_refunded_student_seat($1,$2)", [
      held.id,
      "staff@example.test",
    ]);
    expect(await f.occupying(offer.id)).toBe(0);
  } finally {
    await f.close();
  }
});
