# Scholarship Hub — Cloudflare deployment owned by Group 15

โค้ดชุดนี้ใช้บัญชีและฐานข้อมูลของโครงงานเอง ไม่มีโฟลเดอร์ `.openai` และไม่ใช้บัญชีล็อกอินจากโฮสต์เดิม

## ตอนนี้ทำอะไรต่อจากการขึ้น GitHub แล้ว

1. สร้าง branch `feature/cloudflare-deploy` ใน repo เดิม
2. ใช้ไฟล์ `cloudflare-update.patch` จากชุดอัปเดต โดยตรวจ `git apply --check` ก่อน อย่าเขียนทับทั้ง repo หรือย้าย `.git`
3. ติดตั้ง Node.js 24 ขึ้นไป แล้วเปิด Terminal ที่โฟลเดอร์ซึ่งมี `package.json`
4. รัน:

```bash
npm install
npm run setup
npm run dev
```

เปิด URL ที่ Terminal แสดง ปกติ `http://localhost:5173` แล้วไปหน้า `/login` สร้างบัญชีทดสอบ ชื่อบัญชีใช้ a-z, ตัวเลข, `_` จำนวน 3–32 ตัว รหัสผ่านอย่างน้อย 12 ตัวอักษร ใช้รหัสเฉพาะสำหรับโครงงาน

`setup` สร้าง `.dev.vars` พร้อมค่า random `AUTH_PEPPER` และ `PARTNER_API_KEY` โดยไม่พิมพ์ค่าออกมา และ apply migrations ให้ D1 **ในเครื่อง** หากไฟล์มีอยู่แล้วจะเก็บค่าเดิม ห้ามเปลี่ยน pepper หลังสร้างบัญชีโดยไม่วางแผนรีเซ็ตรหัสผ่าน ห้าม commit `.dev.vars` ฐานข้อมูล local ชุดใหม่เก็บใน `.wrangler/standalone-state` แยกจากฐานข้อมูล local ของชุดเดิม

หากมี `pnpm-lock.yaml` และทีมเลือกใช้ pnpm ให้ใช้ `pnpm install --frozen-lockfile` และ `pnpm run ...` แทน เลือก package manager เดียวเพื่อไม่สร้าง lockfile หลายแบบ

## ทดสอบเส้นทางหลักในเครื่อง

สร้างบัญชี → ข้อมูลนักศึกษา → ใส่ข้อมูลสมมติ → บันทึก → ค้นหาทุน ASEAN → บันทึกทุน → เปิดรายละเอียด → ติ๊กเอกสาร 3 รายการ → รับทราบการใช้ข้อมูล → ส่งใบสมัคร → ดูเลข SCH-… → refresh → ออกจากระบบแล้วล็อกอินใหม่ → ข้อมูลยังอยู่

บัญชีนี้เป็นบัญชีสำหรับโครงงาน ไม่ได้ยืนยันตัวตนนักศึกษาจริง ข้อมูลทุนเป็นข้อมูลสมมติ ไม่มีการอนุมัติทุน จ่ายเงิน หรือรับอัปโหลดเอกสารจริง

```bash
npm test
npm run typecheck
npm run build
node scripts/smoke-worker.mjs
```

## บันทึกงานและให้เพื่อนทำต่อ

หลังทดสอบแล้ว:

```bash
git add .
git commit -m "Make scholarship platform deployable on our Cloudflare account"
git push -u origin feature/cloudflare-deploy
```

เปิด Pull Request ตรวจแล้วค่อย merge เข้า main เพื่อน clone/pull แล้วรัน `npm install`, `npm run setup`, `npm run dev` ในเครื่องตนเอง แต่ละเครื่องมี D1 local และ secrets ของตนเอง

## Deploy ขึ้น Cloudflare ของทีม

### 1. ลงชื่อเข้าใช้ Cloudflare จากเครื่องของคุณ

```bash
npm run cf:login
```

ทำขั้นตอน sign-in ใน browser ของคุณ ไม่ต้องส่ง password, token หรือ secrets มาทางแชท

### 2. สร้าง D1 ของทีม

```bash
npm run cf:database
```

คำสั่งสร้างฐานข้อมูลชื่อ `scholarship-db` ให้คัดลอก `database_id` ที่ได้ ไปแทน UUID ตัวอย่างใน `wrangler.jsonc` ตรง `d1_databases[0].database_id` ชื่อ binding ต้องยังเป็น `DB`

หากมีฐานข้อมูลชื่อนี้แล้ว ใช้ฐานข้อมูลที่ยืนยันว่าเป็นของโครงงานและมี schema ที่ถูกต้อง อย่าลบหรือทับฐานข้อมูลของโครงงานอื่น

### 3. Deploy ครั้งแรก

```bash
npm run deploy
```

คำสั่งนี้ตรวจ database ID, apply migrations **บน cloud**, build แล้ว deploy Worker/หน้าเว็บให้ ได้ URL จริงจาก Terminal เช่นรูปแบบ `https://<worker-name>.<account-subdomain>.workers.dev` ซึ่งไม่มีคำว่า chatgpt

เว็บไซต์จะเปิดได้ แต่บัญชีล็อกอินยังต้องตั้ง secret ในขั้นถัดไปก่อนใช้

### 4. ตั้งค่าลับบน cloud

เปิดไฟล์ `.dev.vars` ในเครื่องของคุณเพื่อดูค่า แล้วรันทีละคำสั่งและวางเฉพาะค่าที่ CLI ขอ:

```bash
npx wrangler secret put AUTH_PEPPER --config wrangler.jsonc
npx wrangler secret put PARTNER_API_KEY --config wrangler.jsonc
```

ค่า AUTH_PEPPER ต้องยาวอย่างน้อย 32 ตัว เก็บไว้ใน password manager ของทีม และไม่ใส่ใน `wrangler.jsonc` หรือ Git

หากได้รับ Bearer token จาก Team 03 แล้ว:

```bash
npx wrangler secret put ENROLLMENT_BEARER_TOKEN --config wrangler.jsonc
```

การแก้ secrets จะสร้าง worker version ใหม่ตามพฤติกรรมของ Wrangler ข้อมูล local กับ cloud แยกกัน ต้องสร้างบัญชีทดสอบใหม่บนเว็บออนไลน์ด้วย

### 5. ทดสอบออนไลน์กับทีมจริง

ทดสอบ login → save → checklist → submit → refresh/logout/login และให้สมาชิกอีกบัญชีตรวจว่าไม่เห็นข้อมูลของกันและกัน จากนั้นประสาน Team 03 และกลุ่มที่ใช้ API ของเราให้ทดสอบพร้อมกัน

## API ของเราให้กลุ่มอื่นเชื่อม

### รายการทุนสาธารณะ

`GET /api/scholarships` ส่งเฉพาะทุนสมมติ 4 รายการ ไม่มีข้อมูลนักศึกษา

### API สำหรับกลุ่มคู่เชื่อมพร้อมหลักฐาน

`GET /api/partner/scholarships` ใช้ header `Authorization: Bearer <PARTNER_API_KEY>` เรียกจาก Backend ของเพื่อน ไม่ฝัง key ในหน้าเว็บสาธารณะ

ผลลัพธ์มี `provider`, `request_id`, `generated_at` และ `data` ฝั่งเราบันทึก request_id เดียวกันในตาราง `provider_access_logs` ให้เทียบหลักฐานสองฝั่งได้ ค่าคีย์แชร์กับกลุ่มที่ได้รับอนุญาตผ่านช่องทางส่วนตัวของทีม ไม่ใส่ใน screenshot หรือ Git

ตัวอย่าง (แทน origin และ environment variable ด้วยค่าบนเครื่องของคู่เชื่อม):

```bash
curl "https://YOUR_WORKER.YOUR_SUBDOMAIN.workers.dev/api/partner/scholarships" -H "Authorization: Bearer YOUR_PARTNER_KEY"
```

`YOUR_WORKER...` เป็น placeholder ไม่ใช่ URL ที่ deploy ให้แล้ว มี script `scripts/test-partner.mjs` สำหรับบันทึก response ลงไฟล์ โดยไม่บันทึก key อ่าน `docs/API.md`

## การเรียก API ของ Team 03

`POST /api/integration/enrollment` จะเรียก endpoint Enrollment ที่ระบุในเอกสารเดิม ใช้ student_id=1 เพื่อทดสอบเท่านั้น ปลายทางเคยตอบ HTTP 401 ว่าต้องใช้ Bearer token โค้ดรองรับ secret แล้ว แต่ **ยังไม่ถือว่าเชื่อมสำเร็จ** จนกว่าจะใส่ token ที่ได้รับอนุญาตและทดสอบจริง

ไม่ได้ต่อ Team 04 หรือสร้าง Webhook/HMAC/background queue ในชุดนี้

## โครงสร้างหลัก

| ไฟล์ | หน้าที่ |
|---|---|
| app/scholarship-app.tsx | หน้าเว็บและคำขอไป API |
| app/login/login-form.tsx | ฟอร์มสมัครบัญชี / ล็อกอิน |
| app/auth.ts | อ่าน session ที่ยืนยันจากฐานข้อมูลแล้ว |
| lib/auth.mjs | hash password, rate limit, sessions และ cookies |
| lib/service.mjs | ข้อมูลโปรไฟล์ บันทึกทุน เช็กลิสต์ และใบสมัคร |
| lib/provider.mjs | API read-only สำหรับกลุ่มคู่เชื่อม |
| lib/partner.mjs | เรียก Team 03 แบบ server-to-server |
| db/schema.ts / drizzle | schema และ migrations |
| wrangler.jsonc | Cloudflare Worker + D1 ของทีม |
| scripts/setup.mjs / deploy.mjs | เตรียม local และ deploy ผ่านบัญชีของทีม |

## ขอบเขตความปลอดภัย

ใช้ opaque sessions ที่เซิร์ฟเวอร์เก็บเฉพาะแฮช Cookie เป็น HttpOnly/SameSite=Lax และ Secure บน HTTPS; ตรวจ Origin บน write; ตรวจเจ้าของข้อมูล; bound SQL; input/body/rate limits; partner URL allowlist

บัญชีเก็บ salted password hash กับ server-side pepper ไม่เก็บ plaintext password การ hash ใช้ PBKDF2-SHA256 100,000 iterations ตามขีดจำกัด per-call ของ runtime พร้อม pepper นี่เป็นระบบสาธิต ยังไม่มี MFA, password reset, email verification, account recovery หรือการตรวจช่องโหว่แบบเต็ม ดู SECURITY.md ก่อนใช้ข้อมูลจริง

## การใช้ AI และการประเมิน

AI ช่วยสร้างและแก้โค้ด ทดสอบ และเอกสาร ทีมต้องอธิบาย source, ทำ minor modification, deploy และบันทึกงานของแต่ละคนจริงตามโจทย์อาจารย์ ไม่สร้าง commit หรือผลทดสอบย้อนหลัง

อ่าน `docs/TESTING.md`, `docs/SECURITY.md`, `docs/API.md` และ `docs/DEPLOY_CHECKLIST.md`
