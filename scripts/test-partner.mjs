// Obtain the key from the owning team; never commit a real credential.
import {writeFileSync,mkdirSync} from 'node:fs';
const origin=process.env.SCHOLARSHIP_ORIGIN,key=process.env.SCHOLARSHIP_API_KEY;
if(!origin||!key){console.error('Set SCHOLARSHIP_ORIGIN and SCHOLARSHIP_API_KEY in your terminal environment first.');process.exit(1);}
const parsed=new URL(origin);if(parsed.protocol!=='https:'&&parsed.hostname!=='localhost'&&parsed.hostname!=='127.0.0.1')throw new Error('Use HTTPS for remote API requests.');
const response=await fetch(new URL('/api/partner/scholarships',parsed),{headers:{Authorization:`Bearer ${key}`,Accept:'application/json'},signal:AbortSignal.timeout(15000)});
const data=await response.json();
const result={tested_at:new Date().toISOString(),method:'GET',endpoint:new URL('/api/partner/scholarships',parsed).toString(),http_status:response.status,request_id:response.headers.get('x-request-id'),response:data};
mkdirSync('evidence',{recursive:true});writeFileSync('evidence/provider-call.json',JSON.stringify(result,null,2));console.log(JSON.stringify({http_status:response.status,request_id:result.request_id,success:response.ok,evidence:'evidence/provider-call.json'}));
if(!response.ok)process.exitCode=1;
