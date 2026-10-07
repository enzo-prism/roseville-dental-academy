import { randomUUID, createHmac } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { test, expect } from "@playwright/test";
import { createEnrollmentSession, ENROLLMENT_PILOT_COOKIE } from "@/lib/enrollment-auth";
import { availableTestDates } from "@/lib/enrollment-http";
import { suppressSeasonalTheme } from "./support/qa-helpers";

const fixture = process.env.ENROLLMENT_FIXTURE_TESTS === "1";
const origin = process.env.LOCAL_ORIGIN ?? "http://127.0.0.1:3117";
const auth = { password: "fixture-staff-password-long", secret: "fixture-staff-session-secret-xxxxxxxxxxxxxxxx", origin };
const cookie = `${ENROLLMENT_PILOT_COOKIE}=${createEnrollmentSession(auth)}`;
const date = availableTestDates()[0]?.isoDate;
const payload = (holdId = randomUUID()) => ({ holdId, date, policyAccepted: true, policyVersion: "2026-09-30" });
const headers = { Origin: origin, Cookie: cookie };
async function control(value: object) { await writeFile(process.env.RDA_ENROLLMENT_FIXTURE_FILE!, JSON.stringify(value)); }

test.describe("isolated Next.js API plus Stripe fixtures and real PostgreSQL engine", () => {
  test.skip(!fixture, "Only run against the local PGlite/Stripe fixture server; never production.");
  test.beforeEach(async () => { await control({}); });
  test("API requires staff auth, exact origin, accepted policy, open schedule date and fixed server pricing", async ({ request }) => {
    expect((await request.post("/api/enrollment/checkout", { data: payload(), headers: { Origin: origin } })).status()).toBe(401);
    expect((await request.post("/api/enrollment/checkout", { data: payload(), headers: { ...headers, Origin: "https://evil.test" } })).status()).toBe(503);
    for (const data of [{ ...payload(), policyAccepted: false }, { ...payload(), date: "2025-01-01" }, { ...payload(), amount: 1 }, { ...payload(), policyVersion: "old" }]) {
      const response = await request.post("/api/enrollment/checkout", { data, headers }); expect(response.status()).toBe(400); expect((await response.json()).holdCreated).toBe(false);
    }
    const data = payload(), first = await request.post("/api/enrollment/checkout", { data, headers }); expect(first.status()).toBe(200);
    const repeated = await request.post("/api/enrollment/checkout", { data, headers }); expect((await repeated.json()).url).toBe((await first.json()).url);
    await request.post("/api/enrollment/reconcile", { data: { holdId: data.holdId }, headers });
  });
  test("signed webhook and confirmation reject provider tampering, then durably verify and replay payment", async ({ request }) => {
    const data = payload(), created = await request.post("/api/enrollment/checkout", { data, headers }); expect(created.status()).toBe(200);
    const id = (await created.json()).url.split("/").at(-1);
    await control({ status: "complete", amount: 1 });
    let confirmation = await request.get(`/enrollment-pilot/confirmation?hold=${data.holdId}`, { headers }); expect(await confirmation.text()).toContain("Test payment not verified");
    const event = { id: `evt_fixture${randomUUID().replaceAll("-", "")}`, livemode: false, type: "checkout.session.completed", data: { object: { id, livemode: false } } };
    const raw = JSON.stringify(event), t = Math.floor(Date.now()/1000), signature = createHmac("sha256", "whsec_fixture").update(`${t}.${raw}`).digest("hex");
    expect((await request.post("/api/enrollment/webhook", { data: raw, headers: { "stripe-signature": `t=${t},v1=${signature}` } })).status()).toBe(503);
    await control({ status: "complete" });
    for (let attempt=0; attempt<2; attempt++) expect((await request.post("/api/enrollment/webhook", { data: raw, headers: { "stripe-signature": `t=${t},v1=${signature}` } })).status()).toBe(200);
    confirmation = await request.get(`/enrollment-pilot/confirmation?hold=${data.holdId}`, { headers }); expect(await confirmation.text()).toContain("Test payment verified");
    expect(await confirmation.text()).toContain("No real money was charged");
    expect(await (await request.get(`/enrollment-pilot/confirmation?hold=${randomUUID()}`, { headers })).text()).toContain("Test payment not verified");
    expect((await request.post("/api/enrollment/webhook", { data: `${raw} `, headers: { "stripe-signature": `t=${t},v1=${signature}` } })).status()).toBe(400);
  });
  test("lost Stripe response retains hold and safely reconciles the idempotent session", async ({ request }) => {
    const data = payload(); await control({ lostResponse: true });
    expect((await request.post("/api/enrollment/checkout", { data, headers })).status()).toBe(503);
    await control({});
    const reconciled = await request.post("/api/enrollment/reconcile", { data: { holdId: data.holdId }, headers });
    expect(reconciled.status()).toBe(200); expect((await reconciled.json()).status).toBe("expired");
  });
  test("browser reload recovers abandoned hold and forbids a new checkout until verified expiry", async ({ page }) => {
    await suppressSeasonalTheme(page.context());
    await page.context().addCookies([{ name: ENROLLMENT_PILOT_COOKIE, value: createEnrollmentSession(auth), domain: new URL(origin).hostname, path: "/", secure: true, httpOnly: true, sameSite: "Strict" }]);
    const data = payload(); await page.request.post("/api/enrollment/checkout", { data, headers });
    await page.goto("/enrollment-pilot"); await page.evaluate((saved) => sessionStorage.setItem("rda-test-checkout-hold", JSON.stringify(saved)), { id: data.holdId, date: data.date });
    await page.reload(); await expect(page.getByRole("button", { name: "Continue to Stripe test checkout" })).toBeDisabled();
    await expect(page.getByLabel("Course date", { exact: true })).toHaveValue(data.date!);
    await page.getByRole("button", { name: "Close or verify an abandoned test checkout" }).click();
    await expect(page.getByRole("button", { name: "Continue to Stripe test checkout" })).toBeEnabled();
    await expect(page.getByRole("status")).toContainText("test seat is released");
  });
  test("browser requires date and policy, clears a definite full response and blocks duplicate same-tick submits", async ({ page }) => {
    await suppressSeasonalTheme(page.context());
    await page.context().addCookies([{ name: ENROLLMENT_PILOT_COOKIE, value: createEnrollmentSession(auth), domain: new URL(origin).hostname, path: "/", secure: true, httpOnly: true, sameSite: "Strict" }]);
    await page.goto("/enrollment-pilot");
    let calls = 0;
    await page.route("**/api/enrollment/checkout", async (route) => { calls++; await route.fulfill({ status:409, contentType:"application/json", body:JSON.stringify({error:"All 12 test seats for that date are held.",holdCreated:false}) }); });
    await page.getByRole("button",{name:"Continue to Stripe test checkout"}).click(); expect(calls).toBe(0);
    await page.getByLabel("Course date",{exact:true}).selectOption(date!);
    await page.getByRole("button",{name:"Continue to Stripe test checkout"}).click(); expect(calls).toBe(0);
    await page.getByLabel("I have read, understood, and accepted",{exact:false}).check();
    await page.getByRole("button",{name:"Continue to Stripe test checkout"}).click();
    await expect(page.getByRole("status")).toContainText("All 12 test seats");
    await expect(page.getByRole("button",{name:"Continue to Stripe test checkout"})).toBeEnabled();
    expect(await page.evaluate(()=>sessionStorage.getItem("rda-test-checkout-hold"))).toBeNull();
    await page.unroute("**/api/enrollment/checkout"); calls=0;
    await page.route("**/api/enrollment/checkout", async (route) => { calls++; await new Promise((resolve)=>setTimeout(resolve,150)); await route.fulfill({status:503,contentType:"application/json",body:JSON.stringify({error:"Fixture retryable provider error; hold preserved."})}); });
    await page.locator("form").evaluate((form)=>{ (form as HTMLFormElement).requestSubmit(); (form as HTMLFormElement).requestSubmit(); });
    await expect(page.getByRole("status")).toContainText("hold preserved"); expect(calls).toBe(1);
    await expect(page.getByRole("button",{name:"Continue to Stripe test checkout"})).toBeDisabled();
  });
  test("configured staff checkout stays readable and usable at mobile, tablet and desktop", async ({ page }) => {
    await suppressSeasonalTheme(page.context());
    await page.context().addCookies([{ name: ENROLLMENT_PILOT_COOKIE, value: createEnrollmentSession(auth), domain: new URL(origin).hostname, path: "/", secure: true, httpOnly: true, sameSite: "Strict" }]);
    const folder="/Users/enzo/Documents/Codex/2026-09-30/anal-2/work/rda-enrollment-fixture/screenshots"; await mkdir(folder,{recursive:true});
    for(const width of [375,768,1280]) {
      await page.setViewportSize({width,height:900}); await page.goto("/enrollment-pilot");
      await expect(page.getByRole("button",{name:"Continue to Stripe test checkout"})).toBeEnabled();
      const metrics=await page.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth})); expect(metrics.scroll).toBeLessThanOrEqual(metrics.width);
      await page.screenshot({path:`${folder}/enrollment-${width}.png`,fullPage:true});
    }
  });
});
