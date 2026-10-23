import { randomUUID, createHash } from "node:crypto";
import { test, expect } from "@playwright/test";
import { PGlite } from "@electric-sql/pglite";
import { CANCELLATION_POLICY_PARAGRAPHS } from "@/lib/academy-policies";
import {
  getStudentEnrollment,
  STUDENT_POLICY_HASH,
  type StudentConfig,
} from "@/lib/student-enrollment";
import {
  deliverStudentConfirmation,
  studentConfirmationText,
} from "@/lib/student-enrollment-mail";
import { applyStudentEnrollmentSchema } from "./support/student-enrollment-schema";

// Hermetic transport tests: fake credentials, PGlite only, no passthrough fetch.
// The live-delivery branch is exercised without enabling any deployment flags.
async function fixture() {
  const originalEnv = { ...process.env },
    originalFetch = globalThis.fetch,
    db = await PGlite.create();
  Object.assign(process.env, {
    DATABASE_URL: "postgres://fixture:fixture@db.fixture.neon.tech/test",
    RDA_STUDENT_EMAIL_LIVE_ENABLED: "true",
    RDA_STUDENT_EMAIL_API_KEY: "fixture-mail-key",
    RDA_STUDENT_EMAIL_FROM: "Academy <academy@example.test>",
  });
  await applyStudentEnrollmentSchema((sql) => db.exec(sql));
  const offering = randomUUID(),
    id = randomUUID(),
    policy = CANCELLATION_POLICY_PARAGRAPHS.join("\n\n");
  await db.query(
    "INSERT INTO student_enrollment_offerings(id,mode,course_id,course_date,amount,external_seats,policy_version,policy_hash,policy_text,reviewed_at,review_reference,enabled) VALUES($1,'test','infection-control','2099-11-14',39500,0,'2026-09-30',$2,$3,now(),'fixture',true)",
    [offering, STUDENT_POLICY_HASH, policy],
  );
  await db.query(
    "SELECT * FROM reserve_student_enrollment($1,$2,$3,'Synthetic Adult','adult@example.test','916 555 0100','2026-09-30',$4,'test')",
    [id, offering, "a".repeat(64), STUDENT_POLICY_HASH],
  );
  await db.query(
    "UPDATE student_enrollments SET stripe_session_id='cs_test_mail' WHERE id=$1",
    [id],
  );
  await db.query(
    "SELECT apply_student_enrollment_event('evt_mail',$1,'cs_test_mail','pi_mail','paid')",
    [id],
  );
  const calls: { body: string; key: string }[] = [],
    accepted = new Map<string, string>();
  let behavior: "success" | "timeout" | "error" = "success";
  globalThis.fetch = async (input, init = {}) => {
    const url = new URL(input instanceof Request ? input.url : String(input));
    if (
      ["db.fixture.neon.tech", "api.fixture.neon.tech"].includes(url.hostname)
    ) {
      const { query, params } = JSON.parse(String(init.body)),
        result = await db.query<Record<string, unknown>>(query, params);
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
      throw new Error("External network blocked by mail fixture");
    const body = String(init.body),
      key = new Headers(init.headers).get("Idempotency-Key")!;
    calls.push({ body, key });
    if (behavior === "error") {
      behavior = "success";
      return Response.json(
        { error: "fixture temporary error" },
        { status: 503 },
      );
    }
    if (accepted.has(key) && accepted.get(key) !== body)
      return Response.json(
        { error: "fixture payload conflict" },
        { status: 409 },
      );
    accepted.set(key, body);
    if (behavior === "timeout") {
      behavior = "success";
      throw new DOMException(
        "Fixture timed out after acceptance",
        "TimeoutError",
      );
    }
    return Response.json({ id: "fixture_message" });
  };
  const held = (await getStudentEnrollment(id))!,
    config: StudentConfig = {
      mode: "live",
      key: "rk_live_fixture",
      webhookSecret: "whsec_fixture",
      origin: "https://example.test",
      account: "acct_fixture",
    };
  return {
    db,
    id,
    held,
    config,
    calls,
    accepted,
    setBehavior: (value: typeof behavior) => {
      behavior = value;
    },
    retry: () =>
      db.query(
        "UPDATE student_enrollment_mail SET attempted_at=now()-interval '61 seconds' WHERE enrollment_id=$1",
        [id],
      ),
    state: async () =>
      (
        await db.query<{
          status: string;
          payload: { from: string; to: string[]; text: string };
        }>(
          "SELECT status,payload FROM student_enrollment_mail WHERE enrollment_id=$1",
          [id],
        )
      ).rows[0],
    close: async () => {
      globalThis.fetch = originalFetch;
      process.env = originalEnv;
      await db.close();
    },
  };
}

test("ambiguous email timeout retries the exact immutable payload and confirms only once", async () => {
  const f = await fixture();
  try {
    const historicalPolicy =
      "The policy actually accepted before a later deployment.";
    const historical = {
      ...f.held,
      policy_text: historicalPolicy,
      policy_hash: createHash("sha256").update(historicalPolicy).digest("hex"),
    };
    expect(studentConfirmationText(historical, "test")).toContain(
      historicalPolicy,
    );
    expect(studentConfirmationText(historical, "test")).not.toContain(
      CANCELLATION_POLICY_PARAGRAPHS[0],
    );
    f.setBehavior("timeout");
    await expect(deliverStudentConfirmation(f.held, f.config)).rejects.toThrow(
      "timed out",
    );
    expect((await f.state()).status).toBe("sending");
    expect(f.accepted.size).toBe(1);
    await expect(deliverStudentConfirmation(f.held, f.config)).rejects.toThrow(
      "pending",
    );
    expect(f.calls).toHaveLength(1);
    process.env.RDA_STUDENT_EMAIL_FROM = "Changed <changed@example.test>";
    const changedPolicy =
      "Later policy must not change an accepted confirmation";
    const changed = {
      ...f.held,
      email: "changed@example.test",
      student_name: "Changed name",
      policy_text: changedPolicy,
      policy_hash: createHash("sha256").update(changedPolicy).digest("hex"),
    };
    await f.retry();
    await deliverStudentConfirmation(changed, f.config);
    expect(f.calls).toHaveLength(2);
    expect(f.calls[1]).toEqual(f.calls[0]);
    expect(f.accepted.size).toBe(1);
    expect((await f.state()).status).toBe("sent");
    expect((await f.state()).payload.to).toEqual(["adult@example.test"]);
    expect((await f.state()).payload.text).toContain(
      CANCELLATION_POLICY_PARAGRAPHS[0],
    );
    await expect(
      f.db.query(
        "UPDATE student_enrollment_mail SET payload='{}'::jsonb WHERE enrollment_id=$1",
        [f.id],
      ),
    ).rejects.toThrow("immutable");
    await deliverStudentConfirmation(f.held, f.config);
    expect(f.calls).toHaveLength(2);
  } finally {
    await f.close();
  }
});
test("provider failure, concurrent claims and expired retry windows preserve the outbox without duplicate sends", async () => {
  const f = await fixture();
  try {
    f.setBehavior("error");
    await expect(deliverStudentConfirmation(f.held, f.config)).rejects.toThrow(
      "unavailable",
    );
    expect(f.accepted.size).toBe(0);
    await f.retry();
    const results = await Promise.allSettled(
      Array.from({ length: 4 }, () =>
        deliverStudentConfirmation(f.held, f.config),
      ),
    );
    expect(results.some((r) => r.status === "fulfilled")).toBe(true);
    expect(f.calls).toHaveLength(2);
    expect(f.accepted.size).toBe(1);
    expect((await f.state()).status).toBe("sent");
  } finally {
    await f.close();
  }
  const old = await fixture();
  try {
    old.setBehavior("timeout");
    await expect(
      deliverStudentConfirmation(old.held, old.config),
    ).rejects.toThrow();
    await old.db.query(
      "UPDATE student_enrollment_mail SET started_at=now()-interval '13 hours',attempted_at=now()-interval '2 minutes' WHERE enrollment_id=$1",
      [old.id],
    );
    await expect(
      deliverStudentConfirmation(old.held, old.config),
    ).rejects.toThrow("review");
    expect((await old.state()).status).toBe("review");
    expect(old.calls).toHaveLength(1);
  } finally {
    await old.close();
  }
});
test("live email gate blocks provider access until the separate live email flag is set", async () => {
  const f = await fixture();
  try {
    delete process.env.RDA_STUDENT_EMAIL_LIVE_ENABLED;
    await deliverStudentConfirmation(f.held, f.config);
    expect(f.calls).toHaveLength(0);
    expect((await f.state()).status).toBe("pending");
  } finally {
    await f.close();
  }
});
test("refund before delivery suppresses confirmation; test mode captures an immutable payload without provider access", async () => {
  const f = await fixture();
  try {
    await f.db.query(
      "SELECT apply_student_enrollment_event('evt_refund',$1,'cs_test_mail','pi_mail','refunded')",
      [f.id],
    );
    await expect(deliverStudentConfirmation(f.held, f.config)).rejects.toThrow(
      "review",
    );
    expect(f.calls).toHaveLength(0);
    expect((await f.state()).status).toBe("review");
  } finally {
    await f.close();
  }
  const capture = await fixture();
  try {
    delete process.env.RDA_STUDENT_EMAIL_LIVE_ENABLED;
    delete process.env.RDA_STUDENT_EMAIL_API_KEY;
    delete process.env.RDA_STUDENT_EMAIL_FROM;
    await deliverStudentConfirmation(capture.held, {
      ...capture.config,
      mode: "test",
    });
    expect(capture.calls).toHaveLength(0);
    expect((await capture.state()).status).toBe("captured");
    expect((await capture.state()).payload.text).toContain("TEST ONLY");
  } finally {
    await capture.close();
  }
});
test("confirmation send requires a paid enrollment", async () => {
  const f = await fixture();
  try {
    await f.db.query(
      "UPDATE student_enrollments SET status='reserved' WHERE id=$1",
      [f.id],
    );
    await deliverStudentConfirmation(f.held, f.config);
    expect(f.calls).toHaveLength(0);
    expect((await f.state()).status).toBe("pending");
    await f.db.query(
      "UPDATE student_enrollments SET status='paid' WHERE id=$1",
      [f.id],
    );
    await deliverStudentConfirmation(f.held, f.config);
    expect(f.calls).toHaveLength(1);
    expect((await f.state()).status).toBe("sent");
  } finally {
    await f.close();
  }
});
