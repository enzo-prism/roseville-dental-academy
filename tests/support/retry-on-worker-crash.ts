import { test } from "@playwright/test";

const lastFailure = new Map<string, string>();

const workerCrash = /worker process exited unexpectedly|signal=SIGTRAP|signal=SIGSEGV|signal=SIGABRT/i;

function testKey(info: { file: string; line: number; title: string }) {
  return `${info.file}:${info.line}:${info.title}`;
}

/**
 * Retry a test in CI only when the Playwright worker aborted (for example Node 24
 * V8 SIGTRAP while PGlite WASM is collected). Assertion and timeout failures are
 * rethrown immediately on the retry so they still fail the gate.
 */
export function retryWorkerCrashesOnly() {
  test.describe.configure({ retries: process.env.CI ? 1 : 0 });

  test.afterEach(({}, testInfo) => {
    const message = [testInfo.error?.message, ...testInfo.errors.map((entry) => entry.message)]
      .filter(Boolean)
      .join("\n");
    if (testInfo.status !== "passed" && message) lastFailure.set(testKey(testInfo), message);
    else lastFailure.delete(testKey(testInfo));
  });

  test.beforeEach(({}, testInfo) => {
    if (testInfo.retry === 0) return;
    const previous = lastFailure.get(testKey(testInfo));
    // A dead worker often skips afterEach, so a missing record is treated as a crash.
    if (previous && !workerCrash.test(previous)) throw new Error(previous);
  });
}
