const assert = require("node:assert/strict");
const fs = require("node:fs");
const Module = require("node:module");
const path = require("node:path");
const test = require("node:test");
const ts = require("typescript");
const React = require("react");
const { renderToStaticMarkup } = require("react-dom/server");
const originalFetch = globalThis.fetch;
globalThis.fetch = () => { throw new Error("Network is disabled in the rendered feed regression"); };
test.after(() => { globalThis.fetch = originalFetch; });

// Load the real server component with React's JSX runtime. The loader exists
// only in this isolated test process; it adds no application dependency.
const root = path.resolve(__dirname, "..");
const originalResolve = Module._resolveFilename;
const extensions = new Map([".ts", ".tsx"].map((ext) => [ext, require.extensions[ext]]));
let SocialMediaGrid;
let socialChannelPages;
try {
  Module._resolveFilename = function(request, ...args) {
    return originalResolve.call(this, request.startsWith("@/") ? path.join(root, request.slice(2)) : request, ...args);
  };
  for (const ext of extensions.keys()) {
    require.extensions[ext] = (module, filename) => {
      const { outputText } = ts.transpileModule(fs.readFileSync(filename, "utf8"), {
        compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
        fileName: filename,
      });
      module._compile(outputText, filename);
    };
  }
  ({ SocialMediaGrid } = require(path.join(root, "components/site/social-media-grid.tsx")));
  ({ socialChannelPages } = require(path.join(root, "lib/social-channel-data.ts")));
} finally {
  Module._resolveFilename = originalResolve;
  for (const [ext, loader] of extensions) {
    if (loader) require.extensions[ext] = loader;
    else delete require.extensions[ext];
  }
}

const instagram = socialChannelPages.find((page) => page.slug === "instagram");
const imagePost = instagram.socialPosts.find((post) => post.mediaType === "image");
const render = (posts) => renderToStaticMarkup(React.createElement(SocialMediaGrid, { page: { ...instagram, socialPosts: posts } }));
const cards = (html) => (html.match(/data-rda-social-post-card="instagram"/g) || []).length;
const group = (html, kind) => html.match(new RegExp(`<details[^>]*data-rda-social-${kind}="instagram"[^>]*>[\\s\\S]*?<\\/details>`))?.[0] || "";
function importedPost(id, publishedAt) {
  return { ...imagePost, editorialPlacement: undefined, localSrc: `/assets/social/instagram/${id}.jpg`, sourceUrl: `https://www.instagram.com/p/${id}/`, title: `Fixture ${id}`, publishedAt };
}

test("rendered feed keeps fresh imports open, older backfills archived and unknown dates qualified", () => {
  const fresh = importedPost("Fresh_import_01", "2026-10-29T12:00:00Z");
  const backfill = importedPost("Older_backfill_01", "2026-09-14T12:00:00Z");
  const unknown = importedPost("Unknown_date_01");
  const malformed = importedPost("Invalid_date_01", "not-a-date");
  const html = render([fresh, backfill, unknown, malformed, ...instagram.socialPosts]);
  const openGrid = html.split("<details")[0];
  assert.ok(openGrid.includes(fresh.sourceUrl), "A fresh non-curated import must be outside collapsed details");
  assert.ok(!openGrid.includes(backfill.sourceUrl), "Older backfills must not be promoted as fresh");
  const archive = group(html, "archive");
  const undated = group(html, "undated");
  assert.equal(cards(archive), 13);
  assert.ok(archive.includes(backfill.sourceUrl));
  assert.equal(cards(undated), 2);
  assert.ok(undated.includes(unknown.sourceUrl) && undated.includes(malformed.sourceUrl));
  assert.ok(undated.includes("Publication dates could not be verified"));
  assert.equal((undated.match(/Date unconfirmed/g) || []).length, 2);
  assert.ok(!/^<details[^>]*\sopen(?:[\s=>])/.test(archive), "The historical archive stays collapsed by default");
});

test("reviewed catalog renders the same six selections and twelve historical posts", () => {
  const html = render(instagram.socialPosts);
  assert.equal(cards(html), 18);
  assert.equal(cards(html.split("<details")[0]), 6);
  assert.equal(cards(group(html, "archive")), 12);
  assert.equal(group(html, "undated"), "");
});
