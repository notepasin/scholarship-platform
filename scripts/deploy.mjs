// Deployment runs on the team's computer after their own Cloudflare login.
import {readFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
const config=JSON.parse(readFileSync('wrangler.jsonc','utf8'));
if(config.d1_databases?.some(d=>d.database_id==='00000000-0000-4000-8000-000000000000')){console.error('Set the database_id from npm run cf:database in wrangler.jsonc before deploying.');process.exit(1);}
process.env.WRANGLER_SEND_METRICS='false';
function run(args){const r=spawnSync(process.execPath,args,{stdio:'inherit',env:process.env});if(r.error)throw r.error;if(r.status!==0)process.exit(r.status||1);}
run(['node_modules/wrangler/bin/wrangler.js','d1','migrations','apply','DB','--remote','--config','wrangler.jsonc']);
run(['node_modules/vinext/dist/cli.js','build']);
run(['node_modules/wrangler/bin/wrangler.js','deploy','--config','dist/server/wrangler.json']);
