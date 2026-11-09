import { AppError } from './domain.mjs';
export const PARTNER_URL = 'https://unienroll-backend.team03-enrollment.workers.dev/api/enrollments?student_id=1';
// Fixed demonstration student from supplied evidence. Arbitrary URLs/student lookups are not accepted.
export async function fetchEnrollment(fetcher = fetch, bearerToken) {
    const started = Date.now();
    try {
        const response = await fetcher(PARTNER_URL, { headers: { Accept: 'application/json', ...(bearerToken ? { Authorization: `Bearer ${bearerToken}` } : {}) }, signal: AbortSignal.timeout(7000), redirect: 'error' });
        if (!response.ok)
            return { status: 'unavailable', http_status: response.status, duration_ms: Date.now() - started, courses: [], message: response.status === 401 ? 'ระบบลงทะเบียนต้องใช้ Bearer token ที่ได้รับจาก Team 03' : `ระบบลงทะเบียนตอบ HTTP ${response.status}` };
        const raw = await response.text();
        if (raw.length > 100000)
            throw new AppError(502, 'ผลลัพธ์จากระบบลงทะเบียนมีขนาดใหญ่เกินไป');
        const data = JSON.parse(raw);
        if (data.success !== true || !Array.isArray(data.data))
            throw new AppError(502, 'รูปแบบข้อมูลจากระบบลงทะเบียนไม่ตรงตามที่ตกลง');
        const courses = data.data.slice(0, 50).map(r => ({ course_code: String(r.course_code ?? '').slice(0, 30), course_title: String(r.course_title ?? '').slice(0, 150), status: String(r.status ?? '').slice(0, 30), section_number: String(r.section_number ?? '').slice(0, 10) }));
        return { status: 'connected', http_status: response.status, duration_ms: Date.now() - started, courses, message: 'รับข้อมูลจาก Team 03 สำเร็จ' };
    }
    catch (error) {
        return { status: 'unavailable', http_status: null, duration_ms: Date.now() - started, courses: [], message: error instanceof AppError ? error.message : 'ติดต่อระบบลงทะเบียนไม่ได้ กรุณาลองใหม่ภายหลัง' };
    }
}
