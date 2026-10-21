// Local integration harness only. This file is never imported by the application.
import { readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { PGlite } from "@electric-sql/pglite";
if (process.env.RDA_ENROLLMENT_FIXTURE_MODE !== "local-only"
  || process.env.DATABASE_URL !== "postgres://fixture:fixture@db.fixture.neon.tech/test"
  || process.env.RDA_STRIPE_TEST_SECRET_KEY !== "sk_test_fixture"
  || !/^http:\/\/127\.0\.0\.1:\d+$/.test(process.env.RDA_ENROLLMENT_TEST_ORIGIN ?? "")) {
  throw new Error("Enrollment fixture requires isolated local-only configuration");
}
const db = await PGlite.create();
await db.exec(await readFile(new URL("../db/migrations/004_enrollment_test_pilot.sql", import.meta.url), "utf8"));
await db.exec(await readFile(new URL("../db/migrations/005_student_enrollment.sql", import.meta.url), "utf8"));
if (process.env.RDA_STUDENT_PAYMENTS_MODE) {
  if (process.env.RDA_STUDENT_PAYMENTS_MODE !== "test" || process.env.RDA_STUDENT_STRIPE_TEST_KEY !== "sk_test_fixture"
    || process.env.RDA_STUDENT_STRIPE_TEST_WEBHOOK_SECRET !== "whsec_fixture"
    || process.env.RDA_STUDENT_STRIPE_ACCOUNT_ID !== "acct_fixture"
    || process.env.RDA_STUDENT_PAYMENTS_ORIGIN !== process.env.RDA_ENROLLMENT_TEST_ORIGIN
    || process.env.RDA_STUDENT_PAYMENTS_LIVE_ENABLED || process.env.RDA_STUDENT_EMAIL_LIVE_ENABLED
    || process.env.RDA_STUDENT_PAYMENTS_PUBLIC_CTA) throw new Error("Student fixtures require isolated test configuration");
  const source=await readFile(new URL("../lib/academy-policies.ts",import.meta.url),"utf8");
  const paragraphs=[...source.split("export const CANCELLATION_POLICY_PARAGRAPHS = [")[1].split("] as const")[0].matchAll(/"([^"\n]*)"/g)].map(m=>m[1]);
  const hash=createHash("sha256").update(paragraphs.join("\n\n")).digest("hex");
  const parts=new Intl.DateTimeFormat("en-US",{timeZone:"America/Los_Angeles",year:"numeric",month:"2-digit",day:"2-digit"}).formatToParts(new Date());
  const part=(type)=>parts.find((item)=>item.type===type)?.value;
  const today=`${part("year")}-${part("month")}-${part("day")}`;
  const addDays=(iso,days)=>{const [year,month,day]=iso.split("-").map(Number);return new Date(Date.UTC(year,month-1,day+days)).toISOString().slice(0,10);};
  const remaining=["2026-11-14","2026-12-05"].filter((date)=>date>today);
  const dates=remaining.length>=2?remaining:remaining.length===1?[remaining[0],addDays(today,42)]:[addDays(today,21),addDays(today,42)];
  for (const [id,date] of [["11111111-1111-4111-8111-111111111111",dates[0]],["22222222-2222-4222-8222-222222222222",dates[1]]]) {
    await db.query("INSERT INTO student_enrollment_offerings(id,mode,course_id,course_date,amount,external_seats,policy_version,policy_hash,policy_text,reviewed_at,review_reference,enabled) VALUES($1,'test','infection-control',$2,39500,0,'2026-09-30',$3,$4,now(),'isolated synthetic fixture',true)",[id,date,hash,paragraphs.join("\n\n")]);
  }
}
const sessions = new Map(); const keys = new Map();
const originalFetch = globalThis.fetch;
let resetLimits;
async function fixtureControls() {
  try { return JSON.parse(await readFile(process.env.RDA_ENROLLMENT_FIXTURE_FILE, "utf8")); } catch { return {}; }
}
globalThis.fetch = async (input, init = {}) => {
  const url = new URL(input instanceof Request ? input.url : String(input));
  const requestInit = input instanceof Request ? { method: input.method, headers: input.headers, body: input.method !== "GET" && input.method !== "HEAD" ? await input.clone().text() : undefined, ...init } : init;
  init = requestInit;
  if (["db.fixture.neon.tech", "api.fixture.neon.tech"].includes(url.hostname)) {
    try {
      const control=await fixtureControls();
      if (control.resetLimits && control.resetLimits !== resetLimits) {
        await db.exec("TRUNCATE student_enrollment_attempts");
        await db.exec("UPDATE student_enrollment_offerings SET external_seats=0");
        resetLimits=control.resetLimits;
      }
      if (control.externalSeats) {
        for (const [offeringId, seats] of Object.entries(control.externalSeats)) {
          await db.query("UPDATE student_enrollment_offerings SET external_seats=$2 WHERE id=$1",[offeringId, seats]);
        }
      }
      if (control.plantSessionlessHold) {
        const plant=control.plantSessionlessHold;
        const offer=(await db.query("SELECT id,course_date,policy_text,policy_hash FROM student_enrollment_offerings WHERE id=$1",[plant.offeringId])).rows[0];
        if (offer) {
          await db.query("INSERT INTO student_enrollments(id,offering_id,course_date,owner_hash,student_name,email,phone,adult_attested,policy_version,policy_hash,policy_text,amount,currency,status,stripe_expires_at) VALUES($1,$2,$3,$4,$5,$6,$7,true,'2026-09-30',$8,$9,39500,'usd',$11,$10) ON CONFLICT (id) DO NOTHING",[plant.id,offer.id,offer.course_date,plant.owner,plant.name,plant.email,plant.phone,offer.policy_hash,offer.policy_text,plant.expiresAt,plant.status ?? "reserved"]);
        }
      }
      if (control.releaseHold) {
        await db.query("UPDATE student_enrollments SET status='expired',stripe_session_id=NULL,updated_at=now() WHERE id=$1",[control.releaseHold]);
      }
      if (control.plantForeignModeReview) {
        const plant=control.plantForeignModeReview;
        const policy=(await db.query("SELECT policy_text,policy_hash FROM student_enrollment_offerings LIMIT 1")).rows[0];
        if (policy) {
          await db.query("INSERT INTO student_enrollment_offerings(id,mode,course_id,course_date,amount,external_seats,policy_version,policy_hash,policy_text,reviewed_at,review_reference,enabled) VALUES($1,'live','infection-control','2026-11-14',39500,0,'2026-09-30',$2,$3,now(),'foreign-mode fixture',false) ON CONFLICT (mode, course_id, course_date) DO NOTHING",[plant.offeringId,policy.policy_hash,policy.policy_text]);
          await db.query("INSERT INTO student_enrollments(id,offering_id,course_date,owner_hash,student_name,email,phone,adult_attested,policy_version,policy_hash,policy_text,amount,currency,status,stripe_expires_at) VALUES($1,$2,'2026-11-14',$3,$4,$5,$6,true,'2026-09-30',$7,$8,39500,'usd','expired',$9) ON CONFLICT (id) DO NOTHING",[plant.id,plant.offeringId,plant.owner,plant.name,plant.email,plant.phone,policy.policy_hash,policy.policy_text,plant.expiresAt]);
          await db.query("INSERT INTO student_enrollment_reviews(enrollment_id,session_id,reason) VALUES($1,$2,'paid_after_release') ON CONFLICT (enrollment_id, session_id) DO NOTHING",[plant.id,plant.sessionId]);
        }
      }
      const { query, params } = JSON.parse(init.body);
      if (control.expireOnBind && typeof query==="string" && query.includes("UPDATE student_enrollments SET stripe_session_id") && query.includes("status='reserved'")) {
        await db.query("UPDATE student_enrollments SET status='expired',updated_at=now() WHERE id=$1",[control.expireOnBind]);
      }
      const result = await db.query(query, params);
      if (process.env.RDA_ENROLLMENT_FIXTURE_EVIDENCE) {
        const evidence={};
        for (const table of ["student_enrollments","student_enrollment_events","student_enrollment_mail","student_enrollment_reviews","student_enrollment_roster","student_enrollment_roster_test"]) evidence[table]=(await db.query(`SELECT * FROM ${table}`)).rows;
        await writeFile(process.env.RDA_ENROLLMENT_FIXTURE_EVIDENCE,JSON.stringify(evidence));
      }
      return Response.json({ ...result, rows: result.rows.map((row) => result.fields.map(({ name, dataTypeID }) => {
        const value = row[name]; if (value === null) return null;
        if (dataTypeID === 16) return value ? "t" : "f";
        if ([114,3802].includes(dataTypeID)) return JSON.stringify(value);
        if (value instanceof Date) return dataTypeID === 1082 ? value.toISOString().slice(0,10) : value.toISOString(); return String(value);
      })) });
    } catch (error) { return Response.json({ message: error.message }, { status: 400 }); }
  }
  if (url.hostname === "api.stripe.com") {
    const control = await fixtureControls();
    if (control.plantOrphanSession) {
      const plant=control.plantOrphanSession;
      const offer=(await db.query("SELECT course_date,policy_hash FROM student_enrollment_offerings WHERE id=$1",[plant.offeringId])).rows[0];
      if (offer && !sessions.has(plant.id)) {
        const courseDate=offer.course_date instanceof Date && offer.course_date.toISOString().endsWith("T00:00:00.000Z")
          ? offer.course_date.toISOString().slice(0,10) : String(offer.course_date).slice(0,10);
        sessions.set(plant.id,{
          id:plant.id,object:"checkout.session",livemode:false,mode:"payment",amount_total:39500,currency:"usd",
          status:plant.status ?? "open",payment_status:plant.paymentStatus ?? "unpaid",
          expires_at:plant.expiresAt ?? Math.floor(Date.now()/1000)+3600,
          url:`https://checkout.stripe.com/c/pay/${plant.id}`,client_reference_id:plant.enrollmentId,payment_intent:null,
          metadata:{enrollment_id:plant.enrollmentId,offering_id:plant.offeringId,policy_version:"2026-09-30",
            policy_hash:offer.policy_hash,integration:"rda-student-v1",environment:"test",course_date:courseDate},
        });
        if (plant.idempotencyKey) keys.set(plant.idempotencyKey,{id:plant.id,raw:plant.raw ?? "orphan"});
      }
    }
    if (url.pathname === "/v1/account") {
      if (control.accountError) return Response.json({error:"fixture account unavailable"},{status:500});
      return Response.json({id:control.wrongMerchant ? "acct_wrong" : "acct_fixture",charges_enabled:true,payouts_enabled:true});
    }
    if (init.method === "POST" && url.pathname === "/v1/checkout/sessions") {
      if (control.createError) return Response.json({error:"fixture session create unavailable"},{status:500});
      if (control.conflictWithoutIdempotencyCode) return Response.json({error:{message:"fixture 409 without idempotency code"}},{status:409});
      if (control.conflictOtherCode) return Response.json({error:{code:"lock_timeout",message:"fixture 409 with a different code"}},{status:409});
      if (control.idempotencyConflict) return Response.json({error:{code:"idempotency_key_in_use",message:"fixture in-flight idempotency key"}},{status:409});
      const key = new Headers(init.headers).get("Idempotency-Key"), raw = String(init.body);
      if (keys.has(key)) {
        const existing = keys.get(key); if (existing.raw !== raw) return Response.json({ error: { code: "idempotency_key_in_use", message: "idempotency conflict" } }, { status: 409 });
        return Response.json(sessions.get(existing.id));
      }
      const params = new URLSearchParams(raw); const id = `cs_test_fixture${sessions.size + 1}`;
      const session = { id, object: "checkout.session", livemode: false, mode: params.get("mode"), amount_total: Number(params.get("line_items[0][price_data][unit_amount]")),
        currency: params.get("line_items[0][price_data][currency]"), status: "open", payment_status: "unpaid", expires_at: Number(params.get("expires_at")),
        url: `https://checkout.stripe.com/c/pay/${id}`, client_reference_id: params.get("client_reference_id"),
        payment_intent:null, metadata: Object.fromEntries([...params.entries()].filter(([name])=>name.startsWith("metadata[")).map(([name,value])=>[name.slice(9,-1),value])) };
      sessions.set(id, session); keys.set(key, { id, raw });
      if (control.lostResponse) throw new Error("Fixture lost response after Stripe persisted session");
      return Response.json(session);
    }
    const id = url.pathname.split("/")[4];
    if (id && sessions.has(id)) {
      const session = sessions.get(id);
      if (url.pathname.endsWith("/expire")) { session.status = "expired"; session.payment_status = "unpaid"; }
      else if (control.status) { session.status = control.status; session.payment_status = control.status === "complete" ? "paid" : "unpaid"; }
      if (control.paymentStatus) session.payment_status=control.paymentStatus;
      if (session.status === "complete") {
        session.payment_intent={id:`pi_fixture${id.slice(8)}`,status:session.payment_status === "paid" ? "succeeded" : "requires_payment_method",latest_charge:session.payment_status === "paid" ? {id:`ch_fixture${id.slice(8)}`,payment_intent:`pi_fixture${id.slice(8)}`,amount:session.amount_total,currency:"usd",livemode:false,amount_refunded:control.refundedAmount ?? 0,refunded:control.refundedAmount === session.amount_total} : null};
      }
      return Response.json({ ...session, ...(control.amount !== undefined ? { amount_total: control.amount } : {}), ...(control.livemode !== undefined ? { livemode: control.livemode } : {}) });
    }
    if (url.pathname === "/v1/checkout/sessions") return Response.json({ object: "list", data: [...sessions.values()].filter(s=>!url.searchParams.has("payment_intent") || s.payment_intent?.id === url.searchParams.get("payment_intent")), has_more: false });
    return Response.json({ error: "not found" }, { status: 404 });
  }
  if (["127.0.0.1","localhost","::1"].includes(url.hostname)) return originalFetch(input, init);
  throw new Error("Fixture blocked external network access");
};
