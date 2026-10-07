import { fileURLToPath } from "node:url";

import { ACTIVATE_USAGE, parseKnownFlags } from "./cli-args.mjs";

export const ENROLLMENT_WEBHOOK_PATH = "/api/enrollment/webhook";
export const ENROLLMENT_WEBHOOK_EVENTS = [
  "checkout.session.completed",
  "checkout.session.expired",
  "checkout.session.async_payment_succeeded",
];
export const STRIPE_API_VERSION = "2025-02-24.acacia";
export const WEBHOOK_DESCRIPTION = "RDA staff-only enrollment TEST pilot";

const LIVE_KEY = /^(sk|rk)_live_/;
const TEST_KEY = /^(sk|rk)_test_[A-Za-z0-9]+$/;

export function assertTestStripeKey(key) {
  const trimmed = typeof key === "string" ? key.trim() : "";
  if (LIVE_KEY.test(trimmed)) {
    throw new Error("Live Stripe keys are refused. Use a test sk_test_ or rk_test_ key only.");
  }
  if (!TEST_KEY.test(trimmed)) {
    throw new Error("RDA_STRIPE_TEST_SECRET_KEY must be a Stripe test key (sk_test_ or rk_test_).");
  }
  return trimmed;
}

export function assertTestOrigin(origin) {
  const trimmed = typeof origin === "string" ? origin.trim() : "";
  let parsed;
  try {
    parsed = new URL(trimmed);
  } catch {
    throw new Error("RDA_ENROLLMENT_TEST_ORIGIN must be an exact origin with no path or trailing slash.");
  }
  if (parsed.origin !== trimmed || parsed.username || parsed.password) {
    throw new Error("RDA_ENROLLMENT_TEST_ORIGIN must be an exact origin with no path or trailing slash.");
  }
  const loopback = parsed.protocol === "http:" && ["localhost", "127.0.0.1"].includes(parsed.hostname);
  if (parsed.protocol !== "https:" && !loopback) {
    throw new Error("RDA_ENROLLMENT_TEST_ORIGIN must be https, or http on localhost.");
  }
  return trimmed;
}

export function webhookUrlForOrigin(origin) {
  return `${assertTestOrigin(origin)}${ENROLLMENT_WEBHOOK_PATH}`;
}

export function normalizeWebhookUrl(url) {
  return String(url ?? "").replace(/\/+$/u, "");
}

export function eventsMatch(actual, expected = ENROLLMENT_WEBHOOK_EVENTS) {
  if (!Array.isArray(actual) || actual.length !== expected.length) return false;
  const left = [...actual].sort();
  const right = [...expected].sort();
  return left.every((event, index) => event === right[index]);
}

export function findEnrollmentWebhooks(endpoints, url) {
  const expected = normalizeWebhookUrl(url);
  return (endpoints ?? []).filter((endpoint) => normalizeWebhookUrl(endpoint.url) === expected);
}

export function parseActivateArgs(argv, env = process.env) {
  const parsed = parseKnownFlags(argv, {
    flags: new Set(["--dry-run", "--disable"]),
    valued: new Set(["--origin"]),
    usage: ACTIVATE_USAGE,
  });
  return {
    dryRun: parsed.flags.has("--dry-run"),
    disable: parsed.flags.has("--disable"),
    origin: parsed.values["--origin"] ?? env.RDA_ENROLLMENT_TEST_ORIGIN,
    key: env.RDA_STRIPE_TEST_SECRET_KEY,
  };
}

export function assertSafeWebhookResponse(payload, label) {
  if (!payload || payload.livemode !== false) {
    throw new Error(`Non-test ${label} rejected.`);
  }
  return payload;
}

function sameEventsOrThrow(endpoint) {
  if (!eventsMatch(endpoint.enabled_events)) {
    throw new Error(
      "An enrollment webhook exists but does not listen for exactly checkout.session.completed, checkout.session.expired, and checkout.session.async_payment_succeeded.",
    );
  }
  return endpoint;
}

export async function activateEnrollmentPilotWebhook({
  key,
  origin,
  stripe,
  dryRun = false,
  disable = false,
  writeSecret = writeWebhookSecret,
}) {
  assertTestStripeKey(key);
  const url = webhookUrlForOrigin(origin);
  if (!stripe) throw new Error("A Stripe test client is required.");
  const endpoints = await stripe.listWebhookEndpoints();
  if (endpoints.some((endpoint) => endpoint.livemode !== false)) {
    throw new Error("Non-test webhook list rejected.");
  }
  const matches = findEnrollmentWebhooks(endpoints, url);
  if (matches.length > 1) {
    throw new Error("Multiple webhook endpoints match the enrollment URL; resolve them in the Stripe test dashboard.");
  }

  if (matches.length === 1) {
    const existing = sameEventsOrThrow(assertSafeWebhookResponse(matches[0], "webhook endpoint"));
    if (disable) {
      if (existing.status === "disabled") {
        return result({ action: "already_disabled", endpointId: existing.id, url, dryRun });
      }
      if (dryRun) return result({ action: "would_disable", endpointId: existing.id, url, dryRun });
      const updated = assertSafeWebhookResponse(
        await stripe.updateWebhookEndpoint(existing.id, { disabled: true }),
        "webhook update",
      );
      return result({ action: "disabled", endpointId: updated.id, url, dryRun: false });
    }
    if (existing.status === "disabled") {
      if (dryRun) return result({ action: "would_enable", endpointId: existing.id, url, dryRun });
      const updated = assertSafeWebhookResponse(
        await stripe.updateWebhookEndpoint(existing.id, { disabled: false }),
        "webhook update",
      );
      return result({ action: "enabled", endpointId: updated.id, url, dryRun: false });
    }
    return result({ action: "exists", endpointId: existing.id, url, dryRun });
  }

  if (disable) {
    return result({ action: "absent", url, dryRun });
  }
  if (dryRun) {
    return result({ action: "would_create", url, dryRun: true });
  }

  const created = assertSafeWebhookResponse(
    await stripe.createWebhookEndpoint({
      url,
      enabled_events: ENROLLMENT_WEBHOOK_EVENTS,
      description: WEBHOOK_DESCRIPTION,
    }),
    "webhook create",
  );
  if (!/^whsec_[A-Za-z0-9]+$/.test(created.secret ?? "")) {
    throw new Error("Stripe did not return a test webhook signing secret.");
  }
  writeSecret(created.secret);
  return result({ action: "created", endpointId: created.id, url, dryRun: false, secretPrinted: true });
}

function result({ action, endpointId, url, dryRun, secretPrinted = false }) {
  return {
    action,
    endpointId: endpointId ?? null,
    url,
    events: ENROLLMENT_WEBHOOK_EVENTS,
    dryRun,
    secretPrinted,
    testOnly: true,
  };
}

export function writeWebhookSecret(secret) {
  process.stdout.write(
    [
      "",
      "Store this signing secret once as RDA_STRIPE_TEST_WEBHOOK_SECRET in Vercel.",
      "Do not paste it into tickets, screenshots, git, or chat logs. It is shown only this once.",
      secret,
      "",
    ].join("\n"),
  );
}

export function createStripeWebhookClient(key) {
  const safeKey = assertTestStripeKey(key);
  return {
    listWebhookEndpoints: () => listWebhookEndpoints(safeKey),
    createWebhookEndpoint: (input) => createWebhookEndpoint(safeKey, input),
    updateWebhookEndpoint: (id, input) => updateWebhookEndpoint(safeKey, id, input),
  };
}

async function stripeRequest(key, method, path, params) {
  assertTestStripeKey(key);
  const body = params ? encodeStripeParams(params) : undefined;
  const response = await fetch(`https://api.stripe.com/v1/${path}`, {
    method,
    cache: "no-store",
    signal: AbortSignal.timeout(15000),
    headers: {
      Authorization: `Bearer ${key}`,
      "Stripe-Version": STRIPE_API_VERSION,
      ...(body ? { "Content-Type": "application/x-www-form-urlencoded" } : {}),
    },
    body,
  });
  if (!response.ok) throw new Error("Stripe test webhook API unavailable");
  return response.json();
}

function encodeStripeParams(params) {
  const body = new URLSearchParams();
  for (const [name, value] of Object.entries(params)) {
    if (Array.isArray(value)) {
      value.forEach((item, index) => body.append(`${name}[${index}]`, String(item)));
    } else if (value !== undefined && value !== null) {
      body.append(name, String(value));
    }
  }
  return body;
}

async function listWebhookEndpoints(key) {
  const collected = [];
  let cursor = "";
  for (let page = 0; page < 10; page += 1) {
    const query = new URLSearchParams({ limit: "100", ...(cursor ? { starting_after: cursor } : {}) });
    const list = await stripeRequest(key, "GET", `webhook_endpoints?${query}`);
    if (list.object !== "list" || !Array.isArray(list.data) || typeof list.has_more !== "boolean") {
      throw new Error("Invalid test webhook list.");
    }
    collected.push(...list.data);
    if (!list.has_more) return collected;
    cursor = list.data.at(-1)?.id ?? "";
    if (!cursor) throw new Error("Invalid test webhook pagination.");
  }
  throw new Error("Webhook list requires administrator review.");
}

async function createWebhookEndpoint(key, input) {
  return stripeRequest(key, "POST", "webhook_endpoints", {
    url: input.url,
    description: input.description,
    enabled_events: input.enabled_events,
  });
}

async function updateWebhookEndpoint(key, id, input) {
  if (!/^we_[A-Za-z0-9]+$/.test(id)) throw new Error("Invalid webhook endpoint.");
  return stripeRequest(key, "POST", `webhook_endpoints/${encodeURIComponent(id)}`, {
    disabled: input.disabled,
  });
}

async function main() {
  const options = parseActivateArgs(process.argv.slice(2));
  const report = await activateEnrollmentPilotWebhook({
    ...options,
    stripe: createStripeWebhookClient(options.key),
  });
  console.log(JSON.stringify(report));
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : "Enrollment pilot activation failed");
    process.exitCode = 1;
  });
}
