// First-time local database setup. Local and cloud data are separate.
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
function run(args, capture = false) { const r = spawnSync(process.execPath, args, { stdio: capture ? 'pipe' : 'inherit', encoding: 'utf8' }); if (r.status !== 0) {
    if (capture)
        process.stderr.write(r.stderr || r.stdout);
    process.exit(r.status || 1);
} return r.stdout || ''; }
if (!process.argv.includes('--skip-build')) run(['scripts/run-framework.mjs', 'build']);
const base = ['--import', './scripts/sites-env.mjs', './node_modules/wrangler/bin/wrangler.js', 'd1', 'execute', 'DB', '--local', '--config', 'dist/server/wrangler.json', '--persist-to', '.wrangler/state'];
const result = run([...base, '--command', "SELECT name FROM sqlite_master WHERE type='table' AND name='applications'", '--json'], true);
const parsed = JSON.parse(result.slice(result.indexOf('[')));
if (parsed.some(r => r.results?.some(t => t.name === 'applications'))) {
    console.log('Local database already exists. Run npm run dev.');
    process.exit(0);
}
const journal = JSON.parse(readFileSync('drizzle/meta/_journal.json', 'utf8'));
for (const entry of journal.entries)
    run([...base, '--file', `drizzle/${entry.tag}.sql`]);
console.log('Local database ready. Run npm run dev.');
