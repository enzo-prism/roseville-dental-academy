import { randomUUID, createHmac } from "node:crypto";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { test, expect, type APIRequestContext } from "@playwright/test";
import { STUDENT_COOKIE } from "@/lib/student-enrollment";
import {
  createEnrollmentSession,
  ENROLLMENT_PILOT_COOKIE,
} from "@/lib/enrollment-auth";
const origin = process.env.LOCAL_ORIGIN ?? "http://127.0.0.1:3117",
  offer = "11111111-1111-4111-8111-111111111111";
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
      state.student_enrollment_roster.filter(
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
    expect(mail[0].captured_body).toContain("2099-11-14");
    const confirmation = await request.get(
      `/enroll/confirmation?enrollment=${data.id}`,
      { headers },
    );
    expect(await confirmation.text()).toContain("Payment confirmed");
    expect(await confirmation.text()).toContain("2099-11-14");
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
      (await evidence()).student_enrollment_roster.find(
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
      ).status,
    ).toBe("reserved");
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
  test("actual checkout API permits exactly 12 concurrent seats and releases only a verified unpaid expiry", async ({
    request,
  }) => {
    const attempts = Array.from({ length: 13 }, (_, i) => ({
      data: {
        ...payload(),
        offeringId: "22222222-2222-4222-8222-222222222222",
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
  test("complete unpaid checkout and actual async failure retain one seat for review; async success confirms once", async ({
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
    ).toBe("reserved");
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
    ).toBe("reserved");
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
});
