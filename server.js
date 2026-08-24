const express = require('express');
const path = require('path');
const dotenv = require('dotenv');
const { GoogleGenerativeAI } = require('@google/generative-ai');

dotenv.config();

const app = express();
const basePort = Number(process.env.PORT) || 3000;

app.use(express.json({ limit: '1mb' }));
app.use(express.static(path.join(__dirname, 'public')));

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
  { name: 'Six of Cups', nameTh: 'ซิกส์ ออฟ คัพส์', meaning: 'ความทรงจำ ความผูกพันในอดีต มิตรภาพที่บริสุทธิ์', reversedMeaning: 'การยึดติดกับอดีตจนไม่ยอมก้าวไปข้างหน้า' }
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

function meaningFor(cardName){ return tarotDeck.find(t => t.name === cardName) || null; }

function buildFallbackReading({ question, name, cards, category }) {
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

const SPREAD_DESCRIPTIONS = {
  single: '1 ใบ = แก่นสำคัญของคำถาม',
  three: '3 ใบ = อดีต/ต้นเหตุ -> ปัจจุบัน/อุปสรรค -> อนาคต/ผลลัพธ์',
  year: '5 ใบ = สถานการณ์ -> อุปสรรค -> สิ่งที่ซ่อนอยู่ -> คำแนะนำ -> ผลลัพธ์ที่เป็นไปได้',
  relationship: '6 ใบ (Relationship Spread) = ตัวคุณ -> คู่ของคุณ -> รากฐานความสัมพันธ์ -> สถานการณ์ปัจจุบัน -> ความท้าทายที่ต้องเผชิญ -> แนวโน้ม/ผลลัพธ์',
  celtic: '10 ใบ (Celtic Cross) = สถานการณ์ปัจจุบัน -> สิ่งที่ขวางกั้น -> รากฐาน/อดีตอันไกล -> อดีตอันใกล้ -> เป้าหมาย/สิ่งที่เป็นไปได้ -> อนาคตอันใกล้ -> ตัวคุณเอง/ทัศนคติ -> สิ่งแวดล้อมรอบตัว -> ความหวังและความกลัว -> ผลลัพธ์สุดท้าย'
};

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

  const prompt = `คุณคือ "Ace of Tarot" นักพยากรณ์ไพ่ทาโรต์เชิงจิตวิทยา (Tarot & Life Coach) ระดับปรมาจารย์

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

  const result = await model.generateContent(prompt);
  const text = result.response.text();
  return JSON.parse(text);
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

  const result = await model.generateContent(prompt);
  const text = result.response.text();
  return JSON.parse(text);
}

function buildFallbackFollowup({ followupQuestion, cards, category }) {
  const mainCard = cards[0] || tarotDeck[0];
  const m = meaningFor(mainCard.name);
  const kw = m ? (mainCard.isReversed ? (m.reversedMeaning || m.meaning) : m.meaning) : '';
  return {
    answer: `เมื่อโยงกับคำถามต่อเนื่อง "${followupQuestion}" ไพ่ ${mainCard.name}${mainCard.isReversed ? ' (กลับหัว)' : ''} ในชุดเดิมยังคงชี้ให้เห็นถึง${kw || 'พลังงานสำคัญที่คุณควรพิจารณา'} ลองใช้มุมมองนี้ประกอบการตัดสินใจของคุณ พร้อมกับความหมายของไพ่ใบอื่นๆ ในชุดเดียวกัน เพื่อมองภาพรวมของเรื่อง${category || 'นี้'}ให้ครบถ้วนยิ่งขึ้น`
  };
}

app.post('/api/predict', async (req, res) => {
  try {
    const { question, spread, name, category, cards: clientCards } = req.body || {};

    if (!question) {
      return res.status(400).json({ error: 'กรุณากรอกคำถามของคุณก่อนเริ่มทำนาย' });
    }

    const cards = (Array.isArray(clientCards) && clientCards.length > 0)
      ? clientCards
      : drawRandomCards(spread || 'three');

    let summary = null;

    try {
      summary = await generateWithGemini({ question, spread: spread || 'three', cards, name, category });
    } catch (geminiErr) {
      console.warn('Gemini error, using local fallback...', geminiErr.message);
    }

    if (!summary) {
      summary = buildFallbackReading({ question, name, cards, category });
    }

    return res.json({
      success: true,
      spread: spread || 'three',
      category: category || 'love',
      name: name || 'คุณ',
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

app.post('/api/followup', async (req, res) => {
  try {
    const { question, followupQuestion, spread, category, name, cards } = req.body || {};

    if (!followupQuestion || !String(followupQuestion).trim()) {
      return res.status(400).json({ error: 'กรุณาพิมพ์คำถามที่อยากถามต่อ' });
    }
    if (!Array.isArray(cards) || cards.length === 0) {
      return res.status(400).json({ error: 'ไม่พบไพ่ชุดเดิมสำหรับตีความคำถามต่อเนื่อง' });
    }

    let result = null;
    try {
      result = await generateFollowupWithGemini({ question, followupQuestion, cards, spread: spread || 'three', category, name });
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

startServer(basePort);