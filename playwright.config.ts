import { defineConfig } from "@playwright/test";

const previewOrigin = process.env.PREVIEW_URL?.trim();
const localOrigin = previewOrigin || process.env.LOCAL_ORIGIN || "http://127.0.0.1:3000";
const localUrl = new URL(localOrigin);
const healthcheckUrl = new URL("/manifest.webmanifest", localOrigin).toString();
const serverMode = process.env.PLAYWRIGHT_SERVER_MODE ?? "dev";
const useWebServer = process.env.PLAYWRIGHT_NO_WEBSERVER !== "1" && !previewOrigin;

export default defineConfig({
  testDir: "./tests",
  timeout: 180_000,
  fullyParallel: false,
  workers: 1,
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
