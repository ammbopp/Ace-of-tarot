const express = require('express');
const path = require('path');
const dotenv = require('dotenv');
const rateLimit = require('express-rate-limit');
const { GoogleGenerativeAI } = require('@google/generative-ai');

dotenv.config();

const app = express();
const basePort = Number(process.env.PORT) || 3000;

app.use(express.json({ limit: '1mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// จำกัดจำนวนครั้งที่เรียก Gemini API ต่อ IP เพื่อป้องกันการยิงรัวจนบิลพุ่ง/โดน abuse
const aiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 นาที
  max: 30, // สูงสุด 30 ครั้งต่อ IP ต่อ 15 นาที (รวม predict + followup)
  standardHeaders: true,
  legacyHeaders: false,
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
const SPREAD_CARD_COUNTS = { single: 1, three: 3, year: 5, relationship: 6, celtic: 10 };

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

app.post('/api/predict', aiLimiter, async (req, res) => {
  try {
    const { question: rawQuestion, spread: rawSpread, name: rawName, category: rawCategory, cards: clientCards } = req.body || {};

    const question = sanitizeText(rawQuestion, 500);
    if (!question) {
      return res.status(400).json({ error: 'กรุณากรอกคำถามของคุณก่อนเริ่มทำนาย' });
    }

    const spread = SPREAD_CARD_COUNTS.hasOwnProperty(rawSpread) ? rawSpread : 'three';
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
      summary = buildFallbackReading({ question, name, cards, category });
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