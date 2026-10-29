import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import test from "node:test";

const importerUrl = new URL("./import-social-posts.mjs", import.meta.url);
const manifestUrl = new URL("../lib/social-local-media-manifest.json", import.meta.url);

// Exercise the real import loop against the checked-in curated catalog. All I/O
// is isolated in a temporary directory and all downloads use an in-memory stub.
test("Instagram refresh keeps curated posts and captions across URL aliases and repeat feeds", async () => {
  const seed = JSON.parse(await readFile(manifestUrl, "utf8"));
  const originals = seed.posts.filter((post) => post.platform === "instagram");
  const curated = originals.filter((post) => new URL(post.sourceUrl).pathname.startsWith("/rosevilledentalacademy/"));
  assert.ok(curated.length > 0, "Exercise profile-prefixed curated posts from the real catalog");
  assert.ok(curated.some((post) => post.captionsSrc), "Exercise preserved caption files");
  const fixtureRoot = await mkdtemp(join(tmpdir(), "rda-instagram-refresh-"));
  const manifestPath = join(fixtureRoot, "lib/social-local-media-manifest.json");
  const initialCwd = process.cwd();
  const initialFetch = globalThis.fetch;
  const downloads = [];
  const captions = new Map();

  try {
    await mkdir(dirname(manifestPath), { recursive: true });
    await writeFile(manifestPath, JSON.stringify(seed));
    for (const post of curated.filter((post) => post.captionsSrc)) {
      const content = await readFile(new URL(`../public${post.captionsSrc}`, import.meta.url));
      const path = join(fixtureRoot, "public", post.captionsSrc);
      await mkdir(dirname(path), { recursive: true });
      await writeFile(path, content);
      captions.set(path, content);
    }

    const feed = curated.map((post, index) => {
      const url = new URL(post.sourceUrl);
      const shortcode = url.pathname.split("/").filter(Boolean).at(-1);
      const type = post.mediaType === "video" ? "reel" : "p";
      return {
        ...post,
        id: shortcode,
        sourceUrl: `https://${index % 2 ? "" : "www."}instagram.com/${type}/${shortcode}/?fixture=refresh#post`,
        sourceMediaUrl: `https://fixtures.invalid/existing/${shortcode}`,
        sourcePosterUrl: `https://fixtures.invalid/existing/${shortcode}-poster`,
      };
    });
    const newPost = {
      id: "New_refresh_01",
      platform: "instagram",
      mediaType: "image",
      sourceUrl: "https://www.instagram.com/p/New_refresh_01/",
      sourceMediaUrl: "https://fixtures.invalid/new-photo",
      sourcePosterUrl: "https://fixtures.invalid/new-poster",
      publishedAt: "2026-10-29T12:00:00Z",
      title: "New fixture photo",
      alt: "New fixture photo",
    };
    feed.push(newPost, { ...newPost, sourceUrl: "https://instagram.com/rosevilledentalacademy/p/New_refresh_01/?duplicate=true" });
    const held = { ...newPost, id: "DdS81OOBwxd", sourceUrl: "https://www.instagram.com/p/DdS81OOBwxd/", sourceMediaUrl: "https://fixtures.invalid/held-staff-photo" };
    feed.push(held, { ...held, sourceUrl: "https://instagram.com/rosevilledentalacademy/p/DdS81OOBwxd/?alias=true" });
    globalThis.fetch = async (url) => {
      assert.ok(String(url).startsWith("https://fixtures.invalid/"), "No real network is allowed");
      downloads.push(String(url));
      return new Response(new Uint8Array([1, 2, 3]), { status: 200 });
    };
    process.chdir(fixtureRoot);
    const { importInstagram } = await import(importerUrl);
    const first = await importInstagram(async () => feed);
    assert.deepEqual(first.errors, []);
    assert.equal(first.status, "ready");
    assert.ok(!first.posts.some((post) => post.sourceUrl.includes("DdS81OOBwxd")), "The specific held staff photo must not be reimported through either URL form");
    assert.equal(first.posts.length, originals.length + 1, "Existing curated URLs and repeated discovered posts must not duplicate");
    assert.deepEqual(downloads, [newPost.sourceMediaUrl, newPost.sourcePosterUrl], "Only the genuinely new post downloads once");
    for (const original of originals) {
      assert.deepEqual(first.posts.find((post) => post.sourceUrl === original.sourceUrl), original, "Retain original captions and editorial metadata");
    }
    for (const [path, content] of captions) assert.deepEqual(await readFile(path), content);

    const persistedPosts = JSON.parse(JSON.stringify(first.posts));
    await writeFile(manifestPath, JSON.stringify({ ...seed, posts: persistedPosts }));
    downloads.length = 0;
    const second = await importInstagram(async () => feed);
    assert.deepEqual(second.errors, []);
    assert.deepEqual(second.posts, persistedPosts, "A second refresh is idempotent");
    assert.deepEqual(downloads, []);
    for (const [path, content] of captions) assert.deepEqual(await readFile(path), content);
  } finally {
    process.chdir(initialCwd);
    globalThis.fetch = initialFetch;
    await rm(fixtureRoot, { recursive: true, force: true });
  }
});
