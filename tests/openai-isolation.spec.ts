import { expect, test } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";

const SDK_URL = "https://bzrcdn.openai.com/sdk/oaiq.min.js";
const ID = "2adf0fb4-35eb-4714-923c-2622329ba7d6";
const CHANNEL = "682fe9df-b0b0-4f5f-a027-acf963ad2113";
const CLICK = "Native_click-reference_123";
const CLICK_KEY = "rda_openai_click_v1";
const CONSENT_KEY = "rda_openai_measurement_consent_v1";
const ttl = 30 * 86400000;
let sdk: string;
let bridge: string;
test.beforeAll(async ({ request }) => {
  const response = await request.get(SDK_URL);
  expect(response.ok()).toBe(true);
  sdk = await response.text();
  bridge = await readFile("public/measurement/openai.html", "utf8");
});

async function mockVendor(page: import("@playwright/test").Page, payloads: string[], delay = 0) {
  await page.route("https://bzrcdn.openai.com/**", async route => {
    if (route.request().url() === SDK_URL) {
      if (delay) await new Promise(resolve => setTimeout(resolve, delay));
      return route.fulfill({ contentType: "application/javascript", body: sdk });
    }
    return route.fulfill({ contentType: "application/json", headers: { "Access-Control-Allow-Origin": "*" }, body: '{"automatic_advanced_matching_enabled":true}' });
  });
  await page.route("https://bzr.openai.com/**", route => {
    if (route.request().postData()) payloads.push(route.request().postData()!);
    return route.fulfill({ status: 200, headers: { "Access-Control-Allow-Origin": "*" }, body: "" });
  });
  // Other collectors and real form providers never receive QA interactions.
  await page.route("**/*", route => {
    const host = new URL(route.request().url()).hostname;
    return ["127.0.0.1", "localhost", "bzr.openai.com", "bzrcdn.openai.com"].includes(host) ? route.fallback() : route.abort();
  });
}

test("real SDK with automatic matching enabled cannot read raw or hashed parent form values", async ({ page }) => {
  const payloads: string[] = [];
  await mockVendor(page, payloads);
  await page.route("**/isolation-fixture", route => route.fulfill({ contentType: "text/html", body: '<form><label>Email<input name="email" type="email" value="canary-rda@example.test"></label><label>Phone<input name="phone" value="12125550199"></label><button type="button">Send</button></form>' }));
  await page.route("**/measurement/openai.html?*", route => route.fulfill({ contentType: "text/html", body: bridge }));
  await page.goto("/isolation-fixture");
  await page.evaluate(({ channel, click }) => {
    Object.assign(window, { messages: [] });
    window.addEventListener("message", e => (window as typeof window & { messages: unknown[] }).messages.push(e.data));
    const f = document.createElement("iframe"); f.id = "test-frame"; f.sandbox.add("allow-scripts");
    f.src = `/measurement/openai.html?pixel_id=playwright-test-pixel&channel=${channel}&oppref=${click}`;
    document.body.appendChild(f);
  }, { channel: CHANNEL, click: CLICK });
  await expect.poll(() => page.evaluate(() => (window as typeof window & { messages: { type: string }[] }).messages.some(m => m.type === "rda:openai-ready"))).toBe(true);
  await page.getByLabel("Email").fill("canary-rda@example.test");
  await page.getByLabel("Phone").fill("12125550199");
  await page.getByRole("button", { name: "Send" }).click();
  await page.evaluate(({ channel, id }) => {
    const target = (document.getElementById("test-frame") as HTMLIFrameElement).contentWindow!;
    for (const [ch, eventId] of [["bad", id], [channel, "bad"], [channel, id], [channel, id]]) target.postMessage({ type: "rda:openai-lead", channel: ch, eventId }, "*");
  }, { channel: CHANNEL, id: ID });
  await expect.poll(() => payloads.map(p => JSON.parse(p)).flatMap(p => p.events || []).filter(e => e.type === "lead_created").length).toBe(1);
  const lead = payloads.map(p => JSON.parse(p)).find(p => p.events?.some((e: { type: string }) => e.type === "lead_created"));
  expect(lead.oppref).toBe(CLICK); expect(lead.user).toBeUndefined();
  expect(JSON.stringify(payloads)).toContain('automatic_advanced_matching');
  for (const canary of ["canary-rda@example.test", "12125550199"]) {
    expect(payloads.join("")).not.toContain(canary);
    expect(payloads.join("")).not.toContain(createHash("sha256").update(canary).digest("hex"));
  }
  expect(await page.frames().find(f => f.url().includes("/measurement/"))!.evaluate(() => { try { void parent.document; return false; } catch { return true; } })).toBe(true);
});

test("unknown choice blocks SDK; consent stores exact click once; withdrawal removes frame and reference", async ({ page }) => {
  const payloads: string[] = []; await mockVendor(page, payloads);
  await page.goto(`/?oppref=${CLICK}&utm_source=chatgpt#program`);
  await expect(page.getByRole("button", { name: "Allow", exact: true })).toBeVisible();
  expect(await page.locator("#openai-ads-measurement-frame").count()).toBe(0);
  expect(await page.evaluate(key => localStorage.getItem(key), CLICK_KEY)).toBeNull();
  await page.getByRole("button", { name: "Allow", exact: true }).click();
  await expect(page.locator("#openai-ads-measurement-frame")).toHaveCount(1);
  const stored = await page.evaluate(key => JSON.parse(localStorage.getItem(key)!), CLICK_KEY);
  expect(stored.value).toBe(CLICK); expect(stored.expiresAt - Date.now()).toBeGreaterThan(ttl - 10000);
  expect(page.url()).toContain("utm_source=chatgpt"); expect(page.url()).toContain("#program"); expect(page.url()).not.toContain("oppref");
  await page.reload();
  expect(await page.evaluate(key => JSON.parse(localStorage.getItem(key)!).expiresAt, CLICK_KEY)).toBe(stored.expiresAt);
  await page.getByRole("button", { name: "Advertising measurement settings" }).click();
  await page.getByRole("button", { name: "Decline", exact: true }).click();
  await expect(page.locator("#openai-ads-measurement-frame")).toHaveCount(0);
  expect(await page.evaluate(key => localStorage.getItem(key), CLICK_KEY)).toBeNull();
});

for (const signal of ["globalPrivacyControl", "doNotTrack"] as const) {
  test(`${signal} overrides grant and removes persisted/native click`, async ({ page }) => {
    await mockVendor(page, []);
    await page.addInitScript(({ consentKey, clickKey, signal, click }) => {
      localStorage.setItem(consentKey, "granted"); localStorage.setItem(clickKey, JSON.stringify({ value: click, expiresAt: Date.now() + 60000 }));
      Object.defineProperty(navigator, signal, { configurable: true, value: signal === "doNotTrack" ? "1" : true });
    }, { consentKey: CONSENT_KEY, clickKey: CLICK_KEY, signal, click: CLICK });
    await page.goto(`/?oppref=${CLICK}&utm_source=chatgpt`);
    expect(await page.locator("#openai-ads-measurement-frame").count()).toBe(0);
    await expect.poll(() => page.evaluate(key => localStorage.getItem(key), CLICK_KEY)).toBeNull();
    expect(page.url()).not.toContain("oppref"); expect(page.url()).toContain("utm_source=chatgpt");
  });
}

test("expired same URL click does not revive; original lead UUID survives client navigation and is deduplicated", async ({ page }) => {
  const payloads: string[] = []; await mockVendor(page, payloads, 1500);
  await page.addInitScript(({ consentKey, clickKey, click }) => {
    localStorage.setItem(consentKey, "granted"); localStorage.setItem(clickKey, JSON.stringify({ value: click, expiresAt: Date.now() - 1 }));
  }, { consentKey: CONSENT_KEY, clickKey: CLICK_KEY, click: CLICK });
  await page.goto(`/?oppref=${CLICK}&utm_source=chatgpt`);
  await expect(page.locator("#openai-ads-measurement-frame")).toHaveCount(1);
  expect(await page.evaluate(key => localStorage.getItem(key), CLICK_KEY)).toBeNull();
  await page.evaluate(id => {
    for (let i = 0; i < 2; i++) document.dispatchEvent(new CustomEvent("rda:lead-form-success", { detail: { leadEventId: id, openAIAdsReference: { allowed: true, value: "", expiresAt: 0, submittedAt: Date.now(), consentEpoch: 0 } } }));
  }, ID);
  await page.getByRole("navigation", { name: "Footer", exact: true }).getByRole("link", { name: "Contact Us", exact: true }).click();
  await expect.poll(() => payloads.map(p => JSON.parse(p)).flatMap(p => p.events || []).filter(e => e.type === "lead_created").length).toBe(1);
  const event = payloads.map(p => JSON.parse(p)).flatMap(p => p.events || []).find(e => e.type === "lead_created");
  expect(event.id).toBe(ID);
});

for (const removeThrows of [false, true]) {
  test(`stored grant with blocked writes fails closed (removeThrows=${removeThrows})`, async ({ page }) => {
    await mockVendor(page, []);
    await page.addInitScript(({ key, removeThrows }) => {
      const originalSet = Storage.prototype.setItem;
      originalSet.call(localStorage, key, "granted");
      Storage.prototype.setItem = function(k, value) { if (k === key) throw new DOMException("blocked", "QuotaExceededError"); return originalSet.call(this, k, value); };
      if (removeThrows) {
        const originalRemove = Storage.prototype.removeItem;
        Storage.prototype.removeItem = function(k) { if (k === key) throw new DOMException("blocked", "QuotaExceededError"); return originalRemove.call(this, k); };
      }
    }, { key: CONSENT_KEY, removeThrows });
    await page.goto("/");
    await expect(page.getByRole("button", { name: "Advertising measurement settings" })).toBeVisible();
    await expect(page.locator("#openai-ads-measurement-frame")).toHaveCount(0);
    await page.reload();
    await expect(page.getByRole("button", { name: "Advertising measurement settings" })).toBeVisible();
    await expect(page.locator("#openai-ads-measurement-frame")).toHaveCount(0);
  });
}

test("Decline remains blocked when old grant is readable but the write fails", async ({ page }) => {
  await mockVendor(page, []);
  await page.addInitScript(key => localStorage.setItem(key, "granted"), CONSENT_KEY);
  await page.goto("/");
  await expect(page.locator("#openai-ads-measurement-frame")).toHaveCount(1);
  await page.evaluate(key => {
    const originalSet = Storage.prototype.setItem;
    Storage.prototype.setItem = function(k, value) { if (k === key) throw new DOMException("blocked", "QuotaExceededError"); return originalSet.call(this, k, value); };
  }, CONSENT_KEY);
  await page.getByRole("button", { name: "Advertising measurement settings" }).click();
  await page.getByRole("button", { name: "Decline", exact: true }).click();
  await expect(page.locator("#openai-ads-measurement-frame")).toHaveCount(0);
  expect(await page.evaluate(key => localStorage.getItem(key), CONSENT_KEY)).toBeNull();
});

test("queued accepted UUID keeps its click while a post-expiry accepted request has none", async ({ page }) => {
  const payloads: string[] = []; await mockVendor(page, payloads, 1800);
  await page.addInitScript(key => localStorage.setItem(key, "granted"), CONSENT_KEY);
  await page.goto(`/?oppref=${CLICK}`);
  await expect(page.locator('[data-rda-openai-measurement="true"]')).toHaveCount(1);
  const second = "2adf0fb4-35eb-4714-923c-2622329ba7d7";
  await page.evaluate(({ key, id, next }) => {
    const snapshot = { ...JSON.parse(localStorage.getItem(key)!), allowed: true, submittedAt: Date.now(), consentEpoch: 0 };
    document.dispatchEvent(new CustomEvent("rda:lead-form-success", { detail: { leadEventId: id, openAIAdsReference: snapshot } }));
    const record = JSON.parse(localStorage.getItem(key)!); record.expiresAt = Date.now() - 1;
    localStorage.setItem(key, JSON.stringify(record));
    document.dispatchEvent(new CustomEvent("rda:lead-form-success", { detail: { leadEventId: next, openAIAdsReference: { allowed: true, value: "", expiresAt: 0, submittedAt: Date.now(), consentEpoch: 0 } } }));
  }, { key: CLICK_KEY, id: ID, next: second });
  await expect.poll(() => payloads.map(p => JSON.parse(p)).flatMap(p => p.events || []).filter(e => e.type === "lead_created").length).toBe(2);
  const byId = (id: string) => payloads.map(p => JSON.parse(p)).find(p => p.events?.some((e: { id: string }) => e.id === id));
  expect(byId(ID).oppref).toBe(CLICK);
  expect(byId(second).oppref).toBeUndefined();
});

for (const outcome of ["new-click", "withdraw-and-regrant", "rejected"] as const) {
  test(`actual delayed Formspree ${outcome} keeps request-time attribution and consent`, async ({ page }) => {
    const payloads: string[] = []; await mockVendor(page, payloads);
    let release!: () => void;
    const pending = new Promise<void>(resolve => { release = resolve; });
    let submitted = false;
    await page.route("https://formspree.io/**", async route => {
      submitted = true; await pending;
      return route.fulfill({ status: outcome === "rejected" ? 500 : 200, contentType: "application/json", body: '{}' });
    });
    await page.goto(`/lp/dental-assisting-enroll?oppref=${CLICK}`);
    await page.getByRole("button", { name: "Allow", exact: true }).click();
    const form = page.locator('form[data-rda-landing-form="true"]');
    await form.locator('input[name="Name"]').fill("Local QA Fixture");
    await form.locator('input[name="_replyto"]').fill("canary-rda@example.test");
    await form.locator('input[name="Phone"]').fill("12125550199");
    await form.locator('input[type="checkbox"]').check();
    await form.locator('button[type="submit"]').click();
    await expect.poll(() => submitted).toBe(true);
    if (outcome === "withdraw-and-regrant") {
      await page.getByRole("button", { name: "Advertising measurement settings" }).click();
      await page.getByRole("button", { name: "Decline", exact: true }).click();
      await page.getByRole("button", { name: "Advertising measurement settings" }).click();
      await page.getByRole("button", { name: "Allow", exact: true }).click();
    } else if (outcome === "new-click") {
      await page.evaluate(() => {
        history.replaceState(history.state, "", `${location.pathname}?oppref=New_click_after_request`);
        dispatchEvent(new Event("rda:openai-consent"));
      });
    }
    release();
    if (outcome === "new-click") {
      await expect.poll(() => payloads.map(p => JSON.parse(p)).flatMap(p => p.events || []).filter(e => e.type === "lead_created").length).toBe(1);
      const lead = payloads.map(p => JSON.parse(p)).find(p => p.events?.some((e: { type: string }) => e.type === "lead_created"));
      expect(lead.oppref).toBe(CLICK);
    } else {
      if (outcome === "rejected") await expect(form.locator('button[type="submit"]')).not.toBeDisabled();
      else await expect(page.getByText("Request sent", { exact: true })).toBeVisible();
      // Wait for the same local SDK batching interval used by successful tests.
      await page.waitForTimeout(1500);
      expect(payloads.map(p => JSON.parse(p)).flatMap(p => p.events || []).filter(e => e.type === "lead_created")).toEqual([]);
    }
  });
}

test("failed click removal cannot restore old reference after decline and regrant", async ({ page }) => {
  await mockVendor(page, []);
  await page.goto(`/?oppref=${CLICK}`);
  await page.getByRole("button", { name: "Allow", exact: true }).click();
  await page.evaluate(key => {
    const remove = Storage.prototype.removeItem;
    Storage.prototype.removeItem = function(k) { if (k === key) throw new DOMException("blocked", "QuotaExceededError"); return remove.call(this, k); };
  }, CLICK_KEY);
  await page.getByRole("button", { name: "Advertising measurement settings" }).click();
  await page.getByRole("button", { name: "Decline", exact: true }).click();
  await page.getByRole("button", { name: "Advertising measurement settings" }).click();
  await page.getByRole("button", { name: "Allow", exact: true }).click();
  await expect(page.locator('[data-rda-openai-measurement="true"]')).toHaveCount(1);
  expect(await page.locator('[data-rda-openai-measurement="true"]').getAttribute("src")).not.toContain("oppref");
});

test("queued requests are discarded when a cross-tab denial is already followed by grant", async ({ page }) => {
  const payloads: string[] = []; await mockVendor(page, payloads, 1500);
  await page.addInitScript(key => localStorage.setItem(key, "granted"), CONSENT_KEY);
  await page.goto("/");
  await expect(page.locator('[data-rda-openai-measurement="true"]')).toHaveCount(1);
  await page.evaluate(({ key, id }) => {
    document.dispatchEvent(new CustomEvent("rda:lead-form-success", { detail: {
      leadEventId: id, openAIAdsReference: { allowed: true, value: "", expiresAt: 0, submittedAt: Date.now(), consentEpoch: 0 },
    } }));
    Object.assign(window, { freshReady: false });
    window.addEventListener("message", event => {
      if (event.data?.type === "rda:openai-ready") Object.assign(window, { freshReady: true });
    });
    // Storage has the later grant; these queued notifications must still revoke old work.
    dispatchEvent(new StorageEvent("storage", { key, oldValue: "granted", newValue: "denied" }));
    dispatchEvent(new StorageEvent("storage", { key, oldValue: "denied", newValue: "granted" }));
  }, { key: CONSENT_KEY, id: ID });
  await expect.poll(() => page.evaluate(() => (window as Window & { freshReady?: boolean }).freshReady)).toBe(true);
  await page.waitForTimeout(1500);
  await expect(page.locator('[data-rda-openai-measurement="true"]')).toHaveCount(1);
  expect(payloads.map(p => JSON.parse(p)).flatMap(p => p.events || []).filter(e => e.type === "lead_created")).toEqual([]);
});
