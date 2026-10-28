import { expect, test } from "@playwright/test";
import { HOW_HEARD_FIELD } from "@/lib/how-heard";
import { localOrigin, suppressSeasonalTheme, suppressSitePromo } from "./support/qa-helpers";

test.beforeEach(async ({ context }) => {
  await suppressSeasonalTheme(context);
  await suppressSitePromo(context);
});

test("front desk page is discoverable and describes an inquiry, without invented enrollment facts", async ({ page, request }) => {
  await page.goto(`${localOrigin}/dental-front-desk-program`);
  await expect(page.locator("h1")).toHaveCount(1);
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", /\/dental-front-desk-program$/);
  await expect(page.getByRole("heading", { name: "Dental insurance basics", exact: true })).toBeVisible();
  await expect(page.locator('input[name="course_interest"]')).toHaveValue("Front Office Program");
  await expect(page.getByRole("checkbox", { name: /Dental Front Desk/ })).toBeChecked();
  await expect(page.getByRole("main")).not.toContainText(/\$\d|guaranteed employment|Board.approved|9.week/);
  await expect(page.getByRole("button", { name: "Request next steps" })).toBeVisible();
  expect(await (await request.get(`${localOrigin}/sitemap.website.xml`)).text()).toContain("/dental-front-desk-program");
  expect(await (await request.get(`${localOrigin}/llms.txt`)).text()).toContain("/dental-front-desk-program");
  await page.goto(localOrigin);
  await expect(page.getByRole("link", { name: "Explore dental front desk" })).toHaveAttribute("href", "/dental-front-desk-program");
});

test("inquiry validates, retains course/source attribution, handles an error, and succeeds on retry", async ({ page }) => {
  const requests: string[] = [];
  let fail = true;
  await page.route("https://formspree.io/f/**", async route => {
    requests.push(route.request().postData() ?? "");
    await route.fulfill({ status: fail ? 503 : 200, contentType: "application/json", body: JSON.stringify({ ok: !fail }) });
  });
  await page.route("**/api/attribution/receipt-token", route => route.fulfill({ status: 201, contentType: "application/json", body: '{"token":""}' }));
  await page.route("**/api/attribution/receipt", route => route.fulfill({ status: 202, contentType: "application/json", body: "{}" }));
  await page.goto(`${localOrigin}/dental-front-desk-program?utm_source=facebook&utm_medium=organic_social&utm_campaign=front_desk_launch`);
  const form = page.locator('form[data-rda-signup-form="true"]');
  await form.getByRole("button", { name: "Request next steps" }).click();
  expect(requests).toHaveLength(0);
  await form.getByLabel("Full name").fill("QA Example");
  await form.getByLabel("Email", { exact: true }).fill("qa-frontdesk@example.com");
  await form.getByLabel("Phone", { exact: true }).fill("9165550123");
  await form.locator("label").filter({ has: page.locator(`input[name="${HOW_HEARD_FIELD}"][value="Google search"]`) }).click();
  await form.getByRole("button", { name: "Request next steps" }).click();
  await expect(page.locator('[data-rda-lead-form-error="true"]')).toBeVisible();
  expect(requests).toHaveLength(1);
  expect(requests[0]).toContain("Front Office Program");
  expect(requests[0]).toContain("/dental-front-desk-program");
  expect(requests[0]).toContain("front_desk_launch");
  fail = false;
  await form.getByRole("button", { name: "Request next steps" }).click();
  await expect(page.getByRole("heading", { name: "Request sent" })).toBeVisible();
  expect(requests).toHaveLength(2);
});

for (const width of [390, 768, 1280]) {
  for (const colorScheme of ["light", "dark"] as const) {
    test(`front desk layout fits ${width}px in ${colorScheme} mode`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.emulateMedia({ colorScheme, reducedMotion: "reduce" });
      await page.goto(`${localOrigin}/dental-front-desk-program`);
      await expect(page.locator("h1")).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
      await expect(page.getByRole("link", { name: "Request program details" })).toBeVisible();
    });
  }
}
