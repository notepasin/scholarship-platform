import {timingSafeEqual} from 'node:crypto';
import {AppError,assertSameOrigin,parseBody} from './domain.mjs';
const encoder=new TextEncoder();
const hex=bytes=>Array.from(bytes,b=>b.toString(16).padStart(2,'0')).join('');
const unhex=value=>Uint8Array.from(value.match(/../g)||[],b=>parseInt(b,16));
const randomHex=length=>hex(crypto.getRandomValues(new Uint8Array(length)));
export const PASSWORD_ITERATIONS=100000; // Workers WebCrypto per-call limit. See SECURITY.md.
export const SESSION_SECONDS=12*60*60;
export async function sha256(value){return hex(new Uint8Array(await crypto.subtle.digest('SHA-256',encoder.encode(value))));}
function pepperValue(pepper){if(typeof pepper!=='string'||pepper.length<32)throw new AppError(503,'ยังไม่ได้ตั้ง AUTH_PEPPER ให้รัน npm run setup ก่อน');return pepper;}
export async function hashPassword(password,salt,pepper,iterations=PASSWORD_ITERATIONS){
 const hmac=await crypto.subtle.importKey('raw',encoder.encode(pepperValue(pepper)),{name:'HMAC',hash:'SHA-256'},false,['sign']);
 const prepared=await crypto.subtle.sign('HMAC',hmac,encoder.encode(password));
 const key=await crypto.subtle.importKey('raw',prepared,'PBKDF2',false,['deriveBits']);
 return hex(new Uint8Array(await crypto.subtle.deriveBits({name:'PBKDF2',salt:unhex(salt),iterations,hash:'SHA-256'},key,256)));
}
export function validateCredentials(body){
 if(typeof body.username!=='string'||!/^[a-z0-9_]{3,32}$/.test(body.username.trim().toLowerCase()))throw new AppError(400,'ชื่อบัญชีใช้ a-z ตัวเลข หรือ _ จำนวน 3–32 ตัว');
 if(typeof body.password!=='string'||body.password.length<12||body.password.length>128)throw new AppError(400,'รหัสผ่านต้องมี 12–128 ตัวอักษร');
 return {username:body.username.trim().toLowerCase(),password:body.password};
}
function cookieMode(request,development=false){
 const u=new URL(request.url),local=['localhost','127.0.0.1','[::1]'].includes(u.hostname);
 if(u.protocol!=='https:'&&!local&&!development)throw new AppError(400,'การลงชื่อเข้าใช้ต้องใช้ HTTPS');
 return u.protocol==='https:'?{name:'__Host-scholarship_session',secure:'; Secure'}:{name:'scholarship_session',secure:''};
}
export function tokenFromCookie(cookie){
 if(typeof cookie!=='string')return null;
 const fields=new Map(cookie.split(';').map(part=>{const index=part.indexOf('=');return [part.slice(0,index).trim(),part.slice(index+1).trim()];}));
 const token=fields.get('__Host-scholarship_session')||fields.get('scholarship_session');
 return token&&/^[a-f0-9]{64}$/.test(token)?token:null;
}
export async function sessionUser(db,cookie){
 const token=tokenFromCookie(cookie);if(!token||!db)return null;
 const account=await db.prepare('SELECT a.id,a.username FROM auth_sessions s JOIN auth_accounts a ON a.id=s.account_id WHERE s.token_hash=? AND s.expires_at>?').bind(await sha256(token),Math.floor(Date.now()/1000)).first();
 return account?{userId:account.id,displayName:account.username,username:account.username}:null;
}
async function loginLimit(db,request,action,username){
 const ip=request.headers.get('CF-Connecting-IP')||'local-development';
 const bucket=Math.floor(Date.now()/60000),limits=[[`auth-ip:${ip}:${bucket}`,action==='register'?5:15],[`auth-name:${username}:${bucket}`,10]];
 for(const [raw,max] of limits){const key=await sha256(raw);const row=await db.prepare('INSERT INTO rate_limits (key,hits,expires_at) VALUES (?,1,?) ON CONFLICT(key) DO UPDATE SET hits=hits+1 RETURNING hits').bind(key,bucket*60+120).first();if(row.hits>max)throw new AppError(429,'ลองลงชื่อเข้าใช้ถี่เกินไป กรุณารอสักครู่');}
}
function response(body,status=200,cookie){const headers={'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'};if(cookie)headers['Set-Cookie']=cookie;return Response.json(body,{status,headers});}
export async function handleAuth(request,env){
 try{
  const path=new URL(request.url).pathname;
  if(request.method==='GET'&&path==='/api/auth/me')return response({user:await sessionUser(env.DB,request.headers.get('cookie'))});
  if(request.method!=='POST')throw new AppError(405,'ใช้คำขอ POST');
  assertSameOrigin(request);const mode=cookieMode(request,env.development===true),body=await parseBody(request);
  if(!env.DB)throw new AppError(503,'ยังไม่ได้เชื่อมฐานข้อมูล DB');
  if(path==='/api/auth/logout'){
   const token=tokenFromCookie(request.headers.get('cookie'));if(token)await env.DB.prepare('DELETE FROM auth_sessions WHERE token_hash=?').bind(await sha256(token)).run();
   return response({signed_out:true},200,`${mode.name}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${mode.secure}`);
  }
  if(!['/api/auth/login','/api/auth/register'].includes(path))throw new AppError(404,'ไม่พบคำสั่งบัญชี');
  pepperValue(env.AUTH_PEPPER);
  const credentials=validateCredentials(body),action=path.endsWith('/register')?'register':'login';
  await loginLimit(env.DB,request,action,credentials.username);
  let account=await env.DB.prepare('SELECT * FROM auth_accounts WHERE username=?').bind(credentials.username).first();
  if(action==='register'){
   if(env.REGISTRATION_ENABLED!=='true')throw new AppError(403,'ระบบปิดการสร้างบัญชีใหม่');
   if(account)throw new AppError(409,'ชื่อบัญชีนี้ถูกใช้แล้ว');
   const id=crypto.randomUUID(),salt=randomHex(32),created=new Date().toISOString();
   const hash=await hashPassword(credentials.password,salt,env.AUTH_PEPPER);
   try{await env.DB.batch([
    env.DB.prepare('INSERT INTO auth_accounts (id,username,password_hash,salt,iterations,created_at) VALUES (?,?,?,?,?,?)').bind(id,credentials.username,hash,salt,PASSWORD_ITERATIONS,created),
    env.DB.prepare('INSERT INTO users (id,created_at) VALUES (?,?)').bind(id,created),
   ]);}catch(e){if(String(e?.message).includes('UNIQUE'))throw new AppError(409,'ชื่อบัญชีนี้ถูกใช้แล้ว');throw e;}
   account={id,username:credentials.username};
  }else{
   // A non-existent username still executes the expensive operation.
   const salt=account?.salt||'00'.repeat(32),iterations=account?.iterations||PASSWORD_ITERATIONS;
   const candidate=await hashPassword(credentials.password,salt,env.AUTH_PEPPER,iterations),expected=account?.password_hash||'00'.repeat(32);
   if(!timingSafeEqual(unhex(candidate),unhex(expected))||!account)throw new AppError(401,'ชื่อบัญชีหรือรหัสผ่านไม่ถูกต้อง');
  }
  const token=randomHex(32),time=Math.floor(Date.now()/1000);
  await env.DB.batch([
   env.DB.prepare('DELETE FROM auth_sessions WHERE expires_at<=?').bind(time),
   env.DB.prepare('INSERT INTO auth_sessions (token_hash,account_id,expires_at,created_at) VALUES (?,?,?,?)').bind(await sha256(token),account.id,time+SESSION_SECONDS,new Date().toISOString()),
  ]);
  return response({user:{username:account.username}},action==='register'?201:200,`${mode.name}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${SESSION_SECONDS}${mode.secure}`);
 }catch(e){if(e instanceof AppError)return response({error:e.message},e.status);console.error('Authentication error',{type:e?.name||'UnknownError'});return response({error:'ไม่สามารถลงชื่อเข้าใช้ได้ กรุณาลองใหม่'},500);}
}
