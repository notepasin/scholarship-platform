import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import { handleApi } from '../lib/service.mjs';
import { validateProfile, checkEligibility } from '../lib/domain.mjs';
import { fetchEnrollment } from '../lib/partner.mjs';
import { catalog } from '../lib/catalog.mjs';
const alice = { userId: 'test-alice' }, bob = { userId: 'test-bob' };
const profile = { full_name: 'นักศึกษา ทดสอบ', faculty: 'Information Technology', major: 'Software Engineering', study_year: 2, gpa: 3.5 };
function database() {
    const sqlite = new DatabaseSync(':memory:');
    sqlite.exec('PRAGMA foreign_keys=ON');
    sqlite.exec(readFileSync(new URL('../drizzle/0000_smiling_mandarin.sql', import.meta.url), 'utf8'));
    const db = { prepare(sql) { let args = []; return { bind(...a) { args = a; return this; }, async first() { return sqlite.prepare(sql).get(...args) ?? null; }, async all() { return { results: sqlite.prepare(sql).all(...args) }; }, async run() { return { meta: sqlite.prepare(sql).run(...args) }; } }; }, async batch(statements) { sqlite.exec('BEGIN'); try {
            const r = [];
            for (const s of statements)
                r.push(await s.run());
            sqlite.exec('COMMIT');
            return r;
        }
        catch (e) {
            sqlite.exec('ROLLBACK');
            throw e;
        } } };
    return { db, sqlite };
}
async function request(db, path, method = 'GET', body, user = alice, options = {}) {
    const headers = { 'Content-Type': 'application/json', Origin: 'https://test.local', ...options.headers };
    const req = new Request(`https://test.local/api/${path}`, { method, headers, ...(body !== undefined ? { body: typeof body === 'string' ? body : JSON.stringify(body) } : {}) });
    const response = await handleApi(req, { db, user, fetcher: options.fetcher, partnerToken: options.partnerToken });
    return { status: response.status, body: await response.json() };
}
async function ready(db) { await request(db, 'profile', 'POST', profile); await request(db, 'saved', 'POST', { scholarship_id: catalog[0].id }); const state = (await request(db, 'state')).body; for (const c of state.checks)
    await request(db, 'checklist', 'PATCH', { id: c.id, completed: true }); }
test('catalog is explicitly fictional and browseable without authentication', async () => { const r = await request(undefined, 'scholarships', 'GET', undefined, null); assert.equal(r.status, 200); assert.equal(r.body.data.length, 4); assert.equal(r.body.dataset, 'fictional-classroom-demo'); });
test('anonymous write is rejected with 401', async () => { const { db } = database(); assert.equal((await request(db, 'profile', 'POST', profile, null)).status, 401); });
test('cross-origin write is rejected before database mutation', async () => { const { db, sqlite } = database(); assert.equal((await request(db, 'profile', 'POST', profile, alice, { headers: { Origin: 'https://evil.example' } })).status, 403); assert.equal(sqlite.prepare('SELECT COUNT(*) AS n FROM users').get().n, 0); });
test('invalid JSON, unsupported types and oversized payloads are rejected', async () => { const { db } = database(); assert.equal((await request(db, 'profile', 'POST', '{bad')).status, 400); assert.equal((await request(db, 'profile', 'POST', [])).status, 400); assert.equal((await request(db, 'profile', 'POST', profile, alice, { headers: { 'Content-Type': 'text/plain' } })).status, 415); assert.equal((await request(db, 'profile', 'POST', { extra: 'x'.repeat(9000) })).status, 413); });
test('GPA bounds, missing GPA, HTML input and fractional study year fail validation', () => { for (const bad of [{ gpa: 4.1 }, { gpa: -1 }, { gpa: '' }, { gpa: true }, { full_name: '<script>x</script>' }, { study_year: 1.5 }])
    assert.throws(() => validateProfile({ ...profile, ...bad })); });
test('eligibility rejects expired scholarship, missing profile and low GPA', () => { assert.equal(checkEligibility(null, catalog[0]).eligible, false); assert.equal(checkEligibility({ ...profile, gpa: 2 }, catalog[0], new Date('2026-11-09')).eligible, false); assert.equal(checkEligibility(profile, catalog[0], new Date('2027-02-01')).eligible, false); assert.equal(checkEligibility(profile, catalog[0], new Date('2026-12-31T10:00:00Z')).eligible, true); });
test('complete happy path persists profile, saved item, checklist and submitted application', async () => { const { db } = database(); await ready(db); const r = await request(db, 'applications', 'POST', { scholarship_id: catalog[0].id, acknowledged: true }); assert.equal(r.status, 201); assert.equal(r.body.status, 'submitted'); const state = (await request(db, 'state')).body; assert.equal(state.profile.gpa, 3.5); assert.equal(state.saved.length, 1); assert.equal(state.checks.filter(c => c.completed).length, 3); assert.equal(state.applications.length, 1); });
test('retries create neither duplicate bookmarks nor duplicate applications', async () => { const { db } = database(); await ready(db); await request(db, 'saved', 'POST', { scholarship_id: catalog[0].id }); const body = { scholarship_id: catalog[0].id, acknowledged: true }; const first = await request(db, 'applications', 'POST', body), retry = await request(db, 'applications', 'POST', body); assert.equal(retry.status, 200); assert.equal(retry.body.id, first.body.id); assert.equal(retry.body.replayed, true); const state = (await request(db, 'state')).body; assert.equal(state.saved.length, 1); assert.equal(state.checks.length, 3); assert.equal(state.applications.length, 1); });
test('incomplete checklist and missing acknowledgement prevent submission', async () => { const { db } = database(); await request(db, 'profile', 'POST', profile); await request(db, 'saved', 'POST', { scholarship_id: catalog[0].id }); assert.equal((await request(db, 'applications', 'POST', { scholarship_id: catalog[0].id, acknowledged: true })).status, 400); assert.equal((await request(db, 'applications', 'POST', { scholarship_id: catalog[0].id, acknowledged: false })).status, 400); });
test('owner isolation prevents reading and editing another user checklist', async () => { const { db } = database(); await ready(db); const a = (await request(db, 'state')).body; const b = (await request(db, 'state', 'GET', undefined, bob)).body; assert.equal(b.profile, null); assert.equal(b.saved.length, 0); assert.equal(b.checks.length, 0); assert.equal((await request(db, 'checklist', 'PATCH', { id: a.checks[0].id, completed: false }, bob)).status, 404); assert.equal((await request(db, 'state')).body.checks[0].completed, 1); });
test('SQL-looking names are parameter values and cannot drop tables', async () => { const { db, sqlite } = database(); assert.equal((await request(db, 'profile', 'POST', { ...profile, full_name: "Robert'); DROP TABLE users;--" })).status, 200); assert.equal(sqlite.prepare('SELECT COUNT(*) AS n FROM users').get().n, 1); });
test('deleting saved scholarship cascades checklist', async () => { const { db } = database(); await ready(db); assert.equal((await request(db, 'saved', 'DELETE', { scholarship_id: catalog[0].id })).status, 200); const s = (await request(db, 'state')).body; assert.equal(s.saved.length, 0); assert.equal(s.checks.length, 0); });
test('account deletion is explicit and cascades all owned business records', async () => { const { db, sqlite } = database(); await ready(db); await request(db, 'applications', 'POST', { scholarship_id: catalog[0].id, acknowledged: true }); assert.equal((await request(db, 'account', 'DELETE', { confirm: 'no' })).status, 400); assert.equal((await request(db, 'account', 'DELETE', { confirm: 'DELETE' })).status, 200); for (const table of ['users', 'student_profiles', 'saved_scholarships', 'checklist_items', 'applications', 'integration_logs'])
    assert.equal(sqlite.prepare(`SELECT COUNT(*) AS n FROM ${table}`).get().n, 0); });
test('partner success strips student names and emails; records real outcome metadata', async () => { const { db, sqlite } = database(); const fetcher = async () => Response.json({ success: true, data: [{ student_name: 'Private Name', email: 'private@example.com', course_code: 'SWE204', course_title: 'Architecture', status: 'ENROLLED' }] }); const r = await request(db, 'integration/enrollment', 'POST', {}, alice, { fetcher }); assert.equal(r.status, 200); assert.equal(r.body.courses.length, 1); assert.doesNotMatch(JSON.stringify(r.body), /Private Name|private@example/); assert.equal(sqlite.prepare('SELECT status FROM integration_logs').get().status, 'connected'); });
test('upstream 503 is reported honestly; application system remains available', async () => { const { db } = database(); const r = await request(db, 'integration/enrollment', 'POST', {}, alice, { fetcher: async () => new Response('down', { status: 503 }) }); assert.equal(r.status, 502); assert.equal(r.body.status, 'unavailable'); assert.equal(r.body.http_status, 503); await ready(db); assert.equal((await request(db, 'applications', 'POST', { scholarship_id: catalog[0].id, acknowledged: true })).status, 201); });
test('malformed upstream response and network failure never become successful integration', async () => { const malformed = await fetchEnrollment(async () => Response.json({ unexpected: true })); assert.equal(malformed.status, 'unavailable'); const down = await fetchEnrollment(async () => { throw new Error('network down'); }); assert.equal(down.status, 'unavailable'); assert.deepEqual(down.courses, []); });
test('persistent per-user write limit returns 429', async () => { const { db } = database(); let last; for (let i = 0; i < 41; i++)
    last = await request(db, 'profile', 'POST', profile); assert.equal(last.status, 429); });
test('partner bearer token is sent server-to-server and never appears in result or database log', async () => { const { db, sqlite } = database(); let auth; const r = await request(db, 'integration/enrollment', 'POST', {}, alice, { partnerToken: 'test-token-not-real', fetcher: async (url, options) => { auth = options.headers.Authorization; return Response.json({ success: true, data: [] }); } }); assert.equal(auth, 'Bearer test-token-not-real'); assert.equal(r.status, 200); assert.doesNotMatch(JSON.stringify(r.body), /test-token-not-real/); assert.doesNotMatch(JSON.stringify(sqlite.prepare('SELECT * FROM integration_logs').all()), /test-token-not-real/); });
test('submitted application locks document checklist on the server', async () => { const { db } = database(); await ready(db); await request(db, 'applications', 'POST', { scholarship_id: catalog[0].id, acknowledged: true }); const c = (await request(db, 'state')).body.checks[0]; assert.equal((await request(db, 'checklist', 'PATCH', { id: c.id, completed: false })).status, 409); });
