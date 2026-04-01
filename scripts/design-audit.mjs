import fs from "node:fs/promises";
import path from "node:path";

import { chromium } from "playwright";

const baseUrl = process.env.DESIGN_AUDIT_BASE_URL ?? "http://127.0.0.1:3000";
const outputDir = path.resolve("research/design-audit");
const screenshotDir = path.join(outputDir, "screenshots");

const routes = [
  { slug: "", label: "home" },
  { slug: "registration", label: "registration" },
  { slug: "dental-assisting-program", label: "dental-assisting-program" },
  { slug: "front-office-program", label: "front-office-program" },
  { slug: "faqs-1", label: "faqs-1" },
  { slug: "photos", label: "photos" },
  { slug: "m/login", label: "m-login" },
];

const devices = [
  { name: "mobile", width: 390, height: 844 },
  { name: "tablet", width: 768, height: 1024 },
  { name: "desktop", width: 1280, height: 900 },
  { name: "wide", width: 1440, height: 900 },
];

const selector = [
  "a",
  "button",
  "input",
  "textarea",
  "[role='button']",
  "[role='link']",
  "[role='combobox']",
  "h1",
  "h2",
  "h3",
  "fieldset",
  "form",
  "[data-slot='button-group']",
  "[data-slot='card']",
].join(",");

async function ensureDir(dir) {
  await fs.mkdir(dir, { recursive: true });
}

async function auditPage(page, route, device) {
  const href = route.slug ? `${baseUrl}/${route.slug}` : baseUrl;
  await page.setViewportSize({ width: device.width, height: device.height });
  await page.goto(href, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1200);

  const screenshotPath = path.join(
    screenshotDir,
    `${route.label}-${device.name}.png`,
  );

  await page.screenshot({ fullPage: true, path: screenshotPath });

  const result = await page.evaluate((scanSelector) => {
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const doc = document.documentElement;
    const body = document.body;

    function isVisible(el) {
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

    const overflowIssues = [];
    const candidates = Array.from(document.querySelectorAll(scanSelector));

    for (const el of candidates) {
      if (!(el instanceof HTMLElement) || !isVisible(el)) {
        continue;
      }

      const rect = el.getBoundingClientRect();
      const style = window.getComputedStyle(el);
      const text = el.innerText.replace(/\s+/g, " ").trim().slice(0, 120);
      const label = text || el.getAttribute("aria-label") || el.tagName.toLowerCase();

      if (style.position === "fixed" && rect.width >= viewportWidth - 2) {
        continue;
      }

      if (rect.left < -1 || rect.right > viewportWidth + 1) {
        overflowIssues.push({
          label,
          left: Math.round(rect.left),
          right: Math.round(rect.right),
          width: Math.round(rect.width),
          tag: el.tagName.toLowerCase(),
        });
      }
    }

    const sticky = Array.from(document.querySelectorAll("*"))
      .filter((node) => node instanceof HTMLElement)
      .find((node) => window.getComputedStyle(node).position === "sticky");

    const firstHeading = document.querySelector("main h1");
    const stickyRect =
      sticky instanceof HTMLElement ? sticky.getBoundingClientRect() : null;
    const headingRect =
      firstHeading instanceof HTMLElement ? firstHeading.getBoundingClientRect() : null;

    return {
      viewportWidth,
      viewportHeight,
      scrollWidth: doc.scrollWidth,
      clientWidth: doc.clientWidth,
      bodyScrollWidth: body.scrollWidth,
      overflowX: doc.scrollWidth - viewportWidth,
      stickyHeight: stickyRect ? Math.round(stickyRect.height) : null,
      headingTop: headingRect ? Math.round(headingRect.top) : null,
      headerOverlap:
        stickyRect && headingRect ? headingRect.top < stickyRect.bottom - 12 : false,
      overflowIssues: overflowIssues.slice(0, 30),
    };
  }, selector);

  return {
    route: route.label,
    slug: route.slug,
    device: device.name,
    href,
    screenshotPath,
    ...result,
  };
}

async function run() {
  await ensureDir(outputDir);
  await ensureDir(screenshotDir);

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  const report = [];

  for (const route of routes) {
    for (const device of devices) {
      report.push(await auditPage(page, route, device));
    }
  }

  await browser.close();

  const reportPath = path.join(outputDir, "latest.json");
  await fs.writeFile(reportPath, JSON.stringify(report, null, 2));

  const summary = report.map((entry) => ({
    route: entry.route,
    device: entry.device,
    overflowX: entry.overflowX,
    headerOverlap: entry.headerOverlap,
    overflowIssueCount: entry.overflowIssues.length,
  }));

  console.table(summary);
  console.log(`Saved detailed report to ${reportPath}`);
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
