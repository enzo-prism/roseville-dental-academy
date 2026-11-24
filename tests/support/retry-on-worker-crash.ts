import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { test } from "@playwright/test";

const workerCrash = /worker process exited unexpectedly|signal=SIGTRAP|signal=SIGSEGV|signal=SIGABRT/i;
const storeDir = join(tmpdir(), "rda-pw-worker-crash");

function failureFile(info: { file: string; line: number; title: string; testId: string }) {
  const id = createHash("sha1").update(info.testId || `${info.file}:${info.line}:${info.title}`).digest("hex");
  return join(storeDir, id);
}

function readFailure(info: Parameters<typeof failureFile>[0]) {
  try {
    return readFileSync(failureFile(info), "utf8");
  } catch {
    return undefined;
  }
}

function writeFailure(info: Parameters<typeof failureFile>[0], message: string) {
  mkdirSync(storeDir, { recursive: true });
  writeFileSync(failureFile(info), message);
}

function clearFailure(info: Parameters<typeof failureFile>[0]) {
  rmSync(failureFile(info), { force: true });
}

/**
 * Retry a test in CI only when the Playwright worker aborted (for example Node 24
 * V8 SIGTRAP while PGlite WASM is collected). Playwright recycles the worker after
 * every failure, so the previous error is stored on disk rather than in memory.
 * Assertion and timeout failures are rethrown immediately on the retry.
 */
export function retryWorkerCrashesOnly() {
  test.describe.configure({ retries: process.env.CI ? 1 : 0 });

  test.afterEach(({}, testInfo) => {
    const message = [testInfo.error?.message, ...testInfo.errors.map((entry) => entry.message)]
      .filter(Boolean)
      .join("\n");
    if (testInfo.status !== "passed" && message) writeFailure(testInfo, message);
    else clearFailure(testInfo);
  });

  test.beforeEach(({}, testInfo) => {
    if (testInfo.retry === 0) return;
    const previous = readFailure(testInfo);
    // A dead worker skips afterEach, so a missing record is treated as a crash.
    if (previous && !workerCrash.test(previous)) throw new Error(previous);
  });
}
