import { randomUUID, createHmac, createHash } from "node:crypto";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { test, expect, type APIRequestContext } from "@playwright/test";
import { STUDENT_COOKIE } from "@/lib/student-enrollment";
import {
  createEnrollmentSession,
  ENROLLMENT_PILOT_COOKIE,
} from "@/lib/enrollment-auth";
import {
  INFECTION_CONTROL_FIXTURE_OFFERING_ID_BY_SLOT,
  infectionControlFixtureCourseDates,
  infectionControlSessionLabel,
} from "@/lib/student-enrollment-offerings";
const origin = process.env.LOCAL_ORIGIN ?? "http://127.0.0.1:3117",
  offer = INFECTION_CONTROL_FIXTURE_OFFERING_ID_BY_SLOT[0],
  december = INFECTION_CONTROL_FIXTURE_OFFERING_ID_BY_SLOT[1],
  [fixtureFirstDate] = infectionControlFixtureCourseDates();
const cookie = `${STUDENT_COOKIE}=${"a".repeat(64)}`,
  headers = { Origin: origin, Cookie: cookie };
const payload = () => ({
  id: randomUUID(),
  offeringId: offer,
  name: "Synthetic Adult",
  email: `synthetic-${randomUUID()}@example.test`,
  phone: "916 555 0100",
  adultAccepted: true,
  policyAccepted: true,
  policyVersion: "2026-09-30",
});
async function control(value: object) {
  await writeFile(
    process.env.RDA_ENROLLMENT_FIXTURE_FILE!,
    JSON.stringify(value),
  );
}
async function evidence() {
  return JSON.parse(
    await readFile(process.env.RDA_ENROLLMENT_FIXTURE_EVIDENCE!, "utf8"),
  );
}
async function webhook(
  request: APIRequestContext,
  id: string,
  type = "checkout.session.completed",
  extra: object = {},
) {
  const raw = JSON.stringify({
    id: `evt_${randomUUID().replaceAll("-", "")}`,
    livemode: false,
    type,
    data: { object: { id } },
    ...extra,
  });
  const t = Math.floor(Date.now() / 1000),
    sig = createHmac("sha256", "whsec_fixture")
      .update(`${t}.${raw}`)
      .digest("hex");
  return request.post("/api/student-enrollment/webhook", {
    data: raw,
    headers: { "stripe-signature": `t=${t},v1=${sig}` },
  });
}
test.describe("student enrollment isolated full stack", () => {
  test.skip(
    process.env.ENROLLMENT_FIXTURE_TESTS !== "1",
    "Only the isolated fixture server is allowed.",
  );
  test.beforeEach(async () => control({ resetLimits: randomUUID() }));
  test("rejects bad origins, anonymous browsers and browser-controlled business terms", async ({
    request,
  }) => {
    expect(
      (
        await request.post("/api/student-enrollment/checkout", {
          data: payload(),
          headers: { Origin: origin },
        })
      ).status(),
    ).toBe(503);
    expect(
      (
        await request.post("/api/student-enrollment/checkout", {
          data: payload(),
          headers: { ...headers, Origin: "https://evil.test" },
        })
      ).status(),
    ).toBe(503);
    for (const extra of [
      { amount: 1 },
      { adultAccepted: false },
      { policyAccepted: false },
      { policyVersion: "old" },
      { email: "invalid" },
    ]) {
      const response = await request.post("/api/student-enrollment/checkout", {
        data: { ...payload(), ...extra },
        headers,
      });
      expect(response.status()).toBe(400);
      expect((await response.json()).holdCreated).toBe(false);
    }
  });
  test("paid webhook creates one private roster entry and one captured confirmation; forged confirmations fail", async ({
    request,
  }) => {
    const data = payload(),
      created = await request.post("/api/student-enrollment/checkout", {
        data,
        headers,
      });
    expect(created.status()).toBe(200);
    const url = (await created.json()).url,
      id = url.split("/").at(-1);
    const repeated = await request.post("/api/student-enrollment/checkout", {
      data,
      headers,
    });
    expect((await repeated.json()).url).toBe(url);
    expect(
      await (
        await request.get(`/enroll/confirmation?enrollment=${data.id}`, {
          headers,
        })
      ).text(),
    ).toContain("Payment not yet confirmed");
    await control({ status: "complete", amount: 1 });
    expect((await webhook(request, id)).status()).toBe(503);
    await control({ status: "complete" });
    expect((await webhook(request, id)).status()).toBe(200);
    expect((await webhook(request, id)).status()).toBe(200);
    const state = await evidence();
    expect(
      state.student_enrollment_roster_test.filter(
        (r: { id: string }) => r.id === data.id,
      ),
    ).toHaveLength(1);
    const mail = state.student_enrollment_mail.filter(
      (r: { enrollment_id: string }) => r.enrollment_id === data.id,
    );
    expect(mail).toHaveLength(1);
    expect(mail[0].status).toBe("captured");
    expect(mail[0].captured_body).toContain("TEST ONLY");
    expect(mail[0].captured_body).toContain(data.id);
    expect(mail[0].captured_body).toContain(fixtureFirstDate);
    const confirmation = await request.get(
      `/enroll/confirmation?enrollment=${data.id}`,
      { headers },
    );
    expect(await confirmation.text()).toContain("Payment confirmed");
    expect(await confirmation.text()).toContain(fixtureFirstDate);
    expect(confirmation.headers()["cache-control"]).toContain("no-store");
    expect(
      await (
        await request.get(`/enroll/confirmation?enrollment=${data.id}`, {
          headers: { Cookie: `${STUDENT_COOKIE}=${"b".repeat(64)}` },
        })
      ).text(),
    ).not.toContain("Payment confirmed");
    expect(
      await (
        await request.get(`/enroll/confirmation?enrollment=${randomUUID()}`, {
          headers,
        })
      ).text(),
    ).not.toContain("Payment confirmed");
    expect(
      await (await request.get("/enrollment-pilot/roster")).text(),
    ).not.toContain(data.email);
    const staff = createEnrollmentSession({
      password: "fixture-staff-password-long",
      secret: "fixture-staff-session-secret-xxxxxxxxxxxxxxxx",
      origin,
    });
    expect(
      await (
        await request.get("/enrollment-pilot/roster", {
          headers: { Cookie: `${ENROLLMENT_PILOT_COOKIE}=${staff}` },
        })
      ).text(),
    ).toContain(data.email);
    await control({ status: "complete", refundedAmount: 39500 });
    expect(
      (
        await webhook(request, id, "charge.refunded", {
          data: { object: { payment_intent: `pi_fixture${id.slice(8)}` } },
        })
      ).status(),
    ).toBe(200);
    expect(
      await (
        await request.get(`/enroll/confirmation?enrollment=${data.id}`, {
          headers,
        })
      ).text(),
    ).toContain("Payment refunded");
    expect(
      (await evidence()).student_enrollment_roster_test.find(
        (r: { id: string }) => r.id === data.id,
      ).refunded_amount,
    ).toBe(39500);
  });
  test("wrong merchant and lost responses retain inventory until verified closure", async ({
    request,
  }) => {
    const data = payload();
    await control({ wrongMerchant: true });
    expect(
      (
        await request.post("/api/student-enrollment/checkout", {
          data,
          headers,
        })
      ).status(),
    ).toBe(503);
    expect(
      (await evidence()).student_enrollments.find(
        (r: { id: string }) => r.id === data.id,
      ),
    ).toBeUndefined();
    await control({ lostResponse: true });
    expect(
      (
        await request.post("/api/student-enrollment/checkout", {
          data,
          headers,
        })
      ).status(),
    ).toBe(503);
    await control({});
    const result = await request.post("/api/student-enrollment/reconcile", {
      data: { id: data.id },
      headers,
    });
    expect(result.status()).toBe(200);
    expect((await result.json()).status).toBe("expired");
  });
  test("open unpaid sessions do not fulfill and signed events reject wrong environment and tampering", async ({
    request,
  }) => {
    const data = payload(),
      created = await request.post("/api/student-enrollment/checkout", {
        data,
        headers,
      });
    expect(created.status()).toBe(200);
    const id = (await created.json()).url.split("/").at(-1);
    expect((await webhook(request, id)).status()).toBe(200);
    expect(
      (await evidence()).student_enrollment_mail.some(
        (r: { enrollment_id: string }) => r.enrollment_id === data.id,
      ),
    ).toBe(false);
    expect(
      (
        await webhook(request, id, "checkout.session.completed", {
          livemode: true,
        })
      ).status(),
    ).toBe(400);
    expect(
      (
        await request.post("/api/student-enrollment/webhook", {
          data: "{}",
          headers: { "stripe-signature": "t=1,v1=bad" },
        })
      ).status(),
    ).toBe(400);
    const forged = JSON.stringify({
      id: `evt_${"a".repeat(24)}`,
      livemode: false,
      type: "checkout.session.completed",
      data: { object: { id } },
    });
    const forgedTime = Math.floor(Date.now() / 1000);
    const forgedResponse = await request.post(
      "/api/student-enrollment/webhook",
      {
        data: forged,
        headers: {
          "stripe-signature": `t=${forgedTime},v1=${"ab".repeat(32)}`,
        },
      },
    );
    expect(forgedResponse.status()).toBe(400);
    expect(await forgedResponse.json()).toEqual({
      error: "Invalid signature.",
    });
    expect(
      (
        await webhook(request, id, "checkout.session.completed", {
          account: "acct_other",
        })
      ).status(),
    ).toBe(400);
    await request.post("/api/student-enrollment/reconcile", {
      data: { id: data.id },
      headers,
    });
  });
  test("student browser validates consent, suppresses tracking, survives reload and captures responsive previews", async ({
    page,
  }) => {
    const external: string[] = [];
    await page.route("**/*", async (route) => {
      const u = new URL(route.request().url());
      if (u.origin !== origin) {
        external.push(u.hostname);
        await route.abort();
      } else await route.continue();
    });
    await page.goto("/enroll");
    const sessions = page.locator("[data-rda-ic-sessions]");
    await expect(sessions).toContainText("November 14, 2026");
    await expect(sessions).toContainText("December 5, 2026");
    await expect(sessions).toContainText("$395.00 USD");
    await expect(sessions).not.toContainText("November 7");
    await expect(page.locator("[data-rda-checkout-policy]")).toContainText(
      "Payment in full required. Course fees are non-refundable and student enrollment cannot be moved to another date. If Roseville Dental Academy cancels, students may choose another available course date or a refund.",
    );
    const dateOptions = page.getByLabel("Course date and full payment");
    await expect(dateOptions).toContainText(
      `${infectionControlSessionLabel(fixtureFirstDate)} · $395.00 USD`,
    );
    await expect(dateOptions).toContainText("$395.00 USD");
    await expect(
      page.getByRole("button", { name: "Continue to Stripe test checkout" }),
    ).toBeEnabled();
    await page
      .getByRole("button", { name: "Continue to Stripe test checkout" })
      .click();
    expect(
      await page.evaluate(() => sessionStorage.getItem("rda-student-checkout")),
    ).toBeNull();
    const folder = "test-results/student-enrollment-preview";
    await mkdir(folder, { recursive: true });
    for (const width of [375, 768, 1280]) {
      await page.setViewportSize({ width, height: 900 });
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      await page.screenshot({
        path: `${folder}/student-${width}.png`,
        fullPage: true,
      });
    }
    await page.getByLabel("Course date and full payment").selectOption(offer);
    await page.getByLabel("Student full name").fill("Synthetic Adult");
    await page
      .getByLabel("Email for enrollment confirmation")
      .fill(`browser-${randomUUID()}@example.test`);
    await page.getByLabel("Phone number").fill("916 555 0100");
    await page.getByLabel("I confirm that I am at least 18").check();
    await page.getByLabel("I have read, understood, and accepted").check();
    // Stop at the external redirect; the provider remains a local deterministic HTTP fixture.
    await page.route("https://checkout.stripe.com/**", (route) =>
      route.abort(),
    );
    const checkoutResponse = page.waitForResponse(
      (response) =>
        response.url().endsWith("/api/student-enrollment/checkout") &&
        response.request().method() === "POST",
    );
    await page
      .getByRole("button", { name: "Continue to Stripe test checkout" })
      .click();
    expect((await checkoutResponse).status()).toBe(200);
    await page.goto("/enroll");
    await expect(
      page.getByRole("button", { name: "Continue to Stripe test checkout" }),
    ).toBeDisabled();
    await page.reload();
    await expect(
      page.getByRole("button", { name: "Check or close saved checkout" }),
    ).toBeEnabled();
    await page
      .getByRole("button", { name: "Check or close saved checkout" })
      .click();
    await expect(page.getByRole("status")).toContainText(
      "unpaid checkout has closed",
    );
    expect(
      external.filter((h) =>
        /facebook|google-analytics|vercel|formspree|openai/.test(h),
      ),
    ).toHaveLength(0);
  });
  test("both confirmed dates are offered at 39500 and a sold-out date cannot be purchased", async ({
    request,
  }) => {
    const pageResponse = await request.get("/enroll");
    expect(pageResponse.status()).toBe(200);
    const body = await pageResponse.text();
    expect(body).toContain("November 14, 2026");
    expect(body).toContain("December 5, 2026");
    expect(body).toContain("$395.00 USD");
    expect(body).not.toContain("November 7, 2026");
    expect(body).toContain(
      "Payment in full required. Course fees are non-refundable and student enrollment cannot be moved to another date. If Roseville Dental Academy cancels, students may choose another available course date or a refund.",
    );
    await control({
      resetLimits: randomUUID(),
      externalSeats: { [december]: 12 },
    });
    expect(
      (
        await request.post("/api/student-enrollment/checkout", {
          data: { ...payload(), offeringId: december },
          headers,
        })
      ).status(),
    ).toBe(409);
    await control({ externalSeats: { [december]: 0 } });
  });
  test("actual checkout API permits exactly 12 concurrent seats and releases only a verified unpaid expiry", async ({
    request,
  }) => {
    const attempts = Array.from({ length: 13 }, (_, i) => ({
      data: {
        ...payload(),
        offeringId: december,
      },
      headers: {
        Origin: origin,
        Cookie: `${STUDENT_COOKIE}=${(i + 100).toString(16).padStart(64, "0")}`,
      },
    }));
    const responses = await Promise.all(
      attempts.map((a) => request.post("/api/student-enrollment/checkout", a)),
    );
    expect(responses.filter((r) => r.status() === 200)).toHaveLength(12);
    expect(responses.filter((r) => r.status() === 409)).toHaveLength(1);
    const first = responses.findIndex((r) => r.status() === 200);
    const retry = await request.post(
      "/api/student-enrollment/checkout",
      attempts[first],
    );
    expect(retry.status()).toBe(200);
    expect((await retry.json()).url).toBe((await responses[first].json()).url);
    const expired = await request.post("/api/student-enrollment/reconcile", {
      data: { id: attempts[first].data.id },
      headers: attempts[first].headers,
    });
    expect((await expired.json()).status).toBe("expired");
    const rejected = responses.findIndex((r) => r.status() === 409);
    expect(
      (
        await request.post(
          "/api/student-enrollment/checkout",
          attempts[rejected],
        )
      ).status(),
    ).toBe(200);
    const state = await evidence();
    expect(
      state.student_enrollments.filter(
        (r: { offering_id: string; status: string }) =>
          r.offering_id === attempts[0].data.offeringId &&
          r.status === "reserved",
      ),
    ).toHaveLength(12);
  });
  test("same paid event remains acknowledged after partial/full refunds and refund-first delivery never creates a confirmation", async ({
    request,
  }) => {
    const send = async (raw: string) => {
      const t = Math.floor(Date.now() / 1000),
        sig = createHmac("sha256", "whsec_fixture")
          .update(`${t}.${raw}`)
          .digest("hex");
      return request.post("/api/student-enrollment/webhook", {
        data: raw,
        headers: { "stripe-signature": `t=${t},v1=${sig}` },
      });
    };
    const data = payload(),
      created = await request.post("/api/student-enrollment/checkout", {
        data,
        headers,
      });
    expect(created.status()).toBe(200);
    const id = (await created.json()).url.split("/").at(-1),
      raw = JSON.stringify({
        id: `evt_order${randomUUID().replaceAll("-", "")}`,
        livemode: false,
        type: "checkout.session.completed",
        data: { object: { id } },
      });
    await control({ status: "complete" });
    expect((await send(raw)).status()).toBe(200);
    expect((await send(raw)).status()).toBe(200);
    await control({ status: "complete", refundedAmount: 10000 });
    expect(
      (
        await webhook(request, id, "charge.refunded", {
          data: { object: { payment_intent: `pi_fixture${id.slice(8)}` } },
        })
      ).status(),
    ).toBe(200);
    let state = await evidence();
    expect(
      state.student_enrollments.find((r: { id: string }) => r.id === data.id)
        .refunded_amount,
    ).toBe(10000);
    expect(
      state.student_enrollments.find((r: { id: string }) => r.id === data.id)
        .status,
    ).toBe("paid");
    await control({ status: "complete", refundedAmount: 39500 });
    expect(
      (
        await webhook(request, id, "charge.refunded", {
          data: { object: { payment_intent: `pi_fixture${id.slice(8)}` } },
        })
      ).status(),
    ).toBe(200);
    expect((await send(raw)).status()).toBe(200);
    expect((await send(raw)).status()).toBe(200);
    state = await evidence();
    expect(
      state.student_enrollments.find((r: { id: string }) => r.id === data.id)
        .status,
    ).toBe("refunded");
    expect(
      state.student_enrollment_mail.filter(
        (r: { enrollment_id: string }) => r.enrollment_id === data.id,
      ),
    ).toHaveLength(1);
    await control({});
    const early = payload(),
      earlyCreated = await request.post("/api/student-enrollment/checkout", {
        data: early,
        headers,
      });
    expect(earlyCreated.status()).toBe(200);
    const earlyId = (await earlyCreated.json()).url.split("/").at(-1);
    await control({ status: "complete", refundedAmount: 39500 });
    expect((await webhook(request, earlyId)).status()).toBe(200);
    await control({ status: "complete", refundedAmount: 0 });
    expect((await webhook(request, earlyId)).status()).toBe(200);
    state = await evidence();
    expect(
      state.student_enrollments.find((r: { id: string }) => r.id === early.id)
        .status,
    ).toBe("refunded");
    expect(
      state.student_enrollment_mail.some(
        (r: { enrollment_id: string }) => r.enrollment_id === early.id,
      ),
    ).toBe(false);
  });
  test("complete unpaid checkout stays held, async payment failure releases the seat, and async success confirms once", async ({
    request,
  }) => {
    const data = payload(),
      created = await request.post("/api/student-enrollment/checkout", {
        data,
        headers,
      });
    expect(created.status()).toBe(200);
    const id = (await created.json()).url.split("/").at(-1);
    await control({ status: "complete", paymentStatus: "unpaid" });
    expect(
      (await webhook(request, id, "checkout.session.completed")).status(),
    ).toBe(200);
    expect(
      (
        await webhook(request, id, "checkout.session.async_payment_failed")
      ).status(),
    ).toBe(200);
    let state = await evidence();
    expect(
      state.student_enrollments.find((r: { id: string }) => r.id === data.id)
        .status,
    ).toBe("expired");
    expect(
      state.student_enrollment_mail.some(
        (r: { enrollment_id: string }) => r.enrollment_id === data.id,
      ),
    ).toBe(false);
    await control({});
    const next = payload(),
      nextCreated = await request.post("/api/student-enrollment/checkout", {
        data: next,
        headers,
      });
    expect(nextCreated.status()).toBe(200);
    const nextId = (await nextCreated.json()).url.split("/").at(-1);
    const completedId=`evt_asynccomplete${randomUUID().replaceAll("-","")}`;
    const successId=`evt_asyncsuccess${randomUUID().replaceAll("-","")}`;
    await control({ status: "complete", paymentStatus: "unpaid" });
    expect((await webhook(request, nextId,"checkout.session.completed",{id:completedId})).status()).toBe(200);
    await control({ status: "complete", paymentStatus: "paid" });
    expect(
      (
        await webhook(
          request,
          nextId,
          "checkout.session.async_payment_succeeded",
          {id:successId},
        )
      ).status(),
    ).toBe(200);
    expect(
      (
        await webhook(
          request,
          nextId,
          "checkout.session.async_payment_succeeded",
          {id:successId},
        )
      ).status(),
    ).toBe(200);
    expect((await webhook(request,nextId,"checkout.session.completed",{id:completedId})).status()).toBe(200);
    expect((await webhook(request,nextId,"checkout.session.async_payment_failed")).status()).toBe(200);
    state = await evidence();
    expect(
      state.student_enrollments.find((r: { id: string }) => r.id === data.id)
        .status,
    ).toBe("expired");
    expect(
      state.student_enrollments.find((r: { id: string }) => r.id === next.id)
        .status,
    ).toBe("paid");
    expect(
      state.student_enrollment_mail.filter(
        (r: { enrollment_id: string }) => r.enrollment_id === next.id,
      ),
    ).toHaveLength(1);
  });
  test("twelve /v1/account failures create no holds and a later buyer can still purchase", async ({
    request,
  }) => {
    await control({ accountError: true, resetLimits: randomUUID() });
    const attempts = await Promise.all(
      Array.from({ length: 12 }, (_, index) =>
        request.post("/api/student-enrollment/checkout", {
          data: payload(),
          headers: {
            Origin: origin,
            Cookie: `${STUDENT_COOKIE}=${(index + 200).toString(16).padStart(64, "0")}`,
          },
        }),
      ),
    );
    expect(attempts.every((response) => response.status() === 503)).toBe(true);
    expect(
      (await evidence()).student_enrollments.filter(
        (row: { offering_id: string; status: string }) =>
          row.offering_id === offer && row.status === "reserved",
      ),
    ).toHaveLength(0);
    await control({ resetLimits: randomUUID() });
    expect(
      (
        await request.post("/api/student-enrollment/checkout", {
          data: payload(),
          headers,
        })
      ).status(),
    ).toBe(200);
  });
  test("session create failure after reserve releases the hold in the same request", async ({
    request,
  }) => {
    const data = payload();
    const createHeaders = {
      Origin: origin,
      Cookie: `${STUDENT_COOKIE}=${"c".repeat(64)}`,
    };
    await control({ createError: true });
    expect(
      (
        await request.post("/api/student-enrollment/checkout", {
          data,
          headers: createHeaders,
        })
      ).status(),
    ).toBe(503);
    expect(
      (await evidence()).student_enrollments.find(
        (row: { id: string }) => row.id === data.id,
      )?.status,
    ).toBe("expired");
    await control({});
    expect(
      (
        await request.post("/api/student-enrollment/checkout", {
          data: payload(),
          headers,
        })
      ).status(),
    ).toBe(200);
  });
  test("reconcile expires a sessionless hold after stripe_expires_at when recovery is empty", async ({
    request,
  }) => {
    const planted = randomUUID();
    await control({
      plantSessionlessHold: {
        id: planted,
        offeringId: offer,
        owner: createHash("sha256").update("a".repeat(64)).digest("hex"),
        name: "Sessionless Adult",
        email: `sessionless-${planted}@example.test`,
        phone: "916 555 0199",
        expiresAt: 1,
      },
    });
    const expired = await request.post("/api/student-enrollment/reconcile", {
      data: { id: planted },
      headers,
    });
    expect(expired.status()).toBe(200);
    expect((await expired.json()).status).toBe("expired");
    const fresh = randomUUID();
    await control({
      resetLimits: randomUUID(),
      plantSessionlessHold: {
        id: fresh,
        offeringId: offer,
        owner: createHash("sha256").update("a".repeat(64)).digest("hex"),
        name: "Open Sessionless Adult",
        email: `open-sessionless-${fresh}@example.test`,
        phone: "916 555 0198",
        expiresAt: Math.floor(Date.now() / 1000) + 3600,
      },
    });
    expect(
      (
        await request.post("/api/student-enrollment/reconcile", {
          data: { id: fresh },
          headers,
        })
      ).status(),
    ).toBe(503);
    expect(
      (await evidence()).student_enrollments.find(
        (row: { id: string }) => row.id === fresh,
      ).status,
    ).toBe("reserved");
  });
  test("charge.refunded without a Checkout PaymentIntent is acknowledged and ignored", async ({
    request,
  }) => {
    expect(
      (
        await webhook(request, "ignored", "charge.refunded", {
          data: { object: {} },
        })
      ).status(),
    ).toBe(200);
    expect(
      (
        await webhook(request, "ignored", "charge.refunded", {
          data: { object: { payment_intent: "pi_not_a_checkout" } },
        })
      ).status(),
    ).toBe(200);
  });
  test("staff roster reports pending reserved holds and hides them from anonymous browsers", async ({
    request,
  }) => {
    const data = payload();
    const staffHoldHeaders = {
      Origin: origin,
      Cookie: `${STUDENT_COOKIE}=${"d".repeat(64)}`,
    };
    expect(
      (
        await request.post("/api/student-enrollment/checkout", {
          data,
          headers: staffHoldHeaders,
        })
      ).status(),
    ).toBe(200);
    expect(await (await request.get("/enrollment-pilot/roster")).text()).not.toContain(
      data.email,
    );
    const staff = createEnrollmentSession({
      password: "fixture-staff-password-long",
      secret: "fixture-staff-session-secret-xxxxxxxxxxxxxxxx",
      origin,
    });
    const roster = await (
      await request.get("/enrollment-pilot/roster", {
        headers: { Cookie: `${ENROLLMENT_PILOT_COOKIE}=${staff}` },
      })
    ).text();
    expect(roster).toContain("Pending checkout holds");
    expect(roster).toContain(data.email);
    expect(roster).toContain("bound");
  });
  test("409 idempotency race does not release a reserved hold, and bind stays reserved-only", async ({
    request,
  }) => {
    const planted = randomUUID();
    const expiresAt = Math.floor(Date.now() / 1000) + 3600;
    await control({
      resetLimits: randomUUID(),
      plantSessionlessHold: {
        id: planted,
        offeringId: offer,
        owner: createHash("sha256").update("a".repeat(64)).digest("hex"),
        name: "Idempotency Adult",
        email: `idempotency-${planted}@example.test`,
        phone: "916 555 0188",
        expiresAt,
      },
      idempotencyConflict: true,
    });
    expect(
      (
        await request.post("/api/student-enrollment/checkout", {
          data: {
            id: planted,
            offeringId: offer,
            name: "Idempotency Adult",
            email: `idempotency-${planted}@example.test`,
            phone: "916 555 0188",
            adultAccepted: true,
            policyAccepted: true,
            policyVersion: "2026-09-30",
          },
          headers,
        })
      ).status(),
    ).toBe(503);
    expect(
      (await evidence()).student_enrollments.find(
        (row: { id: string }) => row.id === planted,
      ).status,
    ).toBe("reserved");
    const orphan = `cs_test_orphan${planted.replaceAll("-", "").slice(0, 12)}`;
    await control({
      plantOrphanSession: {
        id: orphan,
        enrollmentId: planted,
        offeringId: offer,
        expiresAt,
        idempotencyKey: `rda-student-${planted}`,
      },
      idempotencyConflict: true,
    });
    const recovered = await request.post("/api/student-enrollment/checkout", {
      data: {
        id: planted,
        offeringId: offer,
        name: "Idempotency Adult",
        email: `idempotency-${planted}@example.test`,
        phone: "916 555 0188",
        adultAccepted: true,
        policyAccepted: true,
        policyVersion: "2026-09-30",
      },
      headers,
    });
    expect(recovered.status()).toBe(200);
    expect((await recovered.json()).url).toContain(orphan);
    expect(
      (await evidence()).student_enrollments.find(
        (row: { id: string }) => row.id === planted,
      ).stripe_session_id,
    ).toBe(orphan);
  });
  test("paid webhook for an expired or released row is flagged for staff review instead of 503", async ({
    request,
  }) => {
    const planted = randomUUID();
    const expiresAt = Math.floor(Date.now() / 1000) + 3600;
    const orphan = `cs_test_paidrelease${planted.replaceAll("-", "").slice(0, 8)}`;
    await control({
      resetLimits: randomUUID(),
      plantSessionlessHold: {
        id: planted,
        offeringId: offer,
        owner: createHash("sha256").update("e".repeat(64)).digest("hex"),
        name: "Released Adult",
        email: `released-${planted}@example.test`,
        phone: "916 555 0177",
        expiresAt,
        status: "expired",
      },
      plantOrphanSession: {
        id: orphan,
        enrollmentId: planted,
        offeringId: offer,
        expiresAt,
        status: "complete",
        paymentStatus: "paid",
      },
      status: "complete",
    });
    expect((await webhook(request, orphan)).status()).toBe(200);
    const state = await evidence();
    const row = state.student_enrollments.find(
      (item: { id: string }) => item.id === planted,
    );
    expect(row.status).toBe("expired");
    expect(row.stripe_session_id).toBeNull();
    expect(
      state.student_enrollment_reviews.filter(
        (item: { enrollment_id: string; reason: string }) =>
          item.enrollment_id === planted &&
          item.reason === "paid_after_release",
      ),
    ).toHaveLength(1);
    expect(
      state.student_enrollment_mail.filter(
        (item: { enrollment_id: string }) => item.enrollment_id === planted,
      ),
    ).toHaveLength(0);
    expect((await webhook(request, orphan)).status()).toBe(200);
    const staff = createEnrollmentSession({
      password: "fixture-staff-password-long",
      secret: "fixture-staff-session-secret-xxxxxxxxxxxxxxxx",
      origin,
    });
    const roster = await (
      await request.get("/enrollment-pilot/roster", {
        headers: { Cookie: `${ENROLLMENT_PILOT_COOKIE}=${staff}` },
      })
    ).text();
    expect(roster).toContain("Payments needing staff review");
    expect(roster).toContain(`released-${planted}@example.test`);
    expect(roster).toContain("paid_after_release");
  });
  test("live flags without the public CTA flag render 0 Enroll CTAs on /infection-control", async ({
    request,
  }) => {
    const html = await (await request.get("/infection-control")).text();
    expect(html).not.toContain("data-rda-student-enroll-cta");
    expect(html).not.toContain("Enroll and pay in full");
    const enroll = await request.get("/enroll");
    expect(enroll.status()).toBe(200);
    expect(await enroll.text()).toContain("Infection Control enrollment");
  });
  test("409 without idempotency_key_in_use is not an idempotency conflict", async ({
    request,
  }) => {
    const planted = randomUUID();
    await control({
      resetLimits: randomUUID(),
      plantSessionlessHold: {
        id: planted,
        offeringId: offer,
        owner: createHash("sha256").update("a".repeat(64)).digest("hex"),
        name: "Bare 409 Adult",
        email: `bare409-${planted}@example.test`,
        phone: "916 555 0166",
        expiresAt: Math.floor(Date.now() / 1000) + 3600,
      },
      conflictWithoutIdempotencyCode: true,
    });
    expect(
      (
        await request.post("/api/student-enrollment/checkout", {
          data: {
            id: planted,
            offeringId: offer,
            name: "Bare 409 Adult",
            email: `bare409-${planted}@example.test`,
            phone: "916 555 0166",
            adultAccepted: true,
            policyAccepted: true,
            policyVersion: "2026-09-30",
          },
          headers,
        })
      ).status(),
    ).toBe(503);
    expect(
      (await evidence()).student_enrollments.find(
        (row: { id: string }) => row.id === planted,
      ).status,
    ).toBe("expired");
    const other = randomUUID();
    await control({
      resetLimits: randomUUID(),
      plantSessionlessHold: {
        id: other,
        offeringId: offer,
        owner: createHash("sha256").update("a".repeat(64)).digest("hex"),
        name: "Other 409 Adult",
        email: `other409-${other}@example.test`,
        phone: "916 555 0165",
        expiresAt: Math.floor(Date.now() / 1000) + 3600,
      },
      conflictOtherCode: true,
    });
    expect(
      (
        await request.post("/api/student-enrollment/checkout", {
          data: {
            id: other,
            offeringId: offer,
            name: "Other 409 Adult",
            email: `other409-${other}@example.test`,
            phone: "916 555 0165",
            adultAccepted: true,
            policyAccepted: true,
            policyVersion: "2026-09-30",
          },
          headers,
        })
      ).status(),
    ).toBe(503);
    expect(
      (await evidence()).student_enrollments.find(
        (row: { id: string }) => row.id === other,
      ).status,
    ).toBe("expired");
  });
  test("bind is reserved-only and a bind that loses the race flags review instead of 503", async ({
    request,
  }) => {
    const checkoutHold = randomUUID();
    await control({
      resetLimits: randomUUID(),
      plantSessionlessHold: {
        id: checkoutHold,
        offeringId: offer,
        owner: createHash("sha256").update("a".repeat(64)).digest("hex"),
        name: "Expire On Bind Adult",
        email: `expire-bind-${checkoutHold}@example.test`,
        phone: "916 555 0155",
        expiresAt: Math.floor(Date.now() / 1000) + 3600,
      },
      expireOnBind: checkoutHold,
    });
    expect(
      (
        await request.post("/api/student-enrollment/checkout", {
          data: {
            id: checkoutHold,
            offeringId: offer,
            name: "Expire On Bind Adult",
            email: `expire-bind-${checkoutHold}@example.test`,
            phone: "916 555 0155",
            adultAccepted: true,
            policyAccepted: true,
            policyVersion: "2026-09-30",
          },
          headers,
        })
      ).status(),
    ).toBe(503);
    const checkoutRow = (await evidence()).student_enrollments.find(
      (row: { id: string }) => row.id === checkoutHold,
    );
    expect(checkoutRow.status).toBe("expired");
    expect(checkoutRow.stripe_session_id).toBeNull();
    const raced = randomUUID();
    const orphan = `cs_test_bindrace${raced.replaceAll("-", "").slice(0, 8)}`;
    await control({
      resetLimits: randomUUID(),
      plantSessionlessHold: {
        id: raced,
        offeringId: offer,
        owner: createHash("sha256").update("f".repeat(64)).digest("hex"),
        name: "Bind Race Adult",
        email: `bind-race-${raced}@example.test`,
        phone: "916 555 0144",
        expiresAt: Math.floor(Date.now() / 1000) + 3600,
      },
      plantOrphanSession: {
        id: orphan,
        enrollmentId: raced,
        offeringId: offer,
        expiresAt: Math.floor(Date.now() / 1000) + 3600,
        status: "complete",
        paymentStatus: "paid",
      },
      expireOnBind: raced,
      status: "complete",
    });
    expect((await webhook(request, orphan)).status()).toBe(200);
    const state = await evidence();
    expect(
      state.student_enrollments.find((row: { id: string }) => row.id === raced)
        .status,
    ).toBe("expired");
    expect(
      state.student_enrollment_reviews.filter(
        (item: { enrollment_id: string; session_id: string }) =>
          item.enrollment_id === raced && item.session_id === orphan,
      ),
    ).toHaveLength(1);
  });
  test("a second paid orphan for the same enrollment records another review and returns 200", async ({
    request,
  }) => {
    const planted = randomUUID();
    const first = `cs_test_p11b1${planted.replaceAll("-", "").slice(0, 8)}`;
    const second = `cs_test_p11b2${planted.replaceAll("-", "").slice(0, 8)}`;
    await control({
      resetLimits: randomUUID(),
      plantSessionlessHold: {
        id: planted,
        offeringId: offer,
        owner: createHash("sha256").update("e".repeat(64)).digest("hex"),
        name: "Second Orphan Adult",
        email: `second-orphan-${planted}@example.test`,
        phone: "916 555 0133",
        expiresAt: Math.floor(Date.now() / 1000) + 3600,
        status: "expired",
      },
      plantOrphanSession: {
        id: first,
        enrollmentId: planted,
        offeringId: offer,
        expiresAt: Math.floor(Date.now() / 1000) + 3600,
        status: "complete",
        paymentStatus: "paid",
      },
      status: "complete",
    });
    expect((await webhook(request, first)).status()).toBe(200);
    await control({
      plantOrphanSession: {
        id: second,
        enrollmentId: planted,
        offeringId: offer,
        expiresAt: Math.floor(Date.now() / 1000) + 3600,
        status: "complete",
        paymentStatus: "paid",
      },
      status: "complete",
    });
    expect((await webhook(request, second)).status()).toBe(200);
    expect(
      (await evidence()).student_enrollment_reviews.filter(
        (item: { enrollment_id: string }) => item.enrollment_id === planted,
      ),
    ).toHaveLength(2);
  });
  test("a refund on an orphan resolves its review", async ({ request }) => {
    const planted = randomUUID();
    const orphan = `cs_test_p11a${planted.replaceAll("-", "").slice(0, 8)}`;
    await control({
      resetLimits: randomUUID(),
      plantSessionlessHold: {
        id: planted,
        offeringId: offer,
        owner: createHash("sha256").update("e".repeat(64)).digest("hex"),
        name: "Orphan Refund Adult",
        email: `orphan-refund-${planted}@example.test`,
        phone: "916 555 0122",
        expiresAt: Math.floor(Date.now() / 1000) + 3600,
        status: "expired",
      },
      plantOrphanSession: {
        id: orphan,
        enrollmentId: planted,
        offeringId: offer,
        expiresAt: Math.floor(Date.now() / 1000) + 3600,
        status: "complete",
        paymentStatus: "paid",
      },
      status: "complete",
    });
    expect((await webhook(request, orphan)).status()).toBe(200);
    await control({
      status: "complete",
      refundedAmount: 39500,
    });
    expect(
      (
        await webhook(request, orphan, "charge.refunded", {
          data: { object: { payment_intent: `pi_fixture${orphan.slice(8)}` } },
        })
      ).status(),
    ).toBe(200);
    const review = (await evidence()).student_enrollment_reviews.find(
      (item: { enrollment_id: string }) => item.enrollment_id === planted,
    );
    expect(review.resolution).toBe("refunded");
    expect(review.resolved_at).toBeTruthy();
    const staff = createEnrollmentSession({
      password: "fixture-staff-password-long",
      secret: "fixture-staff-session-secret-xxxxxxxxxxxxxxxx",
      origin,
    });
    const roster = await (
      await request.get("/enrollment-pilot/roster", {
        headers: { Cookie: `${ENROLLMENT_PILOT_COOKIE}=${staff}` },
      })
    ).text();
    expect(roster).not.toContain(`orphan-refund-${planted}@example.test`);
  });
  test("staff review list is filtered by the active payment mode", async ({
    request,
  }) => {
    const planted = randomUUID();
    const foreign = randomUUID();
    const orphan = `cs_test_mode${planted.replaceAll("-", "").slice(0, 8)}`;
    await control({
      resetLimits: randomUUID(),
      plantSessionlessHold: {
        id: planted,
        offeringId: offer,
        owner: createHash("sha256").update("e".repeat(64)).digest("hex"),
        name: "Mode Filter Adult",
        email: `mode-filter-${planted}@example.test`,
        phone: "916 555 0111",
        expiresAt: Math.floor(Date.now() / 1000) + 3600,
        status: "expired",
      },
      plantOrphanSession: {
        id: orphan,
        enrollmentId: planted,
        offeringId: offer,
        expiresAt: Math.floor(Date.now() / 1000) + 3600,
        status: "complete",
        paymentStatus: "paid",
      },
      plantForeignModeReview: {
        id: foreign,
        offeringId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
        owner: "b".repeat(64),
        name: "Live Review Adult",
        email: `live-review-${foreign}@example.test`,
        phone: "916 555 0110",
        expiresAt: Math.floor(Date.now() / 1000) + 3600,
        sessionId: "cs_live_foreignreview",
      },
      status: "complete",
    });
    expect((await webhook(request, orphan)).status()).toBe(200);
    const staff = createEnrollmentSession({
      password: "fixture-staff-password-long",
      secret: "fixture-staff-session-secret-xxxxxxxxxxxxxxxx",
      origin,
    });
    const roster = await (
      await request.get("/enrollment-pilot/roster", {
        headers: { Cookie: `${ENROLLMENT_PILOT_COOKIE}=${staff}` },
      })
    ).text();
    expect(roster).toContain(`mode-filter-${planted}@example.test`);
    expect(roster).not.toContain(`live-review-${foreign}@example.test`);
  });
  test("async_payment_failed does not expire a paid enrollment", async ({
    request,
  }) => {
    const planted = randomUUID();
    const sessionId = `cs_test_paidfail${planted.replaceAll("-", "").slice(0, 8)}`;
    const expiresAt = Math.floor(Date.now() / 1000) + 3600;
    await control({
      resetLimits: randomUUID(),
      plantSessionlessHold: {
        id: planted,
        offeringId: december,
        owner: createHash("sha256").update("a".repeat(64)).digest("hex"),
        name: "Paid Fail Adult",
        email: `paid-fail-${planted}@example.test`,
        phone: "916 555 0108",
        sessionId,
        expiresAt,
        status: "paid",
      },
      plantOrphanSession: {
        id: sessionId,
        enrollmentId: planted,
        offeringId: december,
        expiresAt,
        status: "complete",
        paymentStatus: "unpaid",
      },
      status: "complete",
      paymentStatus: "unpaid",
    });
    expect(
      (await webhook(request, sessionId, "checkout.session.async_payment_failed"))
        .status(),
    ).toBe(200);
    expect(
      (await evidence()).student_enrollments.find(
        (row: { id: string }) => row.id === planted,
      ).status,
    ).toBe("paid");
  });
  test("test roster hides live reserved holds and labels released refunds", async ({
    request,
  }) => {
    const planted = randomUUID();
    const sessionId = `cs_test_released${planted.replaceAll("-", "").slice(0, 8)}`;
    const expiresAt = Math.floor(Date.now() / 1000) + 3600;
    const email = `released-roster-${planted}@example.test`;
    const foreign = randomUUID();
    await control({
      resetLimits: randomUUID(),
      plantSessionlessHold: {
        id: planted,
        offeringId: december,
        owner: createHash("sha256").update("a".repeat(64)).digest("hex"),
        name: "Released Roster Adult",
        email,
        phone: "916 555 0107",
        sessionId,
        expiresAt,
        status: "refunded",
      },
      releaseRefundedSeat: {
        id: planted,
        actor: "staff@example.test",
      },
      plantForeignModeHold: {
        id: foreign,
        offeringId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
        owner: "c".repeat(64),
        name: "Live Hold Adult",
        email: `live-hold-${foreign}@example.test`,
        phone: "916 555 0109",
        expiresAt,
      },
    });
    const staff = createEnrollmentSession({
      password: "fixture-staff-password-long",
      secret: "fixture-staff-session-secret-xxxxxxxxxxxxxxxx",
      origin,
    });
    const roster = await (
      await request.get("/enrollment-pilot/roster", {
        headers: { Cookie: `${ENROLLMENT_PILOT_COOKIE}=${staff}` },
      })
    ).text();
    expect(roster).toContain(email);
    expect(roster).toContain("TEST ONLY · refunded · released");
    expect(roster).not.toContain("TEST ONLY · paid");
    expect(roster).not.toContain("TEST ONLY · refunded</");
    expect(roster).not.toContain("refunded — not sellable until released");
    expect(roster).not.toContain(`live-hold-${foreign}@example.test`);
  });
  test("/enroll remaining matches checkout when a refunded seat still occupies", async ({
    request,
  }) => {
    const planted = randomUUID();
    await control({
      resetLimits: randomUUID(),
      externalSeats: { [december]: 11 },
      plantSessionlessHold: {
        id: planted,
        offeringId: december,
        owner: createHash("sha256").update("a".repeat(64)).digest("hex"),
        name: "Occupying Refund Adult",
        email: `occupy-refund-${planted}@example.test`,
        phone: "916 555 0106",
        expiresAt: Math.floor(Date.now() / 1000) + 3600,
        status: "refunded",
      },
    });
    const enroll = await (await request.get("/enroll")).text();
    expect(enroll).toMatch(/0 seats available/);
    expect(
      (
        await request.post("/api/student-enrollment/checkout", {
          data: { ...payload(), offeringId: december },
          headers,
        })
      ).status(),
    ).toBe(409);
  });
});
