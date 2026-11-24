import { defineConfig } from "@playwright/test";

const previewOrigin = process.env.PREVIEW_URL?.trim();
const localOrigin = previewOrigin || process.env.LOCAL_ORIGIN || "http://127.0.0.1:3000";
const localUrl = new URL(localOrigin);
const healthcheckUrl = new URL("/manifest.webmanifest", localOrigin).toString();
const serverMode = process.env.PLAYWRIGHT_SERVER_MODE ?? "dev";
const useWebServer = process.env.PLAYWRIGHT_NO_WEBSERVER !== "1" && !previewOrigin;

// Node 24's V8 (13.6) can abort the test worker with SIGTRAP while collecting
// PGlite WASM (`jit_page_->allocations_.erase(addr) == 1`, nodejs/node#66366).
// That is not Chromium, /dev/shm, or worker count: CI already launches Chromium
// with --disable-dev-shm-usage, and this config already pins workers to 1.
// NODE_OPTIONS rejects this V8 flag; Playwright workers inherit process.execArgv
// from child_process.fork, so pushing it here disables wasm code GC in workers.
const wasmCodeGcFlag = "--no-wasm-code-gc";
if (!process.execArgv.includes(wasmCodeGcFlag)) process.execArgv.push(wasmCodeGcFlag);

export default defineConfig({
  testDir: "./tests",
  timeout: 180_000,
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: "list",
  use: {
    baseURL: localOrigin,
    headless: true,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  webServer: useWebServer
    ? {
        command:
          serverMode === "prod"
            ? `pnpm start --hostname ${localUrl.hostname} --port ${localUrl.port || "3000"}`
            : `pnpm dev --hostname ${localUrl.hostname} --port ${localUrl.port || "3000"}`,
        url: healthcheckUrl,
        reuseExistingServer: serverMode !== "prod",
        stdout: "pipe",
        stderr: "pipe",
        timeout: 120_000,
      }
    : undefined,
});
