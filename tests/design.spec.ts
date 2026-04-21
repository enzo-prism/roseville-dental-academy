import { expect, test, type Page } from "@playwright/test";

const routes = [
  { path: "/", label: "home" },
  { path: "/registration", label: "registration" },
  { path: "/dental-assisting-program", label: "dental-assisting-program" },
  { path: "/front-office-program", label: "front-office-program" },
  { path: "/faqs-1", label: "faqs-1" },
  { path: "/meet-the-instructors", label: "meet-the-instructors" },
  { path: "/photos", label: "photos" },
  { path: "/resume-portal-dr-oms-only", label: "student-portal" },
  { path: "/m/login", label: "m-login" },
] as const;

const devices = [
  { name: "mobile", width: 390, height: 844, maxStickyHeight: 136 },
  { name: "tablet", width: 768, height: 1024, maxStickyHeight: 120 },
  { name: "desktop", width: 1280, height: 900, maxStickyHeight: 110 },
  { name: "widescreen", width: 1440, height: 960, maxStickyHeight: 110 },
] as const;

const bannedCopy = [
  "the redesign",
  "cleaner hierarchy",
  "live site",
  "cleaner static shell",
  "current site already sells",
] as const;

async function gotoAndWait(page: Page, path: string) {
  const response = await page.goto(path, { waitUntil: "domcontentloaded" });
  expect(response, `${path} did not return a document response`).not.toBeNull();
  expect(response?.status(), `${path} returned ${response?.status()}`).toBeLessThan(400);

  await expect(
    page.getByRole("link", { name: /Roseville Dental Academy/i }).first(),
  ).toBeVisible();
  await expect(page.locator("main")).toBeVisible();
  await page.waitForLoadState("load");

  const mainImages = page.locator("main img");
  if ((await mainImages.count()) > 0) {
    await expect(mainImages.first()).toBeVisible();
  }

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
      expect(
        scan.offscreen,
        `${route.label} has offscreen critical elements on ${device.name}`,
      ).toEqual([]);
    });
  }
}

test("desktop navigation is simplified and student portal CTA points to the public hub", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await gotoAndWait(page, "/");

  const header = page.locator("header").first();

  await expect(header.getByRole("button", { name: "Programs" })).toBeVisible();
  await expect(
    header.getByRole("button", { name: "Stand-alone Courses" }),
  ).toBeVisible();
  await expect(header.getByRole("link", { name: "Admissions" })).toBeVisible();
  await expect(header.getByRole("link", { name: "Contact" })).toBeVisible();
  await expect(header.getByRole("button", { name: "More" })).toHaveCount(0);
  await expect(header.getByText("Resume Portal DR/OMS only")).toHaveCount(0);
  await expect(header.getByRole("link", { name: "Student portal" })).toHaveAttribute(
    "href",
    "/resume-portal-dr-oms-only",
  );
});

test("mobile nav sheet keeps grouped navigation and resources visible", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await gotoAndWait(page, "/");
  await page.getByRole("button", { name: "Open navigation" }).click();

  const dialog = page.getByRole("dialog");

  await expect(dialog).toBeVisible();
  await expect(dialog.getByText("Primary")).toBeVisible();
  await expect(dialog.getByRole("link", { name: "Admissions" })).toBeVisible();
  await expect(dialog.getByRole("link", { name: "Contact" })).toBeVisible();
  await expect(dialog.getByRole("link", { name: "Start registration" })).toBeVisible();
  await expect(dialog.getByRole("link", { name: "Student portal" })).toBeVisible();
  await expect(dialog.getByText("Resume Portal DR/OMS only")).toHaveCount(0);

  await dialog.getByRole("button", { name: "Programs" }).click();
  await expect(dialog.getByRole("link", { name: "Dental Assisting Program" })).toBeVisible();

  await dialog.getByRole("button", { name: "Stand-alone Courses" }).click();
  await expect(dialog.getByRole("link", { name: "BLS / CPR" })).toBeVisible();

  await dialog.getByRole("button", { name: "Resources" }).click();
  await expect(dialog.getByRole("link", { name: "Meet the instructors" })).toBeVisible();
  await expect(dialog.getByRole("link", { name: "FAQs" })).toBeVisible();
  await expect(dialog.getByRole("link", { name: "Photos" })).toBeVisible();
});

test("public pages avoid redesign and stale-site copy", async ({ page }) => {
  test.setTimeout(120_000);

  for (const path of [
    "/",
    "/registration",
    "/dental-assisting-program",
    "/front-office-program",
    "/faqs-1",
    "/meet-the-instructors",
    "/photos",
    "/resume-portal-dr-oms-only",
  ]) {
    await gotoAndWait(page, path);
    const text = (await page.locator("main").innerText()).toLowerCase();

    for (const phrase of bannedCopy) {
      expect(text, `${path} should not mention "${phrase}"`).not.toContain(phrase);
    }
  }
});

test("student portal route is a compact public hub without repeated CTA clusters", async ({
  page,
}) => {
  await gotoAndWait(page, "/resume-portal-dr-oms-only");
  const main = page.locator("main");

  await expect(main.getByRole("heading", { name: "Student portal" })).toBeVisible();
  await expect(main.getByRole("link", { name: "Sign in" })).toHaveCount(1);
  await expect(main.getByRole("link", { name: "Create account" })).toHaveCount(1);
  await expect(main.getByRole("link", { name: "Reset password" })).toHaveCount(1);
  await expect(main.locator("input")).toHaveCount(0);
  await expect(main.getByText("Account sign in")).toHaveCount(0);
  await expect(main.getByText("Portal access")).toHaveCount(0);
  await expect(main.getByText("Send a quick note")).toHaveCount(0);
  await expect(main.getByText("Plan your next step")).toHaveCount(0);
});

test("login route stays task-focused with one primary action and related links", async ({
  page,
}) => {
  await gotoAndWait(page, "/m/login");
  const main = page.locator("main");

  await expect(main.getByRole("button", { name: "Sign in" })).toHaveCount(1);
  await expect(main.getByRole("link", { name: "Reset password" })).toHaveCount(1);
  await expect(main.getByRole("link", { name: "Create account" })).toHaveCount(1);
  await expect(main.getByText("Private route")).toHaveCount(0);
  await expect(main.getByText("Send a quick note")).toHaveCount(0);
  await expect(main.getByText("Plan your next step")).toHaveCount(0);
});

test("account creation and reset routes stay single-purpose", async ({ page }) => {
  await gotoAndWait(page, "/m/create-account");
  let main = page.locator("main");
  await expect(main.getByRole("button", { name: "Create account" })).toHaveCount(1);
  await expect(main.getByRole("link", { name: "Sign in" })).toHaveCount(1);
  await expect(main.getByText(/newsletter|promotions/i)).toHaveCount(0);

  await gotoAndWait(page, "/m/reset");
  main = page.locator("main");
  await expect(main.getByRole("button", { name: "Reset password" })).toHaveCount(1);
  await expect(main.getByRole("link", { name: "Back to sign in" })).toHaveCount(1);
  await expect(main.getByText("Send a quick note")).toHaveCount(0);
});

test("protected utility routes read as notices rather than full auth landing pages", async ({
  page,
}) => {
  for (const path of ["/m/bookings", "/m/account"]) {
    await gotoAndWait(page, path);
    const main = page.locator("main");

    await expect(main.getByText("Private route")).toBeVisible();
    await expect(main.getByRole("link", { name: "Sign in" })).toHaveCount(1);
    await expect(main.getByRole("link", { name: "Create account" })).toHaveCount(1);
    await expect(main.locator("input")).toHaveCount(0);
    await expect(main.getByText("Send a quick note")).toHaveCount(0);
  }
});

test("contact blocks are consolidated by page type", async ({ page }) => {
  await gotoAndWait(page, "/");
  await expect(page.locator("main").getByText("Send a quick note")).toBeVisible();

  await gotoAndWait(page, "/registration");
  let main = page.locator("main");
  await expect(main.getByText("Need help before you submit?")).toBeVisible();
  await expect(main.getByText("Send a quick note")).toHaveCount(0);
  await expect(main.getByText("Plan your next step")).toHaveCount(0);

  await gotoAndWait(page, "/dental-assisting-program");
  main = page.locator("main");
  await expect(main.getByText("Send a quick note")).toHaveCount(0);
  await expect(main.getByText("Talk with admissions")).toHaveCount(0);

  await gotoAndWait(page, "/faqs-1");
  main = page.locator("main");
  await expect(main.getByText("Talk with admissions")).toBeVisible();
  await expect(main.getByText("Send a quick note")).toHaveCount(0);

  await gotoAndWait(page, "/photos");
  main = page.locator("main");
  await expect(main.getByText("Talk with admissions")).toBeVisible();
  await expect(main.getByText("Send a quick note")).toHaveCount(0);
});

test("faq accordion expands cleanly on mobile", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await gotoAndWait(page, "/faqs-1");
  await page.getByRole("button", { name: /what is included/i }).click();
  await expect(page.getByText(/hands-on dental assisting training/i)).toBeVisible();

  const scan = await getLayoutScan(page);
  expect(scan.overflowX).toBeLessThanOrEqual(0);
  expect(scan.offscreen).toEqual([]);
});

test("key pages use live-source photography instead of legacy placeholders", async ({ page }) => {
  for (const path of [
    "/",
    "/registration",
    "/dental-assisting-program",
    "/front-office-program",
    "/meet-the-instructors",
    "/photos",
    "/bls-cpr-1",
    "/infection-control",
    "/m/login",
  ]) {
    await gotoAndWait(page, path);

    const imageScan = await page.evaluate(() => {
      const images = Array.from(document.querySelectorAll<HTMLImageElement>("main img"));
      let liveCount = 0;
      let legacyCount = 0;

      for (const image of images) {
        const candidates = [
          image.currentSrc,
          image.src,
          image.getAttribute("src") ?? "",
        ];

        for (const value of candidates) {
          if (!value) continue;
          const decoded = decodeURIComponent(value);
          if (decoded.includes("/assets/live/")) {
            liveCount += 1;
            break;
          }
          if (decoded.includes("/assets/academy/")) {
            legacyCount += 1;
            break;
          }
        }
      }

      return { liveCount, legacyCount };
    });

    expect(
      imageScan.liveCount,
      `${path} should render live-source academy imagery`,
    ).toBeGreaterThan(0);
    expect(
      imageScan.legacyCount,
      `${path} should not render legacy /assets/academy/ placeholders`,
    ).toBe(0);
  }
});
