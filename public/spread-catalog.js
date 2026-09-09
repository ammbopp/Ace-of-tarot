/* ---------------------------------------------------------------------
 * แหล่งความจริงเดียวของ "รูปแบบการวางไพ่" ทุกแบบ (ทั้งไพ่ฟรีและไพ่พรีเมียม)
 *
 * ไฟล์นี้โหลดได้สองทาง:
 * - server.js: require('./public/spread-catalog.js')
 * - browser:   <script src="/spread-catalog.js"></script> (ต้องมาก่อน public/js/state.js เสมอ)
 *   จะได้ตัวแปร global ชื่อ window.SPREAD_CATALOG
 *
 * ก่อนหน้านี้ server (SPREAD_CARD_COUNTS/PREMIUM_READINGS) กับ client
 * (SPREADS/PREMIUM_CATALOG) ต่างคนต่างเก็บจำนวนใบ/ชื่อตำแหน่งไพ่ของตัวเอง
 * พอเพิ่มไพ่พรีเมียมใหม่แล้วลืมอัปเดตอีกฝั่ง (เช่นตอนเพิ่ม deep/love/compatibility
 * แล้วลืมใส่ใน SPREAD_CARD_COUNTS) ทำให้ /api/followup ใช้ไม่ได้กับไพ่เหล่านั้น
 * ไฟล์นี้เลยรวมทุกอย่างไว้ที่เดียว ให้ทั้งสองฝั่ง derive ค่าจากตรงนี้แทนการ hardcode ซ้ำ
 * --------------------------------------------------------------------- */
(function () {
  // ตำแหน่งไพ่ของแต่ละ spread backend — จำนวนใบคือ positions.length เสมอ ไม่ต้อง maintain เลขแยก
  var SPREAD_POSITIONS = {
    single: ['แก่นสำคัญ'],
    three: ['อดีต / รากเหง้า', 'ปัจจุบัน / อุปสรรค', 'อนาคต / ผลลัพธ์'],
    year: ['สถานการณ์', 'อุปสรรค', 'สิ่งที่ซ่อนอยู่', 'คำแนะนำ', 'ผลลัพธ์ที่เป็นไปได้'],
    relationship: ['ตัวคุณ', 'คู่ของคุณ', 'รากฐานความสัมพันธ์', 'สถานการณ์ปัจจุบัน', 'ความท้าทายที่ต้องเผชิญ', 'แนวโน้ม / ผลลัพธ์'],
    celtic: ['สถานการณ์ปัจจุบัน', 'สิ่งที่ขวางกั้น', 'รากฐาน / อดีตอันไกล', 'อดีตอันใกล้', 'เป้าหมาย / สิ่งที่เป็นไปได้', 'อนาคตอันใกล้', 'ตัวคุณเอง / ทัศนคติ', 'สิ่งแวดล้อมรอบตัว', 'ความหวังและความกลัว', 'ผลลัพธ์สุดท้าย'],
    deep: ['สถานการณ์', 'ความรู้สึก', 'แนวโน้ม', 'คำแนะนำ', 'ผลลัพธ์ที่เป็นไปได้'],
    love: ['เขารู้สึกยังไง', 'ปัญหาระหว่างเรา', 'แนวโน้ม', 'คำแนะนำ'],
    compatibility: ['ตัวคุณ', 'อีกฝ่าย', 'จุดร่วม / เคมีระหว่างกัน', 'จุดแข็งของความสัมพันธ์', 'จุดที่ต้องระวัง', 'สิ่งที่ต้องเรียนรู้ร่วมกัน', 'แนวโน้มไปต่อ'],
    monthly: ['ภาพรวมทั้งเดือนทุกด้าน', 'ภาพรวมด้านความรัก', 'ภาพรวมด้านการงาน', 'ภาพรวมด้านการเงิน', 'ภาพรวมด้านสุขภาพ']
  };

  // จำนวนไพ่ต่อ backend — คำนวณจาก SPREAD_POSITIONS เสมอ (เดิมคือ SPREAD_CARD_COUNTS ที่ hardcode แยกในserver.js)
  var SPREAD_CARD_COUNTS = {};
  Object.keys(SPREAD_POSITIONS).forEach(function (key) {
    SPREAD_CARD_COUNTS[key] = SPREAD_POSITIONS[key].length;
  });

  // ข้อความอธิบาย spread สำหรับใส่ใน prompt ของ Gemini — คำนวณจาก SPREAD_POSITIONS เสมอ
  // (เดิมคือ SPREAD_DESCRIPTIONS ที่พิมพ์ตำแหน่งไพ่ซ้ำเป็น string แยกไว้ใน server.js เอง)
  var SPREAD_DESCRIPTIONS = {};
  Object.keys(SPREAD_POSITIONS).forEach(function (key) {
    SPREAD_DESCRIPTIONS[key] = SPREAD_POSITIONS[key].length + ' ใบ = ' + SPREAD_POSITIONS[key].join(' -> ');
  });

  // ไพ่พรีเมียม — ราคาเหรียญ/ป้ายชื่อ/backend ที่ใช้ (จำนวนใบ+ตำแหน่งดึงจาก SPREAD_POSITIONS[spreadBackend] เสมอ ไม่ซ้ำที่นี่)
  var PREMIUM_READINGS = {
    quick: { label: 'Quick Tarot', coinCost: 10, spreadBackend: 'three', desc: '1 คำถาม + 3 ใบ', promptHint: 'คำถามเดียว อ่านแบบกระชับ 3 ใบ' },
    deep: { label: 'Deep Reading', coinCost: 25, spreadBackend: 'deep', desc: 'อ่านสถานการณ์ / ความรู้สึก / แนวโน้ม / คำแนะนำ / ผลลัพธ์', promptHint: 'อ่านเจาะลึกสถานการณ์ ความรู้สึก แนวโน้ม คำแนะนำ และผลลัพธ์ที่เป็นไปได้' },
    love: { label: 'Love Reading', coinCost: 40, spreadBackend: 'love', desc: 'เขารู้สึกยังไง → ปัญหาระหว่างเรา → แนวโน้ม → คำแนะนำ', promptHint: 'อ่านเจาะลึกด้านความรัก/ความสัมพันธ์' },
    celtic: { label: 'Celtic Cross', coinCost: 50, spreadBackend: 'celtic', desc: 'การอ่านไพ่แบบละเอียดที่สุด 10 ใบ', promptHint: 'การอ่านไพ่แบบละเอียดที่สุด 10 ใบ' },
    compatibility: { label: 'Compatibility', coinCost: 60, spreadBackend: 'compatibility', desc: 'วิเคราะห์ความเข้ากันได้ระหว่างสองคน', promptHint: 'วิเคราะห์ความเข้ากันได้ระหว่างสองคน' },
    // ภาพรวม 1 เดือน: ไม่มีคำถามเฉพาะเจาะจง (skipQuestion) — ข้ามหน้าจอถามคำถามไปจั่วไพ่ทันที แล้วอ่านแยกเป็น
    // ภาพรวมรวม/ความรัก/การงาน/การเงิน/สุขภาพ แทน ดู startPremiumReading() ใน ask.html และ generateWithGemini() ใน server.js
    monthly: {
      label: 'ภาพรวม 1 เดือน', coinCost: 35, spreadBackend: 'monthly',
      desc: 'ไพ่ 5 ใบ อ่านพลังงานเดือนนี้ทุกด้าน: ภาพรวม ความรัก การงาน การเงิน สุขภาพ',
      promptHint: 'อ่านภาพรวมพลังงานของเดือนนี้แยกตามด้านชีวิต ไม่ใช่การตอบคำถามเจาะจง',
      skipQuestion: true, autoQuestion: 'ภาพรวมไพ่ทาโรต์ประจำเดือนนี้ในทุกด้านของชีวิต'
    }
  };

  // metadata เฉพาะ UI ของไพ่ประจำวัน/สเปรดฟรี (ผูกกับ backend ด้านบน ไม่ maintain จำนวนใบ/ตำแหน่งซ้ำอีกที่)
  var FREE_SPREAD_UI = {
    '1': { backend: 'single', label: '1 ใบ', sub: 'Quick Insight' },
    '3': { backend: 'three', label: '3 ใบ', sub: 'อดีต · ปัจจุบัน · อนาคต' },
    '5': { backend: 'year', label: '5 ใบ', sub: 'Deeper Clarity' },
    '6': { backend: 'relationship', label: '6 ใบ', sub: 'Relationship Spread', icon: '♥' },
    '10': { backend: 'celtic', label: '10 ใบ', sub: 'Celtic Cross', icon: '✛' }
  };

  // แพ็กเกจเติมเหรียญ — จำนวนเงินจริง (สตางค์) เป็นแหล่งความจริงเดียว ฝั่ง client คำนวณป้ายราคาบาทจากตรงนี้เอง
  // (เดิม server มี TOPUP_PACKAGES กับ client มี TOPUP_CATALOG แยกกัน ถ้าแก้ราคาแล้วลืมอัปเดตอีกฝั่ง
  //  ราคาที่โชว์กับราคาที่หักจริงจะไม่ตรงกัน)
  var TOPUP_PACKAGES = {
    '50': { coins: 50, amountSatang: 3900 },   // ฿39
    '150': { coins: 150, amountSatang: 9900 }, // ฿99
    '350': { coins: 350, amountSatang: 19900 } // ฿199
  };

  // ระยะเวลาหมดอายุของ QR PromptPay — ใช้ค่าเดียวกันทั้งฝั่ง server (ส่งเป็น expires_at ให้ Omise ตอนสร้าง
  // charge จริง) และฝั่ง client (นับถอยหลังในหน้าเติมเหรียญ) กันไม่ให้ QR หมดอายุจริงกับที่ UI นับถอยหลังไม่ตรงกัน
  var TOPUP_EXPIRE_MINUTES = 15;

  var catalog = { SPREAD_POSITIONS: SPREAD_POSITIONS, SPREAD_CARD_COUNTS: SPREAD_CARD_COUNTS, SPREAD_DESCRIPTIONS: SPREAD_DESCRIPTIONS, PREMIUM_READINGS: PREMIUM_READINGS, FREE_SPREAD_UI: FREE_SPREAD_UI, TOPUP_PACKAGES: TOPUP_PACKAGES, TOPUP_EXPIRE_MINUTES: TOPUP_EXPIRE_MINUTES };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = catalog; // Node.js (server.js)
  } else {
    window.SPREAD_CATALOG = catalog; // browser (public/js/state.js)
  }
})();
