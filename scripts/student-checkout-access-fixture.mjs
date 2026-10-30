// Blocks all outbound requests; only a synthetic rate-limit answer is allowed.
import { appendFileSync } from 'node:fs';
if (process.env.RDA_ACCESS_GUARD_FIXTURE !== 'local-only' || process.env.DATABASE_URL !== 'postgres://fixture:fixture@db.fixture.neon.tech/test' || process.env.RDA_STUDENT_STRIPE_LIVE_KEY !== 'rk_live_fixture' || process.env.RDA_STUDENT_STRIPE_LIVE_WEBHOOK_SECRET !== 'whsec_fixture' || process.env.RDA_STUDENT_EMAIL_LIVE_ENABLED || process.env.RDA_STUDENT_PAYMENTS_ORIGIN !== 'https://example.test') throw new Error('Guard fixture requires synthetic configuration');
globalThis.fetch = async (input, init={}) => {
  const url = new URL(input instanceof Request ? input.url : String(input));
  if(['db.fixture.neon.tech','api.fixture.neon.tech'].includes(url.hostname)) {
    let body;
    try { body=JSON.parse(String(init.body??'{}')); } catch { /* Unrecognized requests are logged and rejected below. */ }
    if(init.method==='POST' && body?.query==='SELECT student_enrollment_allowance($1) AS allowed' && body.params?.length===1 && /^[a-f0-9]{64}$/.test(body.params[0])) {
      appendFileSync(process.env.RDA_ACCESS_GUARD_NETWORK_LOG, JSON.stringify({mocked:'allowance'})+'\n');
      return Response.json({fields:[{name:'allowed',dataTypeID:16}],rows:[['t']],rowCount:1,command:'SELECT'});
    }
  }
  appendFileSync(process.env.RDA_ACCESS_GUARD_NETWORK_LOG, JSON.stringify({blockedHost:url.hostname})+'\n');
  throw new Error('Guard fixture blocks all provider network access');
};
