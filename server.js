const express = require('express');
const path = require('path');
const dotenv = require('dotenv');
const rateLimit = require('express-rate-limit');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { createClient } = require('@supabase/supabase-js');
const Omise = require('omise');
// แหล่งความจริงเดียวของ spread/ไพ่พรีเมียมทั้งหมด (ใช้ร่วมกับฝั่ง client ผ่าน /spread-catalog.js)
const { SPREAD_POSITIONS, SPREAD_CARD_COUNTS, SPREAD_DESCRIPTIONS, PREMIUM_READINGS, TOPUP_PACKAGES, TOPUP_EXPIRE_MINUTES } = require('./public/spread-catalog.js');
// ฟีเจอร์ "ดวงเกิด" (Birth Chart) — แยกต่างหากจากไพ่ทาโรต์/ระบบเหรียญทั้งหมด ไม่ต้องล็อกอิน ไม่หักเหรียญ
const { computeNatalChart } = require('./natal-chart.js');
const BIRTH_LOCATIONS = require('./public/birth-locations.js');
const { ZODIAC_INFO: ZODIAC_INFO_TH, PLANET_INFO, PLANET_ORDER } = require('./public/zodiac-data.js');
const BIRTH_LOCATIONS_BY_ID = new Map(BIRTH_LOCATIONS.map(loc => [loc.id, loc]));

dotenv.config();

const app = express();
const basePort = Number(process.env.PORT) || 3000;

app.use(express.json({ limit: '1mb' }));

app.get('/supabase-config.js', (_req, res) => {
  res.type('application/javascript');
  const url = process.env.SUPABASE_URL || '';
  const anonKey = process.env.SUPABASE_ANON_KEY || '';
  res.send(`
// ไฟล์นี้ generate จาก server.js ตอน request เสมอ ไม่ใช่ไฟล์ static — แก้ค่าได้ที่ SUPABASE_URL/SUPABASE_ANON_KEY ใน .env เท่านั้น
// (ใช้ตัว "anon public" key เท่านั้น ห้ามใช้ "service_role" ฝั่งนี้เด็ดขาด เพราะ service_role ข้าม RLS ได้หมด)
let supabaseClient = null;
const SUPABASE_URL = ${JSON.stringify(url)};
const SUPABASE_ANON_KEY = ${JSON.stringify(anonKey)};
if(SUPABASE_URL && SUPABASE_ANON_KEY){
  supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
} else {
  console.warn('[Ace of Tarot] ยังไม่ได้ตั้งค่า SUPABASE_URL/SUPABASE_ANON_KEY ใน .env — แอปจะทำงานแบบ guest mode (บันทึกลง localStorage เครื่องนี้เท่านั้น ไม่ sync ข้ามอุปกรณ์)');
}
`.trim());
});

app.use(express.static(path.join(__dirname, 'public')));

/* ---------------- Supabase (server-side, service role — bypass RLS) ---------------- */
// service_role key ต้องอยู่ฝั่ง server เท่านั้น ห้ามหลุดไปฝั่ง client เด็ดขาด
// เพราะ key ตัวนี้ข้าม RLS ได้หมด (เข้าถึง/แก้ไขข้อมูลของทุกคนในระบบได้)
const supabaseAdmin = (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY)
  ? createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
  : null;

// สร้าง client ที่ผูกกับ session ของ user คนนั้นๆ (ใช้ anon key + token ของเขา)
// ใช้ตอนต้องเรียก RPC ที่พึ่ง auth.uid() เช่น spend_coins ให้ resolve เป็น user จริง
function supabaseAsUser(accessToken){
  if(!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) return null;
  return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${accessToken}` } }
  });
}

// ตรวจ Authorization: Bearer <token> จาก request แล้วคืนค่า user ที่ล็อกอินอยู่ (หรือ null)
async function getUserFromRequest(req){
  if(!supabaseAdmin) return null;
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if(!token) return null;
  try{
    const { data, error } = await supabaseAdmin.auth.getUser(token);
    if(error || !data.user) return null;
    return { user: data.user, token };
  }catch(e){ return null; }
}

/* ---------------- Admin (หน้า dashboard) ---------------- */
// รายชื่ออีเมลแอดมิน — เช็คแค่ "เข้าหน้า dashboard ได้ไหม" เท่านั้น ไม่เกี่ยวกับสิทธิ์ระดับฐานข้อมูล
// (RPC admin_dashboard_stats ไม่ grant ให้ authenticated เลย เรียกได้เฉพาะ service_role ฝั่งนี้)
const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || '').split(',').map(e => e.trim().toLowerCase()).filter(Boolean);

function isAdminEmail(email){
  return !!email && ADMIN_EMAILS.includes(email.toLowerCase());
}

/* ---------------- Omise (รับชำระเงินจริง — PromptPay) ---------------- */
// ต้องใส่ทั้ง secretKey และ publicKey — SDK ของ Omise ใช้ secretKey กับ resource ส่วนใหญ่ (charges, account)
// แต่ omise.sources.create() (ที่ใช้สร้าง QR PromptPay) ถูก hardcode ไว้ในตัว SDK เองให้ auth ด้วย publicKey
// เท่านั้น (ดู node_modules/omise/lib/resources/Source.js) ถ้าใส่แค่ secretKey จะได้ authentication_failure
// เฉพาะตอนสร้าง source เท่านั้น ส่วน resource อื่นจะทำงานปกติทำให้ดูเหมือนคีย์ถูกต้องแต่จริงๆ ไม่ครบ
const omise = (process.env.OMISE_SECRET_KEY && process.env.OMISE_PUBLIC_KEY)
  ? Omise({ secretKey: process.env.OMISE_SECRET_KEY, publicKey: process.env.OMISE_PUBLIC_KEY, omiseVersion: '2019-05-29' })
  : null;

// แพ็กเกจเติมเหรียญ (ราคา/จำนวนเหรียญ) และรายการไพ่พรีเมียม (label/ราคา/positions)
// มาจาก public/spread-catalog.js (แหล่งความจริงเดียวร่วมกับ client) แล้ว — ห้ามเชื่อค่าที่ client ส่งมาเด็ดขาด
// (ไม่งั้นใครก็ส่ง amount ปลอมมาซื้อเหรียญราคาถูกกว่าจริงได้) ยังคงยึดค่าจาก TOPUP_PACKAGES ฝั่ง server เสมอ

// จำกัดจำนวนครั้งที่เรียก Gemini/Omise API เพื่อป้องกันการยิงรัวจนบิลพุ่ง/โดน abuse
// key ด้วย user ที่ล็อกอินอยู่ (จาก Authorization header) แทนที่จะ key ด้วย IP อย่างเดียวเสมอ — เพราะถ้า key
// ด้วย IP ผู้ใช้หลายคนที่อยู่หลัง NAT/wifi เดียวกัน (เช่น ทดสอบพร้อมกันในออฟฟิศเดียวกัน หรือมือถือค่ายเดียวกัน)
// จะไปแชร์โควตาเดียวกันโดยไม่ตั้งใจ ทำให้คนหนึ่งใช้งานเยอะแล้วอีกคนโดน rate limit ไปด้วยทั้งที่ไม่เกี่ยวกันเลย
// ไม่ต้อง verify token เต็มรูปแบบตรงนี้ (route handler จะ verify เองอยู่แล้ว) แค่ใช้ตัว token ดิบเป็น key
// ก็เพียงพอจะแยกโควตาคนละก้อนกันแล้ว ต่อให้ token ปลอม/หมดอายุก็แค่ได้โควตาก้อนของตัวเอง ไม่กระทบใครอื่น
// (ipKeyGenerator ใช้ normalize IPv6 ให้ถูกต้องตามที่ express-rate-limit v8 กำหนด กันบั๊กเรื่อง subnet)
function aiLimiterKey(req){
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  return token || rateLimit.ipKeyGenerator(req.ip);
}

const aiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 นาที
  max: 30, // สูงสุด 30 ครั้งต่อคน (หรือต่อ IP ถ้าเป็น guest) ต่อ 15 นาที (รวม predict + followup + premium + topup)
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: aiLimiterKey,
  message: { success: false, error: 'คุณส่งคำขอบ่อยเกินไป กรุณาลองใหม่อีกครั้งในอีกสักครู่' }
});

const tarotDeck = [
  { name: 'The Fool', nameTh: 'เดอะ ฟูล', meaning: 'การเริ่มต้นใหม่ ความกล้าหาญ ความเป็นอิสระ', reversedMeaning: 'ความประมาท ความไม่รอบคอบ หรือความลังเล' },
  { name: 'The Magician', nameTh: 'เดอะ เมจิกเชียน', meaning: 'ทักษะ ไหวพริบ ความสามารถ และการลงมือทำ', reversedMeaning: 'การใช้เล่ห์เหลี่ยม หรือขาดความมั่นใจในตนเอง' },
  { name: 'The High Priestess', nameTh: 'เดอะ ไฮพรีสเตส', meaning: 'สัญชาตญาณ ปัญญาญาณ ความลึกซึ้ง ความลับ', reversedMeaning: 'ความสับสน ละเลยเสียงหัวใจตนเอง หรือความลับถูกเปิดเผย' },
  { name: 'The Empress', nameTh: 'ดิ เอ็มเพรส', meaning: 'ความอุดมสมบูรณ์ ความรัก ความอบอุ่น การเติบโต', reversedMeaning: 'ความอึดอัด ความสัมพันธ์ตึงเครียด หรือขาดการดูแลตัวเอง' },
  { name: 'The Emperor', nameTh: 'ดิ เอ็มเพอเรอร์', meaning: 'ความมั่นคง อำนาจ โครงสร้าง ความเป็นผู้นำ', reversedMeaning: 'ความเผด็จการ ยึดติดกฎเกณฑ์ หรือสูญเสียการควบคุม' },
  { name: 'The Hierophant', nameTh: 'เดอะ ไฮโรแฟนท์', meaning: 'คำปรึกษา จริยธรรม ขนบธรรมเนียม การเรียนรู้', reversedMeaning: 'การแหกกฎ ความคิดนอกกรอบ หรือคำแนะนำที่ไม่ตรงใจ' },
  { name: 'The Lovers', nameTh: 'เดอะ เลิฟเวอร์ส', meaning: 'ความสัมพันธ์ ความเข้ากันได้ การตัดสินใจเลือก', reversedMeaning: 'ความขัดแย้งในความสัมพันธ์ หรือความลังเลในการตัดสินใจ' },
  { name: 'The Chariot', nameTh: 'เดอะ ชาริออท', meaning: 'ความมุ่งมั่น ชัยชนะ การควบคุมทิศทาง', reversedMeaning: 'การสูญเสียการควบคุม ความใจร้อน อุปสรรคถาโถม' },
  { name: 'Strength', nameTh: 'สเตร็งธ์', meaning: 'ความอดทน ความแข็งแกร่งที่อ่อนโยน ความเมตตา', reversedMeaning: 'ความอ่อนแอ ความไม่มั่นใจในตนเอง หรืออารมณ์อยู่เหนือสติ' },
  { name: 'The Hermit', nameTh: 'เดอะ เฮอร์มิท', meaning: 'การทบทวนตนเอง การค้นหาความจริงภายในใจ', reversedMeaning: 'ความโดดเดี่ยว การปิดกั้นตัวเอง หรือความสับสนไร้ทิศทาง' },
  { name: 'Wheel of Fortune', nameTh: 'วีล ออฟ ฟอร์จูน', meaning: 'จุดเปลี่ยนของโชคชะตา วัฏจักรชีวิต โอกาสใหม่', reversedMeaning: 'จังหวะเวลาที่ยังไม่ลงตัว หรือการเปลี่ยนแปลงที่ไม่คาดคิด' },
  { name: 'Justice', nameTh: 'จัสติซ', meaning: 'ความยุติธรรม ความสมดุล เหตุและผลที่ชัดเจน', reversedMeaning: 'ความไม่เป็นธรรม อคติ หรือการตัดสินใจที่ผิดพลาด' },
  { name: 'The Hanged Man', nameTh: 'เดอะ แฮงด์แมน', meaning: 'การหยุดพักมองมุมใหม่ การเสียสละ การปล่อยวาง', reversedMeaning: 'ความดื้อรั้น การเสียสละที่สูญเปล่า หรือการยึดติด' },
  { name: 'Death', nameTh: 'เดธ', meaning: 'การสิ้นสุดของสิ่งเดิม เพื่อเริ่มต้นบทใหม่อย่างแท้จริง', reversedMeaning: 'การกลัวการเปลี่ยนแปลง หรือการยื้อสิ่งที่หมดอายุขัย' },
  { name: 'Temperance', nameTh: 'เทมเพอแรนซ์', meaning: 'การปรับสมดุล ความพอดี การประสานความต่าง', reversedMeaning: 'ความไม่สมดุล ความสุดโต่ง หรือความขัดแย้ง' },
  { name: 'The Devil', nameTh: 'เดอะ เดวิล', meaning: 'ความยึดติด กิเลส ตัณหา พันธนาการ', reversedMeaning: 'การตื่นรู้ การปลดแอกตนเองออกจากพันธนาการ' },
  { name: 'The Tower', nameTh: 'เดอะ ทาวเวอร์', meaning: 'การเปลี่ยนแปลงฉับพลัน การพังทลายของสิ่งลวงตา', reversedMeaning: 'การเลี่ยงหายนะเฉียดฉิว หรือการยื้อความจริงที่ต้องแตกหัก' },
  { name: 'The Star', nameTh: 'เดอะ สตาร์', meaning: 'ความหวัง การเยียวยา แรงบันดาลใจ ความกระจ่าง', reversedMeaning: 'ความสิ้นหวังชั่วคราว ขาดแรงบันดาลใจ' },
  { name: 'The Moon', nameTh: 'เดอะ มูน', meaning: 'ความกังวล อารมณ์แปรปรวน ภาพลวงตา สิ่งที่ไม่ชัดเจน', reversedMeaning: 'ความจริงเริ่มปรากฏ ความกังวลเริ่มคลี่คลาย' },
  { name: 'The Sun', nameTh: 'เดอะ ซัน', meaning: 'ความสุข ความสำเร็จ ความกระจ่างแจ้ง พลังบวก', reversedMeaning: 'ความสุขที่มาช้า หรือการมองโลกในแง่ดีเกินจริง' },
  { name: 'Judgement', nameTh: 'จัดจ์เมนต์', meaning: 'การตื่นรู้ การตัดสินใจครั้งใหญ่ การให้อภัย', reversedMeaning: 'การผัดวันประกันพรุ่ง การจมอยู่กับความรู้สึกผิด' },
  { name: 'The World', nameTh: 'เดอะ เวิลด์', meaning: 'ความสมบูรณ์แบบ บรรลุเป้าหมาย วงจรที่ลงตัว', reversedMeaning: 'ความล่าช้าในขั้นตอนสุดท้าย หรือสิ่งที่ยังไม่เสร็จสมบูรณ์' },
  { name: 'Six of Cups', nameTh: 'ซิกส์ ออฟ คัพส์', meaning: 'ความทรงจำ ความผูกพันในอดีต มิตรภาพที่บริสุทธิ์', reversedMeaning: 'การยึดติดกับอดีตจนไม่ยอมก้าวไปข้างหน้า' },

  // ---- Minor Arcana: Wands (ไม้เท้า) — ธาตุไฟ พลังงาน แรงบันดาลใจ การลงมือทำ ----
  { name: 'Ace of Wands', nameTh: 'เอซ ออฟ วานด์ส', meaning: 'การเริ่มต้นใหม่ด้วยแรงบันดาลใจ พลังสร้างสรรค์ โอกาสที่จุดประกาย', reversedMeaning: 'ความล่าช้าในการเริ่มต้น ขาดแรงบันดาลใจ หรือแผนที่ยังไม่ชัดเจน' },
  { name: 'Two of Wands', nameTh: 'ทู ออฟ วานด์ส', meaning: 'การวางแผนอนาคต ความกล้าตัดสินใจก้าวออกจากพื้นที่ปลอดภัย', reversedMeaning: 'ความลังเลไม่กล้าตัดสินใจ กลัวความเสี่ยง หรือขาดวิสัยทัศน์' },
  { name: 'Three of Wands', nameTh: 'ทรี ออฟ วานด์ส', meaning: 'การขยายผล มองการณ์ไกล รอผลลัพธ์จากสิ่งที่ลงมือทำไป', reversedMeaning: 'อุปสรรคที่ทำให้แผนล่าช้า หรือการมองโลกแคบเกินไป' },
  { name: 'Four of Wands', nameTh: 'โฟร์ ออฟ วานด์ส', meaning: 'การเฉลิมฉลอง ความมั่นคง ความสำเร็จที่นำไปสู่ความสุข', reversedMeaning: 'ความไม่มั่นคงในบ้านหรือครอบครัว หรือการเฉลิมฉลองที่ยังไม่ถึงเวลา' },
  { name: 'Five of Wands', nameTh: 'ไฟว์ ออฟ วานด์ส', meaning: 'ความขัดแย้ง การแข่งขัน ความคิดเห็นที่แตกต่างกัน', reversedMeaning: 'การหลีกเลี่ยงความขัดแย้ง หรือการประนีประนอมเพื่อยุติศึก' },
  { name: 'Six of Wands', nameTh: 'ซิกส์ ออฟ วานด์ส', meaning: 'ชัยชนะ การได้รับการยอมรับ ความสำเร็จที่ภาคภูมิใจ', reversedMeaning: 'ความล้มเหลวที่ไม่คาดคิด หรือการขาดการยอมรับจากผู้อื่น' },
  { name: 'Seven of Wands', nameTh: 'เซเว่น ออฟ วานด์ส', meaning: 'การยืนหยัดปกป้องจุดยืน ความมุ่งมั่นสู้ต่อแม้เสียเปรียบ', reversedMeaning: 'ความเหนื่อยล้าจากการต่อสู้ หรือการยอมแพ้ต่อแรงกดดัน' },
  { name: 'Eight of Wands', nameTh: 'เอท ออฟ วานด์ส', meaning: 'ความรวดเร็ว การเคลื่อนไหวไปข้างหน้าอย่างฉับไว ข่าวดีที่กำลังมาถึง', reversedMeaning: 'ความล่าช้า ความสับสนวุ่นวาย หรือแผนที่สะดุด' },
  { name: 'Nine of Wands', nameTh: 'ไนน์ ออฟ วานด์ส', meaning: 'ความอดทน ความเข้มแข็งหลังผ่านอุปสรรคมามาก พร้อมสู้ต่อ', reversedMeaning: 'ความเหนื่อยล้าจนหมดแรง หรือความระแวงระวังตัวมากเกินไป' },
  { name: 'Ten of Wands', nameTh: 'เท็น ออฟ วานด์ส', meaning: 'ภาระที่หนักอึ้ง ความรับผิดชอบที่แบกไว้มากเกินไป', reversedMeaning: 'การปล่อยวางภาระ หรือการรู้จักขอความช่วยเหลือ' },
  { name: 'Page of Wands', nameTh: 'เพจ ออฟ วานด์ส', meaning: 'ความกระตือรือร้น การเรียนรู้สิ่งใหม่ด้วยใจที่เปิดกว้าง', reversedMeaning: 'ความหุนหันพลันแล่น หรือแผนการที่ขาดทิศทาง' },
  { name: 'Knight of Wands', nameTh: 'ไนท์ ออฟ วานด์ส', meaning: 'พลังงานที่ร้อนแรง ความกล้าลงมือทำทันที การผจญภัย', reversedMeaning: 'ความหุนหันไม่คิดหน้าคิดหลัง หรือพลังงานที่ไร้ทิศทาง' },
  { name: 'Queen of Wands', nameTh: 'ควีน ออฟ วานด์ส', meaning: 'ความมั่นใจในตนเอง เสน่ห์ ความอบอุ่นที่มาพร้อมพลัง', reversedMeaning: 'ความหึงหวง ความก้าวร้าว หรือความไม่มั่นใจที่ซ่อนไว้' },
  { name: 'King of Wands', nameTh: 'คิง ออฟ วานด์ส', meaning: 'ภาวะผู้นำที่กล้าตัดสินใจ วิสัยทัศน์ที่กว้างไกล ความมุ่งมั่น', reversedMeaning: 'ความเผด็จการ ความใจร้อน หรือการตัดสินใจที่หุนหันพลันแล่น' },

  // ---- Minor Arcana: Cups (ถ้วย) — ธาตุน้ำ อารมณ์ ความรัก ความสัมพันธ์ ----
  { name: 'Ace of Cups', nameTh: 'เอซ ออฟ คัพส์', meaning: 'จุดเริ่มต้นของความรักและอารมณ์ใหม่ หัวใจที่เปิดรับ', reversedMeaning: 'อารมณ์ที่อัดอั้น ความรักที่ยังไม่สมหวัง หรือหัวใจที่ปิดกั้น' },
  { name: 'Two of Cups', nameTh: 'ทู ออฟ คัพส์', meaning: 'ความสัมพันธ์ที่เข้าใจกัน การเชื่อมโยงทางใจ ความรักที่สมดุล', reversedMeaning: 'ความไม่สมดุลในความสัมพันธ์ หรือความเข้าใจผิดระหว่างกัน' },
  { name: 'Three of Cups', nameTh: 'ทรี ออฟ คัพส์', meaning: 'มิตรภาพ การเฉลิมฉลองร่วมกัน ความสุขที่แบ่งปันกับผู้อื่น', reversedMeaning: 'ความขัดแย้งในกลุ่มเพื่อน หรือความสัมพันธ์ที่ตื้นเขิน' },
  { name: 'Four of Cups', nameTh: 'โฟร์ ออฟ คัพส์', meaning: 'ความเบื่อหน่าย การมองข้ามโอกาสที่อยู่ตรงหน้า', reversedMeaning: 'การเริ่มเปิดใจรับโอกาสใหม่ หรือการตื่นจากความเฉื่อยชา' },
  { name: 'Five of Cups', nameTh: 'ไฟว์ ออฟ คัพส์', meaning: 'ความเสียใจ ความสูญเสีย การจมอยู่กับสิ่งที่ผ่านไปแล้ว', reversedMeaning: 'การเริ่มยอมรับและก้าวต่อไปข้างหน้า' },
  { name: 'Seven of Cups', nameTh: 'เซเว่น ออฟ คัพส์', meaning: 'ทางเลือกมากมาย จินตนาการที่ฟุ้งซ่าน ความสับสนในการตัดสินใจ', reversedMeaning: 'ความชัดเจนที่เริ่มปรากฏ หรือการรู้ตัวว่าหลอกตัวเองมานาน' },
  { name: 'Eight of Cups', nameTh: 'เอท ออฟ คัพส์', meaning: 'การเดินจากสิ่งที่ไม่เติมเต็มใจอีกต่อไป เพื่อค้นหาความหมายที่แท้จริง', reversedMeaning: 'ความกลัวการเปลี่ยนแปลง หรือการยื้อสิ่งที่ควรปล่อยไปแล้ว' },
  { name: 'Nine of Cups', nameTh: 'ไนน์ ออฟ คัพส์', meaning: 'ความพึงพอใจ ความสุขที่สมหวัง ความปรารถนาที่เป็นจริง', reversedMeaning: 'ความพอใจแบบผิวเผิน หรือความสุขที่ยังไม่จีรัง' },
  { name: 'Ten of Cups', nameTh: 'เท็น ออฟ คัพส์', meaning: 'ความสุขในครอบครัว ความสัมพันธ์ที่กลมกลืน ความอบอุ่นใจ', reversedMeaning: 'ความขัดแย้งในครอบครัว หรือค่านิยมที่ไม่ตรงกัน' },
  { name: 'Page of Cups', nameTh: 'เพจ ออฟ คัพส์', meaning: 'ความอ่อนไหวที่บริสุทธิ์ ข่าวดีทางอารมณ์ แรงบันดาลใจใหม่', reversedMeaning: 'อารมณ์แปรปรวน หรือการตีความความรู้สึกผิดพลาด' },
  { name: 'Knight of Cups', nameTh: 'ไนท์ ออฟ คัพส์', meaning: 'ความโรแมนติก การไล่ตามความฝันด้วยหัวใจ ข้อเสนอที่จริงใจ', reversedMeaning: 'ความหวานเชื่อมที่ไม่จริงใจ หรืออารมณ์ที่ไม่มั่นคง' },
  { name: 'Queen of Cups', nameTh: 'ควีน ออฟ คัพส์', meaning: 'ความเห็นอกเห็นใจ สัญชาตญาณที่ลึกซึ้ง ความรักที่อ่อนโยน', reversedMeaning: 'อารมณ์ที่ท่วมท้นจนขาดสติ หรือการพึ่งพาผู้อื่นมากเกินไป' },
  { name: 'King of Cups', nameTh: 'คิง ออฟ คัพส์', meaning: 'ความสุขุมทางอารมณ์ ภาวะผู้นำที่อ่อนโยนและมั่นคง', reversedMeaning: 'อารมณ์ที่กดไว้ภายใน หรือการควบคุมความรู้สึกผู้อื่น' },

  // ---- Minor Arcana: Swords (ดาบ) — ธาตุลม ความคิด การสื่อสาร ความขัดแย้ง ----
  { name: 'Ace of Swords', nameTh: 'เอซ ออฟ ซอร์ดส์', meaning: 'ความคิดที่แจ่มชัด ความจริงที่เปิดเผย จุดเริ่มต้นทางปัญญา', reversedMeaning: 'ความสับสนทางความคิด หรือการสื่อสารที่บิดเบือน' },
  { name: 'Two of Swords', nameTh: 'ทู ออฟ ซอร์ดส์', meaning: 'ทางตันในการตัดสินใจ การประวิงเวลาเพื่อรักษาสมดุล', reversedMeaning: 'การตัดสินใจที่ยื้อไว้นานเกินไป หรือความจริงที่เริ่มปรากฏ' },
  { name: 'Three of Swords', nameTh: 'ทรี ออฟ ซอร์ดส์', meaning: 'ความเจ็บปวดใจ การสูญเสีย ความจริงที่เจ็บแสบแต่จำเป็น', reversedMeaning: 'การเริ่มเยียวยาบาดแผล หรือการให้อภัยและปล่อยวาง' },
  { name: 'Four of Swords', nameTh: 'โฟร์ ออฟ ซอร์ดส์', meaning: 'การพักผ่อน ฟื้นฟูจิตใจ ถอยออกมาตั้งหลักชั่วคราว', reversedMeaning: 'ความเหนื่อยล้าที่สะสม หรือการฝืนทำงานโดยไม่พัก' },
  { name: 'Five of Swords', nameTh: 'ไฟว์ ออฟ ซอร์ดส์', meaning: 'ความขัดแย้งที่ไม่มีใครชนะจริง การเอาชนะที่แลกมาด้วยความสัมพันธ์', reversedMeaning: 'การคืนดีหลังความขัดแย้ง หรือการยอมปล่อยศักดิ์ศรีเพื่อสันติ' },
  { name: 'Six of Swords', nameTh: 'ซิกส์ ออฟ ซอร์ดส์', meaning: 'การเดินทางออกจากสถานการณ์ยากลำบาก มุ่งสู่สิ่งที่สงบกว่า', reversedMeaning: 'ความติดขัดที่ยังปล่อยวางไม่ได้ หรือการเปลี่ยนผ่านที่ล่าช้า' },
  { name: 'Seven of Swords', nameTh: 'เซเว่น ออฟ ซอร์ดส์', meaning: 'กลยุทธ์ การหลบเลี่ยง หรือการทำสิ่งใดโดยไม่เปิดเผยทั้งหมด', reversedMeaning: 'ความจริงที่เริ่มถูกเปิดโปง หรือการสารภาพในสิ่งที่ปิดบังไว้' },
  { name: 'Eight of Swords', nameTh: 'เอท ออฟ ซอร์ดส์', meaning: 'ความรู้สึกติดกับดักทางความคิด ถูกจำกัดด้วยความกลัวของตนเอง', reversedMeaning: 'การเริ่มมองเห็นทางออก หรือการปลดปล่อยตนเองจากความกลัว' },
  { name: 'Nine of Swords', nameTh: 'ไนน์ ออฟ ซอร์ดส์', meaning: 'ความวิตกกังวล นอนไม่หลับ ความคิดในแง่ร้ายที่วนซ้ำ', reversedMeaning: 'การเริ่มปล่อยวางความกังวล หรือแสงสว่างหลังคืนอันมืดมิด' },
  { name: 'Ten of Swords', nameTh: 'เท็น ออฟ ซอร์ดส์', meaning: 'จุดจบที่เจ็บปวดแต่ชัดเจน การปิดฉากเพื่อเริ่มต้นใหม่', reversedMeaning: 'การฟื้นตัวหลังวิกฤต หรือการหลีกเลี่ยงหายนะเฉียดฉิว' },
  { name: 'Page of Swords', nameTh: 'เพจ ออฟ ซอร์ดส์', meaning: 'ความอยากรู้อยากเห็น การสื่อสารที่ตรงไปตรงมา ความคิดที่ว่องไว', reversedMeaning: 'คำพูดที่ขาดความรอบคอบ หรือข่าวลือที่ยังไม่ยืนยัน' },
  { name: 'Knight of Swords', nameTh: 'ไนท์ ออฟ ซอร์ดส์', meaning: 'ความรวดเร็ว การตัดสินใจเด็ดขาด มุ่งมั่นไปข้างหน้าโดยไม่รอ', reversedMeaning: 'ความหุนหันพลันแล่น หรือการกระทำที่ขาดการไตร่ตรอง' },
  { name: 'Queen of Swords', nameTh: 'ควีน ออฟ ซอร์ดส์', meaning: 'ความคิดที่เฉียบคม การมองสิ่งต่างๆ ตามความเป็นจริงโดยไม่ปรุงแต่ง', reversedMeaning: 'ความเย็นชา หรือการตัดสินผู้อื่นด้วยอคติ' },
  { name: 'King of Swords', nameTh: 'คิง ออฟ ซอร์ดส์', meaning: 'สติปัญญา หลักการที่ชัดเจน ความยุติธรรมทางความคิด', reversedMeaning: 'การใช้อำนาจทางความคิดกดดันผู้อื่น หรือความเย็นชาเกินไป' },

  // ---- Minor Arcana: Pentacles (เหรียญ) — ธาตุดิน การเงิน การงาน ความมั่นคง ----
  { name: 'Ace of Pentacles', nameTh: 'เอซ ออฟ เพนตาเคิลส์', meaning: 'โอกาสใหม่ทางการเงินหรือการงาน จุดเริ่มต้นของความมั่นคง', reversedMeaning: 'โอกาสที่พลาดไป หรือแผนการเงินที่ยังไม่มั่นคง' },
  { name: 'Two of Pentacles', nameTh: 'ทู ออฟ เพนตาเคิลส์', meaning: 'การจัดสรรเวลาและทรัพยากรให้สมดุล ความยืดหยุ่นในการปรับตัว', reversedMeaning: 'ความไม่สมดุลจนรับภาระมากเกินไป หรือการบริหารเวลาที่สับสน' },
  { name: 'Three of Pentacles', nameTh: 'ทรี ออฟ เพนตาเคิลส์', meaning: 'การทำงานร่วมกัน ทักษะที่ได้รับการยอมรับ ความสำเร็จจากทีม', reversedMeaning: 'ความขัดแย้งในทีม หรือการขาดความร่วมมือที่ดี' },
  { name: 'Four of Pentacles', nameTh: 'โฟร์ ออฟ เพนตาเคิลส์', meaning: 'ความมั่นคงทางการเงิน การรักษาสิ่งที่มีไว้อย่างระมัดระวัง', reversedMeaning: 'ความตระหนี่ หรือการยึดติดกับทรัพย์สินจนขาดความยืดหยุ่น' },
  { name: 'Five of Pentacles', nameTh: 'ไฟว์ ออฟ เพนตาเคิลส์', meaning: 'ความยากลำบากทางการเงิน ความรู้สึกโดดเดี่ยวในวิกฤต', reversedMeaning: 'การเริ่มฟื้นตัว หรือการได้รับความช่วยเหลือที่รอคอย' },
  { name: 'Six of Pentacles', nameTh: 'ซิกส์ ออฟ เพนตาเคิลส์', meaning: 'การให้และการรับที่สมดุล ความเอื้อเฟื้อ ความช่วยเหลือที่เหมาะสม', reversedMeaning: 'ความไม่เท่าเทียมในการให้-รับ หรือการพึ่งพาที่ไม่สมดุล' },
  { name: 'Seven of Pentacles', nameTh: 'เซเว่น ออฟ เพนตาเคิลส์', meaning: 'ความอดทนรอผลลัพธ์ การประเมินสิ่งที่ลงทุนไปแล้ว', reversedMeaning: 'ความใจร้อนอยากเห็นผลเร็วเกินไป หรือการลงทุนที่ยังไม่คุ้มค่า' },
  { name: 'Eight of Pentacles', nameTh: 'เอท ออฟ เพนตาเคิลส์', meaning: 'ความมุ่งมั่นฝึกฝนทักษะ ความละเอียดรอบคอบในการทำงาน', reversedMeaning: 'งานที่ขาดคุณภาพ หรือการทำงานซ้ำซากโดยไม่พัฒนา' },
  { name: 'Nine of Pentacles', nameTh: 'ไนน์ ออฟ เพนตาเคิลส์', meaning: 'ความสำเร็จที่มาจากน้ำพักน้ำแรงตนเอง ความอิสระทางการเงิน', reversedMeaning: 'การพึ่งพาผู้อื่นมากเกินไป หรือความสำเร็จที่ยังไม่มั่นคง' },
  { name: 'Ten of Pentacles', nameTh: 'เท็น ออฟ เพนตาเคิลส์', meaning: 'ความมั่งคั่งที่ยั่งยืน มรดกของครอบครัว ความมั่นคงระยะยาว', reversedMeaning: 'ความขัดแย้งเรื่องมรดกหรือทรัพย์สินในครอบครัว' },
  { name: 'Page of Pentacles', nameTh: 'เพจ ออฟ เพนตาเคิลส์', meaning: 'ความกระตือรือร้นเรียนรู้เรื่องการเงิน โอกาสใหม่ที่ต้องลงมือศึกษา', reversedMeaning: 'การขาดวินัยทางการเงิน หรือแผนการที่ยังไม่รอบคอบ' },
  { name: 'Knight of Pentacles', nameTh: 'ไนท์ ออฟ เพนตาเคิลส์', meaning: 'ความมุ่งมั่นทำงานอย่างสม่ำเสมอ ความน่าเชื่อถือ ความอดทน', reversedMeaning: 'ความเฉื่อยชา หรือการทำงานแบบติดอยู่กับที่ไม่พัฒนา' },
  { name: 'Queen of Pentacles', nameTh: 'ควีน ออฟ เพนตาเคิลส์', meaning: 'ความอบอุ่น การดูแลเอาใจใส่ ความมั่นคงที่สร้างจากความรัก', reversedMeaning: 'การดูแลตัวเองน้อยเกินไป หรือความไม่สมดุลระหว่างงานกับครอบครัว' },
  { name: 'King of Pentacles', nameTh: 'คิง ออฟ เพนตาเคิลส์', meaning: 'ความมั่งคั่งที่มั่นคง ภาวะผู้นำทางธุรกิจ ความเอื้อเฟื้อที่มาจากความมั่นใจ', reversedMeaning: 'ความโลภ หรือการยึดติดกับวัตถุจนละเลยด้านอื่นของชีวิต' }
];

function drawRandomCards(spread) {
  const count = spread === 'single' ? 1
    : spread === 'year' ? 5
    : spread === 'relationship' ? 6
    : spread === 'celtic' ? 10
    : 3;
  const shuffled = [...tarotDeck].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count).map((card, index) => ({
    ...card,
    position: index + 1,
    isReversed: Math.random() < 0.25
  }));
}

/* ---------------- Input validation & sanitization ---------------- */
// ป้องกัน prompt injection และข้อมูลปลอมที่ client อาจส่งมาแทนที่จะจับไพ่จริงในหน้าเว็บ
const VALID_CARD_NAMES = new Set(tarotDeck.map(c => c.name));
// SPREAD_CARD_COUNTS มาจาก public/spread-catalog.js แล้ว (คำนวณจาก positions.length ของทุก backend อัตโนมัติ)

function sanitizeText(value, maxLen) {
  if (typeof value !== 'string') return '';
  return value.trim().slice(0, maxLen);
}

// ตรวจสอบไพ่ที่ client ส่งมา: ชื่อไพ่ต้องมีจริงใน 78 ใบเท่านั้น จำนวนต้องตรงกับ spread
// และไม่เชื่อ meaning/reversedMeaning/nameTh ที่ client ส่งมาเอง — ดึงข้อมูลจริงจาก
// tarotDeck ฝั่ง server เสมอ เพื่อไม่ให้มีใครแอบฝังข้อความแปลกปลอมเข้าไปใน prompt ของ Gemini
function sanitizeCards(rawCards, spread) {
  if (!Array.isArray(rawCards) || rawCards.length === 0) return null;

  const expectedCount = SPREAD_CARD_COUNTS[spread] || 3;
  if (rawCards.length !== expectedCount) return null;

  const seenNames = new Set();
  const sanitized = [];
  for (const raw of rawCards) {
    if (!raw || typeof raw !== 'object') return null;

    const name = String(raw.name || '').trim();
    if (!VALID_CARD_NAMES.has(name)) return null;
    if (seenNames.has(name)) return null; // ไพ่ใบเดียวกันซ้ำไม่ได้ (สำรับ 1 ชุดไม่มีไพ่ซ้ำ)
    seenNames.add(name);

    const deckCard = tarotDeck.find(c => c.name === name);

    const position = sanitizeText(raw.position, 80);
    if (!position) return null;

    sanitized.push({
      name: deckCard.name,
      nameTh: deckCard.nameTh,
      meaning: deckCard.meaning,
      reversedMeaning: deckCard.reversedMeaning,
      position,
      isReversed: raw.isReversed === true
    });
  }
  return sanitized;
}

const CATEGORY_FOCUS = {
  'ความรัก': {
    title: 'มุมมองเจาะลึกด้านความรัก',
    brief: 'ความเข้ากันได้ระหว่างคุณกับอีกฝ่าย สัญญาณจากใจ ความซื่อสัตย์ และจังหวะของความสัมพันธ์'
  },
  'การงาน': {
    title: 'มุมมองเจาะลึกด้านการงาน',
    brief: 'โอกาสความก้าวหน้า อุปสรรคในที่ทำงาน ความสัมพันธ์กับเพื่อนร่วมงาน/หัวหน้า และจังหวะการตัดสินใจเรื่องงาน'
  },
  'การเงิน': {
    title: 'มุมมองเจาะลึกด้านการเงิน',
    brief: 'แนวโน้มการเงิน โอกาสและความเสี่ยง วิธีบริหารจัดการเงินให้สมดุล และช่วงเวลาที่ควรระมัดระวังเรื่องรายจ่าย'
  },
  'สุขภาพ': {
    title: 'มุมมองเจาะลึกด้านสุขภาพ',
    brief: 'สุขภาพกายและใจ สัญญาณที่ร่างกาย/จิตใจกำลังบอกคุณ และสิ่งที่ควรดูแลเพื่อสร้างสมดุลในชีวิต'
  },
  'ทั่วไป': {
    title: 'มุมมองเจาะลึกในภาพรวมชีวิต',
    brief: 'ภาพรวมของหลายด้านในชีวิต (ความสัมพันธ์ การงาน จิตใจ) ที่เชื่อมโยงกับคำถามของคุณ'
  }
};
function focusFor(category){ return CATEGORY_FOCUS[category] || CATEGORY_FOCUS['ทั่วไป']; }
const VALID_CATEGORIES = new Set(Object.keys(CATEGORY_FOCUS));

function meaningFor(cardName){ return tarotDeck.find(t => t.name === cardName) || null; }

// สำรับ "ภาพรวม 1 เดือน" ให้ผลลัพธ์เป็นคนละ JSON schema กับการอ่านไพ่ปกติ (ดู generateWithGemini สาขา
// spread==='monthly') — fallback ก็ต้องแยกเป็นคนละแบบด้วย ไม่งั้นตอน Gemini ล้ม renderMonthlyOverviewResult()
// ใน result.html จะหา monthly_theme/areas/... ไม่เจอเลย (fallback เดิมมีแต่ overview/positionInsights/...)
// ลำดับไพ่อ้างอิงจาก SPREAD_POSITIONS.monthly เสมอ: [0]=ภาพรวม [1]=ความรัก [2]=การงาน [3]=การเงิน [4]=สุขภาพ
function buildFallbackMonthlyReading({ cards }) {
  const areaOrder = ['overall', 'career', 'finance', 'love', 'health'];
  const cardByArea = { overall: cards[0], love: cards[1], career: cards[2], finance: cards[3], health: cards[4] };

  const readingFor = (c) => {
    if(!c) return '-';
    const m = meaningFor(c.name);
    const kw = m ? (c.isReversed ? (m.reversedMeaning || m.meaning) : m.meaning) : null;
    return kw
      ? `พลังงานของ ${c.name}${c.isReversed ? ' (กลับหัว)' : ''} สะท้อนว่ามีแนวโน้มเกี่ยวข้องกับ${kw} ในด้านนี้ช่วงเดือนนี้`
      : `${c.name}${c.isReversed ? ' (กลับหัว)' : ''} ชี้ให้เห็นพลังงานสำคัญที่ควรพิจารณาในด้านนี้ช่วงเดือนนี้`;
  };

  const areas = {};
  const rating = {};
  areaOrder.forEach(key => {
    const c = cardByArea[key];
    areas[key] = { reading: readingFor(c), advice: 'ให้เวลากับด้านนี้อย่างสม่ำเสมอ และทบทวนอีกครั้งเมื่อสถานการณ์ชัดเจนขึ้น' };
    rating[key] = c && c.isReversed ? 3 : 4;
  });

  const mainCard = cards[0] || tarotDeck[0];
  return {
    monthly_theme: {
      title: 'เดือนแห่งการเรียนรู้และปรับสมดุล',
      summary: `ไพ่ที่เปิดได้ในเดือนนี้ นำโดย ${mainCard.name}${mainCard.isReversed ? ' (กลับหัว)' : ''} มีแนวโน้มสะท้อนถึงช่วงเวลาของการทบทวนและปรับสมดุลในหลายด้านของชีวิต ไม่มีสิ่งใดตายตัว ทุกอย่างเป็นเพียงพลังงานที่ชวนให้ตั้งรับอย่างมีสติ`,
      energy: 'พลังงานแห่งการทบทวนและปรับสมดุล'
    },
    areas,
    opportunities: [
      'โอกาสในการทบทวนสิ่งที่ผ่านมาเพื่อวางแผนต่อไปอย่างมั่นคง',
      'โอกาสในการเปิดใจรับมุมมองใหม่ๆ ที่เข้ามาในเดือนนี้'
    ],
    warnings: [
      'ระวังการตัดสินใจด้วยอารมณ์เร่งรีบในด้านที่ไพ่ออกกลับหัว',
      'อย่าลืมดูแลตัวเองระหว่างที่โฟกัสกับเรื่องภายนอก'
    ],
    key_message: 'เดือนนี้คือโอกาสในการฟังเสียงตัวเองและปรับสมดุลชีวิตอย่างค่อยเป็นค่อยไป',
    rating
  };
}

function buildFallbackReading({ question, name, cards, category, spread }) {
  if(spread === 'monthly') return buildFallbackMonthlyReading({ cards });

  const mainCard = cards[0] || tarotDeck[0];
  const cardSummary = cards.map(c => `${c.name}${c.isReversed ? ' (กลับหัว)' : ''}`).join(', ');
  const focus = focusFor(category);

  const positionInsights = cards.map(c => {
    const m = meaningFor(c.name);
    const kw = m ? (c.isReversed ? (m.reversedMeaning || m.meaning) : m.meaning) : null;
    return kw
      ? `${c.name}${c.isReversed ? ' (กลับหัว)' : ''} ในตำแหน่งนี้สะท้อนถึง${kw} ซึ่งเชื่อมโยงโดยตรงกับคำถาม "${question}" ของคุณ`
      : `${c.name}${c.isReversed ? ' (กลับหัว)' : ''} ในตำแหน่งนี้ชี้ให้เห็นพลังงานสำคัญที่ควรพิจารณาประกอบกับตำแหน่งอื่นๆ ในชุดไพ่นี้`;
  });

  return {
    overview: `สำหรับคำถามเรื่อง "${question}" ของคุณ ${name || 'ผู้ถาม'}: หน้าไพ่ชุดนี้สะท้อนว่า ${mainCard.name}${mainCard.isReversed ? ' (กลับหัว)' : ''} กำลังชี้ให้เห็นประเด็นสำคัญในเรื่อง${category || 'ชีวิต'} ว่าคุณต้องหันกลับมามองความจริงและจุดที่เป็นตัวแปรหลัก สิ่งที่เกิดขึ้นในขณะนี้ไม่ใช่เรื่องบังเอิญ แต่เป็นช่วงเวลาที่นำพาความชัดเจนมาให้`,
    guidance: `ไพ่ชุดนี้ (${cardSummary}) ร้อยเรียงเรื่องราวว่า: สิ่งที่คุณแบกรับหรือสงสัยกำลังเดินทางมาถึงจุดที่ต้องปรับเปลี่ยนมุมมอง การรับมือไม่ใช่การใช้แรงผลักดันอย่างเดียว แต่เป็นการปล่อยให้จังหวะเวลาและความเข้าใจทำงานร่วมกัน`,
    positionInsights,
    focusTitle: focus.title,
    focusInsight: `เมื่อโฟกัสไปที่${focus.brief} ไพ่ ${mainCard.name}${mainCard.isReversed ? ' (กลับหัว)' : ''} ชี้ให้เห็นว่าตอนนี้คือช่วงเวลาที่ควรมองสิ่งเหล่านี้อย่างตรงไปตรงมา และใช้ไพ่ใบอื่นๆ ในชุดนี้เป็นเข็มทิศประกอบการตัดสินใจ`,
    actionPlan: [
      `วิเคราะห์สถานการณ์ "${question}" ด้วยใจที่เป็นกลางและลดความกังวลส่วนตัวลง`,
      `โฟกัสกับสิ่งที่คุณสามารถควบคุมและลงมือทำได้ทันทีในวันนี้`,
      `สื่อสารหรือตัดสินใจด้วยความชัดเจน ตรงไปตรงมา และเคารพความรู้สึกของตนเอง`,
      `เปิดใจรับบทเรียนและแนวโน้มใหม่ๆ ที่ไพ่กำลังเปิดทางให้`
    ],
    answer: `“บางคำถามอาจไม่ได้ต้องการคำตอบที่รวดเร็ว แต่ต้องการมุมมองที่ลึกซึ้งเพื่อให้คุณเติบโตอย่างมั่นคง”`
  };
}

// SPREAD_DESCRIPTIONS (ข้อความสำหรับ prompt ของ Gemini) มาจาก public/spread-catalog.js แล้ว
// คำนวณจาก SPREAD_POSITIONS อัตโนมัติ ไม่ต้อง maintain ข้อความตำแหน่งไพ่ซ้ำอีกที่

// จำกัดเวลารอสูงสุดของ promise ใดๆ — ใช้กับ Gemini โดยเฉพาะ เพราะถ้า Gemini API ค้าง/ตอบช้าผิดปกติ
// promise จะไม่ resolve หรือ reject เลย ทำให้ try/catch + fallback ที่มีอยู่แล้วไม่ถูกเรียกใช้ตลอดกาล
// (ฝั่ง client ก็ไม่มี timeout ของตัวเอง เลยค้างที่หน้า loading ไม่รู้จบ ต้อง timeout จากฝั่งนี้แทน)
function withTimeout(promise, ms, label){
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => {
      const err = new Error(`${label} timeout หลังจากรอ ${ms}ms`);
      err.isTimeout = true; // แยกให้รู้ว่าเป็น timeout ของเราเอง ไม่ใช่ error จาก Gemini SDK ตรงๆ (ดู isRetryableGeminiError)
      reject(err);
    }, ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

// 429 (rate limit) กับ 5xx (เซิร์ฟเวอร์ฝั่ง Google ล่ม/โอเวอร์โหลดชั่วคราว เช่น "high demand" ที่เจอบ่อย)
// เป็นข้อผิดพลาดชั่วคราวที่ retry แล้วมักหายเอง (และมักตอบกลับมาเร็ว ไม่ต้องรอจนครบ timeout) — ส่วน
// 400/401/403/404 (คีย์ผิด/สิทธิ์ไม่พอ/รุ่นไม่มีจริง) retry ไปก็ได้ผลเหมือนเดิมทุกครั้ง ไม่ควรเสียเวลารอ ให้ fallback ทันที
// timeout ของเราเอง (err.isTimeout) ไม่ retry เช่นกัน — ถ้า Gemini ค้าง/ช้าจนครบ timeout ไปแล้วครั้งหนึ่ง
// การลองใหม่มักจะช้าเหมือนเดิม เสียเวลารออีกรอบเปล่าๆ (ต่างจาก 503/429 ที่มักตอบกลับมาเร็วแล้วค่อย fail)
// error อื่นที่ไม่มี .status ชัดเจน (network error, JSON.parse พังเพราะ Gemini ตอบมาไม่ครบ) ยังถือว่า retry ได้
function isRetryableGeminiError(err){
  if (err.isTimeout) return false;
  if (typeof err.status === 'number') {
    return err.status === 429 || err.status >= 500;
  }
  return true;
}

// งบเวลารวมสูงสุดต่อคำขอ 1 ครั้ง (รวมทุก attempt ของ withRetry) — เท่ากับ timeout เดี่ยวเดิมก่อนมี retry
// (client ไม่มี timeout ของตัวเอง เลยต้องคุมด้วยค่านี้ไม่ให้ค้างเกินขอบเขตเดิม ต่อให้ retry กี่ครั้งก็ตาม)
// งบเวลาต่อ 1 attempt สั้นกว่านั้น เพื่อให้ retry ได้จริงภายในงบรวม แทนที่แต่ละ attempt จะกินเวลาเต็ม 180 วิ
const GEMINI_TOTAL_TIMEOUT_MS = 180000;
const GEMINI_ATTEMPT_TIMEOUT_MS = 120000;

// เรียก fn() ซ้ำได้สูงสุด maxAttempts ครั้ง คั่นด้วย exponential backoff (+jitter กันหลาย request ชนกันพร้อมกัน)
// ใช้ก่อนจะยอมแพ้แล้วปล่อยให้ผู้เรียก fallback ไปใช้คำทำนายสำเร็จรูปแทน (buildFallbackReading/buildFallbackFollowup)
async function withRetry(fn, { maxAttempts = 3, baseDelayMs = 600, label = 'operation' } = {}){
  for (let attempt = 1; attempt <= maxAttempts; attempt++){
    try {
      return await fn();
    } catch (err) {
      const canRetry = attempt < maxAttempts && isRetryableGeminiError(err);
      if (!canRetry) throw err;
      const delay = baseDelayMs * Math.pow(2, attempt - 1) + Math.floor(Math.random() * 250);
      console.warn(`${label} ล้มเหลว (ครั้งที่ ${attempt}/${maxAttempts}): ${err.message} — จะลองใหม่ใน ${delay}ms`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}

// Prediction Logic using Google Gemini
async function generateWithGemini({ question, spread, cards, name, category }) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: 'gemini-3.6-flash',
    generationConfig: {
      responseMimeType: 'application/json',
      temperature: 0.7
    }
  });

  const cardListDetails = cards.map((c, i) => {
    const m = meaningFor(c.name);
    const kw = c.isReversed ? ((m && m.reversedMeaning) || c.reversedMeaning || (m && m.meaning) || c.meaning || '-') : ((m && m.meaning) || c.meaning || '-');
    const posLabel = c.position || `ตำแหน่งที่ ${i + 1}`;
    return `ตำแหน่งที่ ${i + 1} (${posLabel}): ${c.name} (${(m && m.nameTh) || c.nameTh || ''}) [สถานะ: ${c.isReversed ? 'ไพ่กลับหัว (Reversed)' : 'ไพ่หน้าตรง (Upright)'}] - คีย์เวิร์ด: ${kw}`;
  }).join('\n');

  const spreadDesc = SPREAD_DESCRIPTIONS[spread] || SPREAD_DESCRIPTIONS.three;
  const focus = focusFor(category);

  // "ภาพรวม 1 เดือน" (spread === 'monthly') ไม่ใช่การตอบคำถามเจาะจงของผู้ใช้ (ไม่มีคำถามจริง เป็นแค่ข้อความอัตโนมัติ)
  // ใช้ prompt/รูปแบบ JSON คนละชุดกับโหมดถาม-ตอบปกติด้านล่างไปเลย (ผู้ใช้กำหนดมาเอง) — renderResult() ใน
  // result.html จึงมีสาขา renderMonthlyOverviewResult() แยกต่างหากสำหรับ shape นี้โดยเฉพาะ ไม่ใช้ฟิลด์ร่วมกับโหมดปกติ
  const monthNameTh = new Date().toLocaleDateString('th-TH', { month: 'long' });
  const yearTh = new Date().toLocaleDateString('th-TH', { year: 'numeric' }); // ปี พ.ศ. ตามธรรมเนียมดูดวงไทย
  const prompt = (spread === 'monthly') ? `คุณคือผู้เชี่ยวชาญด้าน Tarot Reading ที่มีความรู้เกี่ยวกับความหมายของไพ่ Tarot ทั้งด้าน Upright และ Reversed และสามารถวิเคราะห์ความสัมพันธ์ระหว่างไพ่หลายใบเป็นภาพรวมได้

หน้าที่ของคุณคือทำนาย "ดวงภาพรวมประจำเดือน" จากไพ่ Tarot ที่ผู้ใช้เปิดได้ โดยการอ่านไพ่ต้องเน้นแนวโน้ม พลังงาน สถานการณ์ และคำแนะนำ ไม่ควรฟันธงว่าเหตุการณ์จะเกิดขึ้นอย่างแน่นอน

ข้อมูลที่ได้รับ:
- เดือน: ${monthNameTh}
- ปี: ${yearTh}
- ไพ่ที่เปิดได้:
${cardListDetails}

กติกาการทำนาย:

1. วิเคราะห์ความหมายของไพ่แต่ละใบก่อน
   - พิจารณาความหมายของไพ่
   - พิจารณาว่าเป็น Upright หรือ Reversed
   - พิจารณาความหมายตามตำแหน่งของไพ่
   - หลีกเลี่ยงการตีความไพ่แต่ละใบแบบแยกขาดจากกัน

2. วิเคราะห์ความสัมพันธ์ระหว่างไพ่
   - มองหา Theme หรือพลังงานหลักที่ปรากฏซ้ำ
   - วิเคราะห์ว่าไพ่สนับสนุน ขัดแย้ง หรือพัฒนาไปในทิศทางเดียวกันหรือไม่
   - หากมี Major Arcana จำนวนมาก ให้พิจารณาว่าเดือนนี้อาจเป็นช่วงที่มีเหตุการณ์หรือบทเรียนสำคัญ
   - พิจารณา Suit ที่ปรากฏมากเป็นพิเศษ เช่น Cups, Wands, Swords, Pentacles
   - หากมีไพ่ Reversed หลายใบ ให้พิจารณาประเด็นด้านความล่าช้า อุปสรรค ความไม่ชัดเจน หรือสิ่งที่ควรทบทวน

3. สรุปเป็นภาพรวมของเดือน
   ให้ตอบคำถามว่า:
   - เดือนนี้มีพลังงานโดยรวมอย่างไร?
   - สิ่งสำคัญที่มีแนวโน้มเกิดขึ้นคืออะไร?
   - ผู้ใช้ควรให้ความสำคัญกับเรื่องใด?
   - มีสิ่งใดที่ควรระวัง?
   - มีโอกาสหรือจุดที่สามารถใช้ให้เกิดประโยชน์ได้อย่างไร?

4. วิเคราะห์หัวข้อสำคัญ 5 ด้าน:
   - ภาพรวมชีวิต
   - การงาน / การเรียน
   - การเงิน
   - ความรัก / ความสัมพันธ์
   - สุขภาพและการดูแลตัวเอง

5. คำแนะนำ
   ให้คำแนะนำที่สามารถนำไปใช้ได้จริง โดยเชื่อมโยงกับไพ่ที่เปิดได้
   หลีกเลี่ยงคำแนะนำที่ทำให้ผู้ใช้รู้สึกว่าชะตากรรมถูกกำหนดตายตัว

6. รูปแบบภาษา
   - ใช้ภาษาไทย
   - น้ำเสียงอบอุ่น ลึกลับเล็กน้อย และชวนให้ค้นหาตัวเอง
   - เขียนให้เข้าใจง่าย
   - ไม่ใช้ศัพท์ Tarot ที่ซับซ้อนเกินไป
   - ไม่สร้างความกลัว
   - ไม่ทำนายความตาย อุบัติเหตุ หรือเหตุการณ์ร้ายแรงแบบฟันธง
   - ใช้คำว่า "มีแนวโน้ม", "อาจ", "พลังงานของไพ่สะท้อนว่า" แทนการกล่าวว่าเหตุการณ์จะเกิดขึ้นแน่นอน

7. ห้ามตีความไพ่เพียงจากความหมายทั่วไป
   ต้องเชื่อมโยงไพ่ทั้งหมดเข้าด้วยกันเพื่อสร้างเรื่องราวหรือภาพรวมของเดือน

ผลลัพธ์ต้องอยู่ในรูปแบบ JSON เท่านั้น:

{
  "monthly_theme": {
    "title": "ชื่อ Theme ของเดือน",
    "summary": "คำทำนายภาพรวม 1-2 ย่อหน้า",
    "energy": "คำอธิบายพลังงานหลักของเดือน"
  },
  "areas": {
    "overall": {
      "reading": "คำทำนาย",
      "advice": "คำแนะนำ"
    },
    "career": {
      "reading": "คำทำนาย",
      "advice": "คำแนะนำ"
    },
    "finance": {
      "reading": "คำทำนาย",
      "advice": "คำแนะนำ"
    },
    "love": {
      "reading": "คำทำนาย",
      "advice": "คำแนะนำ"
    },
    "health": {
      "reading": "คำทำนาย",
      "advice": "คำแนะนำ"
    }
  },
  "opportunities": [
    "โอกาสสำคัญข้อที่ 1",
    "โอกาสสำคัญข้อที่ 2",
    "โอกาสสำคัญข้อที่ 3"
  ],
  "warnings": [
    "สิ่งที่ควรระวังข้อที่ 1",
    "สิ่งที่ควรระวังข้อที่ 2"
  ],
  "key_message": "ข้อความสำคัญที่ไพ่อยากบอกผู้ใช้ในเดือนนี้",
  "rating": {
    "overall": 1-5,
    "career": 1-5,
    "finance": 1-5,
    "love": 1-5,
    "health": 1-5
  }
}

ตรวจสอบก่อนตอบ:
- ต้องตอบเป็น JSON ที่ valid
- ห้ามใส่ Markdown
- ห้ามใส่ข้อความนอก JSON
- ทุกคำทำนายต้องอ้างอิงจากไพ่ที่ได้รับ
- ห้ามเพิ่มไพ่ที่ไม่ได้อยู่ในข้อมูล
- ห้ามฟันธงอนาคต` : `คุณคือ "Ace of Tarot" นักพยากรณ์ไพ่ทาโรต์เชิงจิตวิทยา (Tarot & Life Coach) ระดับปรมาจารย์

หน้าที่ของคุณ:
1. ตอบคำถามของผู้ใช้ "${question}" ให้ **ตรงประเด็น ชัดเจน ฟันธงสถานการณ์จริง 100%** (ห้ามตอบกำกวม ห้ามตอบเป็นดวงกว้างๆ ทั่วไป)
2. ถอดรหัสพลังงานของไพ่แต่ละใบผสานเข้ากับคำถามโดยตรง โดยยึดตามความหมายของแต่ละตำแหน่งใน Spread นั้นๆ หากไพ่กลับหัว (Reversed) ให้ตีความถึงจุดติดขัดในใจ ความล่าช้า หรือสัญญาณเตือน
3. เขียนคำตีความแยกเป็นรายตำแหน่ง ("positionInsights") ให้ครบทุกใบ **ตามลำดับเดียวกับไพ่ที่จับได้จริงด้านล่าง** โดยแต่ละข้อควรอ้างอิงชื่อตำแหน่งนั้นๆ ผสานกับความหมายไพ่และคำถามของผู้ใช้โดยตรง
4. เพิ่มหัวข้อ "focusInsight" ที่เจาะลึกเฉพาะหมวดหมู่ "${category || 'ทั่วไป'}" โดยยึดประเด็นต่อไปนี้เป็นแกน: ${focus.brief}
5. โทนเสียงต้องอบอุ่น ลึกซึ้ง ให้สติ และสร้างพลังบวก ตามสโลแกน "Same Cards. New Perspectives. A Brighter You."

ข้อมูลการอ่านไพ่:
- ชื่อผู้ถาม: ${name || 'คุณ'}
- หมวดหมู่: ${category || 'ทั่วไป'}
- รูปแบบ Spread: ${spreadDesc}
- ไพ่ที่จับได้จริง:
${cardListDetails}

ตอบกลับเป็นโครงสร้าง JSON นี้เท่านั้น:
{
  "overview": "วิเคราะห์ภาพรวมเพื่อตอบคำถาม '${question}' ให้กระจ่างทันทีใน 3-4 ประโยค เจาะลึกสถานการณ์จริง",
  "guidance": "อธิบายการร้อยเรียงเรื่องราวของไพ่แต่ละใบตามลำดับ (Timeline: จากรากเหง้า สู่ปัจจุบัน สู่ปลายทางข้างหน้า)",
  "positionInsights": [
    "คำตีความไพ่ตำแหน่งที่ 1 (${cards[0] ? (cards[0].position || 'ตำแหน่งที่ 1') : 'ตำแหน่งที่ 1'}) โดยอ้างอิงชื่อตำแหน่งนี้ในคำตอบด้วย",
    "... ให้ครบทุกใบตามจำนวนไพ่จริงด้านบน (ต้องมีจำนวนข้อเท่ากับจำนวนไพ่ทั้งหมด คือ ${cards.length} ข้อ เรียงตามลำดับเดียวกัน)"
  ],
  "focusTitle": "หัวข้อสั้นๆ ของมุมมองเจาะลึกเฉพาะหมวดหมู่ '${category || 'ทั่วไป'}' เช่น '${focus.title}'",
  "focusInsight": "เนื้อหาเจาะลึก 2-4 ประโยค เฉพาะหมวดหมู่ '${category || 'ทั่วไป'}' โดยอิงประเด็น: ${focus.brief}",
  "actionPlan": [
    "คำแนะนำหรือแนวทางปฏิบัติที่ทำได้จริงข้อที่ 1",
    "คำแนะนำหรือแนวทางปฏิบัติที่ทำได้จริงข้อที่ 2",
    "คำแนะนำหรือแนวทางปฏิบัติที่ทำได้จริงข้อที่ 3"
  ],
  "answer": "ประโยคข้อคิดกระตุกใจสั้นๆ สไตล์บทกวีที่ปลอบโยนและสอดคล้องกับคำถาม (ครอบด้วยเครื่องหมายคำพูด)"
}`;

  return withTimeout(
    withRetry(async () => {
      const result = await withTimeout(model.generateContent(prompt), GEMINI_ATTEMPT_TIMEOUT_MS, 'Gemini generateContent');
      const text = result.response.text();
      return JSON.parse(text);
    }, { label: 'Gemini generateContent (predict)' }),
    GEMINI_TOTAL_TIMEOUT_MS, 'Gemini generateContent (predict) รวมทุก attempt'
  );
}

// Follow-up: answer a continued question grounded in the SAME already-drawn cards (no redraw)
async function generateFollowupWithGemini({ question, followupQuestion, cards, spread, category, name }) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: 'gemini-3.6-flash',
    generationConfig: {
      responseMimeType: 'application/json',
      temperature: 0.7
    }
  });

  const cardListDetails = cards.map((c, i) => {
    const m = meaningFor(c.name);
    const kw = c.isReversed ? ((m && m.reversedMeaning) || c.reversedMeaning || (m && m.meaning) || c.meaning || '-') : ((m && m.meaning) || c.meaning || '-');
    const posLabel = c.position || `ตำแหน่งที่ ${i + 1}`;
    return `ตำแหน่งที่ ${i + 1} (${posLabel}): ${c.name} [สถานะ: ${c.isReversed ? 'กลับหัว' : 'หน้าตรง'}] - คีย์เวิร์ด: ${kw}`;
  }).join('\n');

  const spreadDesc = SPREAD_DESCRIPTIONS[spread] || SPREAD_DESCRIPTIONS.three;

  const prompt = `คุณคือ "Ace of Tarot" กำลังคุยต่อเนื่องกับผู้ถามคนเดิม จากไพ่ชุดเดิมที่จับไปแล้วเท่านั้น (ห้ามอ้างว่ามีการจับไพ่ใหม่หรือเปลี่ยนไพ่ใดๆ)

คำถามเดิมของผู้ถาม: "${question}"
หมวดหมู่: ${category || 'ทั่วไป'}
รูปแบบ Spread: ${spreadDesc}
ไพ่ที่จับได้จริง (คงเดิมทั้งหมด):
${cardListDetails}

ตอนนี้ผู้ถาม (${name || 'คุณ'}) มีคำถามต่อเนื่อง (follow-up) ว่า: "${followupQuestion}"

หน้าที่ของคุณ: ตอบคำถามต่อเนื่องนี้โดย **อ้างอิงจากไพ่ชุดเดิมด้านบนเท่านั้น** เชื่อมโยงพลังงานของไพ่ที่มีอยู่กับคำถามใหม่นี้โดยตรง ตอบให้กระชับ ชัดเจน ตรงประเด็น อบอุ่น และให้กำลังใจ ความยาวประมาณ 3-5 ประโยค โทนเสียงตามสโลแกน "Same Cards. New Perspectives. A Brighter You."

ตอบกลับเป็นโครงสร้าง JSON นี้เท่านั้น:
{ "answer": "คำตอบของคำถามต่อเนื่อง" }`;

  return withTimeout(
    withRetry(async () => {
      const result = await withTimeout(model.generateContent(prompt), GEMINI_ATTEMPT_TIMEOUT_MS, 'Gemini generateContent');
      const text = result.response.text();
      return JSON.parse(text);
    }, { label: 'Gemini generateContent (followup)' }),
    GEMINI_TOTAL_TIMEOUT_MS, 'Gemini generateContent (followup) รวมทุก attempt'
  );
}

function buildFallbackFollowup({ followupQuestion, cards, category }) {
  const mainCard = cards[0] || tarotDeck[0];
  const m = meaningFor(mainCard.name);
  const kw = m ? (mainCard.isReversed ? (m.reversedMeaning || m.meaning) : m.meaning) : '';
  return {
    answer: `เมื่อโยงกับคำถามต่อเนื่อง "${followupQuestion}" ไพ่ ${mainCard.name}${mainCard.isReversed ? ' (กลับหัว)' : ''} ในชุดเดิมยังคงชี้ให้เห็นถึง${kw || 'พลังงานสำคัญที่คุณควรพิจารณา'} ลองใช้มุมมองนี้ประกอบการตัดสินใจของคุณ พร้อมกับความหมายของไพ่ใบอื่นๆ ในชุดเดียวกัน เพื่อมองภาพรวมของเรื่อง${category || 'นี้'}ให้ครบถ้วนยิ่งขึ้น`
  };
}

/* ---------------- Premium Readings (ใช้เหรียญ, ต้องล็อกอิน) ---------------- */
function drawPremiumCards(positions){
  const shuffled = [...tarotDeck].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, positions.length).map((card, index) => ({
    ...card,
    position: positions[index],
    isReversed: Math.random() < 0.25
  }));
}

app.post('/api/predict-premium', aiLimiter, async (req, res) => {
  try{
    if(!supabaseAdmin){
      return res.status(503).json({ success:false, error: 'ระบบสมาชิกยังไม่พร้อมใช้งาน กรุณาติดต่อผู้ดูแลเว็บไซต์' });
    }

    const auth = await getUserFromRequest(req);
    if(!auth){
      return res.status(401).json({ success:false, error: 'กรุณาเข้าสู่ระบบก่อนใช้บริการนี้' });
    }
    const { user, token } = auth;

    const { premiumKey, question: rawQuestion, name: rawName, category: rawCategory, cards: clientCards } = req.body || {};
    const premium = PREMIUM_READINGS[premiumKey];
    if(!premium){
      return res.status(400).json({ success:false, error: 'ไม่พบรูปแบบการอ่านไพ่นี้' });
    }

    const question = sanitizeText(rawQuestion, 500) || premium.promptHint;
    const name = sanitizeText(rawName, 50) || 'คุณ';
    const category = VALID_CATEGORIES.has(rawCategory) ? rawCategory : 'ทั่วไป';

    // ผู้ใช้เลือกไพ่เองจากหน้าจั่วไพ่ (เหมือนโฟลว์ไพ่ฟรี) แล้วส่งมาให้ตรวจสอบ — ตรวจก่อนหักเหรียญเสมอ
    // กันเสียเหรียญฟรีถ้าข้อมูลไพ่ที่ส่งมาไม่ถูกต้อง (ชื่อไพ่ปลอม/จำนวนไม่ตรง/ซ้ำใบ)
    let cards;
    if(Array.isArray(clientCards) && clientCards.length > 0){
      cards = sanitizeCards(clientCards, premium.spreadBackend);
      if(!cards){
        return res.status(400).json({ success:false, error: 'ข้อมูลไพ่ที่ส่งมาไม่ถูกต้อง กรุณาลองจับไพ่ใหม่อีกครั้ง' });
      }
    } else {
      cards = drawPremiumCards(SPREAD_POSITIONS[premium.spreadBackend]);
    }

    // หักเหรียญแบบ atomic ก่อนเรียก Gemini เสมอ (กันเสียค่า AI API ฟรีถ้าเหรียญไม่พอ)
    // ใช้ client ที่ผูกกับ token ของ user คนนี้ เพื่อให้ auth.uid() ใน spend_coins resolve ถูกต้อง
    const userClient = supabaseAsUser(token);
    if(!userClient){
      return res.status(503).json({ success:false, error: 'ระบบสมาชิกยังไม่พร้อมใช้งาน กรุณาติดต่อผู้ดูแลเว็บไซต์' });
    }
    const { data: spendOk, error: spendErr } = await userClient.rpc('spend_coins', {
      p_amount: premium.coinCost,
      p_reference: `premium:${premiumKey}:${Date.now()}`
    });
    if(spendErr){
      console.error('spend_coins error:', spendErr);
      return res.status(500).json({ success:false, error: 'เกิดข้อผิดพลาดในการตัดเหรียญ กรุณาลองใหม่อีกครั้ง' });
    }
    if(!spendOk){
      return res.status(402).json({ success:false, error: 'เหรียญไม่พอสำหรับการอ่านไพ่นี้ กรุณาเติมเหรียญก่อน' });
    }

    let summary = null;
    try{
      summary = await generateWithGemini({ question, spread: premium.spreadBackend, cards, name, category });
    }catch(geminiErr){
      console.warn('Gemini error (premium), using local fallback...', geminiErr.message);
    }
    if(!summary){
      summary = buildFallbackReading({ question, name, cards, category, spread: premium.spreadBackend });
    }

    // บันทึกลงประวัติเหมือนการอ่านไพ่ปกติ (ใช้ admin client เพราะ insert แทน user ที่ verify แล้ว)
    const { data: savedRow, error: saveErr } = await supabaseAdmin
      .from('readings')
      .insert({
        user_id: user.id, question, spread_key: premiumKey, spread_backend: premium.spreadBackend,
        category, cards, summary, followups: [], is_daily: false
      })
      .select().single();
    if(saveErr) console.error('Save premium reading error:', saveErr);

    return res.json({
      success: true,
      spread: premium.spreadBackend,
      category, name, cards, summary,
      readingId: savedRow ? savedRow.id : null
    });
  }catch(error){
    console.error('Premium prediction API Error:', error);
    return res.status(500).json({ success:false, error: 'เกิดข้อผิดพลาดในการทำนาย กรุณาลองใหม่อีกครั้ง' });
  }
});

/* ---------------- ดวงเกิด (Birth Chart) — ไม่เกี่ยวกับไพ่ทาโรต์/เหรียญ/การล็อกอินเลย ----------------
   คำนวณตำแหน่งดาวจริงทางดาราศาสตร์ (natal-chart.js, ใช้ astronomy-engine) จากวัน-เวลา-สถานที่เกิด
   แล้วให้ Gemini ตีความเป็นคำอ่านบุคลิกภาพ — สาธารณะทั้งหมด ไม่ต้องล็อกอิน ไม่หักเหรียญ แค่จำกัด rate
   ด้วย aiLimiter ตัวเดียวกับ endpoint AI อื่นๆ กัน spam ยิง Gemini ฟรีๆ */

const BIRTH_YEAR_MIN = 1900;

// แปลง birthDate/birthTime (ตามเวลาท้องถิ่นของสถานที่เกิด) + locationId เป็น UTC Date จริงสำหรับคำนวณดาว
// คืนค่า null ถ้าข้อมูลไม่ถูกต้อง (รูปแบบผิด/สถานที่ไม่อยู่ในรายการ/วันที่เกินช่วงที่รองรับ)
function parseBirthDateTime({ birthDate, birthTime, locationId }) {
  const location = BIRTH_LOCATIONS_BY_ID.get(String(locationId || ''));
  if (!location) return null;

  const dateMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(birthDate || ''));
  if (!dateMatch) return null;
  const year = Number(dateMatch[1]), month = Number(dateMatch[2]), day = Number(dateMatch[3]);
  const currentYear = new Date().getFullYear();
  if (year < BIRTH_YEAR_MIN || year > currentYear) return null;

  let hour = 12, minute = 0; // ไม่ทราบเวลาเกิด -> ใช้เที่ยงวันเป็นค่ากลาง (ไม่กระทบราศีดวงอาทิตย์/ดาวเคราะห์ที่เคลื่อนช้า)
  let hasExactTime = false;
  if (birthTime) {
    const timeMatch = /^(\d{2}):(\d{2})$/.exec(String(birthTime));
    if (!timeMatch) return null;
    hour = Number(timeMatch[1]); minute = Number(timeMatch[2]);
    if (hour > 23 || minute > 59) return null;
    hasExactTime = true;
  }

  const utcMs = Date.UTC(year, month - 1, day, hour, minute) - location.utcOffset * 3600 * 1000;
  const birthUtcDate = new Date(utcMs);
  // ตรวจว่า Date.UTC ไม่เงียบๆ ปัดวันที่ผิด (เช่น 31 ก.พ.) ให้ตรงกับที่กรอกจริง
  if (birthUtcDate.getUTCFullYear() !== year && birthTime) { /* ข้าม offset แล้วปีอาจเลื่อน ไม่ใช่ตัวชี้ error */ }
  const localCheck = new Date(Date.UTC(year, month - 1, day, 0, 0));
  if (localCheck.getUTCMonth() !== month - 1 || localCheck.getUTCDate() !== day) return null; // วันที่ปฏิทินไม่มีจริง

  return { location, birthUtcDate, hasExactTime };
}

// prompt ให้ Gemini ตีความดวงเกิดเป็นคำอ่านบุคลิกภาพ/ชีวิต จากตำแหน่งดาวจริงที่คำนวณไว้แล้ว (ไม่ให้ Gemini
// คำนวณดาวเอง ป้องกัน hallucination ตำแหน่งดาวผิด — ส่งไปแค่ตีความความหมาย ไม่ใช่คำนวณดาราศาสตร์)
async function generateBirthChartInterpretation({ name, placements, hasExactTime }) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: 'gemini-3.6-flash',
    generationConfig: { responseMimeType: 'application/json', temperature: 0.7 }
  });

  const placementLines = PLANET_ORDER
    .filter(key => placements[key]) // ascendant อาจเป็น null ถ้าไม่ทราบเวลาเกิด
    .map(key => `- ${PLANET_INFO[key].label}: ${ZODIAC_INFO_TH[placements[key].sign].label} (${placements[key].sign}) — สื่อถึง${PLANET_INFO[key].meaning}`)
    .join('\n');

  const prompt = `คุณคือนักโหราศาสตร์ตะวันตก (Western Astrology) ผู้เชี่ยวชาญเรื่องดวงเกิด (Natal Chart) ที่ตีความตำแหน่งดาวเป็นคำอ่านบุคลิกภาพและชีวิตได้อย่างลึกซึ้ง อบอุ่น และให้กำลังใจ

หน้าที่ของคุณ: ตีความ "ดวงเกิด" ของ ${name || 'ผู้ใช้'} จากตำแหน่งดาวจริงที่คำนวณไว้แล้วด้านล่าง (ห้ามคำนวณหรือเปลี่ยนตำแหน่งดาวเอง ใช้ตามที่ให้มาเท่านั้น)

ตำแหน่งดาวจริง ณ วันเกิด:
${placementLines}
${hasExactTime ? '' : '\n(หมายเหตุ: ผู้ใช้ไม่ทราบเวลาเกิดแน่นอน จึงไม่มีลัคนา — เน้นตีความจากดวงอาทิตย์/ดวงจันทร์/ดาวเคราะห์อื่นเป็นหลัก)'}

หลักการตีความ:
1. เชื่อมโยงดวงอาทิตย์ ดวงจันทร์${hasExactTime ? ' และลัคนา' : ''} เข้าด้วยกันเป็นภาพรวมบุคลิกภาพหลัก ไม่ตีความแยกทีละดวงแบบไม่เกี่ยวข้องกัน
2. ตีความดาวเคราะห์แต่ละดวงตามความหมายเชิงสัญลักษณ์ที่ให้มา ผสานกับราศีที่ดาวนั้นสถิตอยู่
3. ชี้จุดแข็งและจุดที่ควรพัฒนาอย่างสร้างสรรค์ ไม่ตัดสินหรือให้ความรู้สึกแง่ลบ
4. โทนเสียงอบอุ่น ให้กำลังใจ และชวนให้เข้าใจตัวเองมากขึ้น ตามสโลแกน "Same Cards. New Perspectives. A Brighter You."
5. ใช้ภาษาไทยที่เข้าใจง่าย ไม่ใช้ศัพท์โหราศาสตร์ซับซ้อนเกินไป

ตอบกลับเป็นโครงสร้าง JSON นี้เท่านั้น:
{
  "overview": "ภาพรวมบุคลิกภาพหลัก 3-5 ประโยค เชื่อมโยงดวงอาทิตย์/ดวงจันทร์${hasExactTime ? '/ลัคนา' : ''}เข้าด้วยกัน",
  "placements": {
${PLANET_ORDER.filter(key => placements[key]).map(key => `    "${key}": "ความหมายของ${PLANET_INFO[key].label}ในราศีนี้สำหรับคนคนนี้โดยเฉพาะ"`).join(',\n')}
  },
  "strengths": ["จุดแข็งที่โดดเด่นข้อที่ 1", "ข้อที่ 2", "ข้อที่ 3"],
  "challenges": ["จุดที่ควรพัฒนาข้อที่ 1 (เชิงสร้างสรรค์ ไม่ตัดสิน)", "ข้อที่ 2"],
  "lifeThemeMessage": "ข้อความสรุปแก่นแท้ของชีวิตคนนี้ 1-2 ประโยค เชิงกวี ให้กำลังใจ (ครอบด้วยเครื่องหมายคำพูด)"
}`;

  return withTimeout(
    withRetry(async () => {
      const result = await withTimeout(model.generateContent(prompt), GEMINI_ATTEMPT_TIMEOUT_MS, 'Gemini generateContent');
      return JSON.parse(result.response.text());
    }, { label: 'Gemini generateContent (birth chart)' }),
    GEMINI_TOTAL_TIMEOUT_MS, 'Gemini generateContent (birth chart) รวมทุก attempt'
  );
}

// fallback แบบไม่พึ่ง Gemini (ใช้ตอน Gemini ล้ม/ไม่มี API key) — สร้างคำอ่านทั่วไปจากความหมายดาว+ธาตุของราศี
// ที่มีอยู่แล้วใน PLANET_INFO/ZODIAC_INFO_TH แทน ไม่ใช่คำทำนายเจาะจงรายบุคคลแบบ Gemini แต่ยังอ่านได้ไม่ว่างเปล่า
function buildFallbackBirthChartInterpretation({ placements, hasExactTime }) {
  const placementTexts = {};
  PLANET_ORDER.filter(key => placements[key]).forEach((key) => {
    const p = placements[key];
    const zodiac = ZODIAC_INFO_TH[p.sign];
    placementTexts[key] = `${PLANET_INFO[key].label} ใน${zodiac.label} สะท้อนถึง${PLANET_INFO[key].meaning} ผ่านพลังงานธาตุ${zodiac.element}ของราศีนี้`;
  });
  const sunZodiac = ZODIAC_INFO_TH[placements.sun.sign];
  return {
    overview: `ดวงอาทิตย์ของคุณสถิตใน${sunZodiac.label} ซึ่งเป็นแก่นของตัวตนและอัตลักษณ์หลักในชีวิต ผสานกับตำแหน่งดาวอื่นๆ ในดวงเกิด ทำให้แต่ละคนมีสีสันเฉพาะตัวที่ไม่เหมือนใคร`,
    placements: placementTexts,
    strengths: [
      `ความเป็นตัวเองแบบ${sunZodiac.label}เป็นจุดแข็งที่ควรภูมิใจ`,
      'การเข้าใจตำแหน่งดาวของตัวเองช่วยให้มองเห็นแนวโน้มของตัวเองชัดขึ้น'
    ],
    challenges: [
      'ลองสังเกตว่าพลังงานของแต่ละดาวแสดงออกมาในชีวิตจริงอย่างไร แล้วปรับใช้ให้เกิดประโยชน์'
    ],
    lifeThemeMessage: `“ดวงดาวเป็นเพียงแผนที่ ไม่ใช่ปลายทาง — เส้นทางที่แท้จริงยังอยู่ในมือคุณเสมอ”`
  };
}

app.post('/api/birth-chart', aiLimiter, async (req, res) => {
  try {
    const { name: rawName, birthDate, birthTime, locationId } = req.body || {};
    const name = sanitizeText(rawName, 50);

    const parsed = parseBirthDateTime({ birthDate, birthTime, locationId });
    if (!parsed) {
      return res.status(400).json({ success: false, error: 'ข้อมูลวัน/เวลา/สถานที่เกิดไม่ถูกต้อง กรุณาตรวจสอบอีกครั้ง' });
    }
    const { location, birthUtcDate, hasExactTime } = parsed;

    const placements = computeNatalChart({
      birthUtcDate, lat: location.lat, lon: location.lon, hasExactTime
    });

    let interpretation = null;
    try {
      interpretation = await generateBirthChartInterpretation({ name, placements, hasExactTime });
    } catch (geminiErr) {
      console.warn('Gemini error (birth chart), using local fallback...', geminiErr.message);
    }
    if (!interpretation) {
      interpretation = buildFallbackBirthChartInterpretation({ placements, hasExactTime });
    }

    return res.json({ success: true, placements, interpretation });
  } catch (error) {
    console.error('Birth chart API Error:', error);
    return res.status(500).json({ success: false, error: 'เกิดข้อผิดพลาดในการคำนวณดวงเกิด กรุณาลองใหม่อีกครั้ง' });
  }
});

/* ---------------- Top-up (Omise: PromptPay) ---------------- */

// เครดิตเหรียญให้ผู้ใช้เมื่อ charge สำเร็จจริง — เรียกได้จากสองทาง: (1) webhook ที่ Omise ยิงเข้ามา
// และ (2) /api/topup/status ตอน client poll เจอว่ายัง pending (fallback เผื่อ webhook มาไม่ถึง เช่น
// ตอน dev บน localhost ที่ Omise ยิง webhook เข้ามาไม่ได้เลยเพราะ localhost ไม่ใช่ URL ที่เข้าถึงจากอินเทอร์เน็ตได้
// หรือแม้แต่บน production ก็อาจมีดีเลย์/ส่งไม่ถึงเป็นบางครั้ง) ทั้งสองทางต้อง re-fetch charge จาก Omise API
// ยืนยันสถานะจริงเสมอ ห้ามเชื่อค่า status ที่ใครส่งมาตรงๆ (ใครก็ยิง POST ปลอมมาที่ webhook endpoint ได้)
// คืนค่า status ล่าสุดของ pending_payment กลับไป (null ถ้าไม่พบรายการนี้เลย)
//
// จำกัดความถี่การยิง API จริงไปหา Omise ต่อ charge หนึ่งใบ — client poll ทุก 3 วิ แต่สถานะการจ่ายเงิน
// ไม่ได้เปลี่ยนถี่ขนาดนั้น ถ้าไม่กันไว้จะยิง Omise ซ้ำๆ ได้ถึงร้อยกว่าครั้งต่อการเติมเหรียญ 1 ครั้ง (รอสูงสุด 15 นาที)
// ใช้ in-memory Map พอ ไม่ต้อง persist ข้าม process restart — ส่ง { force: true } เพื่อข้ามการจำกัดนี้
// (ใช้ตอนเช็คครั้งสุดท้ายก่อนฟันธงว่าหมดเวลา และตอน webhook ยิงเข้ามาจริงซึ่งไม่ได้ถี่อยู่แล้ว)
const _chargeCheckThrottle = new Map(); // chargeId -> timestamp ล่าสุดที่เช็คกับ Omise จริง
const CHARGE_CHECK_MIN_INTERVAL_MS = 8000;

// เก็บกวาด entry เก่าที่ไม่ได้ใช้แล้วเป็นระยะ — ปกติ entry จะถูกลบทันทีที่ charge จบสถานะ (สำเร็จ/ไม่สำเร็จ)
// แต่ถ้าผู้ใช้เปิดหน้า QR ค้างไว้แล้วปิดแท็บไปเลยไม่กลับมาเช็คอีก entry จะค้างอยู่ตลอดไป ถ้ามีผู้ใช้พร้อมกัน
// จำนวนมากในระยะยาว (production ใช้งานจริงหลายคน) Map จะโตขึ้นเรื่อยๆ ไม่มีวันจบ — กวาดทิ้งของเก่าเป็นระยะกันไว้
setInterval(() => {
  const cutoff = Date.now() - CHARGE_CHECK_MIN_INTERVAL_MS * 10;
  for(const [chargeId, ts] of _chargeCheckThrottle){
    if(ts < cutoff) _chargeCheckThrottle.delete(chargeId);
  }
}, 30 * 60 * 1000);

async function confirmSuccessfulCharge(chargeId, options){
  const force = !!(options && options.force);
  const { data: pending } = await supabaseAdmin
    .from('pending_payments').select('*').eq('charge_id', chargeId).single();
  if(!pending) return null;
  if(pending.status !== 'pending') return pending.status; // ฟันธงไปแล้ว (สำเร็จ/ไม่สำเร็จ) ไม่ต้องเช็คซ้ำกับ Omise อีก

  if(!force){
    const lastChecked = _chargeCheckThrottle.get(chargeId) || 0;
    if(Date.now() - lastChecked < CHARGE_CHECK_MIN_INTERVAL_MS) return pending.status; // เพิ่งเช็คไปเมื่อกี้ ข้ามรอบนี้
  }
  _chargeCheckThrottle.set(chargeId, Date.now());

  const charge = await omise.charges.retrieve(chargeId);

  // Omise แจ้งชัดเจนแล้วว่าชำระเงินไม่สำเร็จ (failed) หรือ QR หมดอายุไม่มีคนจ่าย (expired) — บันทึกเหตุผลไว้
  // ให้ผู้ใช้เห็นทันที แทนที่จะปล่อยค้างสถานะ 'pending' ไปเรื่อยๆ โดยไม่รู้ว่าเกิดอะไรขึ้น
  if(charge.status === 'failed' || charge.status === 'expired'){
    const failureMessage = charge.status === 'expired'
      ? 'QR หมดอายุก่อนชำระเงิน'
      : (charge.failure_message || 'การชำระเงินไม่สำเร็จ');
    const { error: updateErr } = await supabaseAdmin.from('pending_payments')
      .update({ status: 'failed', failure_message: failureMessage })
      .eq('charge_id', chargeId);
    // ถ้า update พังเพราะ schema ยังไม่มีคอลัมน์/ค่า 'failed' (ยังไม่ได้รันไมเกรชันใน supabase/schema.sql)
    // ให้ log ไว้ชัดๆ กันเงียบหาย — ผู้ใช้จะยังเห็น pending ค้างต่อไปจนกว่าจะรันไมเกรชัน
    if(updateErr) console.error('pending_payments update (failed) error — รัน migration ใน supabase/schema.sql แล้วหรือยัง:', updateErr);
    _chargeCheckThrottle.delete(chargeId);
    return 'failed';
  }

  if(charge.status !== 'successful') return pending.status;
  if(charge.amount !== pending.package_amount_satang){
    console.error('Topup: จำนวนเงินไม่ตรงกับที่คาดไว้', chargeId);
    return pending.status;
  }

  const { error: addErr } = await supabaseAdmin.rpc('add_coins', {
    p_user_id: pending.user_id, p_amount: pending.package_coins, p_reference: chargeId
  });
  // ถ้า error เป็น unique constraint violation (reference ซ้ำ) แปลว่าเครดิตไปแล้วจากคำขอรอบก่อน
  // ไม่ใช่ปัญหา ถือว่าสำเร็จ (idempotent) — error อื่นคือเครดิตเหรียญไม่สำเร็จจริง ห้าม mark ว่า 'successful'
  // เด็ดขาด (ไม่งั้นผู้ใช้จ่ายเงินแล้วแต่ไม่ได้เหรียญ แถม retry ในอนาคตก็จะถูก idempotency guard บล็อกไปด้วย)
  if(addErr && addErr.code !== '23505'){
    console.error('add_coins error:', addErr);
    return pending.status;
  }

  await supabaseAdmin.from('pending_payments').update({ status: 'successful' }).eq('charge_id', chargeId);
  _chargeCheckThrottle.delete(chargeId); // เครดิตสำเร็จแล้ว ไม่ต้องจำ throttle ของ charge นี้อีกต่อไป
  return 'successful';
}

app.post('/api/topup/create-charge', aiLimiter, async (req, res) => {
  try{
    if(!omise || !supabaseAdmin){
      return res.status(503).json({ success:false, error: 'ระบบเติมเหรียญยังไม่พร้อมใช้งาน กรุณาติดต่อผู้ดูแลเว็บไซต์' });
    }
    const auth = await getUserFromRequest(req);
    if(!auth){
      return res.status(401).json({ success:false, error: 'กรุณาเข้าสู่ระบบก่อนเติมเหรียญ' });
    }
    const { user } = auth;

    const { packageId } = req.body || {};
    const pkg = TOPUP_PACKAGES[packageId];
    if(!pkg){
      return res.status(400).json({ success:false, error: 'ไม่พบแพ็กเกจนี้' });
    }

    const source = await omise.sources.create({
      amount: pkg.amountSatang, currency: 'thb', type: 'promptpay'
    });
    // กำหนดเวลาหมดอายุของ QR ให้ตรงกับที่ UI นับถอยหลังจริง (TOPUP_EXPIRE_MINUTES จาก spread-catalog.js)
    // ไม่งั้น Omise จะใช้ค่า default ของตัวเอง (ยาวกว่านี้มาก) ทำให้ QR ยังสแกนจ่ายได้จริงแม้ UI บอกว่าหมดเวลาไปแล้ว
    const expiresAt = new Date(Date.now() + TOPUP_EXPIRE_MINUTES * 60 * 1000).toISOString();
    const charge = await omise.charges.create({
      amount: pkg.amountSatang, currency: 'thb', source: source.id, expires_at: expiresAt
    });

    const { error: insertErr } = await supabaseAdmin.from('pending_payments').insert({
      user_id: user.id, charge_id: charge.id,
      package_coins: pkg.coins, package_amount_satang: pkg.amountSatang, status: 'pending'
    });
    if(insertErr){
      console.error('pending_payments insert error:', insertErr);
      return res.status(500).json({ success:false, error: 'เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง' });
    }

    const qrImage = charge.source && charge.source.scannable_code
      ? charge.source.scannable_code.image.download_uri
      : null;

    return res.json({ success: true, chargeId: charge.id, qrImage, expiresAt: charge.expires_at || null });
  }catch(error){
    console.error('Create charge error:', error);
    return res.status(500).json({ success:false, error: 'ไม่สามารถสร้างรายการชำระเงินได้ กรุณาลองใหม่อีกครั้ง' });
  }
});

// ให้ client poll เช็คสถานะการจ่ายเงินได้ (ระหว่างรอ webhook จาก Omise ยืนยัน)
app.get('/api/topup/status/:chargeId', async (req, res) => {
  try{
    if(!supabaseAdmin) return res.status(503).json({ success:false, error: 'ระบบยังไม่พร้อมใช้งาน' });
    const auth = await getUserFromRequest(req);
    if(!auth) return res.status(401).json({ success:false, error: 'กรุณาเข้าสู่ระบบ' });

    const { data, error } = await supabaseAdmin
      .from('pending_payments').select('status, failure_message')
      .eq('charge_id', req.params.chargeId).eq('user_id', auth.user.id).single();
    if(error || !data) return res.status(404).json({ success:false, error: 'ไม่พบรายการนี้' });

    let status = data.status;
    let failureMessage = data.failure_message;
    // ยังไม่เห็นว่าสำเร็จ/ไม่สำเร็จในฐานข้อมูล — เช็คสถานะจริงกับ Omise ตรงๆ อีกทีเป็น fallback เผื่อ webhook
    // มาไม่ถึง (เช่น dev บน localhost ที่ Omise ยิง webhook เข้ามาไม่ได้เลย หรือดีเลย์บน production) ทำให้ทั้ง
    // ยอดเหรียญเข้าได้ และรู้ว่าจ่ายไม่สำเร็จ (ไม่ใช่ค้าง pending เฉยๆ) แม้ webhook จะไม่เคยส่งมาถึงเลยก็ตาม
    // ?final=1 = client กำลังเช็คครั้งสุดท้ายก่อนฟันธงว่าหมดเวลา (ดู startTopupCountdown ฝั่ง client) —
    // ข้ามการจำกัดความถี่ปกติเพื่อให้ได้สถานะล่าสุดจริงๆ ก่อนแจ้งผู้ใช้ว่าชำระเงินไม่สำเร็จ
    if(status === 'pending' && omise){
      try{
        const force = req.query.final === '1';
        status = (await confirmSuccessfulCharge(req.params.chargeId, { force })) || status;
        if(status === 'failed'){
          const { data: refreshed } = await supabaseAdmin
            .from('pending_payments').select('failure_message').eq('charge_id', req.params.chargeId).single();
          failureMessage = refreshed ? refreshed.failure_message : failureMessage;
        }
      }catch(e){ console.warn('เช็คสถานะ charge กับ Omise ไม่สำเร็จ:', e.message); }
    }

    return res.json({ success:true, status, failureMessage: status === 'failed' ? failureMessage : undefined });
  }catch(error){
    console.error('Topup status error:', error);
    return res.status(500).json({ success:false, error: 'เกิดข้อผิดพลาด' });
  }
});

// Webhook จาก Omise แจ้งผลการชำระเงิน — logic การยืนยัน+เครดิตเหรียญจริงอยู่ที่ confirmSuccessfulCharge()
// ด้านบน (ใช้ร่วมกับ /api/topup/status ที่เป็น fallback ตัวเดียวกัน)
app.post('/api/webhooks/omise', async (req, res) => {
  try{
    if(!omise || !supabaseAdmin) return res.status(503).end();

    const chargeId = req.body && req.body.data && req.body.data.id;
    if(!chargeId) return res.status(200).end(); // ไม่ใช่ event ที่เราสนใจ ตอบ 200 เฉยๆ กัน Omise retry ไม่รู้จบ

    await confirmSuccessfulCharge(chargeId, { force: true }); // webhook ไม่ได้ยิงถี่อยู่แล้ว ไม่ต้องกันซ้ำ
    return res.status(200).end();
  }catch(error){
    console.error('Omise webhook error:', error);
    return res.status(200).end(); // ตอบ 200 เสมอกัน Omise ยิง retry รัวๆ ไว้ debug จาก log แทน
  }
});

app.post('/api/predict', aiLimiter, async (req, res) => {
  try {
    const { question: rawQuestion, spread: rawSpread, name: rawName, category: rawCategory, cards: clientCards } = req.body || {};

    const question = sanitizeText(rawQuestion, 500);
    if (!question) {
      return res.status(400).json({ error: 'กรุณากรอกคำถามของคุณก่อนเริ่มทำนาย' });
    }

    // /api/predict คือของฟรีสำหรับ "ไพ่ประจำวัน" 1 ใบเท่านั้น — ล็อก spread ไว้ที่ single เสมอ
    // ห้ามให้ client กำหนด spread เอง ไม่งั้นใครก็ยิง spread ใหญ่ (เช่น celtic 10 ใบ) มาขอฟรีได้
    // สเปรดอื่นๆ ต้องผ่าน /api/predict-premium ที่หักเหรียญเท่านั้น
    const spread = 'single';
    const name = sanitizeText(rawName, 50) || 'คุณ';
    const category = VALID_CATEGORIES.has(rawCategory) ? rawCategory : 'ทั่วไป';

    let cards;
    if (Array.isArray(clientCards) && clientCards.length > 0) {
      cards = sanitizeCards(clientCards, spread);
      if (!cards) {
        return res.status(400).json({ error: 'ข้อมูลไพ่ที่ส่งมาไม่ถูกต้อง กรุณาลองจับไพ่ใหม่อีกครั้ง' });
      }
    } else {
      cards = drawRandomCards(spread);
    }

    let summary = null;

    try {
      summary = await generateWithGemini({ question, spread, cards, name, category });
    } catch (geminiErr) {
      console.warn('Gemini error, using local fallback...', geminiErr.message);
    }

    if (!summary) {
      summary = buildFallbackReading({ question, name, cards, category, spread });
    }

    return res.json({
      success: true,
      spread,
      category,
      name,
      cards,
      summary
    });
  } catch (error) {
    console.error('Prediction API Error:', error);
    return res.status(500).json({
      success: false,
      error: 'เกิดข้อผิดพลาดในการทำนาย กรุณาลองใหม่อีกครั้ง'
    });
  }
});

app.post('/api/followup', aiLimiter, async (req, res) => {
  try {
    const { question: rawQuestion, followupQuestion: rawFollowup, spread: rawSpread, category: rawCategory, name: rawName, cards: rawCards } = req.body || {};

    const followupQuestion = sanitizeText(rawFollowup, 500);
    if (!followupQuestion) {
      return res.status(400).json({ error: 'กรุณาพิมพ์คำถามที่อยากถามต่อ' });
    }

    const question = sanitizeText(rawQuestion, 500);
    const spread = SPREAD_CARD_COUNTS.hasOwnProperty(rawSpread) ? rawSpread : 'three';
    const name = sanitizeText(rawName, 50) || 'คุณ';
    const category = VALID_CATEGORIES.has(rawCategory) ? rawCategory : 'ทั่วไป';

    const cards = sanitizeCards(rawCards, spread);
    if (!cards) {
      return res.status(400).json({ error: 'ไม่พบไพ่ชุดเดิมสำหรับตีความคำถามต่อเนื่อง หรือข้อมูลไพ่ไม่ถูกต้อง' });
    }

    let result = null;
    try {
      result = await generateFollowupWithGemini({ question, followupQuestion, cards, spread, category, name });
    } catch (geminiErr) {
      console.warn('Gemini followup error, using local fallback...', geminiErr.message);
    }

    if (!result || !result.answer) {
      result = buildFallbackFollowup({ followupQuestion, cards, category });
    }

    return res.json({ success: true, answer: result.answer });
  } catch (error) {
    console.error('Followup API Error:', error);
    return res.status(500).json({
      success: false,
      error: 'เกิดข้อผิดพลาดในการตอบคำถามต่อ กรุณาลองใหม่อีกครั้ง'
    });
  }
});

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', message: 'Ace of Tarot AI engine is running' });
});

// เช็คเฉยๆ ว่า user ปัจจุบันเป็นแอดมินไหม — ฝั่ง client ใช้ตัดสินใจว่าจะโชว์ลิงก์ "Admin" ใน nav หรือเปล่า
// (ไม่ใช่ตัวตัดสินสิทธิ์จริง — /api/admin/stats เช็คสิทธิ์ซ้ำของตัวเองเสมอ ต่อให้ client ปลอมค่านี้ก็ไม่มีผล)
app.get('/api/admin/check', async (req, res) => {
  const auth = await getUserFromRequest(req);
  // ส่ง email ที่ resolve ได้จาก token กลับไปด้วย (เป็นอีเมลของคนเรียกเอง ไม่ใช่ข้อมูลคนอื่น) เพื่อ debug ง่ายๆ
  // ว่าตรงกับ ADMIN_EMAILS ใน .env ไหมโดยไม่ต้องเดา — เทียบตรงนี้กับค่าใน .env ได้เลย
  res.json({ isAdmin: !!auth && isAdminEmail(auth.user.email), email: auth ? auth.user.email : null });
});

app.get('/api/admin/stats', async (req, res) => {
  try{
    if(!supabaseAdmin){
      return res.status(503).json({ success:false, error: 'ระบบยังไม่พร้อมใช้งาน กรุณาติดต่อผู้ดูแลเว็บไซต์' });
    }
    const auth = await getUserFromRequest(req);
    if(!auth || !isAdminEmail(auth.user.email)){
      return res.status(403).json({ success:false, error: 'ไม่มีสิทธิ์เข้าถึงส่วนนี้' });
    }

    const { data, error } = await supabaseAdmin.rpc('admin_dashboard_stats', { p_active_days: 7, p_recent_limit: 10 });
    if(error) throw error;
    return res.json({ success:true, stats: data });
  }catch(error){
    console.error('Admin stats error:', error);
    return res.status(500).json({ success:false, error: 'ไม่สามารถโหลดข้อมูลแดชบอร์ดได้ในขณะนี้' });
  }
});

app.get('*', (_req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

function startServer(port) {
  const server = app.listen(port, () => {
    console.log(`Ace of Tarot AI server running at http://localhost:${port}`);
  });

  server.on('error', (error) => {
    if (error.code === 'EADDRINUSE') {
      console.warn(`Port ${port} in use, trying ${port + 1}...`);
      startServer(port + 1);
      return;
    }
    throw error;
  });
}

// เตือนตั้งแต่ startup ถ้า .env ตั้งค่าไม่ครบ — กันเสียเวลาไล่ debug จาก error 401/403/503 ที่กระจัดกระจาย
// ในฝั่ง browser โดยไม่รู้ต้นตอ (เจอปัญหานี้มาหลายรอบแล้วในทีม เลยทำให้เห็นชัดๆ ตรงนี้ทีเดียว)
if(!supabaseAdmin){
  console.warn('⚠️  SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY ไม่ได้ตั้งค่าใน .env (หรือยังไม่ได้ restart server หลังแก้ .env) — ฟีเจอร์ที่ต้องใช้สิทธิ์ server เช่น ไพ่พรีเมียม, เติมเหรียญ, admin dashboard จะใช้งานไม่ได้ (จะเจอ error 401/403/503)');
}
if(!process.env.SUPABASE_ANON_KEY){
  console.warn('⚠️  SUPABASE_ANON_KEY ไม่ได้ตั้งค่าใน .env — /supabase-config.js จะส่งค่าว่างให้ browser แอปจะตกไปโหมด guest ทั้งหมด');
}
if(!omise){
  console.warn('⚠️  OMISE_SECRET_KEY และ/หรือ OMISE_PUBLIC_KEY ไม่ได้ตั้งค่าใน .env (ต้องมีทั้งคู่) — ฟีเจอร์เติมเหรียญ (สร้าง QR PromptPay) จะใช้งานไม่ได้');
}

startServer(basePort);