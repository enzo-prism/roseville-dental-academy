import { createHmac } from "node:crypto";
import { test, expect } from "@playwright/test";
import { assertBoundTestSession, enrollmentConfig, safeTestCheckoutUrl, verifyEnrollmentSignature, type EnrollmentHold, type TestCheckoutSession } from "@/lib/enrollment-contract";
import { createEnrollmentSession, enrollmentAuthConfig, validEnrollmentSession } from "@/lib/enrollment-auth";
import { createTestSession, recoverTestSession, testSessionParameters } from "@/lib/enrollment-stripe";
import { boundedEnrollmentText } from "@/lib/enrollment-http";

const hold: EnrollmentHold = { hold_id: "fde68e2e-fb14-4fea-bfd3-534b40183920", course_date: "2026-10-12", owner_hash: "a".repeat(64),
  policy_version: "2026-09-30", status: "reserved", stripe_session_id: null,
  stripe_expires_at: Math.floor(Date.now()/1000)+3600, created_at: new Date().toISOString() };
const session: TestCheckoutSession = { id:"cs_test_fixture", object:"checkout.session",livemode:false,mode:"payment",amount_total:39500,currency:"usd",
  status:"open",payment_status:"unpaid",expires_at:Number(hold.stripe_expires_at),client_reference_id:hold.hold_id,url:"https://checkout.stripe.com/c/pay/cs_test_fixture",
  metadata:{hold_id:hold.hold_id,course_date:hold.course_date,pilot:"test-only",policy_version:hold.policy_version} };
const config = { key:"sk_test_fixture",webhookSecret:"whsec_fixture",origin:"http://127.0.0.1:3117" };

test("test session rejects amount, currency, owner binding, policy, expiry and live responses", () => {
  expect(() => assertBoundTestSession(session,hold)).not.toThrow();
  for (const changed of [{livemode:true},{amount_total:1},{currency:"eur"},{mode:"subscription"},{id:"cs_live_fixture"},
    {expires_at:1},{client_reference_id:"forged"},{metadata:{...session.metadata,hold_id:"forged"}},
    {metadata:{...session.metadata,course_date:"2027-01-01"}},{metadata:{...session.metadata,policy_version:"old"}},
    {metadata:{...session.metadata,pilot:"live"}}]) expect(() => assertBoundTestSession({...session,...changed},hold)).toThrow();
  expect(() => assertBoundTestSession(session,{...hold,stripe_session_id:"cs_test_other"})).toThrow();
  for (const url of ["https://checkout.stripe.com.attacker.test/", "http://checkout.stripe.com/", "https://user:pass@checkout.stripe.com/", "javascript:alert(1)"]) expect(() => safeTestCheckoutUrl(url)).toThrow();
});
test("raw webhook HMAC rejects tampering, stale timestamps, absent signatures and duplicate timestamps", () => {
  const now=Date.now(), t=String(Math.floor(now/1000)), body='{"livemode":false}';
  const sig=createHmac("sha256",config.webhookSecret).update(`${t}.${body}`).digest("hex");
  expect(verifyEnrollmentSignature(body,`t=${t},v1=${sig}`,config.webhookSecret,now)).toBe(true);
  expect(verifyEnrollmentSignature(`${body} `,`t=${t},v1=${sig}`,config.webhookSecret,now)).toBe(false);
  expect(verifyEnrollmentSignature(body,`t=${t},v1=${sig}`,config.webhookSecret,now+301000)).toBe(false);
  expect(verifyEnrollmentSignature(body,`t=${t},t=${t},v1=${sig}`,config.webhookSecret,now)).toBe(false);
  expect(verifyEnrollmentSignature(body,`t=${t},v1=oops`,config.webhookSecret,now)).toBe(false);
});
test("staff session is signed, expiring, and invalidated by password rotation", () => {
  const auth={password:"fixture-staff-password-long",secret:"s".repeat(40),origin:config.origin};
  const token=createEnrollmentSession(auth,1000000);
  expect(validEnrollmentSession(token,auth,1000000)).toBe(true);
  expect(validEnrollmentSession(`${token}tampered`,auth,1000000)).toBe(false);
  expect(validEnrollmentSession(token,{...auth,password:"different-staff-password-long"},1000000)).toBe(false);
  expect(validEnrollmentSession(token,auth,1000000+7200000)).toBe(false);
});
test("config never accepts live credentials or missing staff secrets", () => {
  const previous={...process.env};
  try { Object.assign(process.env,{DATABASE_URL:"postgres://fixture",RDA_STRIPE_TEST_SECRET_KEY:"sk_live_fixture",RDA_STRIPE_TEST_WEBHOOK_SECRET:"whsec_fixture",RDA_ENROLLMENT_TEST_ORIGIN:config.origin});
    expect(enrollmentConfig()).toBeNull(); process.env.RDA_STRIPE_TEST_SECRET_KEY="sk_test_fixture"; expect(enrollmentConfig()).not.toBeNull();
    process.env.RDA_ENROLLMENT_TEST_ORIGIN="https://example.test/path"; expect(enrollmentConfig()).toBeNull();
    delete process.env.RDA_ENROLLMENT_PILOT_PASSWORD; expect(enrollmentAuthConfig()).toBeNull();
  } finally { for(const key of Object.keys(process.env)) if (!(key in previous)) delete process.env[key]; Object.assign(process.env,previous); }
});
test("Stripe API fixture fixes price, quantity, idempotency and rejects live provider response", async () => {
  const previous=globalThis.fetch; const calls: { url:string; init?:RequestInit }[]=[];
  try { globalThis.fetch=async(input,init)=>{ calls.push({url:String(input),init}); return Response.json(session); };
    await createTestSession(hold,config); await createTestSession(hold,config);
    expect(calls).toHaveLength(2); expect(calls[0].url).toBe("https://api.stripe.com/v1/checkout/sessions");
    const params=testSessionParameters(hold,config);
    expect(params.get("line_items[0][price_data][unit_amount]")).toBe("39500"); expect(params.get("line_items[0][quantity]")).toBe("1");
    expect(calls[0].init?.headers).toEqual(calls[1].init?.headers); expect(String(calls[0].init?.body)).toBe(String(calls[1].init?.body));
    globalThis.fetch=async()=>Response.json({...session,livemode:true}); await expect(createTestSession(hold,config)).rejects.toThrow("Non-test response rejected");
    await expect(createTestSession(hold,{...config,key:"sk_live_fixture"})).rejects.toThrow("Test credentials required");
  } finally {globalThis.fetch=previous;}
});
test("lost create responses recover only matching verified sessions and never infer closure from absence", async () => {
  const previous=globalThis.fetch;
  try {globalThis.fetch=async()=>Response.json({object:"list",data:[session],has_more:false});
    expect((await recoverTestSession(hold,config))?.id).toBe(session.id);
    globalThis.fetch=async()=>Response.json({object:"list",data:[],has_more:false}); expect(await recoverTestSession(hold,config)).toBeNull();
    await expect(createTestSession({...hold,stripe_expires_at:1},config)).rejects.toThrow("administrator reconciliation");
    globalThis.fetch=async()=>Response.json({object:"list",data:[session,{...session,id:"cs_test_duplicate"}],has_more:false}); await expect(recoverTestSession(hold,config)).rejects.toThrow("Duplicate test sessions");
    globalThis.fetch=async()=>Response.json({object:"list",data:[{...session,livemode:true}],has_more:false}); await expect(recoverTestSession(hold,config)).rejects.toThrow("Invalid test recovery");
  } finally {globalThis.fetch=previous;}
});
test("bounded request streaming rejects dishonest lengths and cancels oversized chunks before full consumption", async () => {
  let reads=0,cancelled=false;
  const stream=new ReadableStream<Uint8Array>({ pull(controller){reads++;controller.enqueue(new Uint8Array(1024));},cancel(){cancelled=true;} });
  const request=new Request("http://127.0.0.1",{method:"POST",body:stream,duplex:"half"} as RequestInit);
  await expect(boundedEnrollmentText(request,4096)).rejects.toThrow("Body too large"); expect(cancelled).toBe(true); expect(reads).toBeLessThanOrEqual(6);
  await expect(boundedEnrollmentText(new Request("http://127.0.0.1",{method:"POST",body:"x",headers:{"content-length":"9000"}}),4096)).rejects.toThrow();
  await expect(boundedEnrollmentText(new Request("http://127.0.0.1",{method:"POST",body:"€"}),2)).rejects.toThrow();
  expect(await boundedEnrollmentText(new Request("http://127.0.0.1",{method:"POST",body:"{\"ok\":true}"}),4096)).toBe('{"ok":true}');
});
