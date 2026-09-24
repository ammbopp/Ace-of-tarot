# 🪷 Ace of Tarot — AI Tarot Reading Platform

> **"Same Cards. New Perspectives. A Brighter You."**
> เว็บแอปพลิเคชันดูดวงและให้คำปรึกษาไพ่ทาโรต์เชิงจิตวิทยา (Psychological Tarot Advisor) ขับเคลื่อนด้วย AI พร้อมระบบสมาชิก, ไพ่ประจำวัน/streak ข้ามอุปกรณ์, ไพ่พรีเมียมแบบเติมเหรียญ, ดวงเกิด (Birth Chart), รองรับ 2 ภาษา (ไทย/อังกฤษ) และหน้า admin dashboard

---

## ✨ คุณสมบัติเด่น (Features)

* **Interactive Tarot Stage (Shuffle → Choose → Reveal)**
  * แอนิเมชันสับไพ่และคลี่ไพ่สำรับ 78 ใบให้เลือกด้วยสัญชาตญาณ พลิกเปิดไพ่แบบ 3 มิติ พร้อมภาพวาดไพ่มาตรฐาน Rider-Waite รองรับทั้งไพ่หน้าตรง/กลับหัว
* **AI-Powered Interpretation (Google Gemini)**
  * วิเคราะห์ตรงประเด็นกับคำถาม แบ่งเป็น Overview, Guidance & Timeline, มุมมองเจาะลึกตามหมวดหมู่, Action Plan และตีความไพ่ทีละตำแหน่งครบทุกใบ พร้อมถามคำถามต่อเนื่อง (Follow-up) จากไพ่ชุดเดิมได้โดยไม่ต้องจับใหม่
  * มีระบบ timeout + fallback reading อัตโนมัติ ถ้า Gemini ตอบช้า/ไม่ตอบสนอง ผู้ใช้จะไม่ต้องรอค้างไม่มีกำหนด
* **ไพ่ประจำวัน + Streak ข้ามอุปกรณ์**
  * จั่วไพ่ 1 ใบฟรีวันละครั้ง กรอกคำถามเองได้ นับ streak ต่อเนื่อง — sync ข้ามอุปกรณ์อัตโนมัติเมื่อล็อกอิน (guest ใช้ localStorage ในเครื่อง)
* **ระบบสมาชิก (Supabase Auth)**
  * สมัคร/ล็อกอินด้วยอีเมล พร้อมปุ่มโชว์/ซ่อนรหัสผ่าน, จำอีเมล (autocomplete ประวัติ), ตั้งชื่อเล่นแสดงแทนอีเมลใน nav bar, ย้ายข้อมูลจาก guest เข้าบัญชีอัตโนมัติตอนสมัคร/ล็อกอินครั้งแรก
* **บันทึกของฉัน (Journal)**
  * ประวัติคำทำนายทั้งหมด ค้นหา/กรองตามหมวดหมู่และรูปแบบไพ่ได้ แชร์ผลลัพธ์เป็นรูปภาพ, แชร์ลง IG Story (เทมเพลตสัดส่วน 9:16 ตรงสเปก) หรือดาวน์โหลดรายงานคำทำนายฉบับเต็ม (Overview, Action Plan, ตีความรายตำแหน่ง, คำตอบสุดท้าย) เป็น PDF
* **ไพ่พรีเมียม + ระบบเหรียญ + เติมเงินจริง**
  * ไพ่พรีเมียม 6 แบบ (Quick Tarot, Deep Reading, Love Reading, Celtic Cross, Compatibility, 1-Month Overview) ใช้เหรียญปลดล็อก หักเหรียญแบบ atomic ฝั่ง server เสมอ
  * เติมเหรียญจริงผ่าน Omise (PromptPay) พร้อม webhook ที่ตรวจสถานะจาก Omise ตรงๆ ก่อนเครดิตเหรียญ (idempotent กัน webhook ยิงซ้ำ) และมีหน้าประวัติการใช้เหรียญ (เติม/ใช้) ให้ดูย้อนหลัง
* **ดวงเกิด (Birth Chart)**
  * วิเคราะห์ดวงเกิดแบบ Western Natal Chart จากตำแหน่งดาวจริง (คำนวณด้วย `astronomy-engine` ไม่ใช่ตารางสำเร็จรูป) ตามวัน-เวลา-สถานที่เกิด แล้วให้ Gemini ตีความเป็น Big Three, บุคลิกภาพเชิงลึก, ความรัก/การงาน/การเงิน/เส้นทางชีวิต พร้อมวงล้อจักรราศี (SVG) — ใช้งานฟรีทั้งหมด ไม่ต้องล็อกอิน ไม่ใช้เหรียญ
* **หน้าแรกส่วนตัว (Personalized Dashboard)**
  * ผู้ใช้ที่ล็อกอินแล้วเห็นแดชบอร์ดสรุปยอดเหรียญ/จำนวนคำทำนาย/streak/หมวดที่ถามบ่อยที่สุด และคำทำนายล่าสุดให้กดดูซ้ำได้ทันที แทนหน้าแรกแบบเดียวกันของทุกคน
* **รองรับ 2 ภาษา (ไทย/อังกฤษ) + Dark Mode**
  * สลับภาษาและธีมสว่าง/มืดได้จากเมนูตั้งค่า — แปล UI ทั้งเว็บ และส่งภาษาที่เลือกไปให้ Gemini ตอบเป็นภาษาอังกฤษด้วยเมื่อเลือกไว้ (ธีมมืดจะ sync ตามธีมเครื่องอัตโนมัติถ้ายังไม่เคยกดสลับเอง)
* **แจ้งปัญหา / ติดต่อทีมงาน**
  * ฟอร์มแจ้งปัญหาในเว็บ (แนบไฟล์/รูปภาพได้) ใช้ได้ทั้ง guest และคนล็อกอิน ส่งอีเมลแจ้งเตือนแอดมินทันทีที่มีคำร้องใหม่ และส่งอีเมลยืนยันอัตโนมัติทั้งตอนรับเรื่องและตอนแก้ไขเสร็จ (ผ่าน Resend)
* **Admin Dashboard**
  * ภาพรวมยอดขาย, ผู้ใช้ทั้งหมด/active, หมวดคำถามยอดฮิต, ไพ่พรีเมียมขายดี, รายการเติมเงินล่าสุด, จัดการคำร้องแจ้งปัญหา (ดูรายละเอียดเต็ม/ไฟล์แนบ, ติดต่อผู้แจ้งตรง, กดแก้ไขแล้วแจ้งอีเมลผู้แจ้งอัตโนมัติ) — จำกัดสิทธิ์ด้วยรายชื่ออีเมลแอดมินฝั่ง server เท่านั้น

---

## 🛠️ เทคโนโลยีที่ใช้ (Tech Stack)

* **Frontend**: HTML5, Vanilla JavaScript (ES6+), CSS3 — ไม่มี framework/build step, โหลดผ่าน `<script>` ตรงๆ (รองรับ 2 ภาษาด้วยระบบ i18n ที่เขียนเอง ดู `public/i18n.js`)
* **Backend**: Node.js, Express.js
* **Database & Auth**: Supabase (Postgres + Row Level Security + Auth)
* **AI**: `@google/generative-ai` (Gemini)
* **Astrology**: `astronomy-engine` (คำนวณตำแหน่งดาวจริงสำหรับดวงเกิด)
* **Payments**: Omise (PromptPay)
* **Email**: Resend (แจ้งเตือนแอดมิน + อีเมลยืนยันถึงผู้แจ้งปัญหา)
* **File upload**: multer (ไฟล์แนบในฟอร์มแจ้งปัญหา)
* **Export**: html2canvas (แชร์ผลลัพธ์เป็นรูป/IG Story) + jsPDF (ดาวน์โหลดรายงาน PDF)

---

## 📁 โครงสร้างโปรเจกต์ (Project Structure)

```text
ace-of-tarot/
├── public/
│   ├── index.html            # โครงหน้าเว็บหลัก + ลงทะเบียนแต่ละ screen
│   ├── app.js                # ตรรกะฝั่ง client ทั้งหมด (state, screens, API calls)
│   ├── i18n.js                # ระบบสองภาษา (ไทย/อังกฤษ) — dictionary + t()/setLang() ต้องโหลดก่อน app.js เสมอ
│   ├── spread-catalog.js     # แหล่งความจริงเดียวของสเปรดไพ่/ไพ่พรีเมียม/แพ็กเกจเติมเหรียญ
│   │                         # (โหลดได้ทั้งฝั่ง client และ require() จาก server.js)
│   ├── zodiac-data.js         # ข้อมูล 12 ราศี + ดาว/จุดสำคัญ สำหรับฟีเจอร์ดวงเกิด (โหลดสองทางเหมือน spread-catalog.js)
│   ├── birth-locations.js     # รายชื่อสถานที่เกิด (ไทย + ต่างประเทศ) พร้อมพิกัด/เขตเวลา สำหรับคำนวณดวงเกิด
│   ├── css/styles.css        # ดีไซน์ระบบทั้งหมด (รวม dark mode)
│   └── partials/             # แต่ละ screen แยกไฟล์ โหลดแบบ fetch ตอน runtime
│       ├── home.html / ask.html / draw.html / loading.html / result.html
│       ├── journal.html / auth.html / premium.html / topup.html
│       ├── birthchart.html / support.html / admin.html
├── natal-chart.js              # คำนวณตำแหน่งดาวจริง (natal chart) ด้วย astronomy-engine — require() จาก server.js
├── server.js                  # Express API server, Gemini prompt, Omise, auth middleware
├── supabase/
│   ├── schema.sql             # ตาราง + RLS + RPC functions ทั้งหมด (รันใน Supabase SQL Editor)
│   └── email-templates/
│       ├── confirm-signup.html   # เทมเพลตอีเมลยืนยันตัวตน (วางใน Supabase Auth settings)
│       └── reset-password.html   # เทมเพลตอีเมลตั้งรหัสผ่านใหม่ (วางใน Supabase Auth settings)
├── .env.example                # รายการ environment variables ที่ต้องตั้งค่า
├── package.json
└── README.md
```

---

## 🚀 เริ่มต้นใช้งาน (Getting Started)

### 1. ติดตั้ง dependencies

```bash
npm install
```

### 2. ตั้งค่า Supabase

1. สร้างโปรเจกต์ใหม่ที่ [supabase.com](https://supabase.com) (ฟรี)
2. เปิด **SQL Editor** แล้ววาง [`supabase/schema.sql`](supabase/schema.sql) ทั้งไฟล์รันครั้งเดียว (สร้างตาราง `readings`, `daily_state`, `wallets`, `coin_transactions`, `pending_payments` พร้อม RLS + RPC ทั้งหมด)
3. (แนะนำ) ไปที่ **Authentication → Email Templates** วางเนื้อหาจาก [`supabase/email-templates/confirm-signup.html`](supabase/email-templates/confirm-signup.html) (แท็บ Confirm signup) และ [`supabase/email-templates/reset-password.html`](supabase/email-templates/reset-password.html) (แท็บ Reset password)
4. (แนะนำสำหรับ production) ตั้งค่า **Authentication → Settings → SMTP Settings** ด้วยผู้ให้บริการอีเมลจริง (เช่น Resend, SendGrid) — Supabase มี built-in mailer ให้ใช้ฟรี แต่จำกัดจำนวนอีเมล/ชั่วโมงต่ำมาก เหมาะกับทดสอบเท่านั้น

### 3. ตั้งค่า environment variables

คัดลอก `.env.example` เป็น `.env` แล้วกรอกค่าให้ครบ (ดูรายละเอียดที่มาของแต่ละค่าใน [`.env.example`](.env.example)):

| ตัวแปร | ใช้ทำอะไร |
|---|---|
| `GEMINI_API_KEY` | เรียก Google Gemini สำหรับตีความไพ่/ดวงเกิด |
| `SUPABASE_URL` / `SUPABASE_ANON_KEY` | ฝั่ง client (auth, อ่านข้อมูลตาม RLS) |
| `SUPABASE_SERVICE_ROLE_KEY` | ฝั่ง server เท่านั้น (ข้าม RLS ได้หมด **ห้ามหลุดไปฝั่ง client เด็ดขาด**) |
| `OMISE_SECRET_KEY` / `OMISE_PUBLIC_KEY` | สร้าง/ตรวจสอบการชำระเงินเติมเหรียญ (ต้องใส่ทั้งสองตัว — ดูหมายเหตุใน `.env.example`) |
| `ADMIN_EMAILS` | รายชื่ออีเมล (คั่นด้วย comma) ที่เข้าหน้า admin dashboard ได้ |
| `RESEND_API_KEY` / `SUPPORT_EMAIL_USER` | ส่งอีเมลแจ้งเตือนแอดมิน + อีเมลยืนยันถึงผู้แจ้งปัญหา (ไม่ตั้งก็ได้ — คำร้องยังบันทึกปกติ แค่ข้ามการส่งอีเมล) |

### 4. รันเซิร์ฟเวอร์

```bash
npm run dev
```

เปิด `http://localhost:3000`

> **หมายเหตุ**: `npm run dev` ไม่มี auto-reload — ทุกครั้งที่แก้ `server.js` หรือไฟล์ `.env` ต้องหยุด (`Ctrl+C`) แล้วรันใหม่ ไม่งั้นค่าที่แก้จะยังไม่มีผล

---

## 🔒 ความปลอดภัย

* `SUPABASE_SERVICE_ROLE_KEY` อยู่ฝั่ง server เท่านั้น — ไฟล์ที่ส่งให้ browser (`/supabase-config.js`) ใช้แค่ anon public key ที่ถูกป้องกันด้วย Row Level Security
* ราคา/จำนวนเหรียญของไพ่พรีเมียมและแพ็กเกจเติมเงินยึดค่าจาก `spread-catalog.js` ฝั่ง server เท่านั้น ไม่เชื่อค่าที่ client ส่งมา
* สิทธิ์ admin เช็คจาก `ADMIN_EMAILS` ฝั่ง server ทุกครั้งที่เรียก API ไม่ใช่แค่ซ่อนปุ่มฝั่ง UI
