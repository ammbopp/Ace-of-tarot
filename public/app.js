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
function getSpreadInfo(entry){
  if(SPREADS[entry.spreadKey]) return SPREADS[entry.spreadKey];
  const premium = PREMIUM_CATALOG.find(p => p.key === entry.spreadKey);
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
  question:'', spreadKey:'3', category:'ทั่วไป', isDaily:false,
  deck:[], drawn:[], required:3, positions:[], drawCount:0,
  currentReading:null
};

let loadingInterval = null;

/* ---------------- 3. Navigation ---------------- */
function showScreen(name){
  if(name !== 'topup') clearInterval(_topupPollTimer); // ออกจากหน้าเติมเหรียญแล้วต้องเลิก poll สถานะ ไม่งั้นจะยิง API ค้างไม่รู้จบ
  document.querySelectorAll('.screen').forEach(s=>s.classList.remove('visible'));
  document.getElementById('screen-'+name).classList.add('visible');
  document.getElementById('nav-home').classList.toggle('active', name==='home');
  document.getElementById('nav-journal').classList.toggle('active', name==='journal');
  window.scrollTo({top:0, behavior:'smooth'});
}
async function goHome(){ await renderDailyStrip(); await renderNicknamePrompt(); showScreen('home'); }
function goJournal(){ renderJournal(); showScreen('journal'); }

/* ---------------- Daily Draw: จำกัด 1 ครั้ง/วัน + ระบบ streak (sync ข้ามอุปกรณ์ถ้าล็อกอิน) ---------------- */
const DAILY_KEY = 'ace_tarot_daily';

// ใช้เวลาท้องถิ่นของเครื่องผู้ใช้ (ไม่ใช่ UTC) ให้ตรงกับความรู้สึก "วันนี้" ของผู้ใช้จริง
function dateKey(d){
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function todayKey(){ return dateKey(new Date()); }
function yesterdayKey(){
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return dateKey(d);
}

// ---- Guest mode: localStorage (พฤติกรรมเดิมทุกประการ) ----
function getDailyStateLocal(){
  try{
    const raw = localStorage.getItem(DAILY_KEY);
    return raw ? JSON.parse(raw) : { lastDate: null, streak: 0, entryId: null };
  }catch(e){
    return { lastDate: null, streak: 0, entryId: null };
  }
}
function saveDailyStateLocal(d){
  try{ localStorage.setItem(DAILY_KEY, JSON.stringify(d)); }catch(e){ /* localStorage ใช้ไม่ได้ ก็แค่ไม่เก็บ streak ข้ามเซสชัน */ }
}

// ---- Signed-in mode: Supabase (ตาราง daily_state, sync ข้ามอุปกรณ์) ----
async function getDailyStateRemote(userId){
  const { data, error } = await supabaseClient.from('daily_state').select('*').eq('user_id', userId).single();
  if(error || !data) return { lastDate: null, streak: 0, entryId: null };
  return { lastDate: data.last_date, streak: data.streak, entryId: data.entry_id };
}
async function saveDailyStateRemote(userId, d){
  const { error } = await supabaseClient.from('daily_state')
    .upsert({ user_id: userId, last_date: d.lastDate, streak: d.streak, entry_id: d.entryId, updated_at: new Date().toISOString() });
  if(error) console.error('Supabase saveDailyState error:', error);
}

// ---- ฟังก์ชันหลักที่ทุกส่วนของแอปเรียกใช้ — เลือกโหมดอัตโนมัติตามสถานะล็อกอิน ----
async function getDailyState(){
  const user = await getCurrentUser();
  return user ? getDailyStateRemote(user.id) : getDailyStateLocal();
}
async function saveDailyState(d){
  const user = await getCurrentUser();
  if(user) return saveDailyStateRemote(user.id, d);
  saveDailyStateLocal(d);
}

async function hasDrawnToday(){
  const d = await getDailyState();
  return d.lastDate === todayKey();
}

// เรียกหลังจั่วไพ่ประจำวันสำเร็จ: บันทึกว่าวันนี้จั่วแล้ว และคำนวณ streak ต่อเนื่อง
// (ถ้าจั่วครั้งก่อนคือ "เมื่อวาน" พอดี ต่อ streak ทันที ถ้าห่างกว่านั้นให้เริ่มนับใหม่ที่ 1)
async function recordDailyDraw(entryId){
  const d = await getDailyState();
  const newStreak = (d.lastDate === yesterdayKey()) ? (d.streak || 0) + 1 : 1;
  await saveDailyState({ lastDate: todayKey(), streak: newStreak, entryId });
}

// อัปเดตแถบ "ไพ่ประจำวัน" ในหน้าแรกให้ตรงกับสถานะปัจจุบัน (จั่วแล้ว/ยังไม่จั่ว + streak)
async function renderDailyStrip(){
  const strip = document.getElementById('daily-strip');
  if(!strip) return;
  const d = await getDailyState();
  const drawnToday = d.lastDate === todayKey();
  const streakHtml = d.streak > 0 ? `<span class="daily-streak">🔥 ต่อเนื่อง ${d.streak} วัน</span>` : '';
  const iconSvg = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2l1.8 5.8L19.6 9.6l-5.8 1.8L12 17.2l-1.8-5.8L4.4 9.6l5.8-1.8L12 2z"/></svg>`;

  if(drawnToday){
    strip.innerHTML = `
      <div class="daily-icon">${iconSvg}</div>
      <div class="txt">
        <div class="daily-head">
          <h3>ไพ่ประจำวันของวันนี้ <span class="check">✓</span></h3>
          ${streakHtml}
        </div>
        <p>คุณจั่วไพ่ประจำวันไปแล้ว พรุ่งนี้กลับมาต่อ streak ได้เลย</p>
      </div>
      <button class="btn-ghost daily-btn" onclick="viewTodaysDailyReading()">ดูไพ่วันนี้</button>
    `;
  } else {
    strip.innerHTML = `
      <div class="daily-icon">${iconSvg}</div>
      <div class="txt">
        <div class="daily-head">
          <h3>ไพ่ประจำวัน</h3>
          ${streakHtml}
        </div>
        <p>จั่วไพ่หนึ่งใบเพื่อเป็นข้อคิดสำหรับวันนี้ — ฟรีทุกวัน</p>
      </div>
      <button class="btn-primary daily-btn" onclick="startReading(true)">จั่วไพ่วันนี้</button>
    `;
  }
}

// เปิดดูไพ่ประจำวันของวันนี้ที่จั่วไปแล้ว (แทนที่จะให้จั่วซ้ำ)
async function viewTodaysDailyReading(){
  const d = await getDailyState();
  if(!d.entryId){ showScreen('home'); return; }
  const list = await loadJournal();
  const entry = list.find(e => e._id === d.entryId);
  if(!entry){ showScreen('home'); return; }
  state.currentReading = entry;
  renderResult(entry);
  showScreen('result');
}

/* ---------------- 4. Ask Screen Logic ---------------- */
function renderChips(){
  const row = document.getElementById('chip-row');
  const list = SUGGESTED_BY_CATEGORY[state.category] || SUGGESTED_BY_CATEGORY['ทั่วไป'];
  row.innerHTML = list.map(q=>`<button class="chip" onclick="fillQuestion(this)">${q}</button>`).join('');
}
function fillQuestion(el){
  const ta = document.getElementById('question-input');
  ta.value = el.textContent;
  updateCharCount();
}
function updateCharCount(){
  const ta = document.getElementById('question-input');
  document.getElementById('char-count').textContent = ta.value.length;
}
function renderCatGrid(){
  const grid = document.getElementById('cat-grid');
  if(!grid) return;
  grid.innerHTML = CATEGORIES.map(c => `
    <button class="cat-chip${state.category===c.key?' selected':''}" onclick="selectCategory('${c.key}')">
      <span class="cicon">${c.icon}</span>${c.label}
    </button>`).join('');
}
function selectCategory(key){ state.category = key; renderCatGrid(); renderChips(); }

function updateCatFilterVisibility(){
  const row = document.getElementById('cat-filter-row');
  if(!row) return;
  row.style.display = '';
}

// การอ่านไพ่แบบถามคำถามเองอิสระ (ไม่ใช่ไพ่ประจำวัน) เป็นฟีเจอร์เสียเหรียญเท่านั้น
// ไพ่ประจำวัน (daily=true) เป็นของฟรีชิ้นเดียวที่เหลืออยู่ — จั่วได้วันละ 1 ใบ
async function startReading(daily){
  if(!daily){
    goPremiumStore();
    return;
  }
  if(await hasDrawnToday()){
    viewTodaysDailyReading();
    return;
  }
  state.isDaily = true;
  state.spreadKey = '1';
  document.getElementById('question-input').value = '';
  updateCharCount();
  renderCatGrid();
  updateCatFilterVisibility();
  renderChips();
  showScreen('ask');
}

function goDraw(){
  const ta = document.getElementById('question-input');
  const typed = (ta ? ta.value : '').trim();
  // ไพ่ประจำวันไม่บังคับพิมพ์คำถาม — ถ้าเว้นว่างไว้ใช้ข้อความกลางๆ แทน
  state.question = typed || (state.isDaily ? "ข้อความสำหรับวันนี้ ฉันควรรู้อะไรบ้าง?" : '');
  if(!state.question){
    if (ta) {
      ta.focus();
      ta.style.borderColor = '#D97757';
      setTimeout(()=>{ ta.style.borderColor = ''; }, 1200);
    }
    return;
  }
  document.getElementById('draw-question').textContent = `"${state.question}"`;
  const s = SPREADS[state.spreadKey] || SPREADS['3'];
  state.required = s.count;
  state.positions = s.positions;
  state.drawCount = 0;
  state.drawn = [];
  buildFan();
  showScreen('draw');
}

/* ---------------- 5. Draw Screen Logic ---------------- */
function playShuffleAnimation(onDone){
  const overlay = document.getElementById('shuffle-overlay');
  const fan = document.getElementById('fan-wrap');
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if(!overlay || reduceMotion){ onDone(); return; }
  const rotations = [-16, -8, 0, 8, 16];
  overlay.innerHTML = rotations.map((r,i)=>
    `<div class="shuffle-card" style="--base-rot:${r}deg; animation-delay:${i*70}ms; z-index:${i}"></div>`
  ).join('');
  overlay.classList.add('active');
  fan.style.opacity = '0';
  setTimeout(()=>{
    overlay.classList.remove('active');
    fan.style.opacity = '';
    overlay.innerHTML = '';
    onDone();
  }, 780);
}

function renderFan(){
  // แสดงไพ่ให้ครบทั้งสำรับ (78 ใบ) ให้ผู้ใช้เลือกได้อิสระ
  const count = state.deck.length;
  const wrap = document.getElementById('fan-wrap');
  let html = '';
  for(let i=0;i<count;i++){
    const dealRot = (Math.random()*18 - 9).toFixed(1);
    const restRot = (Math.random()*8 - 4).toFixed(1); // เอียงเล็กน้อยค้างไว้ ให้ดูเป็นกองไพ่ที่ถูกคว่ำกระจาย ไม่ใช่เรียงตรงเป๊ะทีละใบ
    const delay = Math.min(i * 7, 260);
    html += `<div class="card-back" data-idx="${i}" role="button" tabindex="0" aria-label="ไพ่ใบที่ ${i + 1} ยังไม่เปิด กดเพื่อเลือกไพ่ใบนี้" style="--deal-rot:${dealRot}deg; --rest-rot:${restRot}deg; animation-delay:${delay}ms" onclick="drawCard(this)" onkeydown="handleCardKeydown(event, this)">
      <div class="face back-face"></div>
      <div class="face front-face"></div>
    </div>`;
  }
  wrap.classList.remove('dealt');
  wrap.innerHTML = html;
  void wrap.offsetWidth; 
  wrap.classList.add('dealt');
  document.getElementById('draw-cta').style.display = 'none';
  updateProgress();
}

function buildFan(){
  state.deck = shuffledDeck();
  playShuffleAnimation(renderFan);
}
function reshuffleFan(){ if(state.drawCount>0) return; buildFan(); }
function updateProgress(){
  document.getElementById('draw-progress').textContent = `เลือกแล้ว ${state.drawCount}/${state.required} ใบ`;
}
function drawCard(el){
  if(state.drawCount >= state.required || el.classList.contains('flipped')) return;
  const card = state.deck.pop();
  const position = state.positions[state.drawCount];
  state.drawn.push({...card, position});
  state.drawCount++;

  const front = el.querySelector('.front-face');
  // ออร่ารอบไพ่ตอนเลือกใช้สีทองเดียวกันทุกใบ (ไม่ต้องเปลี่ยนตามธาตุ/ชุดไพ่)
  
  // เรียกใช้รูปไพ่จากโฟลเดอร์ในเครื่อง
  const cardImgUrl = getCardImageUrl(card);

  const sparksHtml = Array.from({length:8}).map((_,i)=>{
    const ang = (i/8)*360 + (Math.random()*18 - 9);
    const dist = 42 + Math.random()*20;
    const dx = (Math.cos(ang*Math.PI/180)*dist).toFixed(1);
    const dy = (Math.sin(ang*Math.PI/180)*dist).toFixed(1);
    return `<span class="spark" style="--dx:${dx}px; --dy:${dy}px; animation-delay:${i*14}ms;"></span>`;
  }).join('');

  front.innerHTML = `
    <span class="burst-ring r1"></span><span class="burst-ring r2"></span>
    ${sparksHtml}
    <div class="art-panel">
      <img src="${cardImgUrl}" class="real-card-img" alt="${card.name}" onerror="handleCardImgError(this)">
    </div>`;
    
  el.classList.add('flipped');
  el.setAttribute('aria-label', `ไพ่ที่เลือก: ${card.name}${card.reversed ? ' (กลับหัว)' : ''}`);
  if(card.reversed) el.classList.add('rev-inner');
  updateProgress();

  const wrap = document.getElementById('fan-wrap');
  if(wrap){
    wrap.classList.add('focus-pick');
    setTimeout(()=>wrap.classList.remove('focus-pick'), 750);
  }

  if(state.drawCount >= state.required){
    document.querySelectorAll('.card-back:not(.flipped)').forEach(c=>{
      c.classList.add('used-up');
      c.setAttribute('tabindex', '-1');
      c.setAttribute('aria-disabled', 'true');
    });
    document.getElementById('draw-cta').style.display = 'inline-flex';
  }
}

// รองรับการเลือกไพ่ด้วยคีย์บอร์ด (Enter / Space) สำหรับผู้ใช้ที่ไม่ได้ใช้เมาส์ หรือใช้ screen reader
function handleCardKeydown(event, el){
  if(event.key === 'Enter' || event.key === ' ' || event.key === 'Spacebar'){
    event.preventDefault(); // กัน Space เลื่อนหน้าจอลง
    drawCard(el);
  }
}

/* ---------------- 6. Loading Animation & Prediction API ---------------- */
function startLoadingAnim(){
  let i = 0;
  const el = document.getElementById('loading-msg');
  if (el) el.textContent = LOADING_MSGS[0];
  loadingInterval = setInterval(() => {
    i = (i + 1) % LOADING_MSGS.length;
    if (el) el.textContent = LOADING_MSGS[i];
  }, 1600);
}

function stopLoadingAnim(){
  if (loadingInterval) clearInterval(loadingInterval);
}

async function submitDraw() {
  if (!state.question) {
    alert('กรุณากรอกคำถามของคุณก่อนเริ่มทำนาย');
    showScreen('ask');
    return;
  }

  showScreen('loading');
  startLoadingAnim();

  const spreadBackend = SPREAD_BACKEND_MAP[state.spreadKey] || 'three';

  const clientCards = state.drawn.map(c => ({
    name: c.name,
    position: c.position,
    isReversed: !!c.reversed
  }));

  try {
    const response = await fetch('/api/predict', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        question: state.question,
        spread: spreadBackend,
        name: 'คุณ',
        category: state.category || 'ทั่วไป',
        cards: clientCards
      })
    });

    const data = await response.json();

    if (!response.ok || !data.success || !data.summary) {
      throw new Error(data.error || 'ไม่สามารถรับคำทำนายได้ กรุณาลองใหม่อีกครั้ง');
    }

    const entry = {
      date: new Date().toISOString(),
      question: state.question,
      spreadKey: state.spreadKey,
      spreadBackend,
      category: state.category || 'ทั่วไป',
      cards: state.drawn,
      summary: data.summary,
      followups: [],
      isDaily: state.isDaily
    };

    state.currentReading = entry;
    await persistReading(entry, false);
    if(state.isDaily){
      await recordDailyDraw(entry._id);
      await renderDailyStrip();
    }
    renderResult(entry);
    showScreen('result');

  } catch (error) {
    console.error('Error in submitDraw:', error);
    showScreen('draw');
    showDrawError(error.message);
  } finally {
    stopLoadingAnim();
  }
}

function showDrawError(msg){
  const wrap = document.getElementById('fan-wrap');
  const existing = document.getElementById('draw-error');
  if(existing) existing.remove();
  const div = document.createElement('div');
  div.id = 'draw-error';
  div.className = 'error-box';
  div.style.width = '100%';
  div.innerHTML = `ขออภัย เกิดข้อผิดพลาด: ${escapeHtml(msg) || 'เชื่อมต่อกับไพ่ไม่สำเร็จ'}<br><button onclick="submitDraw()">ลองใหม่อีกครั้ง</button>`;
  wrap.parentNode.insertBefore(div, wrap.nextSibling);
}

/* ---------------- 7. Render Result ---------------- */
/* ---------------- 7b. Share / Export Result as Image ---------------- */
// วาดการ์ดสรุปผลทำนายด้วย Canvas API ล้วนๆ (ไม่พึ่ง library ภายนอก) เพื่อใช้แชร์/ดาวน์โหลดเป็นรูปภาพ
function wrapCanvasText(ctx, text, x, startY, maxWidth, lineHeight){
  let line = '';
  let y = startY;
  for(let i = 0; i < text.length; i++){
    const testLine = line + text[i];
    if(ctx.measureText(testLine).width > maxWidth && line.length > 0){
      ctx.fillText(line, x, y);
      line = text[i];
      y += lineHeight;
    } else {
      line = testLine;
    }
  }
  if(line){ ctx.fillText(line, x, y); y += lineHeight; }
  return y;
}

function buildShareCanvas(entry){
  const W = 1080, H = 1350;
  const canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d');

  // พื้นหลังไล่สีม่วง (โทนเดียวกับธีมแอป)
  const grad = ctx.createLinearGradient(0, 0, W, H);
  grad.addColorStop(0, '#8C67B4');
  grad.addColorStop(1, '#5B3E80');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);

  // กรอบทอง
  ctx.strokeStyle = 'rgba(201,164,103,0.9)';
  ctx.lineWidth = 4;
  ctx.strokeRect(28, 28, W - 56, H - 56);

  ctx.textAlign = 'center';

  // แบรนด์
  ctx.fillStyle = '#F5E9D6';
  ctx.font = '600 44px Georgia, "Cormorant Garamond", serif';
  ctx.fillText('✦ Ace of Tarot ✦', W / 2, 140);

  ctx.font = '300 22px Arial, sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,0.75)';
  ctx.fillText('Same Cards. New Perspectives. A Brighter You.', W / 2, 178);

  // คำถาม
  let y = 270;
  ctx.font = 'italic 36px Georgia, serif';
  ctx.fillStyle = '#FFFFFF';
  y = wrapCanvasText(ctx, `"${entry.question}"`, W / 2, y, W - 160, 48);

  y += 36;
  ctx.strokeStyle = 'rgba(201,164,103,0.6)';
  ctx.beginPath(); ctx.moveTo(W / 2 - 80, y); ctx.lineTo(W / 2 + 80, y); ctx.stroke();
  y += 60;

  // รายชื่อไพ่ที่จับได้
  ctx.font = '600 30px Arial, sans-serif';
  ctx.fillStyle = '#E7D3AC';
  entry.cards.forEach(c => {
    const line = `${c.position}: ${c.name}${c.reversed ? ' (กลับหัว)' : ''}`;
    y = wrapCanvasText(ctx, line, W / 2, y, W - 160, 40);
  });

  y += 26;
  ctx.strokeStyle = 'rgba(201,164,103,0.6)';
  ctx.beginPath(); ctx.moveTo(W / 2 - 80, y); ctx.lineTo(W / 2 + 80, y); ctx.stroke();
  y += 60;

  // ข้อคิดปิดท้าย
  const rawAnswer = (entry.summary && entry.summary.answer) || '';
  const answer = rawAnswer.replace(/^[""]|[""]$/g, '');
  if(answer){
    ctx.font = '300 28px Georgia, serif';
    ctx.fillStyle = 'rgba(255,255,255,0.92)';
    wrapCanvasText(ctx, answer, W / 2, y, W - 180, 40);
  }

  // footer
  ctx.font = '300 20px Arial, sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  ctx.fillText('Ace of Tarot', W / 2, H - 60);

  return canvas;
}

async function shareOrDownloadResult(btn){
  const entry = state.currentReading;
  if(!entry) return;

  const originalLabel = btn ? btn.innerHTML : null;
  if(btn){ btn.disabled = true; btn.innerHTML = 'กำลังสร้างรูปภาพ...'; }

  try{
    const canvas = buildShareCanvas(entry);
    canvas.toBlob(async (blob) => {
      if(btn){ btn.disabled = false; btn.innerHTML = originalLabel; }
      if(!blob) return;

      const fileName = `ace-of-tarot-${Date.now()}.png`;
      const file = new File([blob], fileName, { type: 'image/png' });

      // ถ้าอุปกรณ์รองรับ Web Share API แบบแนบไฟล์ (ส่วนใหญ่คือมือถือ) ให้เปิด share sheet ของระบบ
      if(navigator.canShare && navigator.canShare({ files: [file] })){
        try{
          await navigator.share({
            files: [file],
            title: 'Ace of Tarot',
            text: `ผลทำนายไพ่ทาโรต์ของฉัน: "${entry.question}"`
          });
          return;
        }catch(err){
          if(err && err.name === 'AbortError') return; // ผู้ใช้กดยกเลิกการแชร์เอง
          console.warn('แชร์ไม่สำเร็จ, จะดาวน์โหลดไฟล์แทน', err);
        }
      }

      // ไม่รองรับ Web Share API (เช่นเดสก์ท็อป) หรือแชร์ล้มเหลว -> ดาวน์โหลดไฟล์ภาพโดยตรงแทน
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = fileName;
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 'image/png');
  }catch(err){
    console.error('สร้างรูปภาพสำหรับแชร์ล้มเหลว', err);
    if(btn){ btn.disabled = false; btn.innerHTML = originalLabel; }
  }
}

function renderResult(entry){
  const s = getSpreadInfo(entry);
  const summary = entry.summary || {};
  state.currentReading = entry;
  const followupsHtml = renderFollowupsHtml(entry);

  // เรียกใช้รูปไพ่จากโฟลเดอร์ในเครื่องสำหรับหน้าแสดงผล
  const cardsHtml = entry.cards.map(c => {
    const cardImgUrl = getCardImageUrl(c);
    return `
      <div class="mini-card ${c.reversed ? 'rev' : ''}" style="--accent:${accentFor(c)}">
        <div class="mc-face">
          <span class="mc-glow"></span>
          <img src="${cardImgUrl}" class="real-card-img" alt="${escapeHtml(c.name)}" onerror="handleCardImgError(this)">
        </div>
        <div class="mc-name">${escapeHtml(c.name)} ${c.reversed ? '(กลับหัว)' : ''}</div>
        <div class="mc-pos">${escapeHtml(c.position)}</div>
      </div>`;
  }).join('');

  const actionItemsHtml = Array.isArray(summary.actionPlan) 
    ? summary.actionPlan.map(act => `<li>${escapeHtml(act)}</li>`).join('')
    : `<li>โฟกัสกับสิ่งที่คุณลงมือทำได้ทันทีในวันนี้</li>`;

  const catInfo = CATEGORIES.find(c => c.key === entry.category) || CATEGORIES[0];
  const focusHtml = summary.focusInsight ? `
      <div class="rblock rb-focus">
        <div class="rb-title"><span class="cicon">${catInfo.icon}</span> ${escapeHtml(summary.focusTitle) || ('มุมมองเจาะลึกด้าน' + catInfo.label)} <span class="cat-tag">${catInfo.label}</span></div>
        <p>${escapeHtml(summary.focusInsight)}</p>
      </div>` : '';

  const posInsights = (Array.isArray(summary.positionInsights) && summary.positionInsights.length === entry.cards.length)
    ? summary.positionInsights
    : entry.cards.map(c => `${c.name}${c.reversed ? ' (กลับหัว)' : ''} ในตำแหน่งนี้ชี้ให้เห็นพลังงานสำคัญที่ควรพิจารณาประกอบกับตำแหน่งอื่นๆ ในชุดไพ่นี้`);

  const positionBlocksHtml = entry.cards.map((c, i) => `
    <div class="position-block" style="animation-delay:${Math.min(i * 8, 60)}ms;">
      <div class="pb-head">
        <span class="pb-num">${i + 1}</span>
        <span class="pb-title">${escapeHtml(c.position)}</span>
      </div>
      <div class="pb-card">${escapeHtml(c.name)}${c.reversed ? ' (กลับหัว)' : ''}</div>
      <p>${escapeHtml(posInsights[i]) || '-'}</p>
    </div>`).join('');

  document.getElementById('result-content').innerHTML = `
    <div class="result-q">
      <div class="lbl-eyebrow">Your Question · ${s.label} · ${catInfo.label}</div>
      <p class="qtext">"${escapeHtml(entry.question)}"</p>
      <div class="drawn-row">${cardsHtml}</div>
      <div class="share-row">
        <button class="btn-share" id="btn-save-img" onclick="exportResultAsImage()">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 3v13m0 0l-4-4m4 4l4-4M5 21h14"/></svg>
          บันทึกเป็นรูปภาพ
        </button>
        <button class="btn-share" id="btn-share-result" onclick="shareResult()">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="M8.6 13.5l6.8 3.9M15.4 6.6L8.6 10.5"/></svg>
          แชร์ผลลัพธ์
        </button>
        <button class="btn-share" id="btn-download-pdf" onclick="exportResultAsFullPDF()">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><path d="M14 2v6h6"/><path d="M9 15h6M9 18h4"/></svg>
          ดาวน์โหลด PDF
        </button>
      </div>
    </div>

    <div class="result-grid">
      <div class="rblock">
        <div class="rb-title">${iconSvgSmall()} ภาพรวมสถานการณ์ (Overview)</div>
        <p>${escapeHtml(summary.overview) || '-'}</p>
      </div>
      <div class="rblock">
        <div class="rb-title">${iconSvgSmall()} การร้อยเรียงเรื่องราวของไพ่ (Guidance & Timeline)</div>
        <p>${escapeHtml(summary.guidance) || '-'}</p>
      </div>${focusHtml}
      <div class="rblock">
        <div class="rb-title">${iconSvgSmall()} แนวทางปฏิบัติเพื่อปลดล็อกสถานการณ์ (Action Plan)</div>
        <ul class="action-list-styled">
          ${actionItemsHtml}
        </ul>
      </div>
    </div>

    <div class="position-section">
      <h3>ตีความไพ่ทีละตำแหน่ง (${s.label} · ${s.sub})</h3>
      <div class="sub">หัวข้อด้านล่างจะเปลี่ยนไปตามวิธีการอ่านไพ่ที่คุณเลือก</div>
      <div class="position-grid">${positionBlocksHtml}</div>
    </div>

    <div class="closing-quote">
      <p>${escapeHtml(summary.answer) || '“บางคำถามอาจต้องการมุมมองที่ลึกซึ้งเพื่อให้คุณเติบโตอย่างมั่นคง”'}</p>
      <span>— Ace of Tarot</span>
    </div>

    <div class="followup-section">
      <h3>${iconSvgSmall()} ถามต่อจากไพ่ชุดนี้</h3>
      <div class="sub">ถามเจาะลึกเพิ่มเติมได้เลย โดยไม่ต้องจับไพ่ใหม่ — เราจะตีความจากไพ่ชุดเดิมที่คุณจับไปแล้ว</div>
      <div class="fu-thread" id="fu-thread">${followupsHtml}</div>
      <div class="followup-form">
        <textarea id="followup-input" placeholder="เช่น แล้วถ้าฉันเลือกทางนี้แทนล่ะ?" rows="1" oninput="this.style.height='auto'; this.style.height=this.scrollHeight+'px';"></textarea>
        <button class="btn-primary" id="followup-btn" onclick="submitFollowup()">ถามต่อ</button>
      </div>
      <div id="fu-status"></div>
    </div>

    <div class="result-actions">
      <button class="btn-primary" onclick="startReading(false)">ถามคำถามใหม่</button>
      <button class="btn-ghost" onclick="goJournal()">ดูบันทึกทั้งหมด</button>
    </div>
  `;
}

function renderFollowupsHtml(entry){
  const list = Array.isArray(entry.followups) ? entry.followups : [];
  return list.map(f => `
    <div class="fu-item">
      <div class="fu-q">${escapeHtml(f.question)}</div>
      <div class="fu-a"><span class="fu-label">Ace of Tarot</span>${escapeHtml(f.answer)}</div>
    </div>`).join('');
}

/* ---------------- 8b. Export / Share ผลลัพธ์ ---------------- */
// สร้าง element การ์ดสรุปผลแบบสวยงาม (แยกจากหน้าผลลัพธ์เต็มซึ่งยาวเกินจะแคปเป็นรูปได้)
// ไว้นอกจอ (position:fixed; left:-9999px) เพื่อให้ html2canvas capture ได้โดยไม่รบกวนสายตาผู้ใช้
function buildShareCardElement(entry){
  const s = getSpreadInfo(entry);
  const catInfo = CATEGORIES.find(c => c.key === entry.category) || CATEGORIES[0];
  const summary = entry.summary || {};
  const closing = summary.answer || 'บางคำถามอาจต้องการมุมมองที่ลึกซึ้งเพื่อให้คุณเติบโตอย่างมั่นคง';
  const dateStr = (() => {
    try{ return new Date(entry.date || Date.now()).toLocaleDateString('th-TH', { day:'numeric', month:'long', year:'numeric' }); }
    catch(e){ return ''; }
  })();

  // ปรับขนาดรูปไพ่ตามจำนวนไพ่ในชุด เพื่อให้ชุดใหญ่ (เช่น Celtic Cross 10 ใบ) ยังพอดีแถวเดียว
  const count = entry.cards.length;
  const cardW = count <= 3 ? 122 : count <= 5 ? 96 : count <= 6 ? 84 : 58;
  const nameFont = count <= 6 ? '.68rem' : '.56rem';

  const cardsHtml = entry.cards.map(c => {
    const cardImgUrl = getCardImageUrl(c);
    return `
      <div style="display:flex; flex-direction:column; align-items:center; width:${cardW}px;">
        <div style="width:${cardW}px; height:${Math.round(cardW * 1.52)}px; border-radius:8px; overflow:hidden; border:2px solid #C9A467; box-shadow:0 10px 22px -10px rgba(91,62,128,.35); ${c.reversed ? 'transform:rotate(180deg);' : ''}">
          <img src="${cardImgUrl}" onerror="handleCardImgError(this)" style="width:100%; height:100%; object-fit:fill; display:block;">
        </div>
        <div style="margin-top:8px; font-size:${nameFont}; color:#5B3E80; text-align:center; line-height:1.4; max-width:${cardW + 14}px;">${escapeHtml(c.name)}${c.reversed ? '<br>(กลับหัว)' : ''}</div>
      </div>`;
  }).join('');

  const badge = (text) => `<span style="display:inline-flex; align-items:center; background:rgba(140,103,180,.1); border:1px solid rgba(140,103,180,.3); border-radius:99px; padding:5px 14px; font-size:.72rem; color:#5B3E80; white-space:nowrap;">${text}</span>`;

  const el = document.createElement('div');
  el.style.cssText = `position:fixed; left:-9999px; top:0; width:720px; border-radius:28px; overflow:hidden; font-family:'Prompt', sans-serif; color:#3A2E4D;`;
  el.innerHTML = `
    <div style="position:relative;">
      <div style="position:absolute; inset:0; background:#FDF6F0 url('/img/bg2.png') center/cover no-repeat;"></div>

      <div style="position:relative; padding:52px 46px 40px;">
        <div style="text-align:center; font-family:'Cormorant Garamond',serif; font-size:1.15rem; letter-spacing:.24em; text-transform:uppercase; color:#B4894F;">✦ Ace of Tarot ✦</div>

        <div style="display:flex; justify-content:center; gap:9px; flex-wrap:wrap; margin-top:18px;">
          ${badge(catInfo.icon + ' ' + escapeHtml(catInfo.label))}
          ${badge(escapeHtml(s.label) + ' · ' + escapeHtml(s.sub))}
          ${dateStr ? badge(escapeHtml(dateStr)) : ''}
        </div>

        <div style="background:rgba(255,255,255,.85); border:1px solid rgba(140,103,180,.3); border-radius:20px; padding:24px 28px; margin-top:26px; box-shadow:0 14px 30px -18px rgba(91,62,128,.3);">
          <div style="font-size:.72rem; letter-spacing:.12em; text-transform:uppercase; color:#8C67B4; margin-bottom:8px;">คำถาม</div>
          <div style="font-family:'Cormorant Garamond',serif; font-size:1.45rem; line-height:1.55; color:#3A2E4D;">"${escapeHtml(entry.question)}"</div>
        </div>

        <div style="display:flex; justify-content:center; gap:14px; flex-wrap:wrap; margin-top:28px;">${cardsHtml}</div>

        <div style="background:rgba(255,255,255,.85); border-left:3px solid #C9A467; border-radius:12px; padding:22px 26px; margin-top:26px; box-shadow:0 14px 30px -18px rgba(91,62,128,.3);">
          <div style="font-family:'Cormorant Garamond',serif; font-style:italic; font-size:1.12rem; line-height:1.7; color:#3A2E4D;">${escapeHtml(closing)}</div>
        </div>

        <div style="text-align:center; margin-top:34px; padding-top:22px; border-top:1px solid rgba(140,103,180,.25);">
          <div style="font-size:.78rem; color:#5B3E80; letter-spacing:.03em;">Same Cards. New Perspectives. A Brighter You.</div>
          <div style="font-size:.72rem; color:#B4894F; margin-top:6px; letter-spacing:.08em;">${escapeHtml(location.host)}</div>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(el);
  return el;
}

// รอให้รูปไพ่ทุกใบในการ์ดโหลดเสร็จ (หรือ error/fallback เสร็จ) ก่อนแคปเป็นรูป
// กันปัญหา html2canvas แคปรูปไปตอนที่ไพ่บางใบยังโหลดไม่เสร็จ กลายเป็นช่องว่าง
function waitForImages(el){
  const imgs = Array.from(el.querySelectorAll('img'));
  return Promise.all(imgs.map(img => {
    if(img.complete) return Promise.resolve();
    return new Promise(resolve => {
      img.addEventListener('load', resolve, { once: true });
      img.addEventListener('error', resolve, { once: true });
    });
  }));
}

// แปลงการ์ดสรุปผลเป็น canvas ผ่าน html2canvas — ใช้ร่วมกันทั้งแชร์เป็นรูป (blob) และส่งออกเป็น PDF
async function renderShareCardToCanvas(entry){
  if(typeof html2canvas === 'undefined'){
    console.error('html2canvas ยังไม่โหลด');
    return null;
  }
  const el = buildShareCardElement(entry);
  try{
    await waitForImages(el);
    return await html2canvas(el, { backgroundColor: null, scale: 2, useCORS: true });
  }finally{
    el.remove();
  }
}

// แปลงการ์ดสรุปผลเป็น Blob รูปภาพ (PNG) — คืนค่าเป็น Promise<Blob|null>
async function renderShareCardToBlob(entry){
  const canvas = await renderShareCardToCanvas(entry);
  if(!canvas) return null;
  return await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
}

async function exportResultAsImage(){
  const entry = state.currentReading;
  if(!entry) return;
  const btn = document.getElementById('btn-save-img');
  if(btn) btn.classList.add('is-busy');
  try{
    const blob = await renderShareCardToBlob(entry);
    if(!blob){
      alert('ขออภัย ไม่สามารถสร้างรูปภาพได้ในขณะนี้ กรุณาลองใหม่อีกครั้ง');
      return;
    }
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ace-of-tarot-${Date.now()}.png`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }finally{
    if(btn) btn.classList.remove('is-busy');
  }
}

/* ---------------- 8c. ดาวน์โหลดคำทำนายฉบับเต็มเป็น PDF ---------------- */
// สร้าง element รายงานคำทำนายแบบเต็ม (Overview, Guidance, Action Plan, ตีความไพ่ทีละตำแหน่ง, คำตอบสุดท้าย)
// ไว้นอกจอ — เนื้อหายาวกว่าการ์ดสรุปผลมาก เลยต้องแคปเป็นภาพเดียวแล้วตัดแบ่งหลายหน้าใส่ PDF (ดู addCanvasAsPdfPages)
function buildFullReportElement(entry){
  const s = getSpreadInfo(entry);
  const summary = entry.summary || {};
  const catInfo = CATEGORIES.find(c => c.key === entry.category) || CATEGORIES[0];
  const dateStr = (() => {
    try{ return new Date(entry.date || Date.now()).toLocaleDateString('th-TH', { day:'numeric', month:'long', year:'numeric' }); }
    catch(e){ return ''; }
  })();

  const cardsHtml = entry.cards.map(c => {
    const cardImgUrl = getCardImageUrl(c);
    return `
      <div style="display:flex; flex-direction:column; align-items:center; width:72px;">
        <div style="width:72px; height:110px; border-radius:8px; overflow:hidden; border:2px solid #C9A467; ${c.reversed ? 'transform:rotate(180deg);' : ''}">
          <img src="${cardImgUrl}" onerror="handleCardImgError(this)" style="width:100%; height:100%; object-fit:fill; display:block;">
        </div>
        <div style="margin-top:6px; font-size:.62rem; color:#5B3E80; text-align:center; line-height:1.4; max-width:82px;">${escapeHtml(c.name)}${c.reversed ? '<br>(กลับหัว)' : ''}</div>
      </div>`;
  }).join('');

  const badge = (text) => `<span style="display:inline-flex; align-items:center; background:rgba(140,103,180,.1); border:1px solid rgba(140,103,180,.3); border-radius:99px; padding:5px 14px; font-size:.72rem; color:#5B3E80; white-space:nowrap;">${text}</span>`;
  const sectionBlock = (title, bodyHtml) => `
    <div style="background:#fff; border:1px solid rgba(140,103,180,.2); border-radius:14px; padding:20px 24px; margin-top:18px;">
      <div style="font-size:.8rem; font-weight:600; letter-spacing:.02em; color:#8C67B4; margin-bottom:10px;">${title}</div>
      ${bodyHtml}
    </div>`;

  const actionItemsHtml = (Array.isArray(summary.actionPlan) && summary.actionPlan.length)
    ? '<ul style="margin:0; padding-left:20px; font-size:.88rem; line-height:1.9; color:#3A2E4D;">' + summary.actionPlan.map(act => `<li>${escapeHtml(act)}</li>`).join('') + '</ul>'
    : '<p style="margin:0; font-size:.88rem; line-height:1.8; color:#3A2E4D;">โฟกัสกับสิ่งที่คุณลงมือทำได้ทันทีในวันนี้</p>';

  const posInsights = (Array.isArray(summary.positionInsights) && summary.positionInsights.length === entry.cards.length)
    ? summary.positionInsights
    : entry.cards.map(c => `${c.name}${c.reversed ? ' (กลับหัว)' : ''} ในตำแหน่งนี้ชี้ให้เห็นพลังงานสำคัญที่ควรพิจารณาประกอบกับตำแหน่งอื่นๆ ในชุดไพ่นี้`);

  const positionBlocksHtml = entry.cards.map((c, i) => `
    <div style="padding:16px 0; ${i > 0 ? 'border-top:1px dashed rgba(140,103,180,.25);' : ''}">
      <div style="display:flex; align-items:center; gap:10px; margin-bottom:6px;">
        <span style="flex-shrink:0; width:22px; height:22px; border-radius:50%; background:#8C67B4; color:#fff; font-size:.7rem; font-weight:600; display:flex; align-items:center; justify-content:center;">${i + 1}</span>
        <span style="font-size:.85rem; font-weight:600; color:#5B3E80;">${escapeHtml(c.position)}</span>
      </div>
      <div style="font-size:.8rem; color:#B4894F; font-weight:600; margin-bottom:6px; margin-left:32px;">${escapeHtml(c.name)}${c.reversed ? ' (กลับหัว)' : ''}</div>
      <p style="margin:0 0 0 32px; font-size:.85rem; line-height:1.8; color:#3A2E4D;">${escapeHtml(posInsights[i]) || '-'}</p>
    </div>`).join('');

  const focusSectionHtml = summary.focusInsight
    ? sectionBlock(escapeHtml(summary.focusTitle) || ('มุมมองเจาะลึกด้าน' + catInfo.label), `<p style="margin:0; font-size:.88rem; line-height:1.8; color:#3A2E4D;">${escapeHtml(summary.focusInsight)}</p>`)
    : '';

  const el = document.createElement('div');
  el.style.cssText = `position:fixed; left:-9999px; top:0; width:760px; background:#FDF6F0; font-family:'Prompt', sans-serif; color:#3A2E4D; padding:44px 40px;`;
  el.innerHTML = `
    <div style="text-align:center; font-family:'Cormorant Garamond',serif; font-size:1.2rem; letter-spacing:.24em; text-transform:uppercase; color:#B4894F;">✦ Ace of Tarot ✦</div>

    <div style="display:flex; justify-content:center; gap:9px; flex-wrap:wrap; margin-top:16px;">
      ${badge(catInfo.icon + ' ' + escapeHtml(catInfo.label))}
      ${badge(escapeHtml(s.label) + ' · ' + escapeHtml(s.sub))}
      ${dateStr ? badge(escapeHtml(dateStr)) : ''}
    </div>

    <div style="background:#fff; border:1px solid rgba(140,103,180,.3); border-radius:16px; padding:22px 26px; margin-top:22px;">
      <div style="font-size:.72rem; letter-spacing:.12em; text-transform:uppercase; color:#8C67B4; margin-bottom:8px;">คำถาม</div>
      <div style="font-family:'Cormorant Garamond',serif; font-size:1.3rem; line-height:1.6; color:#3A2E4D;">"${escapeHtml(entry.question)}"</div>
    </div>

    <div style="display:flex; justify-content:center; gap:12px; flex-wrap:wrap; margin-top:24px;">${cardsHtml}</div>

    ${sectionBlock('ภาพรวมสถานการณ์ (Overview)', `<p style="margin:0; font-size:.88rem; line-height:1.8; color:#3A2E4D;">${escapeHtml(summary.overview) || '-'}</p>`)}
    ${sectionBlock('การร้อยเรียงเรื่องราวของไพ่ (Guidance & Timeline)', `<p style="margin:0; font-size:.88rem; line-height:1.8; color:#3A2E4D;">${escapeHtml(summary.guidance) || '-'}</p>`)}
    ${focusSectionHtml}
    ${sectionBlock('แนวทางปฏิบัติเพื่อปลดล็อกสถานการณ์ (Action Plan)', actionItemsHtml)}

    <div style="margin-top:26px;">
      <div style="font-family:'Cormorant Garamond',serif; font-size:1.15rem; color:#5B3E80; margin-bottom:4px;">ตีความไพ่ทีละตำแหน่ง</div>
      <div style="font-size:.76rem; color:#9A8AB3; margin-bottom:10px;">${escapeHtml(s.label)} · ${escapeHtml(s.sub)}</div>
      <div style="background:#fff; border:1px solid rgba(140,103,180,.2); border-radius:14px; padding:6px 24px;">${positionBlocksHtml}</div>
    </div>

    <div style="background:rgba(255,255,255,.9); border-left:3px solid #C9A467; border-radius:12px; padding:22px 26px; margin-top:24px;">
      <div style="font-family:'Cormorant Garamond',serif; font-style:italic; font-size:1.05rem; line-height:1.7; color:#3A2E4D;">${escapeHtml(summary.answer) || 'บางคำถามอาจต้องการมุมมองที่ลึกซึ้งเพื่อให้คุณเติบโตอย่างมั่นคง'}</div>
      <div style="text-align:right; margin-top:10px; font-size:.8rem; color:#9A8AB3;">— Ace of Tarot</div>
    </div>

    <div style="text-align:center; margin-top:30px; padding-top:18px; border-top:1px solid rgba(140,103,180,.2);">
      <div style="font-size:.74rem; color:#5B3E80;">Same Cards. New Perspectives. A Brighter You.</div>
      <div style="font-size:.68rem; color:#B4894F; margin-top:4px;">${escapeHtml(location.host)}</div>
    </div>
  `;
  document.body.appendChild(el);
  return el;
}

// ตัดภาพยาวๆ (เช่นรายงานคำทำนายฉบับเต็ม) ออกเป็นหลายหน้าใส่ PDF ตามความสูงที่พอดีหน้ากระดาษ
function addCanvasAsPdfPages(doc, canvas, marginMm){
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const contentW = pageW - marginMm * 2;
  const contentH = pageH - marginMm * 2;

  const pxPerMm = canvas.width / contentW;
  const pageHeightPx = Math.max(1, Math.floor(contentH * pxPerMm));

  let renderedY = 0;
  let firstPage = true;
  while(renderedY < canvas.height){
    const sliceHeightPx = Math.min(pageHeightPx, canvas.height - renderedY);
    const pageCanvas = document.createElement('canvas');
    pageCanvas.width = canvas.width;
    pageCanvas.height = sliceHeightPx;
    pageCanvas.getContext('2d').drawImage(canvas, 0, renderedY, canvas.width, sliceHeightPx, 0, 0, canvas.width, sliceHeightPx);

    const sliceHeightMm = sliceHeightPx / pxPerMm;
    if(!firstPage) doc.addPage();
    doc.addImage(pageCanvas.toDataURL('image/png'), 'PNG', marginMm, marginMm, contentW, sliceHeightMm);
    firstPage = false;
    renderedY += sliceHeightPx;
  }
}

// ดาวน์โหลดคำทำนายฉบับเต็ม (Overview, Action Plan, ตีความไพ่ทีละตำแหน่ง, คำตอบสุดท้าย) เป็นไฟล์ PDF
async function exportResultAsFullPDF(){
  const entry = state.currentReading;
  if(!entry) return;
  if(typeof window.jspdf === 'undefined' || typeof html2canvas === 'undefined'){
    alert('ขออภัย ไม่สามารถสร้าง PDF ได้ในขณะนี้ กรุณาลองใหม่อีกครั้ง');
    return;
  }
  const btn = document.getElementById('btn-download-pdf');
  if(btn) btn.classList.add('is-busy');
  const el = buildFullReportElement(entry);
  try{
    await waitForImages(el);
    const canvas = await html2canvas(el, { backgroundColor: '#FDF6F0', scale: 2, useCORS: true });
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    addCanvasAsPdfPages(doc, canvas, 10);
    doc.save(`ace-of-tarot-${Date.now()}.pdf`);
  }catch(err){
    console.error('สร้าง PDF ไม่สำเร็จ', err);
    alert('ขออภัย ไม่สามารถสร้าง PDF ได้ในขณะนี้ กรุณาลองใหม่อีกครั้ง');
  }finally{
    el.remove();
    if(btn) btn.classList.remove('is-busy');
  }
}

function buildShareText(entry){
  const cardNames = entry.cards.map(c => c.name).join(', ');
  const closing = (entry.summary && entry.summary.answer) || '';
  return `✦ Ace of Tarot ✦\n\nคำถาม: "${entry.question}"\nไพ่ที่จับได้: ${cardNames}\n\n${closing}\n\nลองทำนายไพ่ทาโรต์ด้วยตัวเองได้ที่ ${location.origin}`;
}

async function shareResult(){
  const entry = state.currentReading;
  if(!entry) return;
  const btn = document.getElementById('btn-share-result');
  if(btn) btn.classList.add('is-busy');
  const shareText = buildShareText(entry);

  try{
    const blob = await renderShareCardToBlob(entry);
    const file = blob ? new File([blob], 'ace-of-tarot.png', { type: 'image/png' }) : null;

    // เบราว์เซอร์ที่รองรับแชร์ไฟล์รูปโดยตรง (ส่วนใหญ่บนมือถือ)
    if(file && navigator.canShare && navigator.canShare({ files: [file] })){
      await navigator.share({ files: [file], title: 'Ace of Tarot', text: shareText });
      return;
    }
    // เบราว์เซอร์ที่รองรับ Web Share API แต่ไม่รองรับไฟล์ (แชร์แค่ข้อความ)
    if(navigator.share){
      await navigator.share({ title: 'Ace of Tarot', text: shareText });
      return;
    }
    // เบราว์เซอร์เดสก์ท็อปที่ไม่มี Web Share API เลย — คัดลอกข้อความไปยัง clipboard แทน
    await navigator.clipboard.writeText(shareText);
    alert('คัดลอกข้อความผลทำนายไปยังคลิปบอร์ดแล้ว นำไปวางแชร์ต่อได้เลย');
  }catch(err){
    if(err && err.name === 'AbortError') return; // ผู้ใช้กดยกเลิกหน้าต่างแชร์เอง ไม่ต้องแจ้งเตือน
    console.error('Share error:', err);
    alert('ขออภัย ไม่สามารถแชร์ผลลัพธ์ได้ในขณะนี้ กรุณาลองใหม่อีกครั้ง');
  }finally{
    if(btn) btn.classList.remove('is-busy');
  }
}

async function submitFollowup(){
  const ta = document.getElementById('followup-input');
  const btn = document.getElementById('followup-btn');
  const statusEl = document.getElementById('fu-status');
  const followupQuestion = (ta.value || '').trim();

  if(!followupQuestion){
    statusEl.innerHTML = `<div class="fu-error">พิมพ์คำถามที่อยากถามต่อก่อนนะครับ</div>`;
    return;
  }

  const entry = state.currentReading;
  if(!entry){ return; }

  btn.disabled = true;
  ta.disabled = true;
  statusEl.innerHTML = `<div class="fu-loading"><span class="dot"></span><span class="dot"></span><span class="dot"></span> กำลังตีความไพ่ชุดเดิมเพื่อตอบคำถามนี้...</div>`;

  try{
    const response = await fetch('/api/followup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        question: entry.question,
        followupQuestion,
        spread: entry.spreadBackend || SPREAD_BACKEND_MAP[entry.spreadKey] || 'three',
        category: entry.category || 'ทั่วไป',
        name: 'คุณ',
        cards: entry.cards.map(c => ({ name: c.name, position: c.position, isReversed: !!c.reversed }))
      })
    });

    const data = await response.json();
    if(!response.ok || !data.success || !data.answer){
      throw new Error(data.error || 'ไม่สามารถตอบคำถามต่อได้ กรุณาลองใหม่อีกครั้ง');
    }

    if(!Array.isArray(entry.followups)) entry.followups = [];
    entry.followups.push({ question: followupQuestion, answer: data.answer, date: new Date().toISOString() });

    await persistReading(entry, true);
    ta.value = '';
    ta.style.height = 'auto';
    statusEl.innerHTML = '';
    document.getElementById('fu-thread').innerHTML = renderFollowupsHtml(entry);
  }catch(err){
    console.error('Followup error:', err);
    statusEl.innerHTML = `<div class="fu-error">${escapeHtml(err.message)}</div>`;
  }finally{
    btn.disabled = false;
    ta.disabled = false;
  }
}

/* ---------------- 7b. Auth (Supabase) ---------------- */
let authMode = 'login'; // 'login' | 'signup'

const AUTH_EYE_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z"/><circle cx="12" cy="12" r="3"/></svg>';
const AUTH_EYE_OFF_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.94 10.94 0 0112 19c-7 0-11-7-11-7a21.6 21.6 0 015.06-6.06M9.9 4.24A10.94 10.94 0 0112 4c7 0 11 7 11 7a21.6 21.6 0 01-2.61 3.68M14.12 14.12a3 3 0 11-4.24-4.24"/><path d="M1 1l22 22"/></svg>';

// สลับ input password ระหว่างซ่อน/แสดงตัวอักษร (ไอคอนจะเปลี่ยนตามสถานะปัจจุบัน)
function toggleAuthPasswordVisibility(){
  const input = document.getElementById('auth-password');
  const btn = document.getElementById('auth-toggle-pw-btn');
  if(!input || !btn) return;
  const willShow = input.type === 'password';
  input.type = willShow ? 'text' : 'password';
  btn.innerHTML = willShow ? AUTH_EYE_OFF_ICON : AUTH_EYE_ICON;
  btn.setAttribute('aria-pressed', String(willShow));
  btn.setAttribute('aria-label', willShow ? 'ซ่อนรหัสผ่าน' : 'แสดงรหัสผ่าน');
}

// ---- จำอีเมลไว้ในเครื่อง (localStorage) เพื่อไม่ต้องพิมพ์ใหม่ทุกครั้งที่เข้าหน้าล็อกอิน ----
const AUTH_REMEMBER_EMAIL_KEY = 'ace_tarot_remember_email';
function loadRememberedEmail(){
  try{ return localStorage.getItem(AUTH_REMEMBER_EMAIL_KEY) || ''; }catch(e){ return ''; }
}
function setRememberedEmail(email, remember){
  try{
    if(remember && email) localStorage.setItem(AUTH_REMEMBER_EMAIL_KEY, email);
    else localStorage.removeItem(AUTH_REMEMBER_EMAIL_KEY);
  }catch(e){ /* localStorage ใช้ไม่ได้ ก็แค่ไม่จำอีเมลข้ามเซสชัน */ }
}

function goAuth(){
  authMode = 'login';
  updateAuthUI();
  showScreen('auth');

  const remembered = loadRememberedEmail();
  const emailInput = document.getElementById('auth-email');
  const rememberCb = document.getElementById('auth-remember-email');
  if(emailInput) emailInput.value = remembered;
  if(rememberCb) rememberCb.checked = !!remembered;
}

function toggleAuthMode(){
  authMode = authMode === 'login' ? 'signup' : 'login';
  updateAuthUI();
}

function updateAuthUI(){
  const title = document.getElementById('auth-title');
  const subtitle = document.getElementById('auth-subtitle');
  const btn = document.getElementById('auth-submit-btn');
  const toggle = document.querySelector('.auth-toggle');
  const errEl = document.getElementById('auth-error');
  const pwInput = document.getElementById('auth-password');
  if(!title) return; // partial ยังไม่โหลด
  if(errEl) errEl.style.display = 'none';

  if(authMode === 'login'){
    title.textContent = 'เข้าสู่ระบบ';
    subtitle.textContent = 'เข้าสู่ระบบเพื่อดูประวัติคำทำนายของคุณได้จากทุกอุปกรณ์';
    btn.textContent = 'เข้าสู่ระบบ';
    toggle.innerHTML = `ยังไม่มีบัญชี? <a onclick="toggleAuthMode()">สมัครสมาชิก</a>`;
    if(pwInput) pwInput.autocomplete = 'current-password';
  } else {
    title.textContent = 'สมัครสมาชิก';
    subtitle.textContent = 'สมัครบัญชีฟรี เพื่อเริ่มเก็บประวัติคำทำนายข้ามอุปกรณ์';
    btn.textContent = 'สมัครสมาชิก';
    toggle.innerHTML = `มีบัญชีอยู่แล้ว? <a onclick="toggleAuthMode()">เข้าสู่ระบบ</a>`;
    if(pwInput) pwInput.autocomplete = 'new-password';
  }
  renderEmailHistoryDatalist();
}

// ---- ประวัติอีเมลที่เคยใช้ล็อกอิน/สมัครบนเครื่องนี้ (ใช้ทำ autocomplete dropdown ในช่องอีเมล) ----
const AUTH_EMAIL_HISTORY_KEY = 'ace_tarot_email_history';
const AUTH_EMAIL_HISTORY_MAX = 5;

function loadEmailHistory(){
  try{
    const raw = localStorage.getItem(AUTH_EMAIL_HISTORY_KEY);
    const list = raw ? JSON.parse(raw) : [];
    return Array.isArray(list) ? list : [];
  }catch(e){ return []; }
}
function addToEmailHistory(email){
  if(!email) return;
  try{
    const list = loadEmailHistory().filter(e => e !== email);
    list.unshift(email);
    localStorage.setItem(AUTH_EMAIL_HISTORY_KEY, JSON.stringify(list.slice(0, AUTH_EMAIL_HISTORY_MAX)));
  }catch(e){ /* localStorage ใช้ไม่ได้ ก็แค่ไม่มี autocomplete ประวัติอีเมล */ }
}
function renderEmailHistoryDatalist(){
  const list = document.getElementById('auth-email-history');
  if(!list) return;
  list.innerHTML = loadEmailHistory().map(e => `<option value="${escapeHtml(e)}">`).join('');
}

// wrapper ของ <form onsubmit> — กัน reload หน้า แล้วค่อยยิง flow login/signup เดิม
function handleAuthFormSubmit(event){
  event.preventDefault();
  handleAuthSubmit();
}

function translateAuthError(msg){
  if(/Invalid login credentials/i.test(msg)) return 'อีเมลหรือรหัสผ่านไม่ถูกต้อง';
  if(/already registered|already exists|User already registered/i.test(msg)) return 'อีเมลนี้ถูกใช้สมัครสมาชิกไปแล้ว ลองเข้าสู่ระบบแทน';
  if(/Password should be at least/i.test(msg)) return 'รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร';
  if(/Unable to validate email/i.test(msg)) return 'รูปแบบอีเมลไม่ถูกต้อง';
  return msg;
}

async function handleAuthSubmit(){
  if(typeof supabaseClient === 'undefined' || !supabaseClient){
    const errEl = document.getElementById('auth-error');
    errEl.style.color = '#E05C5C';
    errEl.textContent = 'ระบบล็อกอินยังไม่พร้อมใช้งาน (ยังไม่ได้ตั้งค่า Supabase) กรุณาติดต่อผู้ดูแลเว็บไซต์';
    errEl.style.display = 'block';
    return;
  }

  const email = (document.getElementById('auth-email').value || '').trim();
  const password = document.getElementById('auth-password').value || '';
  const errEl = document.getElementById('auth-error');
  const btn = document.getElementById('auth-submit-btn');
  errEl.style.display = 'none';

  if(!email || !password){
    errEl.style.color = '#E05C5C';
    errEl.textContent = 'กรุณากรอกอีเมลและรหัสผ่าน';
    errEl.style.display = 'block';
    return;
  }

  btn.disabled = true;
  const originalText = btn.textContent;
  btn.textContent = 'กำลังดำเนินการ...';

  try{
    let result;
    if(authMode === 'login'){
      result = await supabaseClient.auth.signInWithPassword({ email, password });
    } else {
      result = await supabaseClient.auth.signUp({ email, password });
    }
    if(result.error) throw result.error;

    const rememberCb = document.getElementById('auth-remember-email');
    setRememberedEmail(email, rememberCb ? rememberCb.checked : false);
    addToEmailHistory(email);

    // Supabase บางโปรเจกต์เปิด "ยืนยันอีเมล" ไว้ — ถ้าสมัครแล้วยังไม่มี session แปลว่าต้องยืนยันอีเมลก่อน
    if(authMode === 'signup' && !result.data.session){
      errEl.style.color = '#3FA66B';
      errEl.textContent = 'สมัครสำเร็จ! กรุณาเช็คอีเมลเพื่อยืนยันบัญชีก่อนเข้าสู่ระบบ';
      errEl.style.display = 'block';
      return;
    }

    await onAuthSuccess();
  }catch(err){
    errEl.style.color = '#E05C5C';
    errEl.textContent = translateAuthError(err.message || 'เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง');
    errEl.style.display = 'block';
  }finally{
    btn.disabled = false;
    btn.textContent = originalText;
  }
}

async function onAuthSuccess(){
  const user = await getCurrentUser(); // ดึงครั้งเดียวแล้วส่งต่อ กันแต่ละฟังก์ชันด้านล่าง getSession() ซ้ำ
  await migrateAllGuestStateIfNeeded(user);
  await updateNavAuthUI(user);
  await renderCoinBadge(user);
  goHome();
}

async function handleLogout(){
  if(typeof supabaseClient !== 'undefined' && supabaseClient){
    await supabaseClient.auth.signOut();
  }
  await updateNavAuthUI();
  await renderCoinBadge();
  goHome();
}

// อัปเดตแถบ nav ด้านบนขวา: แสดงปุ่ม "เข้าสู่ระบบ" ถ้ายังไม่ล็อกอิน หรือชื่อเล่น/อีเมล+ปุ่มออกจากระบบถ้าล็อกอินอยู่
async function updateNavAuthUI(user){
  const area = document.getElementById('nav-auth-area');
  const adminArea = document.getElementById('nav-admin-area');
  if(!area) return;
  if(user === undefined) user = await getCurrentUser();
  if(user){
    const nickname = (user.user_metadata && user.user_metadata.nickname) || '';
    const displayName = nickname || user.email;
    area.innerHTML = `
      <span class="nav-user-email" title="${escapeHtml(user.email)}">${escapeHtml(displayName)}</span>
      <button class="nav-btn" onclick="handleLogout()">ออกจากระบบ</button>
    `;
    if(adminArea){
      const isAdmin = await checkIsAdmin();
      adminArea.innerHTML = isAdmin ? `<button class="nav-btn" onclick="goAdmin()">Admin</button>` : '';
    }
  } else {
    area.innerHTML = `<button class="nav-btn nav-btn-highlight" onclick="goAuth()">เข้าสู่ระบบ</button>`;
    if(adminArea) adminArea.innerHTML = '';
  }
}

/* ---------------- 7d. Nickname: ทักทายผู้ใช้ใหม่และให้ตั้งชื่อเล่น ---------------- */
// signed-in: เก็บใน user_metadata ของ Supabase (sync ข้ามอุปกรณ์) / guest: เก็บใน localStorage เครื่องนี้
const NICKNAME_KEY = 'ace_tarot_nickname';
const NICKNAME_SKIP_KEY = 'ace_tarot_nickname_skipped';

function getLocalNickname(){
  try{ return localStorage.getItem(NICKNAME_KEY) || ''; }catch(e){ return ''; }
}
function setLocalNickname(name){
  try{
    if(name) localStorage.setItem(NICKNAME_KEY, name);
    else localStorage.removeItem(NICKNAME_KEY);
  }catch(e){ /* localStorage ใช้ไม่ได้ ก็แค่ไม่จำชื่อเล่นข้ามเซสชัน */ }
}
function isNicknameSkipped(){
  try{ return localStorage.getItem(NICKNAME_SKIP_KEY) === '1'; }catch(e){ return false; }
}

async function getNickname(){
  const user = await getCurrentUser();
  if(user) return (user.user_metadata && user.user_metadata.nickname) || '';
  return getLocalNickname();
}

async function saveNickname(name){
  const user = await getCurrentUser();
  if(user){
    const { error } = await supabaseClient.auth.updateUser({ data: { nickname: name } });
    if(error) console.error('บันทึกชื่อเล่นไม่สำเร็จ:', error);
  } else {
    setLocalNickname(name);
  }
}

// ทักทายผู้ใช้ใหม่/ยังไม่มีชื่อเล่นบนหน้าแรก ซ่อนอัตโนมัติถ้ามีชื่อแล้วหรือกด "ข้ามไปก่อน" ไปแล้ว
async function renderNicknamePrompt(){
  const box = document.getElementById('nickname-prompt');
  if(!box) return;
  const nickname = await getNickname();
  box.style.display = (nickname || isNicknameSkipped()) ? 'none' : '';
}

async function submitNickname(){
  const input = document.getElementById('nickname-input');
  if(!input) return;
  const name = (input.value || '').trim().slice(0, 30);
  if(!name){ input.focus(); return; }
  await saveNickname(name);
  await renderNicknamePrompt();
  await updateNavAuthUI();
}

function skipNicknamePrompt(){
  try{ localStorage.setItem(NICKNAME_SKIP_KEY, '1'); }catch(e){}
  renderNicknamePrompt();
}

/* ---------------- 7e. Guest -> Signed-in migration (เครื่องมือกลาง) ---------------- */
// ทุกฟีเจอร์ที่มีข้อมูลแบบ guest (localStorage) ต้องย้ายเข้าบัญชีตอนล็อกอินครั้งแรก ใช้ descriptor
// ในลิสต์นี้ร่วมกัน แทนการเขียนฟังก์ชัน migrate*IfNeeded แยกทุกครั้ง — ฟีเจอร์ใหม่แค่เพิ่ม descriptor พอ
// แต่ละ descriptor มี:
//   getLocal()            คืนค่า/ลิสต์แบบ guest ที่เก็บไว้ในเครื่องนี้
//   isEmpty(local)         true ถ้าไม่มีอะไรต้องย้าย (ข้ามทั้ง descriptor)
//   skip(user)             true ถ้าไม่ควรย้ายทับ (เช่น remote มีค่าอยู่แล้ว) — readings ไม่มีแนวคิดนี้เลยคืน false เสมอ
//   migrate(user, local, context)  ทำการย้ายจริง คืนค่าอะไรก็ได้ที่ descriptor อื่นอาจต้องใช้ต่อ (เก็บใน context)
//   clearLocal()           ล้างข้อมูล guest ในเครื่องหลังย้าย (ไม่ว่าจะ skip หรือย้ายสำเร็จก็ตาม)
//   confirmMessage(local)  ถ้ามี: ข้อความถามยืนยันก่อนย้าย (ไม่ระบุ = ย้ายเงียบๆ ไม่ต้องถาม)
//   onDone(local, result)  ถ้ามี: เรียกหลังย้ายสำเร็จ (เช่นแจ้งผลด้วย alert)
const GUEST_MIGRATIONS = [
  {
    name: 'readings',
    getLocal: () => loadJournalLocal(),
    isEmpty: (list) => !list.length,
    skip: async () => false, // readings เป็นลิสต์ที่โตขึ้นเรื่อยๆ ไม่เช็คว่า remote มีอยู่แล้วเหมือน nickname/dailyState
    migrate: async (user, list) => {
      let migrated = 0;
      const idMap = {}; // localEntryId -> remoteReadingId ให้ descriptor 'dailyState' ใช้ map entryId ต่อ
      for(const entry of list){
        const { data, error } = await supabaseClient.from('readings').insert(entryToRow(entry, user.id)).select('id').single();
        if(!error && data){ migrated++; idMap[entry._id] = data.id; }
      }
      return { migrated, total: list.length, idMap };
    },
    clearLocal: () => saveJournalListLocal([]),
    confirmMessage: (list) => `พบบันทึกคำทำนาย ${list.length} รายการที่เก็บไว้ในเครื่องนี้ (ก่อนล็อกอิน)\n\nต้องการย้ายเข้าบัญชีของคุณหรือไม่? (บันทึกในเครื่องจะถูกลบหลังย้ายสำเร็จ)`,
    onDone: (list, result) => alert(`ย้ายบันทึกสำเร็จ ${result.migrated} จาก ${result.total} รายการ`)
  },
  {
    name: 'nickname',
    getLocal: () => getLocalNickname(),
    isEmpty: (name) => !name,
    skip: async (user) => !!(user.user_metadata && user.user_metadata.nickname), // ไม่ทับชื่อเล่นเดิมจากอุปกรณ์อื่น
    migrate: async (user, name) => { await saveNickname(name); },
    clearLocal: () => setLocalNickname('')
  },
  {
    name: 'dailyState',
    getLocal: () => getDailyStateLocal(),
    isEmpty: (state) => !state.lastDate,
    skip: async (user) => !!(await getDailyStateRemote(user.id)).lastDate, // ไม่ทับ streak เดิมจากอุปกรณ์อื่น
    migrate: async (user, local, context) => {
      // entryId เดิมเป็น id แบบ local ไม่ใช่ uuid — map ผ่าน idMap ที่ descriptor 'readings' ย้ายไว้ก่อนหน้า (ถ้ามี)
      const readingsResult = context.readings;
      const migratedEntryId = (readingsResult && readingsResult.idMap && local.entryId) ? (readingsResult.idMap[local.entryId] || null) : null;
      await saveDailyStateRemote(user.id, { lastDate: local.lastDate, streak: local.streak, entryId: migratedEntryId });
    },
    clearLocal: () => saveDailyStateLocal({ lastDate: null, streak: 0, entryId: null })
  }
];

async function runGuestMigration(descriptor, user, context){
  const local = descriptor.getLocal();
  if(descriptor.isEmpty(local)) return context;
  if(descriptor.confirmMessage && !confirm(descriptor.confirmMessage(local))) return context;

  if(!(await descriptor.skip(user))){
    const result = await descriptor.migrate(user, local, context);
    context = { ...context, [descriptor.name]: result };
    // เคลียร์ข้อมูล local ก่อนเรียก onDone() เสมอ เพราะ onDone อาจเป็น alert() ที่บล็อก thread ค้างไว้
    // (ถ้าเคลียร์หลัง แล้วผู้ใช้ปิดแท็บตอน alert ค้างอยู่ ข้อมูลที่ย้ายไปแล้วจะไม่ถูกลบ เสี่ยงย้ายซ้ำรอบหน้า)
    descriptor.clearLocal();
    if(descriptor.onDone) descriptor.onDone(local, result);
    return context;
  }
  descriptor.clearLocal();
  return context;
}

// เรียกครั้งเดียวตอนล็อกอิน/สมัครสำเร็จ — รันทุก descriptor ใน GUEST_MIGRATIONS ตามลำดับ
async function migrateAllGuestStateIfNeeded(user){
  if(!user) return {}; // กันกรณี getCurrentUser() ยังไม่ resolve session ทัน (เคยมี guard นี้ในฟังก์ชันเดิมทุกตัวก่อนรวมเป็น engine เดียว)
  let context = {};
  for(const descriptor of GUEST_MIGRATIONS){
    context = await runGuestMigration(descriptor, user, context);
  }
  return context;
}

/* ---------------- 7c. Coins / Premium Readings / Top-up (Omise) ---------------- */
// รายการไพ่พรีเมียมฝั่งแสดงผล derive จาก spread-catalog.js (แหล่งความจริงเดียวร่วมกับ server)
// ราคาจริงที่หักเหรียญยึดตามค่าที่ตั้งไว้ฝั่ง server เท่านั้น (ต่อให้แก้ค่าพวกนี้ผ่าน devtools ก็ไม่มีผลกับยอดเหรียญที่ถูกหักจริง)
const PREMIUM_CATALOG = Object.keys(SPREAD_CATALOG_SAFE.PREMIUM_READINGS).map(key => {
  const p = SPREAD_CATALOG_SAFE.PREMIUM_READINGS[key];
  return { key, label: p.label, coinCost: p.coinCost, desc: p.desc };
});
// หมวดหมู่ของแต่ละไพ่พรีเมียม ใช้ตอนบันทึกลง journal เพื่อให้กรองตามหมวดหมู่เจอ (คีย์ที่ไม่ได้ระบุถือเป็น 'ทั่วไป')
const PREMIUM_CATEGORY = { love: 'ความรัก', compatibility: 'ความรัก' };
// แพ็กเกจเติมเหรียญ derive จาก spread-catalog.js (แหล่งความจริงเดียวร่วมกับ server) — priceLabel คำนวณจาก
// amountSatang เอง ไม่ต้อง maintain ข้อความราคาแยก (Object.keys ของคีย์ตัวเลขล้วนแบบนี้เรียงจากน้อยไปมากเสมอ)
const TOPUP_CATALOG = Object.keys(SPREAD_CATALOG_SAFE.TOPUP_PACKAGES || {}).map(id => {
  const pkg = SPREAD_CATALOG_SAFE.TOPUP_PACKAGES[id];
  return { id, coins: pkg.coins, priceLabel: '฿' + (pkg.amountSatang / 100) };
});

// ดึง access token ปัจจุบัน (ใช้แนบ Authorization header ตอนเรียก endpoint ที่ต้องล็อกอิน)
async function getAuthToken(){
  if(typeof supabaseClient === 'undefined' || !supabaseClient) return null;
  try{
    const { data } = await supabaseClient.auth.getSession();
    return data.session ? data.session.access_token : null;
  }catch(e){ return null; }
}

async function getCoinBalance(user){
  if(user === undefined) user = await getCurrentUser();
  if(!user) return null;
  const { data, error } = await supabaseClient.from('wallets').select('coins').eq('user_id', user.id).single();
  if(error || !data) return 0;
  return data.coins;
}

// อัปเดต badge เหรียญบน nav (แสดงเฉพาะตอนล็อกอินอยู่)
async function renderCoinBadge(user){
  const area = document.getElementById('nav-coin-badge');
  if(!area) return;
  const coins = await getCoinBalance(user);
  if(coins === null){ area.innerHTML = ''; return; }
  area.innerHTML = `<button class="nav-btn nav-coin-btn" onclick="goPremiumStore()">🪙 ${coins}</button>`;
}

/* ---------------- 7f. Admin dashboard ---------------- */
// เช็คกับ server ว่าบัญชีที่ล็อกอินอยู่เป็นแอดมินไหม (แค่ใช้ตัดสินใจโชว์ปุ่ม Admin ใน nav — ไม่ใช่ตัวตัดสินสิทธิ์จริง
// /api/admin/stats เช็คสิทธิ์ซ้ำของตัวเองเสมอที่ server ต่อให้ปลอมค่านี้ฝั่ง client ก็เข้าดูข้อมูลจริงไม่ได้)
async function checkIsAdmin(){
  const token = await getAuthToken();
  if(!token) return false;
  try{
    const response = await fetch('/api/admin/check', { headers: { 'Authorization': `Bearer ${token}` } });
    const data = await response.json();
    return !!data.isAdmin;
  }catch(e){ return false; }
}

function goAdmin(){
  renderAdminDashboard();
  showScreen('admin');
}

function formatBaht(satang){
  return ((satang || 0) / 100).toLocaleString('th-TH', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

async function renderAdminDashboard(){
  const container = document.getElementById('admin-content');
  if(!container) return;
  container.innerHTML = `<div class="journal-empty">กำลังโหลดข้อมูล...</div>`;

  const token = await getAuthToken();
  if(!token){
    container.innerHTML = `<div class="journal-empty"><div>กรุณา <a onclick="goAuth()">เข้าสู่ระบบ</a> ก่อน</div></div>`;
    return;
  }

  try{
    const response = await fetch('/api/admin/stats', { headers: { 'Authorization': `Bearer ${token}` } });
    const data = await response.json();
    if(response.status === 403){
      container.innerHTML = `<div class="journal-empty"><div>บัญชีนี้ไม่มีสิทธิ์เข้าถึงหน้านี้</div></div>`;
      return;
    }
    if(!response.ok || !data.success){
      throw new Error(data.error || 'โหลดข้อมูลไม่สำเร็จ');
    }
    renderAdminStats(data.stats || {});
  }catch(err){
    container.innerHTML = `<div class="journal-empty"><div>${escapeHtml(err.message || 'เกิดข้อผิดพลาด')}</div></div>`;
  }
}

function renderAdminStats(stats){
  const container = document.getElementById('admin-content');
  if(!container) return;

  const statCard = (label, value) => `
    <div class="admin-stat-card">
      <div class="admin-stat-value">${value}</div>
      <div class="admin-stat-label">${label}</div>
    </div>`;

  const statsGridHtml = `
    <div class="admin-stats-grid">
      ${statCard('ยอดขายรวม', '฿' + formatBaht(stats.totalRevenueSatang))}
      ${statCard('จำนวนครั้งเติมเงิน', (stats.totalTopups || 0).toLocaleString('th-TH'))}
      ${statCard('ผู้ใช้ทั้งหมด', (stats.totalUsers || 0).toLocaleString('th-TH'))}
      ${statCard('ผู้ใช้ active (7 วัน)', (stats.activeUsers || 0).toLocaleString('th-TH'))}
      ${statCard('คำทำนายทั้งหมด', (stats.totalReadings || 0).toLocaleString('th-TH'))}
    </div>`;

  const barRow = (label, count, max, fillClass) => `
    <div class="admin-bar-row">
      <div class="admin-bar-label">${label}</div>
      <div class="admin-bar-track"><div class="admin-bar-fill ${fillClass || ''}" style="width:${max ? Math.round(count / max * 100) : 0}%"></div></div>
      <div class="admin-bar-count">${count}</div>
    </div>`;

  // หมวดคำถามยอดฮิต
  const catCounts = stats.readingsByCategory || {};
  const catEntries = CATEGORIES
    .map(c => ({ label: `${c.icon} ${escapeHtml(c.label)}`, count: catCounts[c.key] || 0 }))
    .sort((a, b) => b.count - a.count);
  const maxCatCount = Math.max(0, ...catEntries.map(c => c.count));
  const catBarsHtml = catEntries.map(c => barRow(c.label, c.count, maxCatCount)).join('');

  // ไพ่พรีเมียมขายดี
  const spreadCounts = stats.readingsBySpreadKey || {};
  const premiumEntries = PREMIUM_CATALOG
    .map(p => ({ label: escapeHtml(p.label), count: spreadCounts[p.key] || 0 }))
    .sort((a, b) => b.count - a.count);
  const maxPremiumCount = Math.max(0, ...premiumEntries.map(p => p.count));
  const premiumBarsHtml = premiumEntries.map(p => barRow(p.label, p.count, maxPremiumCount, 'admin-bar-fill-gold')).join('');

  // รายการเติมเงินล่าสุด
  const recentTopups = Array.isArray(stats.recentTopups) ? stats.recentTopups : [];
  const topupRowsHtml = recentTopups.length
    ? recentTopups.map(t => {
        const d = new Date(t.created_at);
        const dateStr = d.toLocaleDateString('th-TH', { day:'2-digit', month:'short', year:'2-digit' }) + ' ' + d.toLocaleTimeString('th-TH', { hour:'2-digit', minute:'2-digit' });
        return `<tr><td>${dateStr}</td><td>🪙 ${t.package_coins}</td><td>฿${formatBaht(t.package_amount_satang)}</td></tr>`;
      }).join('')
    : `<tr><td colspan="3" style="text-align:center; color:#9A8AB3;">ยังไม่มีรายการ</td></tr>`;

  container.innerHTML = `
    ${statsGridHtml}
    <div class="admin-section">
      <h3>หมวดคำถามยอดฮิต</h3>
      ${catBarsHtml || '<p class="sub">ยังไม่มีข้อมูล</p>'}
    </div>
    <div class="admin-section">
      <h3>ไพ่พรีเมียมขายดี</h3>
      ${premiumBarsHtml || '<p class="sub">ยังไม่มีข้อมูล</p>'}
    </div>
    <div class="admin-section">
      <h3>รายการเติมเงินล่าสุด</h3>
      <table class="admin-table">
        <thead><tr><th>วันที่</th><th>แพ็กเกจ</th><th>จำนวนเงิน</th></tr></thead>
        <tbody>${topupRowsHtml}</tbody>
      </table>
    </div>
  `;
}

function goPremiumStore(){
  renderPremiumGrid();
  showScreen('premium');
}

async function renderPremiumGrid(){
  const grid = document.getElementById('premium-grid');
  const statusEl = document.getElementById('premium-coin-status');
  if(!grid) return;

  const user = await getCurrentUser();
  const coins = user ? await getCoinBalance(user) : null;

  if(statusEl){
    statusEl.innerHTML = user
      ? `<div class="premium-balance">🪙 คุณมี <b>${coins}</b> เหรียญ &nbsp;<a onclick="goTopup()">เติมเหรียญ</a></div>`
      : `<div class="premium-balance">กรุณา <a onclick="goAuth()">เข้าสู่ระบบ</a> ก่อนใช้ไพ่พรีเมียม</div>`;
  }

  grid.innerHTML = PREMIUM_CATALOG.map(p => {
    const canAfford = user && coins !== null && coins >= p.coinCost;
    const btnHtml = !user
      ? `<button class="btn-ghost" onclick="goAuth()">เข้าสู่ระบบก่อน</button>`
      : canAfford
        ? `<button class="btn-primary" onclick="buyPremiumReading('${p.key}')">ปลดล็อก · 🪙 ${p.coinCost}</button>`
        : `<button class="btn-ghost" onclick="goTopup()">เหรียญไม่พอ · เติมเหรียญ</button>`;
    return `
      <div class="premium-card">
        <div class="premium-card-cost">🪙 ${p.coinCost}</div>
        <h3>${escapeHtml(p.label)}</h3>
        <p>${escapeHtml(p.desc)}</p>
        ${btnHtml}
      </div>`;
  }).join('');
}

async function buyPremiumReading(premiumKey){
  const token = await getAuthToken();
  if(!token){ goAuth(); return; }

  const product = PREMIUM_CATALOG.find(p => p.key === premiumKey);
  const question = prompt(`ระบุคำถามสำหรับ "${product ? product.label : 'การอ่านไพ่'}" (หรือเว้นว่างไว้ให้ไพ่นำทาง)`) || '';

  startLoadingAnim();
  showScreen('loading');

  try{
    const response = await fetch('/api/predict-premium', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ premiumKey, question, name: 'คุณ', category: PREMIUM_CATEGORY[premiumKey] || 'ทั่วไป' })
    });
    const data = await response.json();

    if(response.status === 402){
      stopLoadingAnim();
      alert(data.error || 'เหรียญไม่พอ กรุณาเติมเหรียญก่อน');
      goTopup();
      return;
    }
    if(!response.ok || !data.success){
      throw new Error(data.error || 'ไม่สามารถอ่านไพ่ได้ กรุณาลองใหม่อีกครั้ง');
    }

    const entry = {
      _id: data.readingId || undefined,
      date: new Date().toISOString(),
      question: question || (product ? product.desc : ''),
      spreadKey: premiumKey,
      spreadBackend: data.spread,
      category: data.category,
      // server ส่งฟิลด์ isReversed มา แต่ทุกจุด render (renderResult, share card) เช็ค .reversed
      cards: (data.cards || []).map(c => ({ ...c, reversed: !!c.isReversed })),
      summary: data.summary,
      followups: [],
      isDaily: false
    };
    if(!entry._id){
      // server บันทึกลง readings ไม่สำเร็จ (เหรียญถูกหักไปแล้ว) — กันไพ่หายด้วยการบันทึกซ้ำจากฝั่ง client
      await persistReading(entry, false);
    }
    state.currentReading = entry;
    await renderCoinBadge();
    renderResult(entry);
    showScreen('result');
  }catch(err){
    stopLoadingAnim();
    alert(err.message || 'เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง');
    showScreen('premium');
  }finally{
    stopLoadingAnim();
  }
}

function goTopup(){
  renderTopupPackages();
  document.getElementById('topup-qr-area').style.display = 'none';
  showScreen('topup');
}

function renderTopupPackages(){
  const wrap = document.getElementById('topup-packages');
  if(!wrap) return;
  wrap.style.display = '';
  wrap.innerHTML = TOPUP_CATALOG.map(pkg => `
    <div class="topup-card" onclick="startTopup('${pkg.id}')">
      <div class="topup-coins">🪙 ${pkg.coins}</div>
      <div class="topup-price">${pkg.priceLabel}</div>
    </div>`).join('');
}

let _topupPollTimer = null;

async function startTopup(packageId){
  const token = await getAuthToken();
  if(!token){ goAuth(); return; }

  const wrap = document.getElementById('topup-packages');
  const qrArea = document.getElementById('topup-qr-area');
  wrap.style.display = 'none';
  qrArea.style.display = '';
  qrArea.innerHTML = `<div class="topup-loading">กำลังสร้างรายการชำระเงิน...</div>`;

  try{
    const response = await fetch('/api/topup/create-charge', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ packageId })
    });
    const data = await response.json();
    if(!response.ok || !data.success){
      throw new Error(data.error || 'ไม่สามารถสร้างรายการชำระเงินได้');
    }

    qrArea.innerHTML = `
      <div class="topup-qr-card">
        <img src="${data.qrImage}" alt="PromptPay QR" class="topup-qr-img">
        <p>สแกนจ่ายผ่านแอปธนาคาร รอสักครู่ ระบบจะเติมเหรียญให้อัตโนมัติ</p>
        <div class="topup-waiting"><span class="dot"></span><span class="dot"></span><span class="dot"></span> กำลังรอการชำระเงิน...</div>
      </div>`;

    pollTopupStatus(data.chargeId, token);
  }catch(err){
    qrArea.innerHTML = `<div class="topup-error">${escapeHtml(err.message || 'เกิดข้อผิดพลาด')}</div>`;
  }
}

function pollTopupStatus(chargeId, token){
  clearInterval(_topupPollTimer);
  _topupPollTimer = setInterval(async () => {
    try{
      const response = await fetch(`/api/topup/status/${chargeId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if(data.success && data.status === 'successful'){
        clearInterval(_topupPollTimer);
        await renderCoinBadge();
        const qrArea = document.getElementById('topup-qr-area');
        qrArea.innerHTML = `<div class="topup-success">✓ เติมเหรียญสำเร็จ!</div>`;
        setTimeout(() => goPremiumStore(), 1400);
      }
    }catch(e){ /* เดี๋ยวลองใหม่รอบถัดไป */ }
  }, 3000);
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

// ---- Guest mode: localStorage (พฤติกรรมเดิมทุกประการ สำหรับผู้ใช้ที่ไม่ได้ล็อกอิน) ----
function loadJournalLocal(){
  try{
    const raw = localStorage.getItem('ace_tarot_journal');
    return raw ? JSON.parse(raw) : [];
  }catch(e){ return []; }
}
function saveJournalListLocal(list){
  try{ localStorage.setItem('ace_tarot_journal', JSON.stringify(list)); }
  catch(e){ console.error('Storage save failed', e); }
}

// ---- Signed-in mode: Supabase (ตาราง readings, กรองด้วย RLS ตาม user_id อัตโนมัติ) ----
function rowToEntry(row){
  return {
    _id: row.id,
    date: row.created_at,
    question: row.question,
    spreadKey: row.spread_key,
    spreadBackend: row.spread_backend,
    category: row.category,
    cards: row.cards,
    summary: row.summary,
    followups: row.followups || [],
    isDaily: row.is_daily
  };
}
function entryToRow(entry, userId){
  return {
    user_id: userId,
    question: entry.question,
    spread_key: entry.spreadKey,
    spread_backend: entry.spreadBackend,
    category: entry.category,
    cards: entry.cards,
    summary: entry.summary,
    followups: entry.followups || [],
    is_daily: entry.isDaily || false
  };
}
async function loadJournalRemote(userId){
  const { data, error } = await supabaseClient
    .from('readings').select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if(error){ console.error('Supabase loadJournal error:', error); return []; }
  return data.map(rowToEntry);
}

// ---- ฟังก์ชันหลักที่ทุกส่วนของแอปเรียกใช้ — เลือกโหมดอัตโนมัติตามสถานะล็อกอิน ----
async function loadJournal(){
  const user = await getCurrentUser();
  return user ? loadJournalRemote(user.id) : loadJournalLocal();
}

async function persistReading(entry, isUpdate){
  const user = await getCurrentUser();

  if(user){
    if(isUpdate && entry._id){
      const { error } = await supabaseClient
        .from('readings')
        .update({
          question: entry.question, cards: entry.cards, summary: entry.summary,
          followups: entry.followups, is_daily: entry.isDaily
        })
        .eq('id', entry._id).eq('user_id', user.id);
      if(error) console.error('Supabase update error:', error);
      return;
    }
    const { data, error } = await supabaseClient
      .from('readings').insert(entryToRow(entry, user.id)).select().single();
    if(error){ console.error('Supabase insert error:', error); return; }
    entry._id = data.id;
    entry.date = data.created_at;
    return;
  }

  // guest mode: localStorage เหมือนของเดิมทุกประการ
  const list = loadJournalLocal();
  if(isUpdate && entry._id){
    const idx = list.findIndex(x=>x._id===entry._id);
    if(idx>-1){ list[idx] = entry; saveJournalListLocal(list); return; }
  }
  entry._id = entry._id || (Date.now()+'-'+Math.random().toString(36).slice(2,7));
  list.unshift(entry);
  saveJournalListLocal(list);
}

function populateJournalFilterOptions(){
  const catSel = document.getElementById('journal-filter-cat');
  if(catSel && catSel.children.length <= 1){
    CATEGORIES.forEach(c=>{
      const opt = document.createElement('option');
      opt.value = c.key; opt.textContent = `${c.icon} ${c.label}`;
      catSel.appendChild(opt);
    });
  }
  const spreadSel = document.getElementById('journal-filter-spread');
  if(spreadSel && spreadSel.children.length <= 1){
    Object.keys(SPREADS).forEach(key=>{
      const s = SPREADS[key];
      const opt = document.createElement('option');
      opt.value = key; opt.textContent = `${s.label} · ${s.sub}`;
      spreadSel.appendChild(opt);
    });
    PREMIUM_CATALOG.forEach(p=>{
      const opt = document.createElement('option');
      opt.value = p.key; opt.textContent = `${p.label} · ${p.desc}`;
      spreadSel.appendChild(opt);
    });
  }
}
function onJournalFilterChange(){ renderJournal(); }

async function renderJournal(){
  const body = document.getElementById('journal-body');
  body.innerHTML = `<div class="journal-empty">กำลังโหลดบันทึก...</div>`;
  populateJournalFilterOptions();

  const list = await loadJournal();
  window._journalCache = list;
  const filtersEl = document.getElementById('journal-filters');

  if(!list.length){
    if(filtersEl) filtersEl.style.display = 'none';
    document.getElementById('journal-count').textContent = '';
    body.innerHTML = `<div class="journal-empty">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M4 4h13a3 3 0 013 3v13H7a3 3 0 01-3-3V4z"/><path d="M4 4v13a3 3 0 003 3"/></svg>
      <div>ยังไม่มีการอ่านไพ่ที่บันทึกไว้</div>
      <div style="margin-top:14px;"><button class="btn-primary" onclick="startReading(false)">เริ่มการอ่านไพ่ครั้งแรก</button></div>
    </div>`;
    return;
  }
  if(filtersEl) filtersEl.style.display = '';

  const searchVal = (document.getElementById('journal-search')?.value || '').trim().toLowerCase();
  const catVal = document.getElementById('journal-filter-cat')?.value || 'all';
  const spreadVal = document.getElementById('journal-filter-spread')?.value || 'all';

  const filtered = list
    .map((e, i)=>({ e, i }))
    .filter(({e})=>{
      if(catVal !== 'all' && (e.category || 'ทั่วไป') !== catVal) return false;
      if(spreadVal !== 'all' && e.spreadKey !== spreadVal) return false;
      if(searchVal && !(e.question || '').toLowerCase().includes(searchVal)) return false;
      return true;
    });

  document.getElementById('journal-count').textContent = `${filtered.length} / ${list.length} การอ่านที่บันทึกไว้`;

  if(!filtered.length){
    body.innerHTML = `<div class="journal-empty"><div>ไม่พบรายการที่ตรงกับตัวกรอง</div></div>`;
    return;
  }

  body.innerHTML = `<div class="jr-list">` + filtered.map(({e, i})=>{
    const d = new Date(e.date);
    const dateStr = d.toLocaleDateString('th-TH', {day:'2-digit', month:'short', year:'2-digit'});
    const cardNames = (e.cards || []).map(c=>escapeHtml(c.name)).join(' · ');
    const catInfo = CATEGORIES.find(c=>c.key===e.category) || CATEGORIES[0];
    return `<div class="jr-item">
      <div class="jr-click" onclick="openJournalEntry(${i})">
        <div class="jr-date">${dateStr}<br><span class="jr-cat">${catInfo.icon} ${catInfo.label}</span></div>
        <div class="jr-body"><div class="jr-q">${escapeHtml(e.question)}</div><div class="jr-cards">${cardNames}</div></div>
        <div class="jr-arrow"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M9 6l6 6-6 6"/></svg></div>
      </div>
      <button class="jr-delete" onclick="deleteJournalEntry(event, ${i})" title="ลบบันทึกนี้">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0-1 14a2 2 0 01-2 2H7a2 2 0 01-2-2L4 6"/></svg>
      </button>
    </div>`;
  }).join('') + `</div>`;
}

function openJournalEntry(i){
  const entry = window._journalCache[i];
  state.currentReading = entry;
  renderResult(entry);
  showScreen('result');
}

let _pendingDeleteIdx = null;

function deleteJournalEntry(ev, i){
  ev.stopPropagation();
  const entry = window._journalCache[i];
  if(!entry) return;
  _pendingDeleteIdx = i;
  document.getElementById('delete-modal-question').textContent = `"${entry.question}" — การลบไม่สามารถย้อนกลับได้`;
  document.getElementById('delete-modal-overlay').classList.add('active');
}

function closeDeleteModal(){
  document.getElementById('delete-modal-overlay').classList.remove('active');
  _pendingDeleteIdx = null;
}

async function confirmDeleteJournal(){
  const i = _pendingDeleteIdx;
  if(i === null || i === undefined) return;
  const entry = window._journalCache[i];
  closeDeleteModal();
  if(!entry) return;

  const user = await getCurrentUser();
  if(user){
    const { error } = await supabaseClient.from('readings').delete().eq('id', entry._id).eq('user_id', user.id);
    if(error) console.error('Supabase delete error:', error);
  } else {
    const list = loadJournalLocal();
    const idx = list.findIndex(x=>x._id===entry._id);
    if(idx > -1) list.splice(idx, 1);
    saveJournalListLocal(list);
  }
  renderJournal();
}

document.addEventListener('keydown', (e)=>{
  if(e.key === 'Escape'){
    const overlay = document.getElementById('delete-modal-overlay');
    if(overlay && overlay.classList.contains('active')) closeDeleteModal();
  }
});

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
// โหลดเนื้อหาแต่ละ "หน้า" (screen) จากไฟล์ partial แยกต่างหาก แล้วค่อยรัน init ที่พึ่งพา DOM ของหน้านั้นๆ
async function loadPartials(){
  const sections = document.querySelectorAll('[data-partial]');
  await Promise.all(Array.from(sections).map(async sec => {
    try{
      const res = await fetch(sec.dataset.partial);
      if(!res.ok) throw new Error('โหลดไฟล์ไม่สำเร็จ: ' + sec.dataset.partial);
      sec.innerHTML = await res.text();
    }catch(err){
      console.error('โหลด partial ล้มเหลว:', sec.dataset.partial, err);
    }
  }));
}

scatterSparkles();
loadPartials().then(async () => {
  renderCatGrid();
  updateCatFilterVisibility();
  renderChips();
  await renderDailyStrip();
  await renderNicknamePrompt();
  await updateNavAuthUI();
  await renderCoinBadge();
  showScreen('home');
});