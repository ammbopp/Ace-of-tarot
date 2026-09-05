// app.js — โค้ดที่ใช้ร่วมกันทั้งแอป (utils, ข้อมูลไพ่, state, session, navigation, การ์ตูนพื้นหลัง, bootstrap)
// ฟังก์ชันเฉพาะของแต่ละหน้า (ask/draw/result/journal/auth/premium/topup/admin ฯลฯ) อยู่ใน
// <script> ที่ฝังท้ายไฟล์ partial ของหน้านั้นเองใน public/partials/ ไม่ได้กองรวมไว้ที่นี่

/* ---------------- วิดีโอพื้นหลัง ---------------- */
// วิดีโอมี autoplay ผ่าน HTML attribute (ไม่รู้จัก prefers-reduced-motion เอง) — ถ้าผู้ใช้ตั้งค่าลด
// การเคลื่อนไหวไว้ ให้หยุดเล่นทันทีแล้วเหลือแค่ poster frame นิ่งแทน (เท่ากับพื้นหลังภาพนิ่งแบบเดิม)
(function(){
  const video = document.getElementById('bg-video');
  if(!video) return;
  if(window.matchMedia('(prefers-reduced-motion: reduce)').matches){
    video.pause();
    video.removeAttribute('autoplay');
  }
})();

/* ---------------- 0. Utils ---------------- */
// escape ค่าที่มาจากผู้ใช้/AI ก่อนแทรกลง innerHTML เพื่อป้องกัน XSS
function escapeHtml(str){
  return String(str ?? '').replace(/[&<>"']/g, ch => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[ch]));
}

/* ---------------- 1. Deck Data & Icons ---------------- */
const MAJOR = ["The Fool","The Magician","The High Priestess","The Empress","The Emperor","The Hierophant","The Lovers","The Chariot","Strength","The Hermit","Wheel of Fortune","Justice","The Hanged Man","Death","Temperance","The Devil","The Tower","The Star","The Moon","The Sun","Judgement","The World"];
const ROMANS = ["0","I","II","III","IV","V","VI","VII","VIII","IX","X","XI","XII","XIII","XIV","XV","XVI","XVII","XVIII","XIX","XX","XXI"];
function numeralFor(card){ return card.arcana==='major' ? (ROMANS[MAJOR.indexOf(card.name)] || '') : ''; }
const SUITS = ["Cups","Pentacles","Swords","Wands"];
const RANKS = ["Ace","Two","Three","Four","Five","Six","Seven","Eight","Nine","Ten","Page","Knight","Queen","King"];

function buildDeck(){
  const deck = MAJOR.map(name => ({name, arcana:'major'}));
  SUITS.forEach(suit => RANKS.forEach(rank => deck.push({name:`${rank} of ${suit}`, arcana:'minor', suit})));
  return deck;
}
function shuffledDeck(){
  const d = buildDeck().map(c => ({...c, reversed: Math.random() < 0.28}));
  for(let i=d.length-1;i>0;i--){ const j = Math.floor(Math.random()*(i+1)); [d[i],d[j]]=[d[j],d[i]]; }
  return d;
}

const SUIT_PATHS = {
  Cups: `<path d="M6 4h12l-1.2 8.5A4.8 4.8 0 0112 17a4.8 4.8 0 01-4.8-4.5L6 4z"/><path d="M9 21h6M12 17v4"/>`,
  Pentacles: `<circle cx="12" cy="12" r="8"/><path d="M12 6l3.6 5.2L9 15l6-1L12 18l-1-4-4.6-1.4L11 10z"/>`,
  Swords: `<path d="M12 2v14"/><path d="M8 20l4-4 4 4"/><path d="M9 8h6"/>`,
  Wands: `<path d="M6 18L18 6"/><path d="M14 4l2 2-2 2M18 8l2 2-2 2"/>`
};
const ICONS = {
  major: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 1l2 7 7 2-7 2-2 7-2-7-7-2 7-2 2-7z"/></svg>`,
  Cups: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">${SUIT_PATHS.Cups}</svg>`,
  Pentacles: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">${SUIT_PATHS.Pentacles}</svg>`,
  Swords: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">${SUIT_PATHS.Swords}</svg>`,
  Wands: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">${SUIT_PATHS.Wands}</svg>`
};
function iconFor(card){ return card.arcana === 'major' ? ICONS.major : (ICONS[card.suit] || ICONS.major); }
function iconSvgSmall(){ return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 2l1.6 5.2L19 9l-5.4 1.8L12 16l-1.6-5.2L5 9l5.4-1.8L12 2z"/></svg>`; }

const SUIT_ACCENT = { major:'var(--c-major)', Cups:'var(--c-cups)', Pentacles:'var(--c-pentacles)', Swords:'var(--c-swords)', Wands:'var(--c-wands)' };
function accentFor(card){ return card.arcana === 'major' ? SUIT_ACCENT.major : (SUIT_ACCENT[card.suit] || SUIT_ACCENT.major); }

/* ---------------- 1c. Local Card Images ---------------- */
const CARD_IMG_BASE = '/img/tarot/';
const CARD_BACK_URL = CARD_IMG_BASE + '13.png';

// แปลงชื่อไพ่ให้ตรงกับชื่อไฟล์รูปในโฟลเดอร์ public/img/tarot เช่น "Ace of Cups" -> "Ace Of Cups.png"
function cardFileName(card){
  const titled = card.name.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
  return `${titled}.png`;
}
function getCardImageUrl(card){
  return CARD_IMG_BASE + encodeURIComponent(cardFileName(card));
}

// ภาพสำรอง (inline SVG, ไม่พึ่งไฟล์ภายนอกเลย) ใช้ตอนรูปไพ่จริงโหลดไม่ขึ้น
// เช่น ชื่อไฟล์ในโฟลเดอร์ public/img/tarot ไม่ตรงกับชื่อไพ่ (เว้นวรรค/ตัวพิมพ์ผิด)
const CARD_IMG_FALLBACK = 'data:image/svg+xml,' + encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 300">
    <rect width="200" height="300" fill="#8C67B4"/>
    <rect x="8" y="8" width="184" height="284" fill="none" stroke="#C9A467" stroke-width="3"/>
    <text x="100" y="128" font-size="54" fill="#E7D3AC" text-anchor="middle" font-family="serif">✦</text>
    <text x="100" y="172" font-size="15" fill="#FDF6F0" text-anchor="middle" font-family="sans-serif">ไม่พบภาพไพ่</text>
  </svg>`
);
// เรียกจาก onerror ของ <img> รูปไพ่ทุกจุด: สลับไปใช้ภาพสำรอง และเอา onerror ออก
// เพื่อกันลูปไม่รู้จบ (เผื่อกรณีภาพสำรองเองก็โหลดไม่ขึ้นด้วยเหตุผลบางอย่าง)
function handleCardImgError(imgEl){
  imgEl.onerror = null;
  imgEl.src = CARD_IMG_FALLBACK;
  imgEl.classList.add('img-fallback');
}

/* ---------------- 2. State & Constants ---------------- */
// SPREADS/SPREAD_BACKEND_MAP/PREMIUM_CATALOG derive จาก spread-catalog.js (แหล่งความจริงเดียวร่วมกับ server)
// ต้องโหลด <script src="/spread-catalog.js"> ก่อน app.js เสมอ — เผื่อโหลดไม่สำเร็จ (404/ถูกบล็อก) ก็ fallback
// เป็น catalog ว่างแทนที่จะปล่อยให้ทั้งสคริปต์ throw แล้วพังทั้งแอป (nav/journal/auth ควรยังพอใช้ได้)
const SPREAD_CATALOG_SAFE = window.SPREAD_CATALOG || (function(){
  console.error('[Ace of Tarot] โหลด /spread-catalog.js ไม่สำเร็จ — ฟีเจอร์เกี่ยวกับสเปรด/ไพ่พรีเมียมจะใช้งานไม่ได้');
  return { FREE_SPREAD_UI: {}, SPREAD_CARD_COUNTS: {}, SPREAD_POSITIONS: {}, PREMIUM_READINGS: {}, TOPUP_PACKAGES: {} };
})();
const SPREADS = {};
const SPREAD_BACKEND_MAP = {};
Object.keys(SPREAD_CATALOG_SAFE.FREE_SPREAD_UI).forEach(uiKey => {
  const ui = SPREAD_CATALOG_SAFE.FREE_SPREAD_UI[uiKey];
  SPREADS[uiKey] = {
    label: ui.label, sub: ui.sub, icon: ui.icon,
    count: SPREAD_CATALOG_SAFE.SPREAD_CARD_COUNTS[ui.backend],
    positions: SPREAD_CATALOG_SAFE.SPREAD_POSITIONS[ui.backend]
  };
  SPREAD_BACKEND_MAP[uiKey] = ui.backend;
});

// คืนข้อมูล label/sub ของ spread ที่ใช้แสดงผล — รองรับทั้ง spread ปกติ (SPREADS)
// และ spread พรีเมียม (PREMIUM_CATALOG) ที่ entry.spreadKey เป็น premium key เช่น 'love'/'celtic'/'compatibility'
// PREMIUM_CATALOG ประกาศอยู่ใน premium.html (โหลดแบบ async) เช็ค typeof ไว้กันพังถ้าเรียกก่อน partial นั้นโหลดเสร็จ
function getSpreadInfo(entry){
  if(SPREADS[entry.spreadKey]) return SPREADS[entry.spreadKey];
  const premium = (typeof PREMIUM_CATALOG !== 'undefined' ? PREMIUM_CATALOG : []).find(p => p.key === entry.spreadKey);
  if(premium) return { label: premium.label, sub: premium.desc, count: (entry.cards || []).length };
  return SPREADS['3'];
}
const SUGGESTED_BY_CATEGORY = {
  'ทั่วไป': ["ตอนนี้ชีวิตฉันกำลังเดินไปทางไหน?","มีอะไรที่ฉันควรรู้ตอนนี้บ้าง?","ฉันควรโฟกัสกับเรื่องอะไรก่อน?","จะมีการเปลี่ยนแปลงอะไรเข้ามาในชีวิตไหม?","ฉันกำลังมองข้ามอะไรไปหรือเปล่า?","สิ่งที่เกิดขึ้นตอนนี้มีความหมายว่าอะไร?"],
  'ความรัก': ["เขายังคิดถึงเราไหม?","ความสัมพันธ์นี้จะไปต่อได้ไหม?","เราสองคนเข้ากันได้แค่ไหน?","คนที่ใช่จะเข้ามาเมื่อไหร่?","ทำไมความสัมพันธ์นี้ถึงสะดุด?","ควรเปิดใจให้เขาอีกครั้งไหม?"],
  'การงาน': ["งานนี้จะไปต่อได้หรือเปล่า?","ฉันควรเปลี่ยนงานตอนนี้ไหม?","โอกาสก้าวหน้าจะมาเมื่อไหร่?","ควรเจรจาเรื่องนี้กับหัวหน้ายังไง?","โปรเจกต์นี้จะสำเร็จไหม?","ฉันเหมาะกับเส้นทางสายอาชีพนี้หรือเปล่า?"],
  'การเงิน': ["การเงินของฉันจะดีขึ้นไหม?","ควรลงทุนตอนนี้หรือรอก่อน?","หนี้สินจะคลี่คลายเมื่อไหร่?","มีโอกาสรายได้ใหม่เข้ามาไหม?","ควรตัดสินใจเรื่องเงินก้อนนี้ยังไง?","ฉันจะมีความมั่นคงทางการเงินไหม?"],
  'สุขภาพ': ["สุขภาพฉันตอนนี้เป็นยังไง?","ฉันควรดูแลตัวเองด้านไหนเพิ่ม?","ความเครียดนี้จะคลี่คลายไหม?","ฉันควรพักผ่อนมากขึ้นหรือเปล่า?","สัญญาณที่ร่างกายส่งมาหมายถึงอะไร?","ใจฉันตอนนี้ต้องการอะไร?"]
};
const SUGGESTED_RELATIONSHIP = ["ความสัมพันธ์นี้จะไปในทิศทางไหน?","เราสองคนเข้ากันได้จริงแค่ไหน?","อะไรคือรากฐานที่ทำให้เรามาถึงจุดนี้?","ตอนนี้เขา/เธอรู้สึกกับเรายังไง?","อุปสรรคที่แท้จริงของความสัมพันธ์นี้คืออะไร?","สุดท้ายแล้วความสัมพันธ์นี้จะจบลงแบบไหน?"];
const SUGGESTED_CELTIC = ["ภาพรวมชีวิตของฉันตอนนี้เป็นยังไง?","อะไรคือสิ่งที่ขวางกั้นฉันอยู่ตอนนี้?","รากเหง้าของปัญหานี้มาจากไหน?","ฉันควรเตรียมใจรับมือกับอะไรในอนาคต?","อะไรคือสิ่งที่ฉันมองข้ามไปเกี่ยวกับสถานการณ์นี้?","สุดท้ายแล้วเรื่องนี้ทั้งหมดจะคลี่คลายไปทางไหน?"];
const LOADING_MSGS = [
  "กำลังสับไพ่แห่งจักรวาล...",
  "กำลังฟังเสียงไพ่...",
  "กำลังเชื่อมโยงคำถามของคุณกับไพ่...",
  "กำลังถอดความหมาย...",
  "อีกสักครู่นะ..."
];

const CATEGORIES = [
  {key:'ทั่วไป', label:'ทั่วไป', icon:'☾'},
  {key:'ความรัก', label:'ความรัก', icon:'♥'},
  {key:'การงาน', label:'การงาน', icon:'⚒'},
  {key:'การเงิน', label:'การเงิน', icon:'฿'},
  {key:'สุขภาพ', label:'สุขภาพ', icon:'✚'}
];

let state = {
  question:'', spreadKey:'3', category:'ทั่วไป', isDaily:false, premiumKey:null,
  deck:[], drawn:[], required:3, positions:[], drawCount:0,
  currentReading:null
};

let loadingInterval = null;

// ตัวจับเวลาของหน้าเติมเหรียญ (poll สถานะ + นับถอยหลัง) — ประกาศไว้ที่นี่ (ไฟล์กลาง ไม่ใช่ topup.html)
// เพราะ showScreen() ด้านล่างต้อง clearInterval() ทั้งคู่ได้เสมอทุกครั้งที่เปลี่ยนหน้า ไม่ว่า topup.html
// (ซึ่งโหลดแบบ async แยกไฟล์) จะโหลดเสร็จไปแล้วหรือยัง — ถ้าประกาศไว้ที่ topup.html เฉยๆ แล้ว topup.html
// โหลดพลาด/ช้า จะทำให้ showScreen() (ที่ทำงานแทบทุกการนำทางในแอป) throw ReferenceError ทั้งแอปทันที
let _topupPollTimer = null;
let _topupCountdownTimer = null;

/* ---------------- 2b. Session (ใช้ร่วมกันแทบทุกฟีเจอร์) ---------------- */
async function getAuthToken(){
  if(typeof supabaseClient === 'undefined' || !supabaseClient) return null;
  try{
    const { data } = await supabaseClient.auth.getSession();
    return data.session ? data.session.access_token : null;
  }catch(e){ return null; }
}
// คืนค่า user ปัจจุบันถ้า login อยู่ (ผ่าน Supabase Auth), null ถ้าเป็น guest
// เผื่อไว้กรณียังไม่ได้ตั้งค่า Supabase (ยังไม่กรอก URL/key) จะ fallback เป็น guest mode เสมอ ไม่ error
async function getCurrentUser(){
  if(typeof supabaseClient === 'undefined' || !supabaseClient) return null;
  try{
    const { data } = await supabaseClient.auth.getSession();
    return data.session ? data.session.user : null;
  }catch(e){ return null; }
}

// ยิง fetch แบบแนบ Authorization header ให้อัตโนมัติ — รวม pattern "ดึง token แล้วแนบ Bearer header"
// ที่เดิมเขียนซ้ำแยกกันในหลายไฟล์ (draw.html, topup.html, admin.html) ไว้ที่เดียว
// คืนค่า null แทนการ throw ถ้าไม่มี token (ยังไม่ได้ล็อกอิน) ให้ผู้เรียกตัดสินใจเอง (เช่น goAuth())
async function authFetch(url, options){
  const token = await getAuthToken();
  if(!token) return null;
  const opts = options || {};
  const headers = Object.assign({ 'Authorization': `Bearer ${token}` }, opts.headers || {});
  return fetch(url, Object.assign({}, opts, { headers }));
}

/* ---------------- 3. Navigation ---------------- */
function showScreen(name){
  if(name !== 'topup'){
    clearInterval(_topupPollTimer); // ออกจากหน้าเติมเหรียญแล้วต้องเลิก poll สถานะ ไม่งั้นจะยิง API ค้างไม่รู้จบ
    clearInterval(_topupCountdownTimer); // และเลิกนับถอยหลังด้วย ไม่งั้นจะพยายามอัปเดต DOM ของหน้าที่ไม่ได้แสดงอยู่แล้ว
  }
  document.querySelectorAll('.screen').forEach(s=>s.classList.remove('visible'));
  document.getElementById('screen-'+name).classList.add('visible');
  document.getElementById('nav-home').classList.toggle('active', name==='home');
  document.getElementById('nav-journal').classList.toggle('active', name==='journal');
  window.scrollTo({top:0, behavior:'smooth'});
}
// รอ partialsReady ก่อนเสมอ (ดูคำอธิบายที่ประกาศ partialsReady ท้ายไฟล์) กัน ReferenceError ถ้าผู้ใช้กด
// ปุ่ม nav (อยู่ใน index.html ซึ่งคลิกได้ทันทีตั้งแต่หน้าโหลดเสร็จ) เร็วกว่าที่ partial ของหน้านั้นจะโหลดเสร็จ
// เช็ค typeof ซ้ำอีกชั้นเผื่อ partial โหลดพลาดจริงๆ (ไม่ใช่แค่ช้า) — ยอมข้าม render ส่วนนั้นแทนที่จะพังทั้งฟังก์ชัน
async function goHome(){
  await partialsReady;
  if(typeof renderDailyStrip === 'function') await renderDailyStrip();
  if(typeof renderNicknamePrompt === 'function') await renderNicknamePrompt();
  showScreen('home');
}
async function goJournal(){
  await partialsReady;
  if(typeof renderJournal === 'function') renderJournal();
  showScreen('journal');
}

/* ---------------- 3b. Password recovery listener ---------------- */
// ต้องลงทะเบียนไวที่สุดตั้งแต่ app.js โหลด (ก่อนที่ partial ของหน้า auth ซึ่ง fetch แบบ async จะโหลดเสร็จด้วยซ้ำ)
// ไม่งั้นอาจพลาด event PASSWORD_RECOVERY ที่ Supabase ยิงทันทีตอนตรวจ token ในลิงก์อีเมลจาก URL หลังโหลดหน้าเสร็จ
// ฟังก์ชัน authMode/updateAuthUI ที่เรียกใช้ด้านล่างอยู่ใน public/partials/auth.html (โหลดเสร็จก่อนจะถูกเรียกจริงเสมอ)
let pendingPasswordRecovery = false;
function showPasswordRecoveryScreen(){
  const title = document.getElementById('auth-title');
  if(!title){ pendingPasswordRecovery = true; return; }
  pendingPasswordRecovery = false;
  authMode = 'reset';
  updateAuthUI();
  showScreen('auth');
}
function setupPasswordRecoveryListener(){
  if(typeof supabaseClient === 'undefined' || !supabaseClient) return;
  supabaseClient.auth.onAuthStateChange((event) => {
    if(event === 'PASSWORD_RECOVERY') showPasswordRecoveryScreen();
  });
}
setupPasswordRecoveryListener();

/* ---------------- 4. Sound Engine (สับไพ่/พลิกไพ่/เพลงพื้นหลัง) ---------------- */
// สร้างเสียงทั้งหมดด้วย Web Audio API สดๆ ไม่ต้องพึ่งไฟล์เสียงภายนอกเลย
// เสียงสับไพ่/พลิกไพ่ = noise burst ผ่าน bandpass filter, เพลงพื้นหลัง = pad เสียงคอร์ดเบาๆ วนลูป
const SOUND_SFX_KEY = 'ace_tarot_sfx_enabled';
const SOUND_MUSIC_KEY = 'ace_tarot_music_enabled';
const SOUND_ON_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M11 5L6 9H3v6h3l5 4V5z"/><path d="M15.5 8.5a5 5 0 010 7"/><path d="M18 6a9 9 0 010 12"/></svg>';
const SOUND_OFF_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M11 5L6 9H3v6h3l5 4V5z"/><line x1="16" y1="9" x2="22" y2="15"/><line x1="22" y1="9" x2="16" y2="15"/></svg>';

let _audioCtx = null;
function getAudioCtx(){
  if(!_audioCtx){
    const Ctor = window.AudioContext || window.webkitAudioContext;
    if(!Ctor) return null;
    _audioCtx = new Ctor();
  }
  if(_audioCtx.state === 'suspended') _audioCtx.resume();
  return _audioCtx;
}

// บัฟเฟอร์ white noise ใช้ซ้ำได้ทุกครั้งที่ต้องเล่นเสียง sfx (สร้างครั้งเดียวพอ)
let _noiseBuffer = null;
function getNoiseBuffer(ctx){
  if(_noiseBuffer && _noiseBuffer.sampleRate === ctx.sampleRate) return _noiseBuffer;
  const len = ctx.sampleRate; // 1 วินาที เพียงพอสำหรับตัด burst สั้นๆ ทุกแบบ
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for(let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
  _noiseBuffer = buf;
  return buf;
}

function isSfxEnabled(){
  try{ const v = localStorage.getItem(SOUND_SFX_KEY); return v === null ? true : v === '1'; }catch(e){ return true; }
}
function isMusicEnabled(){
  try{ return localStorage.getItem(SOUND_MUSIC_KEY) === '1'; }catch(e){ return false; }
}

// เสียงสับไพ่: จำลองเสียง riffle ด้วย noise burst สั้นๆ หลายครั้งติดกันแบบสุ่มจังหวะเล็กน้อย
function playShuffleSfx(){
  if(!isSfxEnabled()) return;
  const ctx = getAudioCtx();
  if(!ctx) return;
  try{
    const master = ctx.createGain();
    master.gain.value = 0.35;
    master.connect(ctx.destination);

    const now = ctx.currentTime;
    const ticks = 12;
    for(let i = 0; i < ticks; i++){
      const t = now + (i / ticks) * 0.6 + Math.random() * 0.02;
      const src = ctx.createBufferSource();
      src.buffer = getNoiseBuffer(ctx);
      const bp = ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.value = 1800 + Math.random() * 2600;
      bp.Q.value = 0.8;
      const g = ctx.createGain();
      const peak = 0.5 + Math.random() * 0.4;
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(peak, t + 0.004);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.03 + Math.random() * 0.02);
      src.connect(bp); bp.connect(g); g.connect(master);
      src.start(t);
      src.stop(t + 0.08);
    }
  }catch(e){ console.warn('เล่นเสียงสับไพ่ไม่สำเร็จ', e); }
}

// เสียงพลิกไพ่: noise "แชะ" สั้นๆ (pitch กวาดขึ้น) + โน้ต sine เบาๆ ให้ความรู้สึกกระดิ่งแผ่ว
function playFlipSfx(){
  if(!isSfxEnabled()) return;
  const ctx = getAudioCtx();
  if(!ctx) return;
  try{
    const now = ctx.currentTime;
    const master = ctx.createGain();
    master.gain.value = 0.4;
    master.connect(ctx.destination);

    const src = ctx.createBufferSource();
    src.buffer = getNoiseBuffer(ctx);
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.setValueAtTime(2200, now);
    bp.frequency.exponentialRampToValueAtTime(5200, now + 0.09);
    bp.Q.value = 1.1;
    const ng = ctx.createGain();
    ng.gain.setValueAtTime(0, now);
    ng.gain.linearRampToValueAtTime(0.6, now + 0.008);
    ng.gain.exponentialRampToValueAtTime(0.001, now + 0.11);
    src.connect(bp); bp.connect(ng); ng.connect(master);
    src.start(now); src.stop(now + 0.13);

    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(520, now);
    osc.frequency.exponentialRampToValueAtTime(220, now + 0.06);
    const og = ctx.createGain();
    og.gain.setValueAtTime(0.22, now);
    og.gain.exponentialRampToValueAtTime(0.001, now + 0.07);
    osc.connect(og); og.connect(master);
    osc.start(now); osc.stop(now + 0.08);
  }catch(e){ console.warn('เล่นเสียงพลิกไพ่ไม่สำเร็จ', e); }
}

/* ---- เพลงพื้นหลัง: เล่นไฟล์เพลงจริง แล้ววนลูปแบบครอสเฟดให้ต่อเนื่องไม่มีรอยต่อ ---- */
// ไฟล์ต้นฉบับยาว 150.05 วิ แต่ใช้ลูปแค่ช่วง BGM_LOOP_START–BGM_LOOP_END เพราะ:
//   - 0–0.44 วิ เป็นความเงียบนำหน้าเพลง (ถ้าวนจากต้นไฟล์จะได้ยินเสียงสะดุดเงียบทุกรอบ)
//   - ตั้งแต่ ~144.5 วิ เป็นหางเพลงที่ค่อยๆ แผ่วหายไปจนเงียบสนิทตอน 150 วิ (ตัดทิ้งตามที่ต้องการ)
// การวนลูปใช้ <audio> สองตัวสลับกัน: ตอนตัวที่เล่นอยู่ใกล้ถึง BGM_LOOP_END จะสตาร์ตอีกตัวที่ BGM_LOOP_START
// แล้วครอสเฟดข้ามกัน — เนียนกว่าการ seek กลับต้นเพลงกับตัวเดิม (ซึ่งจะมีรอยสะดุด/ช่องว่างตอน seek)
const BGM_SRC = '/music/atlasaudio-ambient-574024.mp3';
const BGM_LOOP_START = 0.44;
const BGM_LOOP_END = 144.4;
const BGM_CROSSFADE = 3;   // วินาทีที่ให้สองแทร็กซ้อนทับกันตอนต่อลูป
const BGM_VOLUME = 0.3;

let _bgmNodes = null;

// ใช้เส้นโค้ง equal-power (sin/cos) แทนเส้นตรง เพราะเสียงสองช่วงที่ครอสเฟดกันไม่ได้สัมพันธ์กัน
// ถ้าเฟดเป็นเส้นตรงทั้งคู่ ระดับเสียงรวมจะตกประมาณ 3dB ตรงกลางครอสเฟด (ได้ยินเป็นเสียงแหว่ง)
function bgmFadeCurve(rising){
  const steps = 64;
  const curve = new Float32Array(steps);
  for(let i = 0; i < steps; i++){
    const t = i / (steps - 1);
    curve[i] = rising ? Math.sin(t * Math.PI / 2) : Math.cos(t * Math.PI / 2);
  }
  return curve;
}

function createBgmTrack(ctx, master){
  const el = new Audio(BGM_SRC);
  el.preload = 'auto';
  const gain = ctx.createGain();
  gain.gain.value = 0;
  ctx.createMediaElementSource(el).connect(gain);
  gain.connect(master);
  return { el, gain };
}

function startBgm(){
  if(_bgmNodes) return;
  const ctx = getAudioCtx();
  if(!ctx) return;
  try{
    const master = ctx.createGain();
    master.gain.value = 0;
    master.connect(ctx.destination);
    master.gain.linearRampToValueAtTime(BGM_VOLUME, ctx.currentTime + 2.5);

    const tracks = [createBgmTrack(ctx, master), createBgmTrack(ctx, master)];
    _bgmNodes = { master, tracks, active: 0, timer: null };

    // รอบแรกเริ่มจากต้นไฟล์จริง (มีเงียบนำนิดหน่อยตามต้นฉบับ) — รอบถัดๆ ไปถึงจะเริ่มที่ BGM_LOOP_START
    tracks[0].gain.gain.value = 1;
    tracks[0].el.play().catch(err => console.warn('เล่นเพลงพื้นหลังไม่สำเร็จ (เบราว์เซอร์อาจบล็อก autoplay)', err));

    _bgmNodes.timer = setInterval(watchBgmLoop, 250);
  }catch(e){ console.warn('เริ่มเพลงพื้นหลังไม่สำเร็จ', e); }
}

// เช็คเป็นระยะว่าแทร็กที่เล่นอยู่ใกล้ถึงจุดตัดหางเพลงหรือยัง ถ้าใกล้แล้วให้เริ่มครอสเฟดไปแทร็กอีกตัว
function watchBgmLoop(){
  if(!_bgmNodes) return;
  const ctx = getAudioCtx();
  if(!ctx) return;
  const cur = _bgmNodes.tracks[_bgmNodes.active];
  if(!cur || cur.el.paused || cur.el.currentTime < BGM_LOOP_END - BGM_CROSSFADE) return;

  const nextIdx = 1 - _bgmNodes.active;
  const next = _bgmNodes.tracks[nextIdx];
  const now = ctx.currentTime;

  try{ next.el.currentTime = BGM_LOOP_START; }catch(e){ /* ยังโหลด metadata ไม่เสร็จ — เริ่มจากต้นไฟล์แทน */ }
  next.el.play().catch(() => {});

  // ไม่ใส่ setValueAtTime ก่อน setValueCurveAtTime เพราะสเปกถือว่าเป็น event ซ้อนกันแล้ว throw
  // (cancelScheduledValues ค้างค่าปัจจุบันไว้ให้อยู่แล้ว และค่าแรกของเส้นโค้งตรงกับค่าปัจจุบันพอดี)
  next.gain.gain.cancelScheduledValues(now);
  next.gain.gain.setValueCurveAtTime(bgmFadeCurve(true), now, BGM_CROSSFADE);
  cur.gain.gain.cancelScheduledValues(now);
  cur.gain.gain.setValueCurveAtTime(bgmFadeCurve(false), now, BGM_CROSSFADE);

  _bgmNodes.active = nextIdx;
  setTimeout(() => {
    try{ cur.el.pause(); cur.el.currentTime = BGM_LOOP_START; }catch(e){}
  }, BGM_CROSSFADE * 1000 + 300);
}

function stopBgm(){
  if(!_bgmNodes) return;
  const ctx = getAudioCtx();
  const { master, tracks, timer } = _bgmNodes;
  const now = ctx.currentTime;
  clearInterval(timer);
  master.gain.cancelScheduledValues(now);
  master.gain.setValueAtTime(master.gain.value, now);
  master.gain.linearRampToValueAtTime(0, now + 1.2);
  setTimeout(() => {
    tracks.forEach(t => {
      try{ t.el.pause(); t.gain.disconnect(); }catch(e){ /* เผื่อ context ถูกปิดไปแล้ว */ }
    });
    try{ master.disconnect(); }catch(e){}
  }, 1300);
  _bgmNodes = null;
}

function toggleSfx(event){
  // renderSoundPanel() ด้านล่างจะแทนที่ innerHTML ของพาเนล ทำให้ปุ่มที่เพิ่งกดหลุดจาก DOM
  // ต้อง stopPropagation ก่อน ไม่งั้น document click listener (ปิดพาเนลเมื่อคลิกนอกพาเนล) จะเข้าใจผิดว่า
  // คลิกนี้อยู่นอก #nav-sound-area (เพราะ target กลายเป็น node ที่หลุดออกจาก DOM ไปแล้ว) แล้วปิดพาเนลทิ้งทันที
  if(event) event.stopPropagation();
  const next = !isSfxEnabled();
  try{ localStorage.setItem(SOUND_SFX_KEY, next ? '1' : '0'); }catch(e){}
  renderSoundPanel();
  if(next) playFlipSfx(); // เปิดแล้วเล่นตัวอย่างเสียงให้ฟังทันที
}
function toggleMusic(event){
  if(event) event.stopPropagation(); // เหตุผลเดียวกับ toggleSfx() ด้านบน
  const next = !isMusicEnabled();
  try{ localStorage.setItem(SOUND_MUSIC_KEY, next ? '1' : '0'); }catch(e){}
  if(next) startBgm(); else stopBgm();
  renderSoundPanel();
}

function toggleSoundPanel(event){
  if(event) event.stopPropagation(); // กันไม่ให้ไปโดน listener ปิดพาเนลที่ผูกไว้กับ document ทันที
  const panel = document.getElementById('sound-panel');
  if(panel) panel.classList.toggle('open');
}
function closeSoundPanel(){
  const panel = document.getElementById('sound-panel');
  if(panel) panel.classList.remove('open');
}
document.addEventListener('click', (e) => {
  const area = document.getElementById('nav-sound-area');
  if(area && !area.contains(e.target)) closeSoundPanel();
});

function renderSoundPanel(){
  const btn = document.getElementById('nav-sound-btn');
  const panel = document.getElementById('sound-panel');
  if(!btn || !panel) return;
  const sfxOn = isSfxEnabled();
  const musicOn = isMusicEnabled();
  btn.innerHTML = (sfxOn || musicOn) ? SOUND_ON_ICON : SOUND_OFF_ICON;
  panel.innerHTML = `
    <div class="sound-row">
      <span>🎴 เสียงเอฟเฟกต์</span>
      <button class="sound-switch ${sfxOn ? 'on' : ''}" onclick="toggleSfx(event)" aria-pressed="${sfxOn}"><span class="knob"></span></button>
    </div>
    <div class="sound-row">
      <span>🎵 เพลงพื้นหลัง</span>
      <button class="sound-switch ${musicOn ? 'on' : ''}" onclick="toggleMusic(event)" aria-pressed="${musicOn}"><span class="knob"></span></button>
    </div>
  `;
}
renderSoundPanel();

// เบราว์เซอร์บล็อกเสียงจนกว่าจะมี user gesture ก่อน — ถ้าผู้ใช้เปิดเพลงพื้นหลังไว้ตั้งแต่ครั้งก่อน
// ให้รอ interaction แรกสุดของหน้านี้ (คลิก/กดคีย์บอร์ดตรงไหนก็ได้) แล้วค่อยเริ่มเล่นให้อัตโนมัติ
function primeAudioOnFirstGesture(){
  const handler = () => {
    document.removeEventListener('pointerdown', handler);
    document.removeEventListener('keydown', handler);
    if(isMusicEnabled()) startBgm();
  };
  document.addEventListener('pointerdown', handler, { once: true });
  document.addEventListener('keydown', handler, { once: true });
}
primeAudioOnFirstGesture();

/* ---------------- 9. Decorative Background Sparkles ---------------- */
function scatterSparkles(){
  const container = document.body;
  const positions = [
    {t:'6%', l:'4%', d:'0s'}, {t:'14%', l:'92%', d:'1.4s'}, {t:'40%', l:'2%', d:'2.3s'},
    {t:'70%', l:'94%', d:'.8s'}, {t:'88%', l:'8%', d:'1.9s'}, {t:'55%', l:'50%', d:'2.8s'}
  ];
  positions.forEach(p=>{
    const s = document.createElement('div');
    s.className = 'sparkle';
    s.style.top = p.t; s.style.left = p.l; s.style.animationDelay = p.d;
    s.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l2 8 8 2-8 2-2 8-2-8-8-2 8-2 2-8z"/></svg>`;
    container.appendChild(s);
  });
}

/* ---------------- 10. App Initialization ---------------- */
// โหลดเนื้อหาแต่ละ "หน้า" (screen) จากไฟล์ partial แยกต่างหาก แล้วรัน <script> ที่ฝังอยู่ท้ายไฟล์นั้น
// (ฟังก์ชันเฉพาะของแต่ละหน้าอยู่ในไฟล์ partial ของหน้านั้นเอง ไม่ได้กองอยู่ที่ app.js)
async function loadPartials(){
  const sections = document.querySelectorAll('[data-partial]');
  await Promise.all(Array.from(sections).map(async sec => {
    try{
      const res = await fetch(sec.dataset.partial);
      if(!res.ok) throw new Error('โหลดไฟล์ไม่สำเร็จ: ' + sec.dataset.partial);
      sec.innerHTML = await res.text();
      execPartialScripts(sec);
    }catch(err){
      console.error('โหลด partial ล้มเหลว:', sec.dataset.partial, err);
    }
  }));
}

// การตั้ง innerHTML ไม่รัน <script> ที่แทรกมาด้วยอัตโนมัติ (ข้อจำกัดของเบราว์เซอร์) — ต้องสร้าง
// <script> element ใหม่แล้วสลับเข้าไปแทนที่ ถึงจะถูกรันจริงและประกาศฟังก์ชันเป็น global ตามปกติ
function execPartialScripts(container){
  container.querySelectorAll('script').forEach(oldScript => {
    const newScript = document.createElement('script');
    for(const attr of oldScript.attributes) newScript.setAttribute(attr.name, attr.value);
    newScript.textContent = oldScript.textContent;
    oldScript.replaceWith(newScript);
  });
}

scatterSparkles();
// สัญญาว่า partial ทุกไฟล์ fetch+รันสคริปต์เสร็จแล้ว (resolve เสมอต่อให้บางไฟล์โหลดพลาด เพราะ loadPartials()
// ดักจับ error ของแต่ละไฟล์เองแล้ว ไม่ throw ต่อ) — ฟังก์ชันที่ต้องพึ่งพา global จาก partial (เช่น goHome/goJournal)
// ควร await ตัวนี้ก่อนเสมอ กันเรียกก่อน partial ที่เกี่ยวข้องโหลดเสร็จ
let partialsReady = loadPartials();
partialsReady.then(async () => {
  renderCatGrid();
  updateCatFilterVisibility();
  renderChips();
  await renderDailyStrip();
  await renderNicknamePrompt();
  await updateNavAuthUI();
  await renderCoinBadge();
  if(pendingPasswordRecovery){
    showPasswordRecoveryScreen(); // ลิงก์รีเซ็ตรหัสผ่านพามาก่อน loadPartials() เสร็จ — เข้าหน้าตั้งรหัสผ่านใหม่แทนหน้าแรก
  } else {
    showScreen('home');
  }
});
