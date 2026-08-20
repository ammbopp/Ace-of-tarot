# 🪷 Ace of Tarot — AI Tarot Reading Platform

> **"Same Cards. New Perspectives. A Brighter You."**  
> เว็บแอปพลิเคชันดูดวงและให้คำปรึกษาไพ่ทาโรต์เชิงจิตวิทยา (Psychological Tarot Advisor) ขับเคลื่อนด้วย AI พร้อมระบบจำลองการสับไพ่และเลือกไพ่แบบ 3D Interactive

---

## ✨ คุณสมบัติเด่น (Features)

* **Design System & Aesthetics**: 
  * คุมโทนสีตามเอกสารการออกแบบ: **Primary Purple (`#8C67B4`)**, **Soft Pink (`#F0BED0`)**, **Cream Background (`#FCEFE6`)**, และ **Mystic Indigo/Gold (`#231942` / `#E2B86E`)**[cite: 1]
  * ลวดลายดอกลิลลี่สีทอง (Golden Lily Vector) และแอนิเมชันกลีบดอกไม้ลอยละล่อง (Floating Blossom Petals)[cite: 1]
* **Interactive Tarot Stage (Shuffle $\to$ Choose $\to$ Reveal)**:
  * **Shuffle Deck**: แอนิเมชันตัดไพ่และสับสลับใบเสมือนจริง (Riffle Shuffle)[cite: 1]
  * **Card Fan Selection**: คลี่ไพ่เป็นทรงพัด 22 ใบ ให้ผู้ใช้เลือกด้วยสัญชาตญาณ[cite: 1]
  * **3D Flip & Real Artwork**: พลิกเปิดไพ่แบบ 3 มิติ พร้อมแสดงภาพวาดไพ่ทาโรต์มาตรฐานสากล (Rider-Waite) รองรับทั้งไพ่หน้าตรงและไพ่กลับหัว (Reversed Cards)[cite: 1]
* **AI-Powered Interpretation**:
  * ขับเคลื่อนด้วย **Google Gemini (Gemini 1.5 Flash)** และรองรับ **Groq (Llama 3.3 70B)** ฟรี
  * วิเคราะห์ตรงประเด็นกับคำถาม 100% โดยแบ่งการอ่านออกเป็น 4 หมวดหมู่:
    1. **ความหมายแต่ละใบ** (Card-by-card breakdown)[cite: 1]
    2. **ภาพรวม** (Overview)[cite: 1]
    3. **ความเชื่อมโยงของไพ่** (Storyline & Timeline)[cite: 1]
    4. **คำแนะนำเชิงปฏิบัติ** (Actionable Advice)[cite: 1]
  * ป้ายคำคมข้อคิดปลอบประโลมใจ (Mystic Quote Banner) และกล่องถามคำถามต่อเนื่อง (Follow-up)[cite: 1]

---

## 🛠️ เทคโนโลยีที่ใช้ (Tech Stack)

* **Frontend**: HTML5, Modern CSS3 (Custom 3D Transforms, Keyframe Animations, SVG Graphics), Vanilla JavaScript (ES6+)
* **Backend**: Node.js, Express.js[cite: 2]
* **AI Integration**: `@google/generative-ai` (Gemini SDK), `openai` (Groq/OpenAI compatible SDK)[cite: 2]
* **Typography**: *Cormorant Garamond*, *Plus Jakarta Sans*, *Prompt*

---

## 📁 โครงสร้างโปรเจกต์ (Project Structure)

```text
ace-of-tarot/
├── public/
│   ├── index.html       # โครงสร้างหน้าเว็บตาม Flow 3 ขั้นตอน
│   ├── styles.css       # ชุดสี แอนิเมชัน และ Responsive Layout
│   └── app.js           # ตรรกะฝั่ง Client (สับไพ่, เลือกไพ่, พลิกไพ่, เรียก API)
├── .env                 # ไฟล์เก็บ API Keys และ Config
├── package.json         # รายการ Dependencies และ Scripts
├── server.js            # Express API Server & AI Prompt Integration
└── README.md            # เอกสารประกอบโปรเจกต์