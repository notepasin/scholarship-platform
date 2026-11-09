# Scholarship Hub API

ทุก response เป็น JSON; ข้อมูลบัญชีส่วนตัวใช้ `Cache-Control: no-store` การเรียก production อยู่หลัง access policy ของ Site

| Method | Path | ต้องลงชื่อเข้าใช้ | หน้าที่ |
|---|---|---|---|
| GET | /api/health | ชั้นแอปไม่บังคับ | สถานะ service |
| GET | /api/scholarships | ชั้นแอปไม่บังคับ | ข้อมูลทุนสมมติ |
| GET | /api/state | ใช่ | โปรไฟล์ บันทึก เช็กลิสต์ ใบสมัคร logs ของตนเอง |
| POST | /api/profile | ใช่ | สร้าง/แก้โปรไฟล์ |
| POST | /api/saved | ใช่ | บันทึกทุนแบบป้องกันซ้ำด้วย unique constraint |
| DELETE | /api/saved | ใช่ | นำทุนที่ยังไม่ส่งใบสมัครออก พร้อม checklist |
| PATCH | /api/checklist | ใช่ | เปลี่ยนความพร้อมเอกสารของตนเอง |
| POST | /api/applications | ใช่ | ส่งใบสมัคร ป้องกันซ้ำตามบัญชี+ทุน |
| POST | /api/integration/enrollment | ใช่ | ทดสอบเรียก API จริงของ Team 03 |
| DELETE | /api/account | ใช่ | ลบข้อมูลธุรกิจของตนเอง ต้องยืนยัน |

คำขอเปลี่ยนข้อมูลต้องมี `Origin` ตรงกับ origin ของเว็บและ `Content-Type: application/json`; body ไม่เกิน 8 KiB, จำกัด 40 คำขอต่อบัญชีต่อช่วงนาที (fixed window)

## ตัวอย่าง body

`POST /api/profile`
```json
{"full_name":"นักศึกษา ทดสอบ","faculty":"Information Technology","major":"Software Engineering","study_year":2,"gpa":3.5}
```
`POST /api/saved` และ `POST /api/applications`
```json
{"scholarship_id":"asean-2026","acknowledged":true}
```
`PATCH /api/checklist` (ใช้ id จริงจาก `/api/state`)
```json
{"id":"CHECKLIST_ROW_ID","completed":true}
```
`POST /api/integration/enrollment`
```json
{}
```
`DELETE /api/account`
```json
{"confirm":"DELETE"}
```

## Errors

401 ไม่ลงชื่อเข้าใช้, 403 Origin ไม่ตรง, 400 input/คุณสมบัติ/เอกสารไม่ครบ, 404 resource ไม่พบหรือไม่ใช่เจ้าของ, 409 นำทุนที่ส่งใบสมัครแล้วออกไม่ได้, 413 body ใหญ่เกิน, 415 ไม่ใช่ JSON, 429 จำกัดความถี่, 502 คู่เชื่อมผิดพลาด, 503 ไม่มี DB binding

API ไม่รับ role/user_id จาก body เพื่อเลือกเจ้าของ ไม่เปิด endpoint อนุมัติทุนในรุ่นนี้

## Integration contract

ต้นทาง: `GET https://unienroll-backend.team03-enrollment.workers.dev/api/enrollments?student_id=1`

คาดหวัง `{ "success": true, "data": [ ... ] }` เลือกเฉพาะ `course_code`, `course_title`, `status`, `section_number` ไม่ส่งชื่อ/GPA ของผู้ใช้ไป ไม่คัดลอกชื่อนักศึกษาหรืออีเมลจาก response

URL ถูกกำหนดใน server ห้ามผู้ใช้เลือก URL arbitrary เพื่อป้องกัน SSRF ไม่ตาม redirect และ timeout 7 วินาที ข้อมูล student_id=1 มีไว้สาธิตเท่านั้น ยังไม่มีการผูกนักศึกษาจริงกับบัญชี

HTTP 200 จากคู่เชื่อมที่ไม่มี schema ตรงจะไม่แสดงว่าสำเร็จ หากคู่เชื่อมล่มจะคืน 502 พร้อมสถานะ unavailable และบันทึกผล ไม่มี mock fallback ที่แสร้งว่าสำเร็จ ไม่มี queue/retry background หรือ HMAC webhook ใน implementation ใหม่นี้

การเรียกจากกลุ่มอื่นมายัง private Site ต้องออกแบบสิทธิ์ service caller ผ่านกลไกที่ hosting รองรับ ห้ามแจก credential เจ้าของบัญชี

## Partner authentication (verified during this build)

Live endpoint returned HTTP 401 with `Unauthorized: Missing or invalid Authorization header. Expected Bearer token.` Configure server-only secret `ENROLLMENT_BEARER_TOKEN` with a valid token obtained from Team 03. `lib/partner.mjs` adds `Authorization: Bearer ...` only to the fixed server-to-server request. No token is included in browser code, response or integration log. Do not guess or reuse unrelated tokens.
