// Isolated real-route access proof. Never uses live credentials or provider network.
import { spawn } from 'node:child_process';
import { createHmac, randomBytes } from 'node:crypto';
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
import { resolve } from 'node:path';
const repo=resolve(import.meta.dirname,'..');
const out=resolve(repo,'dogfood-output/student-checkout-access');
await mkdir(out,{recursive:true});
const port=Number(process.env.STUDENT_ACCESS_FIXTURE_PORT??'3141');
assert(Number.isInteger(port)&&port>=1024&&port<=65535,'Invalid local fixture port');
const origin='https://example.test', local=`http://127.0.0.1:${port}`;
const password='fixture-staff-password-long', secret='fixture-staff-session-secret-xxxxxxxxxxxxxxxx';
function staffToken(issued=Math.floor(Date.now()/1000)) {
  const sign=(s)=>createHmac('sha256',secret).update(s).digest('base64url');
  const payload=Buffer.from(JSON.stringify({v:1,iat:issued,exp:issued+7200,rev:sign(`password:${password}`),nonce:randomBytes(16).toString('base64url')})).toString('base64url');
  return `${payload}.${sign(payload)}`;
}
const student=`__Host-rda-student-checkout=${'a'.repeat(64)}`;
const rows=[];
let mockedAllowanceCalls=0;
for (const spec of [{name:'default-staff'},{name:'explicit-public',audience:'public'},{name:'invalid-audience',audience:'Public'},{name:'staff-origin-mismatch',staffOrigin:'https://different.example.test'},{name:'kill-switch',audience:'public',disabled:true}]) {
  const env={...process.env};
  for (const key of Object.keys(env)) if (/^(RDA_|STRIPE_|NEXT_PUBLIC_|DATABASE_URL|POSTGRES|PGHOST|PGPASSWORD|PGUSER|PGDATABASE|NEON_|RESEND_|NODE_OPTIONS)/.test(key)) delete env[key];
  const networkLog=`${out}/${spec.name}-network.jsonl`;
  await writeFile(networkLog,'');
  Object.assign(env,{RDA_ACCESS_GUARD_FIXTURE:'local-only',RDA_ACCESS_GUARD_NETWORK_LOG:networkLog,DATABASE_URL:'postgres://fixture:fixture@db.fixture.neon.tech/test',RDA_STUDENT_PAYMENTS_MODE:'live',RDA_STUDENT_PAYMENTS_LIVE_ENABLED:spec.disabled?'false':'true',RDA_STUDENT_STRIPE_LIVE_KEY:'rk_live_fixture',RDA_STUDENT_STRIPE_LIVE_WEBHOOK_SECRET:'whsec_fixture',RDA_STUDENT_STRIPE_ACCOUNT_ID:'acct_1UJHgLCOhHjREvRz',RDA_STUDENT_PAYMENTS_ORIGIN:origin,RDA_ENROLLMENT_PILOT_PASSWORD:password,RDA_ENROLLMENT_PILOT_SESSION_SECRET:secret,RDA_ENROLLMENT_TEST_ORIGIN:spec.staffOrigin??origin});
  if (spec.audience) env.RDA_STUDENT_PAYMENTS_ACCESS=spec.audience;
  const server=spawn(process.execPath,['--import',repo+'/scripts/student-checkout-access-fixture.mjs',repo+'/node_modules/next/dist/bin/next','start','--hostname','127.0.0.1','--port',String(port)],{cwd:repo,env,stdio:['ignore','ignore','pipe']});
  let stderr='';server.stderr.on('data',x=>{stderr+=x});
  try {
    let ready=false;
    for(let i=0;i<100;i++) { if(server.exitCode!==null) throw new Error(`Fixture process exited ${server.exitCode}`); try {if((await fetch(local+'/manifest.webmanifest')).ok){ready=true;break}}catch{} await new Promise(r=>setTimeout(r,100)); }
    assert(ready,'Local fixture did not start');
    const publicAllowed=spec.audience==='public'&&!spec.disabled;
    for(const who of ['anonymous','valid-staff','expired-staff','forged-staff']) {
      const token=who==='valid-staff'?staffToken():who==='expired-staff'?staffToken(Math.floor(Date.now()/1000)-10800):'forged';
      const cookie=student+(who==='anonymous'?'':`; __Host-rda-enrollment-pilot=${token}`);
      const staffAllowed=spec.name==='default-staff'&&who==='valid-staff';
      const expected=publicAllowed||staffAllowed;
      const headers={Origin:origin,Cookie:cookie,'Content-Type':'application/json'};
      const sessionHeaders={Origin:origin,'Content-Type':'application/json',...(who==='anonymous'?{}:{Cookie:`__Host-rda-enrollment-pilot=${token}`})};
      const beforeNetwork=await readFile(networkLog,'utf8');
      const wrongOriginSession=await fetch(local+'/api/student-enrollment/session',{method:'POST',headers:{...sessionHeaders,Origin:'https://wrong.example.test'},body:'{}'});
      assert.equal(wrongOriginSession.status,503,'Wrong request origin must not issue a session');
      assert.equal(wrongOriginSession.headers.get('set-cookie'),null);
      const wrongOrigin=await fetch(local+'/api/student-enrollment/checkout',{method:'POST',headers:{...headers,Origin:'https://wrong.example.test'},body:'{}'});
      assert.equal(wrongOrigin.status,503,'Wrong request origin must fail before database/provider access');
      assert.equal(await readFile(networkLog,'utf8'),beforeNetwork);
      const session=await fetch(local+'/api/student-enrollment/session',{method:'POST',headers:sessionHeaders,body:'{}'});
      assert.equal(session.status,expected?200:503,`${spec.name}/${who}/session`);
      if(!expected) assert.equal(session.headers.get('set-cookie'),null);
      else {
        const issued=session.headers.get('set-cookie')??'';
        assert(/^__Host-rda-student-checkout=[a-f0-9]{64};/.test(issued),'Allowed session must issue a valid owner cookie');
        assert(issued.includes('; Secure;')&&issued.includes('; HttpOnly;')&&issued.includes('; SameSite=lax'),'Owner cookie protections must stay enabled');
      }
      const checkout=await fetch(local+'/api/student-enrollment/checkout',{method:'POST',headers,body:'{}'});
      assert.equal(checkout.status,expected?400:503,`${spec.name}/${who}/checkout`);
      assert.match(checkout.headers.get('cache-control'),/private.*no-store/);
      if(!expected) assert.equal(await readFile(networkLog,'utf8'),beforeNetwork,'Denied checkout cannot reach the database or provider');
      rows.push({audience:spec.name,browser:who,session_status:session.status,checkout_invalid_body_status:checkout.status});
    }
    if(!publicAllowed) {
      const page=await fetch(local+'/enroll');const html=await page.text();
      assert(html.includes('Online enrollment is currently unavailable'),'Anonymous enrollment must stay closed');
      assert(html.includes('Class capacity: 12. Contact the academy for available seats.'),'Unknown availability must be labelled as capacity');
      assert(!html.includes('Student details and payment'));
      rows.push({audience:spec.name,anonymous_page_closed:true,capacity_not_availability:true});
      const beforeReturn=await readFile(networkLog,'utf8');
      const returned=await fetch(local+'/enroll?cancelled=1');
      const returnHtml=await returned.text();
      assert(returnHtml.includes('Online enrollment is currently unavailable'));
      assert(!returnHtml.includes('Student details and payment'));
      assert.equal(returnHtml.includes('data-rda-staff-checkout-resume'),['default-staff','staff-origin-mismatch'].includes(spec.name));
      assert.equal(await readFile(networkLog,'utf8'),beforeReturn,'A return flag never grants inventory access');
      rows.push({audience:spec.name,anonymous_cancel_return_closed:true,return_flag_grants_access:false});
    }
    const network=(await readFile(networkLog,'utf8')).trim().split('\n').filter(Boolean).map(s=>JSON.parse(s));
    assert(network.every(row=>row.mocked==='allowance'),'All provider network must stay blocked');
    assert.equal(network.length,publicAllowed?4:spec.name==='default-staff'?1:0);
    mockedAllowanceCalls+=network.length;
  } finally { server.kill('SIGTERM');await new Promise(resolve=>server.exitCode!==null?resolve():server.once('exit',resolve)); }
}
await writeFile(out+'/staff-access-http-proof.json',JSON.stringify({checked_at_utc:new Date().toISOString(),source_head:process.env.GITHUB_SHA??'local-build',runtime:'Next.js production build',scope:'Five isolated local live-mode configurations with synthetic credentials; all outbound fetch blocked',results:rows,provider_network_requests:0,real_database_network_requests:0,mocked_allowance_calls:mockedAllowanceCalls,charges:0,emails:0,texts:0},null,2)+'\n');
console.log(JSON.stringify({http_access_cases:rows.length,provider_network_requests:0,charges:0,emails:0,result:'PASS'}));
