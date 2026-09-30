// Local integration harness only. This file is never imported by the application.
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
if (process.env.RDA_ENROLLMENT_FIXTURE_MODE !== "local-only"
  || process.env.DATABASE_URL !== "postgres://fixture:fixture@db.fixture.neon.tech/test"
  || process.env.RDA_STRIPE_TEST_SECRET_KEY !== "sk_test_fixture"
  || !/^http:\/\/127\.0\.0\.1:\d+$/.test(process.env.RDA_ENROLLMENT_TEST_ORIGIN ?? "")) {
  throw new Error("Enrollment fixture requires isolated local-only configuration");
}
const db = await PGlite.create();
await db.exec(await readFile(new URL("../db/migrations/004_enrollment_test_pilot.sql", import.meta.url), "utf8"));
const sessions = new Map(); const keys = new Map();
const originalFetch = globalThis.fetch;
async function fixtureControls() {
  try { return JSON.parse(await readFile(process.env.RDA_ENROLLMENT_FIXTURE_FILE, "utf8")); } catch { return {}; }
}
globalThis.fetch = async (input, init = {}) => {
  const url = new URL(input instanceof Request ? input.url : String(input));
  const requestInit = input instanceof Request ? { method: input.method, headers: input.headers, body: input.method !== "GET" && input.method !== "HEAD" ? await input.clone().text() : undefined, ...init } : init;
  init = requestInit;
  if (["db.fixture.neon.tech", "api.fixture.neon.tech"].includes(url.hostname)) {
    try {
      const { query, params } = JSON.parse(init.body);
      const result = await db.query(query, params);
      return Response.json({ ...result, rows: result.rows.map((row) => result.fields.map(({ name, dataTypeID }) => {
        const value = row[name]; if (value === null) return null;
        if (dataTypeID === 16) return value ? "t" : "f";
        if (value instanceof Date) return value.toISOString(); return String(value);
      })) });
    } catch (error) { return Response.json({ message: error.message }, { status: 400 }); }
  }
  if (url.hostname === "api.stripe.com") {
    const control = await fixtureControls();
    if (init.method === "POST" && url.pathname === "/v1/checkout/sessions") {
      const key = new Headers(init.headers).get("Idempotency-Key"), raw = String(init.body);
      if (keys.has(key)) {
        const existing = keys.get(key); if (existing.raw !== raw) return Response.json({ error: "idempotency conflict" }, { status: 409 });
        return Response.json(sessions.get(existing.id));
      }
      const params = new URLSearchParams(raw); const id = `cs_test_fixture${sessions.size + 1}`;
      const session = { id, object: "checkout.session", livemode: false, mode: params.get("mode"), amount_total: Number(params.get("line_items[0][price_data][unit_amount]")),
        currency: params.get("line_items[0][price_data][currency]"), status: "open", payment_status: "unpaid", expires_at: Number(params.get("expires_at")),
        url: `https://checkout.stripe.com/c/pay/${id}`, client_reference_id: params.get("client_reference_id"),
        metadata: Object.fromEntries(["hold_id","course_date","pilot","policy_version"].map((name) => [name, params.get(`metadata[${name}]`)])) };
      sessions.set(id, session); keys.set(key, { id, raw });
      if (control.lostResponse) throw new Error("Fixture lost response after Stripe persisted session");
      return Response.json(session);
    }
    const id = url.pathname.split("/")[4];
    if (id && sessions.has(id)) {
      const session = sessions.get(id);
      if (url.pathname.endsWith("/expire")) { session.status = "expired"; session.payment_status = "unpaid"; }
      else if (control.status) { session.status = control.status; session.payment_status = control.status === "complete" ? "paid" : "unpaid"; }
      return Response.json({ ...session, ...(control.amount !== undefined ? { amount_total: control.amount } : {}), ...(control.livemode !== undefined ? { livemode: control.livemode } : {}) });
    }
    if (url.pathname === "/v1/checkout/sessions") return Response.json({ object: "list", data: [...sessions.values()], has_more: false });
    return Response.json({ error: "not found" }, { status: 404 });
  }
  return originalFetch(input, init);
};
