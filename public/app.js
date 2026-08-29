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
const SPREADS = {
  '1': {label:'1 ใบ', sub:'Quick Insight', count:1, positions:['แก่นสำคัญ']},
  '3': {label:'3 ใบ', sub:'อดีต · ปัจจุบัน · อนาคต', count:3, positions:['อดีต / รากเหง้า','ปัจจุบัน / อุปสรรค','อนาคต / ผลลัพธ์']},
  '5': {label:'5 ใบ', sub:'Deeper Clarity', count:5, positions:['สถานการณ์','อุปสรรค','สิ่งที่ซ่อนอยู่','คำแนะนำ','ผลลัพธ์ที่เป็นไปได้']},
  '6': {label:'6 ใบ', sub:'Relationship Spread', count:6, icon:'♥', positions:['ตัวคุณ','คู่ของคุณ','รากฐานความสัมพันธ์','สถานการณ์ปัจจุบัน','ความท้าทายที่ต้องเผชิญ','แนวโน้ม / ผลลัพธ์']},
  '10': {label:'10 ใบ', sub:'Celtic Cross', count:10, icon:'✛', positions:['สถานการณ์ปัจจุบัน','สิ่งที่ขวางกั้น','รากฐาน / อดีตอันไกล','อดีตอันใกล้','เป้าหมาย / สิ่งที่เป็นไปได้','อนาคตอันใกล้','ตัวคุณเอง / ทัศนคติ','สิ่งแวดล้อมรอบตัว','ความหวังและความกลัว','ผลลัพธ์สุดท้าย']}
};
const SPREAD_BACKEND_MAP = { '1': 'single', '3': 'three', '5': 'year', '6': 'relationship', '10': 'celtic' };
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
  document.querySelectorAll('.screen').forEach(s=>s.classList.remove('visible'));
  document.getElementById('screen-'+name).classList.add('visible');
  document.getElementById('nav-home').classList.toggle('active', name==='home');
  document.getElementById('nav-journal').classList.toggle('active', name==='journal');
  window.scrollTo({top:0, behavior:'smooth'});
}
function goHome(){ showScreen('home'); }
function goJournal(){ renderJournal(); showScreen('journal'); }

const SPREAD_SUGGESTED = {
  '6': ["ความสัมพันธ์ของเราสองคนตอนนี้เป็นยังไง?","เราสองคนจะไปด้วยกันได้ไกลแค่ไหน?","อะไรคือรากฐานที่ทำให้เรายังอยู่ด้วยกัน?","เราควรปรับตรงไหนเพื่อให้ความสัมพันธ์ดีขึ้น?","อนาคตของความสัมพันธ์นี้จะเป็นยังไง?","เขา/เธอรู้สึกกับเรายังไงกันแน่?"],
  '10': ["ภาพรวมชีวิตตอนนี้ของฉันเป็นยังไง?","อะไรคือสิ่งที่ขวางกั้นฉันอยู่ตอนนี้?","อดีตส่งผลต่อฉันตอนนี้ยังไง?","ฉันควรรู้อะไรเกี่ยวกับเส้นทางข้างหน้า?","ผลลัพธ์สุดท้ายของเรื่องนี้จะเป็นยังไง?","ฉันควรวางใจกับสถานการณ์นี้แค่ไหน?"]
};

/* ---------------- 4. Ask Screen Logic ---------------- */
function renderChips(){
  const row = document.getElementById('chip-row');
  const list = SPREAD_SUGGESTED[state.spreadKey]
    || SUGGESTED_BY_CATEGORY[state.category]
    || SUGGESTED_BY_CATEGORY['ทั่วไป'];
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

function renderSpreadGrid(){
  const grid = document.getElementById('spread-grid');
  let html = '';
  Object.keys(SPREADS).forEach(key=>{
    const s = SPREADS[key];
    html += `<button class="spread-card${state.spreadKey===key?' selected':''}" onclick="selectSpread('${key}')">
      <span class="num">${s.icon || s.count}</span>
      <span><span class="lbl">${s.label}</span><br><span class="slbl">${s.sub}</span></span>
    </button>`;
  });
  grid.innerHTML = html;
}
function updateCatFilterVisibility(){
  const row = document.getElementById('cat-filter-row');
  if(!row) return;
  row.style.display = SPREAD_SUGGESTED[state.spreadKey] ? 'none' : '';
}
function selectSpread(key){ state.spreadKey = key; renderSpreadGrid(); updateCatFilterVisibility(); renderChips(); }

function startReading(daily){
  state.isDaily = daily;
  if(daily){
    state.question = "ข้อความสำหรับวันนี้ ฉันควรรู้อะไรบ้าง?";
    state.spreadKey = '1';
    state.category = 'ทั่วไป';
    goDraw();
  } else {
    document.getElementById('question-input').value = '';
    updateCharCount();
    renderCatGrid();
    renderSpreadGrid();
    updateCatFilterVisibility();
    renderChips();
    showScreen('ask');
  }
}

function goDraw(){
  if(!state.isDaily){
    const ta = document.getElementById('question-input');
    state.question = (ta ? ta.value : '').trim();
  }
  if(!state.question){
    const ta = document.getElementById('question-input');
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
      followups: []
    };

    state.currentReading = entry;
    await persistReading(entry, false);
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
  const s = SPREADS[entry.spreadKey] || SPREADS['3'];
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
  const s = SPREADS[entry.spreadKey] || SPREADS['3'];
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

// แปลงการ์ดสรุปผลเป็น Blob รูปภาพ (PNG) ผ่าน html2canvas — คืนค่าเป็น Promise<Blob|null>
async function renderShareCardToBlob(entry){
  if(typeof html2canvas === 'undefined'){
    console.error('html2canvas ยังไม่โหลด');
    return null;
  }
  const el = buildShareCardElement(entry);
  try{
    await waitForImages(el);
    const canvas = await html2canvas(el, { backgroundColor: null, scale: 2, useCORS: true });
    return await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
  }finally{
    el.remove();
  }
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

/* ---------------- 8. LocalStorage Journal ---------------- */
async function loadJournal(){
  try{
    const raw = localStorage.getItem('ace_tarot_journal');
    return raw ? JSON.parse(raw) : [];
  }catch(e){ return []; }
}

async function saveJournalList(list){
  try{ 
    localStorage.setItem('ace_tarot_journal', JSON.stringify(list)); 
  }catch(e){ 
    console.error('Storage save failed', e); 
  }
}

async function persistReading(entry, isUpdate){
  const list = await loadJournal();
  if(isUpdate && entry._id){
    const idx = list.findIndex(x=>x._id===entry._id);
    if(idx>-1){ list[idx] = entry; await saveJournalList(list); return; }
  }
  entry._id = entry._id || (Date.now()+'-'+Math.random().toString(36).slice(2,7));
  list.unshift(entry);
  await saveJournalList(list);
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
  const list = await loadJournal();
  const idx = entry._id ? list.findIndex(x=>x._id===entry._id) : i;
  if(idx > -1) list.splice(idx, 1);
  await saveJournalList(list);
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
loadPartials().then(() => {
  renderCatGrid();
  renderSpreadGrid();
  updateCatFilterVisibility();
  renderChips();
  showScreen('home');
});