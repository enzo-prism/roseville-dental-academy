import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

import { ACTIVATE_USAGE, MIGRATE_USAGE, VERIFY_USAGE } from "./cli-args.mjs";
import {
  ENROLLMENT_WEBHOOK_EVENTS,
  activateEnrollmentPilotWebhook,
  assertTestOrigin,
  assertTestStripeKey,
  eventsMatch,
  findEnrollmentWebhooks,
  parseActivateArgs,
  webhookUrlForOrigin,
} from "./enrollment-pilot-activate.mjs";
import { parseVerifyArgs } from "./enrollment-pilot-verify.mjs";
import { parseMigratorArgs } from "./migrate-attribution.mjs";

const origin = "https://rda-preview.example";
const url = `${origin}/api/enrollment/webhook`;
const key = "sk_test_fixturekey";
const endpoint = {
  id: "we_test_existing",
  url,
  enabled_events: [...ENROLLMENT_WEBHOOK_EVENTS],
  status: "enabled",
  livemode: false,
};

function mockStripe({ list = [], create, update } = {}) {
  const calls = { list: 0, create: [], update: [] };
  return {
    calls,
    client: {
      async listWebhookEndpoints() {
        calls.list += 1;
        return list;
      },
      async createWebhookEndpoint(input) {
        calls.create.push(input);
        if (create) return create(input);
        return {
          id: "we_test_created",
          url: input.url,
          enabled_events: input.enabled_events,
          status: "enabled",
          livemode: false,
          secret: "whsec_fixtureonce",
        };
      },
      async updateWebhookEndpoint(id, input) {
        calls.update.push({ id, input });
        if (update) return update(id, input);
        return { ...endpoint, id, status: input.disabled ? "disabled" : "enabled" };
      },
    },
  };
}

test("key guard accepts only sk_test_ and rk_test_ and never calls Stripe for live keys", async () => {
  const { client, calls } = mockStripe();
  for (const live of ["sk_live_fixture", "rk_live_fixture", " sk_live_fixture "]) {
    assert.throws(() => assertTestStripeKey(live), /Live Stripe keys are refused/);
    await assert.rejects(
      activateEnrollmentPilotWebhook({ key: live, origin, stripe: client }),
      /Live Stripe keys are refused/,
    );
  }
  assert.equal(calls.list, 0);
  assert.equal(calls.create.length, 0);
  assert.equal(assertTestStripeKey("sk_test_abc"), "sk_test_abc");
  assert.equal(assertTestStripeKey(" rk_test_abc "), "rk_test_abc");
  for (const invalid of ["", "pk_test_abc", "sk_test_", "not-a-key", "sk_test_abc.def"]) {
    assert.throws(() => assertTestStripeKey(invalid), /must be a Stripe test key/);
  }
});

test("origin must be an exact https origin and maps to the enrollment webhook path", () => {
  assert.equal(webhookUrlForOrigin(origin), url);
  assert.equal(assertTestOrigin("http://127.0.0.1:3000"), "http://127.0.0.1:3000");
  for (const bad of ["https://example.test/", "https://example.test/path", "http://example.test", "https://user:pass@example.test"]) {
    assert.throws(() => assertTestOrigin(bad));
  }
});

test("event matching is order-independent and rejects extras or omissions", () => {
  assert.equal(eventsMatch([...ENROLLMENT_WEBHOOK_EVENTS].reverse()), true);
  assert.equal(eventsMatch(["checkout.session.completed"]), false);
  assert.equal(eventsMatch([...ENROLLMENT_WEBHOOK_EVENTS, "charge.succeeded"]), false);
  assert.equal(eventsMatch(["*"]), false);
});

test("creates the webhook only when missing and prints the signing secret once", async () => {
  const { client, calls } = mockStripe();
  const printed = [];
  const created = await activateEnrollmentPilotWebhook({
    key, origin, stripe: client, writeSecret: (secret) => printed.push(secret),
  });
  assert.equal(created.action, "created");
  assert.equal(created.secretPrinted, true);
  assert.equal("secret" in created, false);
  assert.deepEqual(printed, ["whsec_fixtureonce"]);
  assert.equal(calls.create.length, 1);
  assert.deepEqual(calls.create[0].enabled_events, ENROLLMENT_WEBHOOK_EVENTS);
  assert.equal(calls.create[0].url, url);
});

test("idempotent activate reuses an exact existing endpoint and does not create or print a secret", async () => {
  const { client, calls } = mockStripe({ list: [endpoint] });
  const printed = [];
  const report = await activateEnrollmentPilotWebhook({
    key, origin, stripe: client, writeSecret: (secret) => printed.push(secret),
  });
  assert.equal(report.action, "exists");
  assert.equal(report.endpointId, "we_test_existing");
  assert.equal(report.secretPrinted, false);
  assert.deepEqual(printed, []);
  assert.equal(calls.create.length, 0);
  assert.equal(calls.update.length, 0);
});

test("existing endpoint with different events fails closed without creating another", async () => {
  const { client, calls } = mockStripe({
    list: [{ ...endpoint, enabled_events: ["checkout.session.completed"] }],
  });
  await assert.rejects(
    activateEnrollmentPilotWebhook({ key, origin, stripe: client }),
    /does not listen for exactly/,
  );
  assert.equal(calls.create.length, 0);
});

test("dry-run never creates, updates, or prints a secret", async () => {
  const missing = mockStripe();
  const existing = mockStripe({ list: [endpoint] });
  const printed = [];
  const wouldCreate = await activateEnrollmentPilotWebhook({
    key, origin, stripe: missing.client, dryRun: true, writeSecret: (secret) => printed.push(secret),
  });
  const wouldKeep = await activateEnrollmentPilotWebhook({
    key, origin, stripe: existing.client, dryRun: true, writeSecret: (secret) => printed.push(secret),
  });
  assert.equal(wouldCreate.action, "would_create");
  assert.equal(wouldKeep.action, "exists");
  assert.deepEqual(printed, []);
  assert.equal(missing.calls.create.length, 0);
  assert.equal(existing.calls.update.length, 0);
});

test("disable and re-enable are idempotent against the matching test endpoint", async () => {
  const enabled = mockStripe({ list: [endpoint] });
  const disabled = mockStripe({ list: [{ ...endpoint, status: "disabled" }] });
  const missing = mockStripe();
  const disabledReport = await activateEnrollmentPilotWebhook({
    key, origin, stripe: enabled.client, disable: true,
  });
  const already = await activateEnrollmentPilotWebhook({
    key, origin, stripe: disabled.client, disable: true,
  });
  const enabledReport = await activateEnrollmentPilotWebhook({
    key, origin, stripe: disabled.client,
  });
  const absent = await activateEnrollmentPilotWebhook({
    key, origin, stripe: missing.client, disable: true,
  });
  assert.equal(disabledReport.action, "disabled");
  assert.equal(already.action, "already_disabled");
  assert.equal(enabledReport.action, "enabled");
  assert.equal(absent.action, "absent");
  assert.equal(enabled.calls.create.length, 0);
  assert.deepEqual(enabled.calls.update[0], { id: "we_test_existing", input: { disabled: true } });
  assert.deepEqual(disabled.calls.update[0], { id: "we_test_existing", input: { disabled: false } });
});

test("duplicate URLs, live responses, and trailing-slash aliases fail closed", async () => {
  await assert.rejects(
    activateEnrollmentPilotWebhook({
      key, origin, stripe: mockStripe({ list: [endpoint, { ...endpoint, id: "we_test_other" }] }).client,
    }),
    /Multiple webhook endpoints/,
  );
  await assert.rejects(
    activateEnrollmentPilotWebhook({
      key, origin, stripe: mockStripe({ list: [{ ...endpoint, livemode: true }] }).client,
    }),
    /Non-test/,
  );
  const { client, calls } = mockStripe({
    list: [{ ...endpoint, url: `${url}/` }],
  });
  const report = await activateEnrollmentPilotWebhook({ key, origin, stripe: client });
  assert.equal(report.action, "exists");
  assert.equal(calls.create.length, 0);
});

test("CLI args read the test key and origin without writing secrets", () => {
  const env = { RDA_STRIPE_TEST_SECRET_KEY: key, RDA_ENROLLMENT_TEST_ORIGIN: "https://ignored.example" };
  const parsed = parseActivateArgs(["--dry-run", "--origin", "https://preview.example"], env);
  assert.deepEqual(parsed, {
    dryRun: true,
    disable: false,
    origin: "https://preview.example",
    key,
  });
  assert.deepEqual(
    parseActivateArgs(["--", "--disable", "--origin=https://preview.example"], env),
    { dryRun: false, disable: true, origin: "https://preview.example", key },
  );
  assert.deepEqual(parseMigratorArgs(["--", "--check"]), { check: true, dryRun: false });
  assert.deepEqual(parseMigratorArgs(["--dry-run"]), { check: false, dryRun: true });
  parseVerifyArgs([]);
  parseVerifyArgs(["--"]);
  assert.deepEqual(
    findEnrollmentWebhooks([{ url: `${url}/` }, { url: "https://other.example/api/enrollment/webhook" }], url).map((item) => item.url),
    [`${url}/`],
  );
});

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const unknownArgs = ["--dryrun", "--chek", "--disabl", "stray-positional"];
const cliScripts = [
  { file: "enrollment-pilot-activate.mjs", parse: (argv) => parseActivateArgs(argv, { RDA_STRIPE_TEST_SECRET_KEY: key }), usage: ACTIVATE_USAGE },
  { file: "migrate-attribution.mjs", parse: parseMigratorArgs, usage: MIGRATE_USAGE },
  { file: "enrollment-pilot-verify.mjs", parse: parseVerifyArgs, usage: VERIFY_USAGE },
];

async function runCli(scriptName, args) {
  const dir = await mkdtemp(join(tmpdir(), "rda-cli-"));
  const logPath = join(dir, "network.json");
  try {
    const child = spawn(
      process.execPath,
      ["--import", join(root, "scripts/cli-network-stub.mjs"), join(root, "scripts", scriptName), ...args],
      {
        cwd: root,
        env: {
          ...process.env,
          RDA_CLI_NETWORK_LOG: logPath,
          RDA_STRIPE_TEST_SECRET_KEY: "sk_test_fixturekey",
          RDA_STRIPE_TEST_WEBHOOK_SECRET: "whsec_fixture",
          RDA_ENROLLMENT_TEST_ORIGIN: "https://rda-preview.example",
          DATABASE_URL: "postgres://fixture:fixture@127.0.0.1:1/never",
        },
      },
    );
    let stdout = "";
    let stderr = "";
    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk) => {
      stdout += chunk;
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk;
    });
    const status = await new Promise((resolve, reject) => {
      child.on("error", reject);
      child.on("close", resolve);
    });
    let networkCalls = [];
    try {
      networkCalls = JSON.parse((await readFile(logPath, "utf8")).trim() || "[]");
    } catch {
      networkCalls = [];
    }
    return { status, stdout, stderr, networkCalls };
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

for (const script of cliScripts) {
  for (const arg of unknownArgs) {
    test(`${script.file} rejects ${arg} with no fetch or database calls`, async () => {
      assert.throws(() => script.parse([arg]), { message: script.usage });
      const result = await runCli(script.file, [arg]);
      assert.equal(result.status, 1);
      assert.equal(result.stderr.trim(), script.usage);
      assert.doesNotMatch(result.stdout, /whsec_/);
      assert.deepEqual(result.networkCalls, []);
    });
  }
}

test("valid activate and migrate flags still parse after the pnpm -- separator", () => {
  const env = { RDA_STRIPE_TEST_SECRET_KEY: key, RDA_ENROLLMENT_TEST_ORIGIN: origin };
  assert.deepEqual(parseActivateArgs(["--", "--dry-run"], env), { dryRun: true, disable: false, origin, key });
  assert.deepEqual(parseActivateArgs(["--disable"], env), { dryRun: false, disable: true, origin, key });
  assert.deepEqual(parseMigratorArgs(["--", "--dry-run", "--check"]), { check: true, dryRun: true });
});

test("migrate --dry-run lists files without connecting", async () => {
  const result = await runCli("migrate-attribution.mjs", ["--", "--dry-run"]);
  assert.equal(result.status, 0);
  const report = JSON.parse(result.stdout);
  assert.equal(report.dryRun, true);
  assert.equal(report.changed, false);
  assert.equal(report.migrations.includes("004_enrollment_test_pilot.sql"), true);
  assert.deepEqual(result.networkCalls, []);
});
