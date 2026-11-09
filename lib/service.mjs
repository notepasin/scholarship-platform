import { catalog, getScholarship } from './catalog.mjs';
import { AppError, validateProfile, checkEligibility, assertSameOrigin, parseBody } from './domain.mjs';
import { fetchEnrollment, PARTNER_URL } from './partner.mjs';
const now = () => new Date().toISOString();
const stmt = (db, sql, ...args) => db.prepare(sql).bind(...args);
export async function ensureData(db, userId) {
    const sql = [stmt(db, 'INSERT OR IGNORE INTO users (id,created_at) VALUES (?,?)', userId, now())];
    for (const s of catalog) {
        sql.push(stmt(db, 'INSERT OR IGNORE INTO scholarships (id,title,description,provider,amount,deadline,category,min_gpa,status) VALUES (?,?,?,?,?,?,?,?,?)', s.id, s.title, s.description, s.provider, s.amount, s.deadline, s.category, s.minGpa, s.status));
        sql.push(stmt(db, 'INSERT OR IGNORE INTO scholarship_eligibility (id,scholarship_id,condition_type,condition_value) VALUES (?,?,?,?)', `${s.id}-gpa`, s.id, 'min_gpa', String(s.minGpa)));
        s.requirements.forEach((r, i) => sql.push(stmt(db, 'INSERT OR IGNORE INTO scholarship_requirements (id,scholarship_id,document_name) VALUES (?,?,?)', `${s.id}-r${i}`, s.id, r)));
    }
    await db.batch(sql);
}
function json(body, status = 200) { return Response.json(body, { status, headers: { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'same-origin' } }); }
async function limit(db, userId) {
    const minute = Math.floor(Date.now() / 60000), raw = new TextEncoder().encode(userId);
    const digest = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', raw))).map(n => n.toString(16).padStart(2, '0')).join('');
    const key = `${digest}:${minute}`;
    const r = await stmt(db, 'INSERT INTO rate_limits (key,hits,expires_at) VALUES (?,1,?) ON CONFLICT(key) DO UPDATE SET hits=hits+1 RETURNING hits', key, minute * 60 + 120).first();
    if (r.hits > 40)
        throw new AppError(429, 'ส่งคำขอถี่เกินไป กรุณารอสักครู่');
    await stmt(db, 'DELETE FROM rate_limits WHERE expires_at < ?', Math.floor(Date.now() / 1000)).run();
}
export async function handleApi(request, { db, user, fetcher = fetch, partnerToken }) {
    try {
        const url = new URL(request.url), path = url.pathname.replace(/\/$/, '');
        if (request.method === 'GET' && path === '/api/scholarships')
            return json({ data: catalog, dataset: 'fictional-classroom-demo' });
        if (request.method === 'GET' && path === '/api/health')
            return json({ ok: true, service: 'scholarship-hub', version: '1.0.0' });
        if (!user?.userId)
            throw new AppError(401, 'ลงชื่อเข้าใช้ก่อนบันทึกข้อมูล');
        if (!db)
            throw new AppError(503, 'ฐานข้อมูลยังไม่พร้อม กรุณาตรวจการตั้งค่า DB');
        if (request.method === 'GET' && path === '/api/state') {
            const [profile, saved, checks, applications, logs] = await Promise.all([
                stmt(db, 'SELECT full_name,faculty,major,study_year,gpa FROM student_profiles WHERE user_id=?', user.userId).first(),
                stmt(db, 'SELECT id,scholarship_id,saved_at FROM saved_scholarships WHERE user_id=? ORDER BY saved_at DESC', user.userId).all(),
                stmt(db, 'SELECT c.id,c.requirement_id,c.completed,s.scholarship_id FROM checklist_items c JOIN saved_scholarships s ON c.saved_id=s.id WHERE s.user_id=?', user.userId).all(),
                stmt(db, 'SELECT id,scholarship_id,status,created_at FROM applications WHERE user_id=? ORDER BY created_at DESC', user.userId).all(),
                stmt(db, 'SELECT id,partner,status,http_status,duration_ms,course_count,created_at FROM integration_logs WHERE user_id=? ORDER BY created_at DESC LIMIT 12', user.userId).all(),
            ]);
            return json({ profile, saved: saved.results, checks: checks.results, applications: applications.results, logs: logs.results });
        }
        if (!['POST', 'PATCH', 'DELETE'].includes(request.method))
            throw new AppError(404, 'ไม่พบคำสั่ง API');
        assertSameOrigin(request);
        const body = await parseBody(request);
        await limit(db, user.userId);
        await ensureData(db, user.userId);
        if (request.method === 'POST' && path === '/api/profile') {
            const p = validateProfile(body);
            await stmt(db, 'INSERT INTO student_profiles (user_id,full_name,faculty,major,study_year,gpa,updated_at) VALUES (?,?,?,?,?,?,?) ON CONFLICT(user_id) DO UPDATE SET full_name=excluded.full_name,faculty=excluded.faculty,major=excluded.major,study_year=excluded.study_year,gpa=excluded.gpa,updated_at=excluded.updated_at', user.userId, p.full_name, p.faculty, p.major, p.study_year, p.gpa, now()).run();
            return json({ profile: p });
        }
        if (path === '/api/saved' && request.method === 'POST') {
            const s = getScholarship(body.scholarship_id);
            if (!s)
                throw new AppError(404, 'ไม่พบทุน');
            const id = crypto.randomUUID(), time = now();
            // Natural unique key makes a retried save safe, including concurrent requests.
            await stmt(db, 'INSERT OR IGNORE INTO saved_scholarships (id,user_id,scholarship_id,saved_at) VALUES (?,?,?,?)', id, user.userId, s.id, time).run();
            const row = await stmt(db, 'SELECT id FROM saved_scholarships WHERE user_id=? AND scholarship_id=?', user.userId, s.id).first();
            await db.batch(s.requirements.map((_, i) => stmt(db, 'INSERT OR IGNORE INTO checklist_items (id,saved_id,requirement_id,completed,updated_at) VALUES (?,?,?,0,?)', crypto.randomUUID(), row.id, `${s.id}-r${i}`, time)));
            return json({ id: row.id }, 201);
        }
        if (path === '/api/saved' && request.method === 'DELETE') {
            const app = await stmt(db, 'SELECT id FROM applications WHERE user_id=? AND scholarship_id=?', user.userId, String(body.scholarship_id)).first();
            if (app)
                throw new AppError(409, 'ทุนที่ส่งใบสมัครแล้วจะเก็บไว้ในรายการของคุณ');
            await stmt(db, 'DELETE FROM saved_scholarships WHERE user_id=? AND scholarship_id=?', user.userId, String(body.scholarship_id)).run();
            return json({ deleted: true });
        }
        if (path === '/api/checklist' && request.method === 'PATCH') {
            if (typeof body.completed !== 'boolean' || typeof body.id !== 'string')
                throw new AppError(400, 'ข้อมูลเช็กลิสต์ไม่ถูกต้อง');
            const owner = await stmt(db, 'SELECT s.scholarship_id FROM checklist_items c JOIN saved_scholarships s ON c.saved_id=s.id WHERE c.id=? AND s.user_id=?', body.id, user.userId).first();
            if (!owner)
                throw new AppError(404, 'ไม่พบเอกสารของคุณ');
            const submitted = await stmt(db, 'SELECT id FROM applications WHERE user_id=? AND scholarship_id=?', user.userId, owner.scholarship_id).first();
            if (submitted)
                throw new AppError(409, 'ส่งใบสมัครแล้ว ไม่สามารถแก้เช็กลิสต์ได้');
            const row = await stmt(db, 'UPDATE checklist_items SET completed=?,updated_at=? WHERE id=? AND saved_id IN (SELECT id FROM saved_scholarships WHERE user_id=?) RETURNING id', body.completed ? 1 : 0, now(), body.id, user.userId).first();
            if (!row)
                throw new AppError(404, 'ไม่พบเอกสารของคุณ');
            return json({ updated: true });
        }
        if (path === '/api/applications' && request.method === 'POST') {
            const s = getScholarship(body.scholarship_id);
            if (!s)
                throw new AppError(404, 'ไม่พบทุน');
            if (body.acknowledged !== true)
                throw new AppError(400, 'อ่านและรับทราบการใช้ข้อมูลก่อนส่งใบสมัคร');
            const existing = await stmt(db, 'SELECT id,status FROM applications WHERE user_id=? AND scholarship_id=?', user.userId, s.id).first();
            if (existing)
                return json({ ...existing, replayed: true });
            const profile = await stmt(db, 'SELECT * FROM student_profiles WHERE user_id=?', user.userId).first();
            const result = checkEligibility(profile, s);
            if (!result.eligible)
                throw new AppError(400, result.reason);
            const saved = await stmt(db, 'SELECT id FROM saved_scholarships WHERE user_id=? AND scholarship_id=?', user.userId, s.id).first();
            if (!saved)
                throw new AppError(400, 'บันทึกทุนและเตรียมเอกสารก่อนสมัคร');
            const count = await stmt(db, 'SELECT COUNT(*) AS total,SUM(completed) AS completed FROM checklist_items WHERE saved_id=?', saved.id).first();
            if (count.total !== s.requirements.length || count.completed !== s.requirements.length)
                throw new AppError(400, 'กรุณาติ๊กเอกสารที่เตรียมครบก่อนสมัคร');
            const id = `SCH-${crypto.randomUUID()}`;
            await stmt(db, 'INSERT OR IGNORE INTO applications (id,user_id,scholarship_id,status,consent_version,created_at) VALUES (?,?,?,?,?,?)', id, user.userId, s.id, 'submitted', 'privacy-v1', now()).run();
            const application = await stmt(db, 'SELECT id,status FROM applications WHERE user_id=? AND scholarship_id=?', user.userId, s.id).first();
            return json({ ...application, replayed: application.id !== id }, application.id === id ? 201 : 200);
        }
        if (path === '/api/integration/enrollment' && request.method === 'POST') {
            const result = await fetchEnrollment(fetcher, partnerToken), time = now(), id = crypto.randomUUID();
            await stmt(db, 'INSERT INTO integration_logs (id,user_id,partner,status,http_status,duration_ms,course_count,created_at) VALUES (?,?,?,?,?,?,?,?)', id, user.userId, 'team03-enrollment', result.status, result.http_status, result.duration_ms, result.courses.length, time).run();
            return json({ ...result, id, requested_at: time, partner_url: PARTNER_URL, notice: 'ข้อมูลทดสอบ student_id=1 ไม่ใช่การยืนยันตัวตนหรือคุณสมบัติของผู้สมัคร' }, result.status === 'connected' ? 200 : 502);
        }
        if (path === '/api/account' && request.method === 'DELETE') {
            if (body.confirm !== 'DELETE')
                throw new AppError(400, 'ยืนยันการลบข้อมูลก่อน');
            await stmt(db, 'DELETE FROM users WHERE id=?', user.userId).run();
            return json({ deleted: true });
        }
        throw new AppError(404, 'ไม่พบคำสั่ง API');
    }
    catch (error) {
        if (error instanceof AppError)
            return json({ error: error.message }, error.status);
        console.error('Scholarship API error', { type: error?.name || 'UnknownError' });
        return json({ error: 'ระบบประมวลผลไม่สำเร็จ กรุณาลองใหม่' }, 500);
    }
}
