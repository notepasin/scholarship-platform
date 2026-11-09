import {catalog} from './catalog.mjs';
import {sha256} from './auth.mjs';
import {timingSafeEqual} from 'node:crypto';
// This read-only service endpoint deliberately exposes no student or application data.
export async function handleProvider(request,env){
 const requestId=crypto.randomUUID(),headers={'Cache-Control':'no-store','X-Request-ID':requestId,'X-Content-Type-Options':'nosniff'};
 const respond=(body,status=200)=>Response.json(body,{status,headers});
 try{
  if(request.method!=='GET')return respond({error:'Method not allowed',request_id:requestId},405);
  if(!env.PARTNER_API_KEY||env.PARTNER_API_KEY.length<32)return respond({error:'Partner API key is not configured',request_id:requestId},503);
  const auth=request.headers.get('authorization')||'',token=auth.startsWith('Bearer ')?auth.slice(7):'';
  const actual=new TextEncoder().encode(await sha256(token)),expected=new TextEncoder().encode(await sha256(env.PARTNER_API_KEY));
  if(!token||!timingSafeEqual(actual,expected))return respond({error:'Unauthorized',request_id:requestId},401);
  if(!env.DB)return respond({error:'Database unavailable',request_id:requestId},503);
  const bucket=Math.floor(Date.now()/60000),key=await sha256(`provider:${bucket}`);
  const rate=await env.DB.prepare('INSERT INTO rate_limits (key,hits,expires_at) VALUES (?,1,?) ON CONFLICT(key) DO UPDATE SET hits=hits+1 RETURNING hits').bind(key,bucket*60+120).first();
  if(rate.hits>120)return respond({error:'Rate limit exceeded',request_id:requestId},429);
  const timestamp=new Date().toISOString();
  await env.DB.batch([
   env.DB.prepare('INSERT INTO provider_access_logs (id,partner,method,path,created_at) VALUES (?,?,?,?,?)').bind(requestId,'external-group','GET','/api/partner/scholarships',timestamp),
   env.DB.prepare('DELETE FROM provider_access_logs WHERE created_at < ?').bind(new Date(Date.now()-7*86400000).toISOString()),
  ]);
  return respond({success:true,provider:'group15-scholarship',request_id:requestId,generated_at:timestamp,dataset:'fictional-classroom-demo',data:catalog});
 }catch(e){console.error('Provider API error',{type:e?.name||'UnknownError'});return respond({error:'Internal service error',request_id:requestId},500);}
}
