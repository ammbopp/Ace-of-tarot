const express = require('express');
const path = require('path');
const dotenv = require('dotenv');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const OpenAI = require('openai');

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
  const count = spread === 'single' ? 1 : spread === 'year' ? 5 : 3;
  const shuffled = [...tarotDeck].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count).map((card, index) => ({
    ...card,
    position: index + 1,
    isReversed: Math.random() < 0.25
  }));
}

function buildFallbackReading({ question, name, cards, category }) {
  const mainCard = cards[0] || tarotDeck[0];
  const cardSummary = cards.map(c => `${c.name}${c.isReversed ? ' (กลับหัว)' : ''}`).join(', ');

  return {
    overview: `สำหรับคำถามเรื่อง "${question}" ของคุณ ${name || 'ผู้ถาม'}: หน้าไพ่ชุดนี้สะท้อนว่า ${mainCard.name}${mainCard.isReversed ? ' (กลับหัว)' : ''} กำลังชี้ให้เห็นประเด็นสำคัญในเรื่อง${category || 'ชีวิต'} ว่าคุณต้องหันกลับมามองความจริงและจุดที่เป็นตัวแปรหลัก สิ่งที่เกิดขึ้นในขณะนี้ไม่ใช่เรื่องบังเอิญ แต่เป็นช่วงเวลาที่นำพาความชัดเจนมาให้`,
    guidance: `ไพ่ชุดนี้ (${cardSummary}) ร้อยเรียงเรื่องราวว่า: สิ่งที่คุณแบกรับหรือสงสัยกำลังเดินทางมาถึงจุดที่ต้องปรับเปลี่ยนมุมมอง การรับมือไม่ใช่การใช้แรงผลักดันอย่างเดียว แต่เป็นการปล่อยให้จังหวะเวลาและความเข้าใจทำงานร่วมกัน`,
    actionPlan: [
      `วิเคราะห์สถานการณ์ "${question}" ด้วยใจที่เป็นกลางและลดความกังวลส่วนตัวลง`,
      `โฟกัสกับสิ่งที่คุณสามารถควบคุมและลงมือทำได้ทันทีในวันนี้`,
      `สื่อสารหรือตัดสินใจด้วยความชัดเจน ตรงไปตรงมา และเคารพความรู้สึกของตนเอง`,
      `เปิดใจรับบทเรียนและแนวโน้มใหม่ๆ ที่ไพ่กำลังเปิดทางให้`
    ],
    answer: `“บางคำถามอาจไม่ได้ต้องการคำตอบที่รวดเร็ว แต่ต้องการมุมมองที่ลึกซึ้งเพื่อให้คุณเติบโตอย่างมั่นคง”`
  };
}

// Prediction Logic using Google Gemini (Free & Highly Intelligent)
async function generateWithGemini({ question, spread, cards, name, category }) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: 'gemini-1.5-flash',
    generationConfig: {
      responseMimeType: 'application/json',
      temperature: 0.7
    }
  });

  const cardListDetails = cards.map((c, i) => 
    `ตำแหน่งที่ ${i + 1}: ${c.name} (${c.nameTh || ''}) [สถานะ: ${c.isReversed ? 'ไพ่กลับหัว (Reversed)' : 'ไพ่หน้าตรง (Upright)'}] - คีย์เวิร์ด: ${c.isReversed ? (c.reversedMeaning || c.meaning) : c.meaning}`
  ).join('\n');

  const prompt = `คุณคือ "Ace of Tarot" นักพยากรณ์ไพ่ทาโรต์เชิงจิตวิทยา (Tarot & Life Coach) ระดับปรมาจารย์

หน้าที่ของคุณ:
1. ตอบคำถามของผู้ใช้ "${question}" ให้ **ตรงประเด็น ชัดเจน ฟันธงสถานการณ์จริง 100%** (ห้ามตอบกำกวม ห้ามตอบเป็นดวงกว้างๆ ทั่วไป)
2. ถอดรหัสพลังงานของไพ่แต่ละใบผสานเข้ากับคำถามโดยตรง หากไพ่กลับหัว (Reversed) ให้ตีความถึงจุดติดขัดในใจ ความล่าช้า หรือสัญญาณเตือน
3. โทนเสียงต้องอบอุ่น ลึกซึ้ง ให้สติ และสร้างพลังบวก ตามสโลแกน "Same Cards. New Perspectives. A Brighter You."

ข้อมูลการอ่านไพ่:
- ชื่อผู้ถาม: ${name || 'คุณ'}
- หมวดหมู่: ${category || 'ทั่วไป'}
- รูปแบบ Spread: ${spread} (1 ใบ = แก่นสำคัญ, 3 ใบ = อดีต/ต้นเหตุ -> ปัจจุบัน/อุปสรรค -> อนาคต/ผลลัพธ์)
- ไพ่ที่จับได้จริง:
${cardListDetails}

ตอบกลับเป็นโครงสร้าง JSON นี้เท่านั้น:
{
  "overview": "วิเคราะห์ภาพรวมเพื่อตอบคำถาม '${question}' ให้กระจ่างทันทีใน 3-4 ประโยค เจาะลึกสถานการณ์จริง",
  "guidance": "อธิบายการร้อยเรียงเรื่องราวของไพ่แต่ละใบตามลำดับ (Timeline: จากรากเหง้า สู่ปัจจุบัน สู่ปลายทางข้างหน้า)",
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

// Alternative: Groq API (Llama-3.3-70b-versatile - Free)
async function generateWithGroq({ question, spread, cards, name, category }) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) return null;

  const client = new OpenAI({
    apiKey,
    baseURL: 'https://api.groq.com/openai/v1'
  });

  const cardListDetails = cards.map((c, i) => 
    `ตำแหน่งที่ ${i + 1}: ${c.name} [${c.isReversed ? 'Reversed (กลับหัว)' : 'Upright'}] - ${c.isReversed ? (c.reversedMeaning || c.meaning) : c.meaning}`
  ).join('\n');

  const systemPrompt = `คุณคือแม่หมอไพ่ทาโรต์ Ace of Tarot ที่วิเคราะห์ดวงเชิงจิตวิทยาได้อย่างเฉียบคม แม่นยำ และตรงประเด็นกับคำถามของผู้ใช้ 100% ตอบกลับเป็น JSON เท่านั้น`;
  const userPrompt = `คำถาม: "${question}" (หมวด: ${category || 'ทั่วไป'})
ผู้ถาม: ${name || 'คุณ'}
ไพ่ที่ได้:
${cardListDetails}

สร้าง JSON:
{
  "overview": "ตอบคำถาม '${question}' โดยตรงทันที 3-4 ประโยค",
  "guidance": "ร้อยเรียงเรื่องราวของไพ่จากอดีต ปัจจุบัน สู่บทสรุป",
  "actionPlan": ["แนวทางปฏิบัติที่ 1", "แนวทางปฏิบัติที่ 2", "แนวทางปฏิบัติที่ 3"],
  "answer": "Quote ข้อคิดสั้นๆ คมๆ"
}`;

  const completion = await client.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ],
    response_format: { type: 'json_object' },
    temperature: 0.7
  });

  return JSON.parse(completion.choices[0]?.message?.content || '{}');
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

    // ลำดับการเรียกใช้ AI: Gemini -> Groq -> Fallback
    try {
      summary = await generateWithGemini({ question, spread: spread || 'three', cards, name, category });
    } catch (geminiErr) {
      console.warn('Gemini error, attempting Groq fallback...', geminiErr.message);
    }

    if (!summary) {
      try {
        summary = await generateWithGroq({ question, spread: spread || 'three', cards, name, category });
      } catch (groqErr) {
        console.warn('Groq error, using local fallback...', groqErr.message);
      }
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