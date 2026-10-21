// Deterministic local full-stack proof. Never loads real credentials or a real database.
import { spawn } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
const root = resolve(import.meta.dirname, "..");
const output = resolve(root, process.argv.includes("--serve")
  ? "dogfood-output/student-enrollment-preview"
  : "dogfood-output/student-enrollment");
await mkdir(output, { recursive: true });
const env = { ...process.env };
for (const name of Object.keys(env))
  if (/^(RDA_|STRIPE_|NEXT_PUBLIC_|DATABASE_URL$|NODE_OPTIONS$)/.test(name))
    delete env[name];
const port = process.env.STUDENT_FIXTURE_PORT ?? "3117";
if (!/^\d{4,5}$/.test(port)) throw new Error("Invalid local fixture port");
Object.assign(env, {
  DATABASE_URL: "postgres://fixture:fixture@db.fixture.neon.tech/test",
  RDA_ENROLLMENT_FIXTURE_MODE: "local-only",
  RDA_ENROLLMENT_PILOT_PASSWORD: "fixture-staff-password-long",
  RDA_ENROLLMENT_PILOT_SESSION_SECRET:
    "fixture-staff-session-secret-xxxxxxxxxxxxxxxx",
  RDA_ENROLLMENT_TEST_ORIGIN: `http://127.0.0.1:${port}`,
  RDA_STRIPE_TEST_SECRET_KEY: "sk_test_fixture",
  RDA_STRIPE_TEST_WEBHOOK_SECRET: "whsec_fixture",
  RDA_STUDENT_PAYMENTS_MODE: "test",
  RDA_STUDENT_PAYMENTS_ORIGIN: `http://127.0.0.1:${port}`,
  RDA_STUDENT_STRIPE_TEST_KEY: "sk_test_fixture",
  RDA_STUDENT_STRIPE_TEST_WEBHOOK_SECRET: "whsec_fixture",
  RDA_STUDENT_STRIPE_ACCOUNT_ID: "acct_fixture",
  RDA_ENROLLMENT_FIXTURE_FILE: resolve(output, "controls.json"),
  RDA_ENROLLMENT_FIXTURE_EVIDENCE: resolve(output, "evidence.json"),
  ENROLLMENT_FIXTURE_TESTS: "1",
  PLAYWRIGHT_NO_WEBSERVER: "1",
  LOCAL_ORIGIN: `http://127.0.0.1:${port}`,
});
await writeFile(env.RDA_ENROLLMENT_FIXTURE_FILE, "{}");
const server = spawn(
  process.execPath,
  [
    "--import",
    resolve(root, "scripts/enrollment-fixture-preload.mjs"),
    resolve(root, "node_modules/next/dist/bin/next"),
    "start",
    "--hostname",
    "127.0.0.1",
    "--port",
    port,
  ],
  { cwd: root, env, stdio: "inherit" },
);
const stop = () => server.kill("SIGTERM");
process.on("SIGINT", stop);
process.on("SIGTERM", stop);
let ready = false;
try {
  for (let i = 0; i < 120; i++) {
    if (server.exitCode !== null) throw new Error("Fixture server exited");
    try {
      if ((await fetch(`${env.LOCAL_ORIGIN}/manifest.webmanifest`)).ok) {
        ready = true;
        break;
      }
    } catch {}
    await new Promise((r) => setTimeout(r, 500));
  }
  if (!ready) throw new Error("Local fixture server did not become ready");
  if (process.argv.includes("--serve")) {
    console.log(
      `Isolated synthetic enrollment preview: ${env.LOCAL_ORIGIN}/enroll`,
    );
    await new Promise((r) => server.once("exit", r));
  } else {
    const tests = spawn(
      process.execPath,
      [
        resolve(root, "node_modules/@playwright/test/cli.js"),
        "test",
        "--output=dogfood-output/student-enrollment/playwright",
        "tests/enrollment-contract.spec.ts",
        "tests/enrollment-ledger.spec.ts",
        "tests/enrollment-api.spec.ts",
        "tests/student-enrollment.spec.ts",
        "tests/student-enrollment-api.spec.ts",
        "tests/student-enrollment-mail.spec.ts",
        "tests/student-enrollment-webhook-off.spec.ts",
      ],
      { cwd: root, env, stdio: "inherit" },
    );
    process.exitCode = await new Promise((r) =>
      tests.once("exit", (code) => r(code ?? 1)),
    );
  }
} finally {
  stop();
}
