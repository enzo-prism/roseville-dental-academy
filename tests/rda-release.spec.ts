import { expect, test } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { localOrigin, settleMirrorPage, suppressSitePromo, waitForFontsReady } from "./support/qa-helpers";

const clinicalCourses = ["radiation-safety", "coronal-polish", "sealants"] as const;
const viewports = [
  { name: "mobile", width: 390, height: 844 },
  { name: "tablet", width: 768, height: 1024 },
  { name: "desktop", width: 1280, height: 900 },
] as const;

test.beforeEach(async ({ context }) => {
  await suppressSitePromo(context);
});

for (const viewport of viewports) {
  for (const path of ["/faqs-1", ...clinicalCourses.map((course) => `/${course}`), "/cancellation-policy", "/student-jobs", "/enrollment-pilot", "/enrollment-pilot/confirmation"]) {
    test(`release layout ${path} on ${viewport.name}`, async ({ page }, testInfo) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      const response = await page.goto(`${localOrigin}${path}`, { waitUntil: "domcontentloaded" });
      expect(response?.status()).toBe(200);
      await settleMirrorPage(page);
      await waitForFontsReady(page);
      expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth), "page must fit viewport").toBe(0);
      if (path.startsWith("/enrollment-pilot")) {
        await expect(page.locator("main")).toContainText("TEST ONLY");
        const screenshot = await page.screenshot({ fullPage: true, animations: "disabled" });
        const directory = resolve("../rda-qa/screenshots");
        mkdirSync(directory, { recursive: true });
        writeFileSync(resolve(directory, `${path.replaceAll("/", "-")}-${viewport.width}.png`), screenshot);
        await testInfo.attach(`${path.replaceAll("/", "-")}-${viewport.width}.png`, {
          body: screenshot, contentType: "image/png",
        });
        if (path.endsWith("/confirmation")) {
          const action = page.locator("main").getByRole("link", { name: "Return to private test checkout" });
          await action.focus();
          await expect(action).toBeFocused();
          await page.keyboard.press("Enter");
          await page.waitForURL("**/enrollment-pilot", { waitUntil: "domcontentloaded", timeout: 15_000 });
        } else {
          const password = page.getByLabel("Staff pilot password", { exact: true });
          await password.focus();
          await expect(password).toBeFocused();
          await page.keyboard.press("Tab");
          await expect(page.getByRole("button", { name: "Sign in to private test checkout" })).toBeFocused();
        }
        return;
      }
      const footer = page.locator("footer");
      await expect(footer).toContainText("If Roseville Dental Academy cancels, students may choose another available course date or a refund.");
      const jobsLink = footer.getByRole("link", { name: "Student & Alumni Jobs", exact: true });
      await expect(jobsLink).toHaveAttribute("href", "/student-jobs");
      const policyLink = footer.getByRole("link", { name: "Cancellation and Refund Policy", exact: true });
      await expect(policyLink).toHaveAttribute("href", "/cancellation-policy");
      await page.evaluate(() => window.scrollTo({ top: document.documentElement.scrollHeight, behavior: "instant" }));
      expect(await page.evaluate(() => {
        const fab = document.querySelector<HTMLElement>(".rda-whatsapp-fab");
        if (!fab || getComputedStyle(fab).display === "none") return false;
        const box = fab.getBoundingClientRect();
        return [".rda-footer-policy", ".rda-footer-copy", ".rda-footer-links"].some((selector) => {
          const element = document.querySelector(selector);
          if (!element) return false;
          const range = document.createRange();
          range.selectNodeContents(element);
          return Array.from(range.getClientRects()).some((rect) => rect.left < box.right && rect.right > box.left && rect.top < box.bottom && rect.bottom > box.top);
        });
      }), "floating button must not cover footer text or links").toBe(false);
      await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
      await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
      const screenshot = await page.screenshot({ fullPage: true, animations: "disabled" });
      const directory = resolve("../rda-qa/screenshots");
      mkdirSync(directory, { recursive: true });
      writeFileSync(resolve(directory, `${path.replaceAll("/", "-")}-${viewport.width}.png`), screenshot);
      await testInfo.attach(`${path.replaceAll("/", "-")}-${viewport.width}.png`, {
        body: screenshot, contentType: "image/png",
      });
      await policyLink.focus();
      await expect(policyLink).toBeFocused();
      await page.keyboard.press("Enter");
      await page.waitForURL("**/cancellation-policy", { waitUntil: "domcontentloaded", timeout: 15_000 });
      await expect(page.getByRole("heading", { name: "Cancellation and Refund Policy", exact: true })).toBeVisible();
    });
  }
}
