import { expect, test, type Page } from "@playwright/test";

const routes = [
  { path: "/", label: "home" },
  { path: "/registration", label: "registration" },
  { path: "/dental-assisting-program", label: "dental-assisting-program" },
  { path: "/front-office-program", label: "front-office-program" },
  { path: "/faqs-1", label: "faqs-1" },
  { path: "/photos", label: "photos" },
  { path: "/m/login", label: "m-login" },
] as const;

const devices = [
  { name: "mobile", width: 390, height: 844, maxStickyHeight: 136 },
  { name: "tablet", width: 768, height: 1024, maxStickyHeight: 120 },
  { name: "desktop", width: 1280, height: 900, maxStickyHeight: 110 },
] as const;

async function gotoAndWait(page: Page, path: string) {
  const response = await page.goto(path, { waitUntil: "domcontentloaded" });
  expect(response, `${path} did not return a document response`).not.toBeNull();
  expect(response?.status(), `${path} returned ${response?.status()}`).toBeLessThan(400);

  await expect(
    page.getByRole("link", { name: /Roseville Dental Academy/i }).first(),
  ).toBeVisible();
  await expect(page.locator("main")).toBeVisible();
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(250);

  const hasDevError = await page.locator("text=Parsing CSS source code failed").count();
  expect(hasDevError, `${path} rendered a Next.js dev error instead of the page`).toBe(0);
  await expect(page.getByText("Page not found")).toHaveCount(0);
}

async function getLayoutScan(page: Page) {
  return page.evaluate(() => {
    const viewportWidth = window.innerWidth;
    const doc = document.documentElement;

    function isVisible(el: HTMLElement) {
      const style = window.getComputedStyle(el);
      const rect = el.getBoundingClientRect();
      return (
        style.display !== "none" &&
        style.visibility !== "hidden" &&
        Number.parseFloat(style.opacity || "1") > 0 &&
        rect.width > 0 &&
        rect.height > 0
      );
    }

    const candidates = Array.from(
      document.querySelectorAll<HTMLElement>(
        [
          "a",
          "button",
          "input",
          "textarea",
          "select",
          "[role='button']",
          "[role='link']",
          "[role='combobox']",
          "form",
          "fieldset",
          "[data-slot='button-group']",
        ].join(","),
      ),
    );

    const offscreen = candidates
      .filter((el) => isVisible(el))
      .map((el) => {
        const rect = el.getBoundingClientRect();
        const style = window.getComputedStyle(el);
        const label =
          el.innerText.replace(/\s+/g, " ").trim().slice(0, 120) ||
          el.getAttribute("aria-label") ||
          el.tagName.toLowerCase();

        return {
          label,
          left: Math.round(rect.left),
          right: Math.round(rect.right),
          width: Math.round(rect.width),
          position: style.position,
        };
      })
      .filter((entry) => {
        if (entry.position === "fixed" && entry.width >= viewportWidth - 2) {
          return false;
        }

        return entry.left < -1 || entry.right > viewportWidth + 1;
      });

    const sticky = Array.from(document.querySelectorAll<HTMLElement>("*")).find(
      (node) => window.getComputedStyle(node).position === "sticky",
    );
    const heading = document.querySelector<HTMLElement>("main h1");
    const stickyRect = sticky?.getBoundingClientRect();
    const headingRect = heading?.getBoundingClientRect();

    return {
      scrollWidth: doc.scrollWidth,
      viewportWidth,
      overflowX: doc.scrollWidth - viewportWidth,
      stickyHeight: stickyRect ? Math.round(stickyRect.height) : 0,
      headerOverlap:
        stickyRect && headingRect ? headingRect.top < stickyRect.bottom - 12 : false,
      offscreen,
    };
  });
}

for (const route of routes) {
  for (const device of devices) {
    test(`${route.label} stays stable on ${device.name}`, async ({ page }) => {
      await page.setViewportSize({ width: device.width, height: device.height });
      await gotoAndWait(page, route.path);

      const scan = await getLayoutScan(page);

      expect(
        scan.overflowX,
        `${route.label} overflowed by ${scan.overflowX}px on ${device.name}`,
      ).toBeLessThanOrEqual(0);
      expect(
        scan.headerOverlap,
        `${route.label} header overlapped the hero on ${device.name}`,
      ).toBeFalsy();
      expect(
        scan.stickyHeight,
        `${route.label} sticky header was ${scan.stickyHeight}px tall on ${device.name}`,
      ).toBeLessThanOrEqual(device.maxStickyHeight);
      expect(scan.offscreen, `${route.label} has offscreen critical elements on ${device.name}`).toEqual([]);
    });
  }
}

test("mobile nav sheet keeps grouped navigation and CTAs visible", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await gotoAndWait(page, "/");
  await page.getByRole("button", { name: "Open navigation" }).click();

  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(page.getByRole("link", { name: "Start registration" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Student portal" })).toBeVisible();

  await page.getByRole("button", { name: "Programs" }).click();
  await expect(page.getByRole("link", { name: "Dental Assisting Program" })).toBeVisible();

  await page.getByRole("button", { name: "Stand-alone Courses" }).click();
  await expect(page.getByRole("link", { name: "BLS / CPR" })).toBeVisible();
});

test("faq accordion expands cleanly on mobile", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await gotoAndWait(page, "/faqs-1");
  await page.getByRole("button", { name: /what is included/i }).click();
  await expect(
    page.getByText(/hands-on dental assisting training/i),
  ).toBeVisible();

  const scan = await getLayoutScan(page);
  expect(scan.overflowX).toBeLessThanOrEqual(0);
  expect(scan.offscreen).toEqual([]);
});

test("key public pages use academy photography for main imagery", async ({ page }) => {
  for (const path of ["/", "/photos", "/m/login"]) {
    await gotoAndWait(page, path);

    const academyImageCount = await page.evaluate(() => {
      const images = Array.from(document.querySelectorAll<HTMLImageElement>("main img"));
      return images.filter((image) => {
        const candidates = [
          image.currentSrc,
          image.src,
          image.getAttribute("src") ?? "",
          image.getAttribute("data-nimg") ?? "",
        ];

        return candidates.some((value) => {
          if (!value) return false;
          const decoded = decodeURIComponent(value);
          return decoded.includes("/assets/academy/");
        });
      }).length;
    });

    expect(academyImageCount, `${path} should render academy photography`).toBeGreaterThan(0);
  }
});
