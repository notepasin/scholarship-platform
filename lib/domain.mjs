export class AppError extends Error {
    constructor(status, message) { super(message); this.status = status; }
}
export function validateProfile(input) {
    const out = {};
    for (const key of ['full_name', 'faculty', 'major']) {
        if (typeof input[key] !== 'string' || input[key].trim().length < 2 || input[key].length > 120 || /[<>\x00-\x1f]/.test(input[key]))
            throw new AppError(400, 'กรอกชื่อ คณะ และสาขาให้ครบ โดยไม่ใช้แท็ก HTML');
        out[key] = input[key].trim();
    }
    if (!['number', 'string'].includes(typeof input.gpa) || input.gpa === '' || input.gpa == null || typeof input.gpa === 'boolean' || !Number.isFinite(Number(input.gpa)) || Number(input.gpa) < 0 || Number(input.gpa) > 4)
        throw new AppError(400, 'GPA ต้องอยู่ระหว่าง 0.00–4.00');
    if (!['number', 'string'].includes(typeof input.study_year) || !Number.isInteger(Number(input.study_year)) || Number(input.study_year) < 1 || Number(input.study_year) > 8)
        throw new AppError(400, 'ชั้นปีต้องอยู่ระหว่าง 1–8');
    return { ...out, gpa: Number(input.gpa), study_year: Number(input.study_year) };
}
export function checkEligibility(profile, scholarship, now = new Date()) {
    if (!profile)
        return { eligible: false, reason: 'กรอกข้อมูลนักศึกษาก่อนตรวจคุณสมบัติ' };
    if (scholarship.status !== 'open' || now.toISOString().slice(0, 10) > scholarship.deadline)
        return { eligible: false, reason: 'ทุนนี้ปิดรับสมัครแล้ว' };
    if (profile.gpa < scholarship.minGpa)
        return { eligible: false, reason: `GPA ขั้นต่ำ ${scholarship.minGpa.toFixed(2)}` };
    return { eligible: true, reason: 'ผ่านเงื่อนไข GPA เบื้องต้น การอนุมัติขึ้นอยู่กับผู้พิจารณาทุน' };
}
export function assertSameOrigin(request) { const origin = request.headers.get('origin'); if (!origin || origin !== new URL(request.url).origin)
    throw new AppError(403, 'ไม่อนุญาตคำขอจากเว็บไซต์อื่น'); }
export async function parseBody(request) {
    if (!request.headers.get('content-type')?.includes('application/json'))
        throw new AppError(415, 'ต้องส่งข้อมูล JSON');
    if (Number(request.headers.get('content-length') || 0) > 8192)
        throw new AppError(413, 'ข้อมูลมีขนาดใหญ่เกินไป');
    const reader = request.body?.getReader();
    if (!reader)
        throw new AppError(400, 'ไม่พบข้อมูล');
    let size = 0, chunks = [];
    while (true) {
        const { done, value } = await reader.read();
        if (done)
            break;
        size += value.byteLength;
        if (size > 8192) {
            await reader.cancel();
            throw new AppError(413, 'ข้อมูลมีขนาดใหญ่เกินไป');
        }
        chunks.push(value);
    }
    const bytes = new Uint8Array(size);
    let offset = 0;
    for (const c of chunks) {
        bytes.set(c, offset);
        offset += c.length;
    }
    let body;
    try {
        body = JSON.parse(new TextDecoder().decode(bytes));
    }
    catch {
        throw new AppError(400, 'JSON ไม่ถูกต้อง');
    }
    if (!body || typeof body !== 'object' || Array.isArray(body))
        throw new AppError(400, 'ข้อมูลต้องเป็น JSON object');
    return body;
}
