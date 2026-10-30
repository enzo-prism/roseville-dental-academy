// Only the isolated return-navigation browser test imports this preload.
// No real provider transport is permitted; one exact inventory SELECT is mocked.
import { appendFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { syncBuiltinESMExports } from 'node:module';
import net from 'node:net';
import tls from 'node:tls';
import http from 'node:http';
import https from 'node:https';
const env=process.env;
if(env.RDA_CHECKOUT_RETURN_FIXTURE!=='local-only' || env.DATABASE_URL!=='postgres://fixture:fixture@db.fixture.neon.tech/test'
  || env.RDA_STUDENT_PAYMENTS_MODE!=='live' || env.RDA_STUDENT_PAYMENTS_LIVE_ENABLED!=='true'
  || env.RDA_STUDENT_PAYMENTS_ACCESS!=='staff' || env.RDA_STUDENT_STRIPE_LIVE_KEY!=='rk_live_fixture'
  || env.RDA_STUDENT_STRIPE_LIVE_WEBHOOK_SECRET!=='whsec_fixture' || env.RDA_STUDENT_EMAIL_LIVE_ENABLED
  || !/^https:\/\/127\.0\.0\.1:\d+$/.test(env.RDA_STUDENT_PAYMENTS_ORIGIN??'')
  || env.RDA_ENROLLMENT_TEST_ORIGIN!==env.RDA_STUDENT_PAYMENTS_ORIGIN || !env.RDA_CHECKOUT_RETURN_NETWORK_LOG)
  throw new Error('Checkout return fixture requires isolated synthetic live-mode configuration');
const log=(row)=>appendFileSync(env.RDA_CHECKOUT_RETURN_NETWORK_LOG,JSON.stringify(row)+'\n');
const local=(host)=>['localhost','127.0.0.1','::1','[::1]'].includes(String(host));
function guardHost(host){if(!local(host)){log({blockedTransportHost:String(host)});throw new Error('Return fixture blocks non-loopback transport');}}
for(const [module,name] of [[net,'connect'],[net,'createConnection'],[tls,'connect']]) {
  const original=module[name];
  module[name]=function(...args){
    const first=args[0];
    if(first&&typeof first==='object') {if(!first.path)guardHost(first.host??first.hostname??'localhost');}
    else if(typeof first==='number'){const options=args.find(a=>a&&typeof a==='object');guardHost(typeof args[1]==='string'?args[1]:options?.host??options?.hostname??'localhost');}
    // A string-only argument is a local Unix socket, not a remote network host.
    return original.apply(this,args);
  };
}
for(const module of [http,https])for(const name of ['request','get']){
  const original=module[name];module[name]=function(...args){
    const first=args[0];
    if(typeof first==='string'||first instanceof URL)guardHost(new URL(first).hostname);
    else if(first&&typeof first==='object'&&!first.socketPath)guardHost(first.hostname??first.host??'localhost');
    return original.apply(this,args);
  };
}
syncBuiltinESMExports();
const {CANCELLATION_POLICY_PARAGRAPHS}=await import('../lib/academy-policies.ts');
const policy=CANCELLATION_POLICY_PARAGRAPHS.join('\n\n');
const hash=createHash('sha256').update(policy).digest('hex');
const exactQuery=`SELECT o.*, (o.capacity-o.external_seats-(SELECT count(*) FROM student_enrollments e
    WHERE e.offering_id=o.id AND student_enrollment_occupies_seat(e.status,e.inventory_released_at)))::int AS remaining
    FROM student_enrollment_offerings o WHERE o.mode=$1 AND o.enabled=true
    AND o.course_date > (now() AT TIME ZONE 'America/Los_Angeles')::date
    AND o.policy_version=$2 AND o.policy_hash=$3 AND o.policy_text IS NOT NULL ORDER BY o.course_date`.replace(/\s+/g,' ').trim();
const originalFetch=globalThis.fetch;
globalThis.fetch=async(input,init={})=>{
  const url=new URL(input instanceof Request?input.url:String(input));
  const method=init.method??(input instanceof Request?input.method:'GET');
  if(['db.fixture.neon.tech','api.fixture.neon.tech'].includes(url.hostname)){
    let body;
    try{body=JSON.parse(String(init.body??(input instanceof Request?await input.clone().text():'')));}catch{}
    if(method==='POST'&&body?.query?.replace(/\s+/g,' ').trim()===exactQuery
      &&Array.isArray(body.params)&&body.params.length===3&&body.params[0]==='live'&&body.params[1]==='2026-09-30'&&body.params[2]===hash){
      log({mocked:'offerings',mode:'live'});
      const fields=[['id',2950],['mode',25],['course_date',1082],['amount',23],['currency',25],['policy_version',25],['policy_hash',25],['policy_text',25],['remaining',23]].map(([name,dataTypeID])=>({name,dataTypeID}));
      const rows=[['11111111-1111-4111-8111-111111111111','live','2026-11-14','39500','usd','2026-09-30',hash,policy,'12'],['22222222-2222-4222-8222-222222222222','live','2026-12-05','39500','usd','2026-09-30',hash,policy,'12']];
      return Response.json({fields,rows,rowCount:rows.length,command:'SELECT'});
    }
  }
  if(local(url.hostname))return originalFetch(input,init);
  log({blockedFetchHost:url.hostname});throw new Error('Return fixture rejects unexpected database/provider fetch');
};
