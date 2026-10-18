import { expect, test } from "@playwright/test";

import { suppressSitePromo } from "./support/qa-helpers";

test.beforeEach(async ({ context }) => {
  await suppressSitePromo(context);
});

for (const width of [390, 1280]) {
  test(`academy media loads and preserves full photo framing at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    for (const path of ["/", "/photos", "/dental-assisting-program", "/meet-the-instructors", "/instagram"]) {
      await page.goto(path, { waitUntil: "domcontentloaded" });
      const images = page.locator('[data-rda-academy-media] img, [data-rda-gallery-instagram="true"] img');
      for (const image of await images.all()) {
        if (!(await image.isVisible())) continue;
        await image.scrollIntoViewIfNeeded();
        await expect.poll(() => image.evaluate((node: HTMLImageElement) => node.complete && node.naturalWidth > 0)).toBe(true);
        await expect(image).toHaveCSS("object-fit", "contain");
      }
      expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
    }
  });
}

test("all six curated reels decode, seek, and load captions without Instagram requests", async ({ page }) => {
  const remoteMediaRequests: string[] = [];
  page.on("request", (request) => {
    if (/cdninstagram|fbcdn|instagram\.com/.test(request.url())) remoteMediaRequests.push(request.url());
  });
  await page.goto("/photos", { waitUntil: "domcontentloaded" });
  const videos = page.locator('[data-rda-academy-media="academy-training-videos"] video');
  await expect(videos).toHaveCount(6);
  for (const video of await videos.all()) {
    await expect(video).toHaveAttribute("preload", "none");
    await expect(video).toHaveAttribute("controls", "");
    await expect(video).not.toHaveAttribute("autoplay", "");
    const poster = await video.getAttribute("poster");
    expect(poster).toBeTruthy();
    expect((await page.request.get(poster!)).ok()).toBe(true);
    const track = video.locator('track[kind="captions"]');
    expect((await page.request.get((await track.getAttribute("src"))!)).ok()).toBe(true);
    await video.scrollIntoViewIfNeeded();
    await video.evaluate(async (node: HTMLVideoElement) => { node.muted = true; await node.play(); });
    await expect.poll(() => video.evaluate((node: HTMLVideoElement) => node.currentTime)).toBeGreaterThan(0);
    const duration = await video.evaluate((node: HTMLVideoElement) => node.duration);
    expect(duration).toBeGreaterThan(5);
    await video.evaluate((node: HTMLVideoElement) => { node.currentTime = node.duration / 2; });
    await expect.poll(() => video.evaluate((node: HTMLVideoElement) => !node.seeking && node.readyState >= 2)).toBe(true);
    await expect.poll(() => track.evaluate((node: HTMLTrackElement) => node.readyState)).toBe(2);
    expect(await track.evaluate((node: HTMLTrackElement) => node.track.cues?.length ?? 0)).toBeGreaterThan(0);
    expect(await video.evaluate((node: HTMLVideoElement) => node.error)).toBeNull();
    await video.evaluate((node: HTMLVideoElement) => node.pause());
  }
  expect(remoteMediaRequests).toEqual([]);
});

test("Instagram refresh keeps historical posts and new media source links", async ({ page }) => {
  await page.goto("/instagram");
  await expect(page.locator('[data-rda-social-post-card="instagram"]')).toHaveCount(19);
  await expect(page.locator('[data-rda-social-post-card="instagram"]').first()).toHaveAttribute("data-rda-social-post-url", /DdusCGsR_Ar/);
  const firstPhoto = page.locator('[data-rda-social-post-card="instagram"] img').first();
  await expect(firstPhoto).toHaveCSS("object-fit", "contain");
});
