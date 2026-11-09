// Runs the built Worker in an isolated local Workers runtime, never against production.
import {createRequire} from 'node:module';
import {resolve} from 'node:path';
import {readFileSync,readdirSync,mkdirSync,writeFileSync} from 'node:fs';
import assert from 'node:assert/strict';
const require=createRequire(import.meta.url),wranglerRequire=createRequire(require.resolve('wrangler'));
const {Miniflare}=wranglerRequire('miniflare');
function walk(dir){return readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(dir+'/'+e.name):e.name.endsWith('.js')?[resolve(dir,e.name)]:[]);}
const entry=resolve('dist/server/index.js');const modules=[entry,...walk('dist/server').filter(p=>p!==entry)].map(path=>({type:'ESModule',path}));
const mf=new Miniflare({modules,modulesRoot:resolve('dist/server'),compatibilityDate:'2026-05-15',compatibilityFlags:['nodejs_compat'],d1Databases:{DB:'00000000-0000-4000-8000-000000000000'},bindings:{AUTH_PEPPER:'smoke-only-not-a-production-secret-00000000',PARTNER_API_KEY:'smoke-only-partner-key-00000000000000000',REGISTRATION_ENABLED:'true'},cf:false});
const observations=[];
try{
 const db=await mf.getD1Database('DB');
 for(const file of readdirSync('drizzle').filter(f=>f.endsWith('.sql')).sort())for(const sql of readFileSync('drizzle/'+file,'utf8').split('--> statement-breakpoint').map(s=>s.trim()).filter(Boolean))await db.prepare(sql).run();
 let cookie='';
 async function call(path,method='GET',body,extra={}){
  const r=await mf.dispatchFetch('https://smoke.local/api/'+path,{method,headers:{Origin:'https://smoke.local','Content-Type':'application/json',...(cookie?{Cookie:cookie}:{}),...extra},...(body===undefined?{}:{body:JSON.stringify(body)})});
  const setCookie=r.headers.get('set-cookie');if(setCookie)cookie=setCookie.split(';')[0];
  const data=await r.json();observations.push({path,method,http_status:r.status});return {status:r.status,data};
 }
 assert.equal((await call('auth/register','POST',{username:'smoke_student',password:'synthetic-password-2026-only'})).status,201);
 assert.equal((await call('profile','POST',{full_name:'นักศึกษา ทดสอบ',faculty:'Information Technology',major:'Software Engineering',study_year:2,gpa:3.5})).status,200);
 assert.equal((await call('saved','POST',{scholarship_id:'asean-2026'})).status,201);
 const state=(await call('state')).data;assert.equal(state.saved.length,1);
 for(const c of state.checks)assert.equal((await call('checklist','PATCH',{id:c.id,completed:true})).status,200);
 const app=await call('applications','POST',{scholarship_id:'asean-2026',acknowledged:true});assert.equal(app.status,201);
 assert.equal((await call('applications','POST',{scholarship_id:'asean-2026',acknowledged:true})).data.id,app.data.id);
 assert.equal((await call('partner/scholarships','GET',undefined,{Authorization:'Bearer smoke-only-partner-key-00000000000000000'})).status,200);
 assert.equal((await call('auth/logout','POST',{})).status,200);
 assert.equal((await call('state')).status,401);
 assert.equal((await call('auth/login','POST',{username:'smoke_student',password:'synthetic-password-2026-only'})).status,200);
 assert.equal((await call('state')).data.applications.length,1);
 const result={tested_at:new Date().toISOString(),runtime:'Miniflare / workerd + actual built Worker + D1',passed:true,observations};
 mkdirSync('outputs',{recursive:true});writeFileSync('outputs/worker-smoke.json',JSON.stringify(result,null,2));console.log(JSON.stringify({passed:true,steps:observations.length,result:'outputs/worker-smoke.json'}));
}finally{await mf.dispose();}
