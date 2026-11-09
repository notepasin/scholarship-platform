// Reproducible local setup; creates ignored secrets and applies official D1 migrations.
import {existsSync,writeFileSync,mkdirSync} from 'node:fs';
import {randomBytes} from 'node:crypto';
import {spawnSync} from 'node:child_process';
process.env.WRANGLER_SEND_METRICS='false';
process.env.CLOUDFLARE_CF_FETCH_ENABLED='false';
process.env.WRANGLER_LOG_PATH ||= '.wrangler/logs/setup.log';
mkdirSync('.wrangler/logs',{recursive:true});
if(!existsSync('.dev.vars')){
 const pepper=randomBytes(32).toString('hex'),partnerKey=randomBytes(32).toString('hex');
 writeFileSync('.dev.vars',`AUTH_PEPPER="${pepper}"\nENROLLMENT_BEARER_TOKEN=""\nPARTNER_API_KEY="${partnerKey}"\n`,{mode:0o600});
 console.log('Created .dev.vars with random local secrets. Values are not printed. Keep this file private.');
}else console.log('Preserving existing .dev.vars.');
const r=spawnSync(process.execPath,['node_modules/wrangler/bin/wrangler.js','d1','migrations','apply','DB','--local','--config','wrangler.jsonc','--persist-to','.wrangler/standalone-state'],{stdio:'inherit',env:process.env});
if(r.error)throw r.error;process.exitCode=r.status||0;
if(r.status===0)console.log('Local setup complete. Run npm run dev, then create a demonstration account at /login.');
