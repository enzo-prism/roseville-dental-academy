// Real browser cookie/navigation regression, entirely loopback + synthetic mocks.
// Requires an existing production build; this script never builds or uses .env.
import assert from 'node:assert/strict';
import { spawn,execFileSync } from 'node:child_process';
import { createHmac,randomBytes } from 'node:crypto';
import { createServer as createHttpsServer } from 'node:https';
import { request as httpRequest } from 'node:http';
import { mkdir,mkdtemp,readFile,writeFile,rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve,join } from 'node:path';
import { chromium } from 'playwright';
const repo=resolve(import.meta.dirname,'..');
for(const name of ['.env','.env.local','.env.production','.env.production.local'])assert(!existsSync(join(repo,name)),'Return fixture refuses repository dotenv files; run from a clean isolated build checkout');
const out=resolve(repo,'dogfood-output/student-checkout-return');await mkdir(out,{recursive:true});
const port=Number(process.env.STUDENT_RETURN_FIXTURE_PORT??'3145');
assert(Number.isInteger(port)&&port>=1024&&port<=65535,'Invalid local fixture port');
await mkdir(tmpdir(),{recursive:true});
const certificates=await mkdtemp(join(tmpdir(),'rda-checkout-return-'));
const networkLog=join(out,'network.jsonl');await writeFile(networkLog,'');
const password='fixture-staff-password-long',secret='fixture-staff-session-secret-xxxxxxxxxxxxxxxx';
const cookieName='__Host-rda-enrollment-pilot';
const held='33333333-3333-4333-8333-333333333333';
const observations=[],results=[],blockedBrowserRequests=[],blockedBrowserMutationRequests=[];
let server,browser,proxy;
function token(issued=Math.floor(Date.now()/1000)){
  const sign=(v)=>createHmac('sha256',secret).update(v).digest('base64url');
  const payload=Buffer.from(JSON.stringify({v:1,iat:issued,exp:issued+7200,rev:sign(`password:${password}`),nonce:randomBytes(16).toString('base64url')})).toString('base64url');
  return payload+'.'+sign(payload);
}
async function network(){return(await readFile(networkLog,'utf8')).trim().split('\n').filter(Boolean).map(s=>JSON.parse(s));}
async function until(test,message){for(let i=0;i<100;i++){if(await test())return;await new Promise(r=>setTimeout(r,100));}throw new Error(message);}
try{
  execFileSync('openssl',['req','-x509','-newkey','rsa:2048','-nodes','-keyout',join(certificates,'key.pem'),'-out',join(certificates,'cert.pem'),'-days','1','-subj','/CN=localhost'],{stdio:'ignore'});
  let targetOrigin;
  proxy=createHttpsServer({key:await readFile(join(certificates,'key.pem')),cert:await readFile(join(certificates,'cert.pem'))},(req,res)=>{
    const hostname=(req.headers.host??'').split(':')[0];
    if(hostname==='localhost'&&req.url==='/stripe-return-fixture'){
      res.writeHead(200,{'Content-Type':'text/html','Cache-Control':'no-store','Referrer-Policy':'no-referrer'});
      res.end(`<h1>Synthetic external checkout return</h1><a href="${targetOrigin}/enroll?cancelled=1">Return to academy</a>`);return;
    }
    if(hostname!=='127.0.0.1'){res.writeHead(404);res.end();return;}
    if(req.url?.startsWith('/enroll'))observations.push({path:req.url,method:req.method,staffCookiePresent:(req.headers.cookie??'').includes(cookieName+'='),fetchSite:req.headers['sec-fetch-site']??null,fetchMode:req.headers['sec-fetch-mode']??null,fetchDest:req.headers['sec-fetch-dest']??null,rsc:req.headers.rsc??null});
    const upstream=httpRequest({hostname:'127.0.0.1',port,path:req.url,method:req.method,headers:{...req.headers,'x-forwarded-proto':'https'}},response=>{res.writeHead(response.statusCode??502,response.headers);response.pipe(res);});
    upstream.on('error',()=>{res.writeHead(502);res.end('Local fixture upstream unavailable');});req.pipe(upstream);
  });
  await new Promise((resolve,reject)=>{proxy.once('error',reject);proxy.listen(0,'127.0.0.1',resolve);});
  const tlsPort=proxy.address().port;
  targetOrigin=`https://127.0.0.1:${tlsPort}`;
  const sourceOrigin=`https://localhost:${tlsPort}`;
  // Whitelist ordinary process/runtime paths only. Do not inherit provider keys or deployment settings.
  const env=Object.fromEntries(['PATH','HOME','TMPDIR','LANG','LC_ALL','PLAYWRIGHT_BROWSERS_PATH','SystemRoot'].filter(k=>process.env[k]!==undefined).map(k=>[k,process.env[k]]));
  Object.assign(env,{NODE_ENV:'production',NEXT_TELEMETRY_DISABLED:'1',RDA_CHECKOUT_RETURN_FIXTURE:'local-only',RDA_CHECKOUT_RETURN_NETWORK_LOG:networkLog,DATABASE_URL:'postgres://fixture:fixture@db.fixture.neon.tech/test',RDA_STUDENT_PAYMENTS_MODE:'live',RDA_STUDENT_PAYMENTS_ACCESS:'staff',RDA_STUDENT_PAYMENTS_LIVE_ENABLED:'true',RDA_STUDENT_STRIPE_LIVE_KEY:'rk_live_fixture',RDA_STUDENT_STRIPE_LIVE_WEBHOOK_SECRET:'whsec_fixture',RDA_STUDENT_STRIPE_ACCOUNT_ID:'acct_1UJHgLCOhHjREvRz',RDA_STUDENT_PAYMENTS_ORIGIN:targetOrigin,RDA_ENROLLMENT_TEST_ORIGIN:targetOrigin,RDA_ENROLLMENT_PILOT_PASSWORD:password,RDA_ENROLLMENT_PILOT_SESSION_SECRET:secret});
  server=spawn(process.execPath,['--import',join(repo,'scripts/student-checkout-return-fixture.mjs'),join(repo,'node_modules/next/dist/bin/next'),'start','--hostname','127.0.0.1','--port',String(port)],{cwd:repo,env,stdio:['ignore','pipe','pipe']});
  let serverOutput='';server.stdout.on('data',b=>{serverOutput+=b;});server.stderr.on('data',b=>{serverOutput+=b;});
  await until(async()=>{if(server.exitCode!==null)throw new Error('Local fixture exited: '+serverOutput);try{return(await fetch(`http://127.0.0.1:${port}/manifest.webmanifest`,{signal:AbortSignal.timeout(1000)})).ok;}catch{return false;}},'Local production fixture did not become ready');
  browser=await chromium.launch({args:['--disable-background-networking','--disable-component-update','--disable-sync','--no-first-run']});
  for(const spec of [{name:'valid-staff',value:token(),allowed:true},{name:'no-staff-cookie',allowed:false},{name:'expired-staff',value:token(Math.floor(Date.now()/1000)-10800),allowed:false},{name:'forged-staff',value:'forged',allowed:false}]){
    const context=await browser.newContext({ignoreHTTPSErrors:true,serviceWorkers:'block'});
    try{
      await context.route('**/*',route=>{const request=route.request(),u=new URL(request.url());if([targetOrigin,sourceOrigin].includes(u.origin)){if(!['GET','HEAD'].includes(request.method())){blockedBrowserMutationRequests.push({method:request.method(),path:u.pathname});return route.abort('blockedbyclient');}return route.continue();}blockedBrowserRequests.push({host:u.hostname});return route.abort('blockedbyclient');});
      await context.routeWebSocket('**/*',socket=>socket.close());
      if(spec.value)await context.addCookies([{name:cookieName,value:spec.value,domain:'127.0.0.1',path:'/',httpOnly:true,secure:true,sameSite:'Strict'}]);
      const page=await context.newPage();
      await page.goto(targetOrigin+'/enroll?fixture=seed');
      await page.evaluate(held=>sessionStorage.setItem('rda-student-checkout',held),held);
      assert.equal(await page.evaluate(()=>sessionStorage.getItem('rda-student-checkout')),held);
      const beforeObservations=observations.length,beforeNetwork=(await network()).length;
      await page.goto(sourceOrigin+'/stripe-return-fixture');
      await Promise.all([page.waitForNavigation({waitUntil:'load'}),page.getByRole('link',{name:'Return to academy',exact:true}).click()]);
      await page.getByText('Online enrollment is currently unavailable. Please contact the academy to confirm course dates and availability.',{exact:true}).waitFor({state:'visible'});
      assert.equal(await page.locator('#student-name').count(),0,'Cross-site denied return must not render enrollment form');
      const resume=page.locator('a[data-rda-staff-checkout-resume]');await resume.waitFor({state:'visible'});
      assert.equal(await resume.getAttribute('href'),'/enroll');
      assert.equal(await page.getByRole('link',{name:'Staff sign-in',exact:true}).getAttribute('href'),'/enrollment-pilot');
      const first=observations.slice(beforeObservations).filter(o=>o.path==='/enroll?cancelled=1');
      assert.equal(first.length,1,'Return must perform one document navigation');
      assert.equal(first[0].staffCookiePresent,false,'Browser must omit Secure Strict cookie on genuine cross-site return');
      assert.equal(first[0].fetchSite,'cross-site');assert.equal(first[0].fetchDest,'document');assert.equal(first[0].rsc,null);
      assert.equal((await network()).length,beforeNetwork,'Denied first return cannot query database or provider');
      assert.equal(await page.evaluate(()=>sessionStorage.getItem('rda-student-checkout')),held,'Closed return must not clear the saved hold');
      if(spec.allowed)for(const width of [1280,390]){await page.setViewportSize({width,height:900});await page.screenshot({path:join(out,`return-${width}.png`)});}
      await page.setViewportSize({width:1280,height:900});
      await Promise.all([page.waitForNavigation({waitUntil:'load'}),resume.click()]);
      const second=observations.slice(beforeObservations).filter(o=>o.path==='/enroll');
      assert.equal(second.length,1,'Recovery must be a document navigation, not an RSC prefetch');
      assert.equal(second[0].fetchSite,'same-origin');assert.equal(second[0].fetchMode,'navigate');assert.equal(second[0].fetchDest,'document');assert.equal(second[0].rsc,null);
      assert.equal(second[0].staffCookiePresent,Boolean(spec.value));
      if(spec.allowed){
        await page.getByLabel('Student full name',{exact:true}).waitFor({state:'visible'});
        await page.getByRole('button',{name:'Check or close saved checkout',exact:true}).waitFor({state:'visible'});
        assert((await page.locator('main').innerText()).includes(`Saved checkout reference: ${held}`),'Saved hold must survive return and same-tab recovery');
        assert.equal((await network()).length,beforeNetwork+1,'Valid recovery must call only the exact mocked offering SELECT');
        for(const width of [1280,390]){await page.setViewportSize({width,height:900});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);await page.screenshot({path:join(out,`recovered-${width}.png`)});}
      }else{
        await page.getByText('Online enrollment is currently unavailable. Please contact the academy to confirm course dates and availability.',{exact:true}).waitFor({state:'visible'});
        assert.equal(await page.locator('#student-name').count(),0);
        assert.equal(await page.getByRole('button',{name:'Check or close saved checkout',exact:true}).count(),0);
        assert.equal((await network()).length,beforeNetwork,'Absent/expired/forged staff session cannot reach database or provider');
      }
      results.push({case:spec.name,crossSiteCookieOmitted:true,firstPageClosed:true,firstPageDatabaseCalls:0,recoveryDocumentNavigation:true,recoveryCookieSent:Boolean(spec.value),formAndSavedHoldVisible:spec.allowed,providerCalls:0});
    }finally{await context.close();}
  }
  const requests=await network();assert(requests.every(r=>r.mocked==='offerings'),'No unrecognized database/provider/transport request is permitted');assert.equal(requests.length,2,'Only valid-staff seed and same-site recovery may query mocked inventory');
  assert.equal(blockedBrowserMutationRequests.length,0,'The browser regression must not attempt form/session/reconcile mutations');
  const proof={result:'PASS',checkedAtUtc:new Date().toISOString(),runtime:'Existing local Next.js production build behind ephemeral self-signed HTTPS proxy',sourceHead:process.env.GITHUB_SHA??'local-build',cases:results,documentRequests:observations,mockedInventorySelects:requests.length,blockedBrowserRequests,blockedBrowserMutationRequests,providerRequests:0,realDatabaseRequests:0,charges:0,emails:0,texts:0,scope:'Cross-site localhost→127.0.0.1 return with actual Secure/SameSite=Strict browser cookie behavior. Saved hold seeded exactly once before leaving the academy origin; no navigation initialization resets storage. Only recovery link clicked; saved hold reconciliation button is checked for visibility, never activated. Browser allows only GET/HEAD requests.'};
  await writeFile(join(out,'proof.json'),JSON.stringify(proof,null,2)+'\n');console.log(JSON.stringify({result:'PASS',cases:results.length,mockedInventorySelects:requests.length,providerRequests:0,charges:0,emails:0}));
}finally{
  if(browser)await browser.close();
  if(server){server.kill('SIGTERM');await new Promise(resolve=>server.exitCode!==null?resolve():server.once('exit',resolve));}
  if(proxy)await new Promise(resolve=>proxy.close(resolve));
  await rm(certificates,{recursive:true,force:true});
}
