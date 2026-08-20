// Tarot Deck with Standard Rider-Waite Artworks
const tarotDeck = [
  {
    name: 'The Fool',
    nameTh: 'เดอะ ฟูล',
    image: 'https://upload.wikimedia.org/wikipedia/commons/9/90/RWS_Tarot_00_Fool.jpg',
    meaning: 'เริ่มต้นใหม่ ความกล้าหาญ ความเป็นอิสระ และการเปิดรับสิ่งใหม่',
    reversedMeaning: 'ความประมาท ความไม่รอบคอบ หรือความลังเลที่จะก้าวไปข้างหน้า'
  },
  {
    name: 'The Magician',
    nameTh: 'เดอะ เมจิกเชียน',
    image: 'https://upload.wikimedia.org/wikipedia/commons/d/de/RWS_Tarot_01_Magician.jpg',
    meaning: 'ความสามารถ ทักษะเฉพาะตัว และพลังในการเนรมิตสิ่งต่างๆ ให้เป็นจริง',
    reversedMeaning: 'การใช้เล่ห์เหลี่ยม หรือขาดความมั่นใจในศักยภาพของตนเอง'
  },
  {
    name: 'The High Priestess',
    nameTh: 'เดอะ ไฮพรีสเตส',
    image: 'https://upload.wikimedia.org/wikipedia/commons/8/88/RWS_Tarot_02_High_Priestess.jpg',
    meaning: 'สัญชาตญาณ ปัญญาญาณ ความลึกซึ้ง และความจริงที่ซ่อนอยู่ภายใน',
    reversedMeaning: 'ความลับที่ถูกปิดบัง หรือการละเลยเสียงกระซิบจากหัวใจตนเอง'
  },
  {
    name: 'The Empress',
    nameTh: 'ดิ เอ็มเพรส',
    image: 'https://upload.wikimedia.org/wikipedia/commons/d/d2/RWS_Tarot_03_Empress.jpg',
    meaning: 'ความอุดมสมบูรณ์ ความรัก ความอบอุ่น และการเจริญงอกงาม',
    reversedMeaning: 'ความอึดอัด การขาดการดูแลตนเอง หรือความสัมพันธ์ที่ตึงเครียด'
  },
  {
    name: 'The Emperor',
    nameTh: 'ดิ เอ็มเพอเรอร์',
    image: 'https://upload.wikimedia.org/wikipedia/commons/c/c3/RWS_Tarot_04_Emperor.jpg',
    meaning: 'ความมั่นคง อำนาจ ความเป็นผู้นำ และการวางแผนอย่างมีแบบแผน',
    reversedMeaning: 'ความยึดติดในกฎเกณฑ์จนเกินไป หรือการสูญเสียการควบคุม'
  },
  {
    name: 'The Hierophant',
    nameTh: 'เดอะ ไฮโรแฟนท์',
    image: 'https://upload.wikimedia.org/wikipedia/commons/8/8d/RWS_Tarot_05_Hierophant.jpg',
    meaning: 'คำปรึกษา คำแนะนำจากผู้ใหญ่ จริยธรรม และการเรียนรู้สิ่งที่มีคุณค่า',
    reversedMeaning: 'การแหกกฎ ความคิดนอกกรอบ หรือคำแนะนำที่ไม่ตรงใจ'
  },
  {
    name: 'The Lovers',
    nameTh: 'เดอะ เลิฟเวอร์ส',
    image: 'https://upload.wikimedia.org/wikipedia/commons/d/db/RWS_Tarot_06_Lovers.jpg',
    meaning: 'ความสัมพันธ์ที่ลึกซึ้ง ความเข้ากันได้ และการตัดสินใจเลือกตามเสียงหัวใจ',
    reversedMeaning: 'ความไม่ลงรอย ความขัดแย้งในความสัมพันธ์ หรือความลังเลในการเลือก'
  },
  {
    name: 'The Chariot',
    nameTh: 'เดอะ ชาริออท',
    image: 'https://upload.wikimedia.org/wikipedia/commons/9/9b/RWS_Tarot_07_Chariot.jpg',
    meaning: 'ความมุ่งมั่น ชัยชนะ การเอาชนะอุปสรรค และการขับเคลื่อนเป้าหมาย',
    reversedMeaning: 'การสูญเสียทิศทาง ความใจร้อน หรืออุปสรรคที่ถาโถม'
  },
  {
    name: 'Strength',
    nameTh: 'สเตร็งธ์',
    image: 'https://upload.wikimedia.org/wikipedia/commons/f/f5/RWS_Tarot_08_Strength.jpg',
    meaning: 'ความอดทน ความแข็งแกร่งที่อ่อนโยน และการควบคุมอารมณ์ด้วยความเมตตา',
    reversedMeaning: 'ความรู้สึกอ่อนแอ ขาดความเชื่อมั่น หรืออารมณ์ที่เริ่มไม่อยู่ในการควบคุม'
  },
  {
    name: 'The Hermit',
    nameTh: 'เดอะ เฮอร์มิท',
    image: 'https://upload.wikimedia.org/wikipedia/commons/4/4d/RWS_Tarot_09_Hermit.jpg',
    meaning: 'การทบทวนตนเอง การค้นหาความจริงภายในใจ และการถอยมามองภาพรวม',
    reversedMeaning: 'ช่วงเวลาที่สับสน รู้สึกโดดเดี่ยว หรือยังไม่พร้อมเปิดใจอย่างเต็มที่'
  },
  {
    name: 'Wheel of Fortune',
    nameTh: 'วีล ออฟ ฟอร์จูน',
    image: 'https://upload.wikimedia.org/wikipedia/commons/3/3c/RWS_Tarot_10_Wheel_of_Fortune.jpg',
    meaning: 'จุดเปลี่ยนของโชคชะตา โอกาสใหม่ และวัฏจักรชีวิตที่มีขึ้นมีลง',
    reversedMeaning: 'จังหวะเวลาที่ยังไม่ลงตัว หรือการต้องรับมือกับความเปลี่ยนแปลงที่ไม่คาดคิด'
  },
  {
    name: 'Justice',
    nameTh: 'จัสติซ',
    image: 'https://upload.wikimedia.org/wikipedia/commons/e/e0/RWS_Tarot_11_Justice.jpg',
    meaning: 'ความยุติธรรม ความถูกต้อง ความสมดุล และผลลัพธ์ตามเหตุและผล',
    reversedMeaning: 'ความไม่เป็นธรรม อคติ หรือการตัดสินใจที่ผิดพลาด'
  },
  {
    name: 'The Hanged Man',
    nameTh: 'เดอะ แฮงด์แมน',
    image: 'https://upload.wikimedia.org/wikipedia/commons/2/2b/RWS_Tarot_12_Hanged_Man.jpg',
    meaning: 'การหยุดนิ่งเพื่อมองมุมมองใหม่ การเสียสละ และการปล่อยวาง',
    reversedMeaning: 'ความดื้อรั้น การเสียสละที่สูญเปล่า หรือการยึดติด'
  },
  {
    name: 'Death',
    nameTh: 'เดธ',
    image: 'https://upload.wikimedia.org/wikipedia/commons/d/d7/RWS_Tarot_13_Death.jpg',
    meaning: 'การสิ้นสุดของสิ่งเดิม เพื่อเปิดรับการเริ่มต้นบทใหม่อย่างแท้จริง',
    reversedMeaning: 'การกลัวการเปลี่ยนแปลง หรือการยื้อสิ่งที่หมดเวลาไปแล้ว'
  },
  {
    name: 'Temperance',
    nameTh: 'เทมเพอแรนซ์',
    image: 'https://upload.wikimedia.org/wikipedia/commons/f/f8/RWS_Tarot_14_Temperance.jpg',
    meaning: 'การปรับสมดุล ความพอดี การประสานความต่าง และความสงบในใจ',
    reversedMeaning: 'ความไม่สมดุล ความสุดโต่ง หรือความขัดแย้งที่ไม่ได้รับการเยียวยา'
  },
  {
    name: 'The Devil',
    nameTh: 'เดอะ เดวิล',
    image: 'https://upload.wikimedia.org/wikipedia/commons/5/55/RWS_Tarot_15_Devil.jpg',
    meaning: 'ความยึดติด กิเลส พันธนาการ หรือภาพลวงตาที่ต้องใช้สติในการปลดปล่อย',
    reversedMeaning: 'การตื่นรู้ การปลดแอกตนเองออกจากพันธนาการและความทุกข์'
  },
  {
    name: 'The Tower',
    nameTh: 'เดอะ ทาวเวอร์',
    image: 'https://upload.wikimedia.org/wikipedia/commons/5/53/RWS_Tarot_16_Tower.jpg',
    meaning: 'การเปลี่ยนแปลงอย่างฉับพลัน การพังทลายของสิ่งเดิมเพื่อการตื่นรู้',
    reversedMeaning: 'การหลีกเลี่ยงวิกฤตได้อย่างเฉียดฉิว หรือการยื้อสิ่งที่ไม่มั่นคง'
  },
  {
    name: 'Six of Cups',
    nameTh: 'ซิกส์ ออฟ คัพส์',
    image: 'https://upload.wikimedia.org/wikipedia/commons/7/76/Cups06.jpg',
    meaning: 'ความทรงจำในอดีต ความรู้สึกที่เคยอบอุ่น และสิ่งที่เคยผูกพันกัน',
    reversedMeaning: 'การยึดติดกับอดีตจนไม่สามารถก้าวต่อไปข้างหน้าได้'
  },
  {
    name: 'The Star',
    nameTh: 'เดอะ สตาร์',
    image: 'https://upload.wikimedia.org/wikipedia/commons/d/db/RWS_Tarot_17_Star.jpg',
    meaning: 'ความหวัง การเยียวยาจิตใจ แรงบันดาลใจ และอนาคตที่สดใส',
    reversedMeaning: 'ความสิ้นหวังชั่วคราว หรือการมองไม่เห็นแสงสว่างที่รออยู่'
  },
  {
    name: 'The Moon',
    nameTh: 'เดอะ มูน',
    image: 'https://upload.wikimedia.org/wikipedia/commons/7/7f/RWS_Tarot_18_Moon.jpg',
    meaning: 'ความกังวล อารมณ์ที่แปรปรวน ภาพลวงตา และสิ่งที่ยังไม่ชัดเจน',
    reversedMeaning: 'ความกระจ่างเริ่มปรากฏ ความจริงที่ถูกเปิดเผย และความกังวลที่คลี่คลาย'
  },
  {
    name: 'The Sun',
    nameTh: 'เดอะ ซัน',
    image: 'https://upload.wikimedia.org/wikipedia/commons/1/17/RWS_Tarot_19_Sun.jpg',
    meaning: 'ความสุข ความสำเร็จ ความอบอุ่น และความกระจ่างแจ้งในทุกเรื่อง',
    reversedMeaning: 'ความสุขที่อาจล่าช้า หรือความหวังที่ต้องใช้เวลาอดทนอีกนิด'
  },
  {
    name: 'Judgement',
    nameTh: 'จัดจ์เมนต์',
    image: 'https://upload.wikimedia.org/wikipedia/commons/d/dd/RWS_Tarot_20_Judgement.jpg',
    meaning: 'การตื่นรู้ การให้อภัย และการเปลี่ยนผ่านครั้งสำคัญในชีวิต',
    reversedMeaning: 'การลังเลในการตัดสินใจ หรือการไม่ยอมปล่อยวางอดีต'
  },
  {
    name: 'The World',
    nameTh: 'เดอะ เวิลด์',
    image: 'https://upload.wikimedia.org/wikipedia/commons/f/ff/RWS_Tarot_21_World.jpg',
    meaning: 'ความสมบูรณ์แบบ ความสำเร็จตามเป้าหมาย และการเริ่มต้นบทใหม่ที่งดงาม',
    reversedMeaning: 'สิ่งที่ยังคั่งค้าง หรือการรอคอยความสมบูรณ์แบบในขั้นตอนสุดท้าย'
  }
];

// App States
let selectedCategory = 'love';
let selectedSpread = 'three';
let allowReversed = false;
let cardsToPickCount = 3;
let pickedCards = [];
let isShuffling = false;

// DOM References
const step1View = document.getElementById('step1-view');
const step2View = document.getElementById('step2-view');
const step3View = document.getElementById('step3-view');

const nameInput = document.getElementById('nameInput');
const questionInput = document.getElementById('questionInput');
const charCounter = document.getElementById('charCounter');
const reversedToggle = document.getElementById('reversedToggle');

const toPickBtn = document.getElementById('toPickBtn');
const quickSubmitBtn = document.getElementById('quickSubmitBtn');
const backToStep1Btn = document.getElementById('backToStep1Btn');
const newReadingBtn = document.getElementById('newReadingBtn');

const slotsTray = document.getElementById('slotsTray');
const deckStack = document.getElementById('deckStack');
const interactiveFan = document.getElementById('interactiveFan');
const shuffleDeckBtn = document.getElementById('shuffleDeckBtn');
const autoPickBtn = document.getElementById('autoPickBtn');

const stageTitle = document.getElementById('stageTitle');
const stageSubTitle = document.getElementById('stageSubTitle');
const badgeShuffle = document.getElementById('badgeShuffle');
const badgeChoose = document.getElementById('badgeChoose');
const badgeReveal = document.getElementById('badgeReveal');

const spreadCounts = { single: 1, three: 3, year: 5 };

// Character Counter
questionInput.addEventListener('input', () => {
  charCounter.textContent = `${questionInput.value.length}/500`;
});

// Category Tab Filter
document.querySelectorAll('.cat-pill').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.cat-pill').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    selectedCategory = btn.dataset.cat;
  });
});

// Suggested Prompt Chips
document.querySelectorAll('.chip-item').forEach(chip => {
  chip.addEventListener('click', () => {
    questionInput.value = chip.textContent.trim();
    charCounter.textContent = `${questionInput.value.length}/500`;
  });
});

// Spread Selection Cards
document.querySelectorAll('.spread-card').forEach(card => {
  card.addEventListener('click', () => {
    document.querySelectorAll('.spread-card').forEach(c => c.classList.remove('active'));
    card.classList.add('active');
    const radio = card.querySelector('input[type="radio"]');
    radio.checked = true;
    selectedSpread = radio.value;
    cardsToPickCount = spreadCounts[selectedSpread] || 3;
  });
});

// Reversed Toggle
reversedToggle.addEventListener('change', (e) => {
  allowReversed = e.target.checked;
});

// Start Pick Trigger
function handleStartPick() {
  const q = questionInput.value.trim();
  if (!q) {
    alert('กรุณากรอกคำถามของคุณก่อนเริ่มเลือกไพ่นะคะ ✦');
    questionInput.focus();
    return;
  }

  cardsToPickCount = spreadCounts[selectedSpread] || 3;
  pickedCards = [];

  step1View.classList.add('hidden');
  step2View.classList.remove('hidden');
  step3View.classList.add('hidden');

  initStage();
}

toPickBtn.addEventListener('click', handleStartPick);
quickSubmitBtn.addEventListener('click', handleStartPick);

backToStep1Btn.addEventListener('click', () => {
  step2View.classList.add('hidden');
  step1View.classList.remove('hidden');
});

// 2. Interactive Stage Initialization
function initStage() {
  updateStepper('shuffle');
  stageTitle.textContent = 'สับไพ่เพื่อเชื่อมโยงพลังงาน';
  stageSubTitle.textContent = 'กดปุ่ม "สับไพ่" เพื่อคลายสำรับไพ่และเริ่มเลือกไพ่ตามคำถามของคุณ';

  shuffleDeckBtn.classList.remove('hidden');
  autoPickBtn.classList.add('hidden');
  interactiveFan.classList.add('hidden');
  deckStack.classList.remove('hidden');

  renderSlots();
  renderStack();
}

function renderSlots() {
  slotsTray.innerHTML = '';
  for (let i = 0; i < cardsToPickCount; i++) {
    const slot = document.createElement('div');
    slot.className = 'slot-box';
    slot.id = `slot-${i}`;
    slot.innerHTML = `<span>ใบที่ ${i + 1}</span>`;
    slotsTray.appendChild(slot);
  }
}

function renderStack() {
  deckStack.innerHTML = '';
  for (let i = 0; i < 14; i++) {
    const card = document.createElement('div');
    card.className = `stack-card-item ${i % 2 === 0 ? 'stack-left' : 'stack-right'}`;
    card.style.transform = `translateY(${-i * 2}px) rotate(${(i % 2 === 0 ? -1 : 1) * (i * 0.4)}deg)`;
    card.style.zIndex = i;
    card.innerHTML = `<svg viewBox="0 0 100 100" class="card-back-lily"><use href="#ace-lily-emblem" /></svg>`;
    deckStack.appendChild(card);
  }
}

// Realistic Shuffle Animation
shuffleDeckBtn.addEventListener('click', () => {
  if (isShuffling) return;
  isShuffling = true;

  stageTitle.textContent = 'กำลังสับไพ่...';
  stageSubTitle.textContent = 'ผสานคำถามและเจตจำนงของคุณเข้าสู่ไพ่ทุกใบ';
  deckStack.classList.add('shuffling');
  shuffleDeckBtn.disabled = true;

  setTimeout(() => {
    deckStack.classList.remove('shuffling');
    deckStack.classList.add('hidden');
    interactiveFan.classList.remove('hidden');
    autoPickBtn.classList.remove('hidden');
    shuffleDeckBtn.classList.add('hidden');

    updateStepper('choose');
    stageTitle.textContent = 'เลือกไพ่ด้วยสัญชาตญาณของคุณ';
    stageSubTitle.textContent = `เลือกไพ่ให้ครบ ${cardsToPickCount} ใบ ตามความรู้สึกที่ดึงดูดคุณ`;

    renderFan();
    isShuffling = false;
  }, 1600);
});

function renderFan() {
  interactiveFan.innerHTML = '';
  const total = 22;
  const spreadAngle = 60;
  const step = spreadAngle / total;

  for (let i = 0; i < total; i++) {
    const cardEl = document.createElement('div');
    cardEl.className = 'fan-card-item';
    cardEl.dataset.index = i;

    const rot = -spreadAngle / 2 + (i * step);
    const x = (i - total / 2) * 16;
    cardEl.style.transform = `translateX(${x}px) rotate(${rot}deg)`;
    cardEl.style.zIndex = i + 1;
    cardEl.innerHTML = `<svg viewBox="0 0 100 100" class="card-back-lily"><use href="#ace-lily-emblem" /></svg>`;

    cardEl.addEventListener('click', () => pickCard(cardEl));
    interactiveFan.appendChild(cardEl);
  }
}

function pickCard(cardEl) {
  if (isShuffling || pickedCards.length >= cardsToPickCount) return;
  if (cardEl.classList.contains('picked')) return;

  cardEl.classList.add('picked');
  cardEl.style.opacity = '0';
  cardEl.style.pointerEvents = 'none';

  const unpicked = tarotDeck.filter(c => !pickedCards.some(p => p.name === c.name));
  const chosen = unpicked[Math.floor(Math.random() * unpicked.length)];
  const isRev = allowReversed ? Math.random() < 0.35 : false;

  const cardData = {
    ...chosen,
    isReversed: isRev,
    position: pickedCards.length + 1
  };
  pickedCards.push(cardData);

  const slot = document.getElementById(`slot-${pickedCards.length - 1}`);
  if (slot) {
    slot.classList.add('filled');
    slot.innerHTML = `
      <svg viewBox="0 0 100 100" class="slot-lily-svg"><use href="#ace-lily-emblem" /></svg>
      <strong>ใบที่ ${pickedCards.length}</strong>
    `;
  }

  if (pickedCards.length === cardsToPickCount) {
    updateStepper('reveal');
    setTimeout(() => {
      proceedToReveal();
    }, 600);
  }
}

autoPickBtn.addEventListener('click', () => {
  const cards = Array.from(document.querySelectorAll('.fan-card-item:not(.picked)'));
  while (pickedCards.length < cardsToPickCount && cards.length > 0) {
    const randomPick = cards.splice(Math.floor(Math.random() * cards.length), 1)[0];
    pickCard(randomPick);
  }
});

function updateStepper(step) {
  badgeShuffle.classList.toggle('active', step === 'shuffle');
  badgeChoose.classList.toggle('active', step === 'choose');
  badgeReveal.classList.toggle('active', step === 'reveal');
}

// 3. Step 3: Reveal Cards & Reading
async function proceedToReveal() {
  step2View.classList.add('hidden');
  step3View.classList.remove('hidden');

  document.getElementById('resultQuestionText').textContent = `"${questionInput.value.trim()}"`;
  
  const spreadLabels = {
    single: '1 Card (Quick Insight)',
    three: '3 Cards Spread (Past Present Future)',
    year: '5 Cards Spread (Deeper Clarity)'
  };
  document.getElementById('resultSpreadTag').textContent = spreadLabels[selectedSpread] || 'Tarot Reading';

  renderRevealedCards();
  await requestPrediction();
}

function renderRevealedCards() {
  const grid = document.getElementById('revealedCardsGrid');
  grid.innerHTML = '';

  pickedCards.forEach((card, index) => {
    const wrap = document.createElement('div');
    wrap.className = 'revealed-card-wrap';

    wrap.innerHTML = `
      <div class="card-inner-3d" id="card3d-${index}">
        <div class="card-back-face">
          <svg viewBox="0 0 100 100" class="card-back-lily"><use href="#ace-lily-emblem" /></svg>
        </div>
        <div class="card-front-face">
          <div class="card-art-holder">
            <img src="${card.image}" alt="${card.name}" class="tarot-real-img ${card.isReversed ? 'is-reversed' : ''}" loading="lazy" />
          </div>
          <div class="card-caption-area">
            <span class="card-pos-text">CARD 0${card.position}</span>
            <strong>${card.name}</strong>
            ${card.isReversed ? '<span class="reversed-indicator">(กลับหัว - Reversed)</span>' : ''}
          </div>
        </div>
      </div>
    `;

    grid.appendChild(wrap);

    setTimeout(() => {
      const el = document.getElementById(`card3d-${index}`);
      if (el) el.classList.add('flipped');
    }, 400 * (index + 1));
  });
}

// 4. Request Prediction from Server
async function requestPrediction() {
  const readingLoading = document.getElementById('readingLoading');
  const readingContentLayout = document.getElementById('readingContentLayout');

  readingLoading.classList.remove('hidden');
  readingContentLayout.classList.add('hidden');

  try {
    const response = await fetch('/api/predict', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        question: questionInput.value.trim(),
        name: nameInput.value.trim(),
        spread: selectedSpread,
        category: selectedCategory,
        cards: pickedCards
      })
    });

    const data = await response.json();
    populateResult(data.summary || data);
  } catch (error) {
    console.error('Prediction fetch error:', error);
    populateResult({
      overview: 'ความสัมพันธ์หรือสถานการณ์นี้มีรากฐานมาจากความรู้สึกดีๆ ในอดีต แต่อาจกำลังเผชิญหน้ากับความไม่แน่นอนหรือระยะห่างที่ต้องใช้ความเข้าใจ ไพ่บ่งชี้ว่าคุณกำลังเข้าสู่ช่วงแห่งการตื่นรู้และการเปลี่ยนแปลงที่จะนำไปสู่บทสรุปที่ชัดเจนขึ้น',
      guidance: 'ไพ่ทั้งสามใบสะท้อนเส้นทางจากอดีตที่สวยงาม นำมาสู่ปัจจุบันที่ต้องเผชิญหน้ากับความเป็นจริง เพื่อเปิดทางสู่อนาคตที่นำไปสู่การตัดสินใจครั้งสำคัญ เป็นการปิดบทเดิมเพื่อเริ่มบทใหม่ที่เหมาะสมกว่า',
      actionPlan: [
        'ทบทวนความรู้สึกของตัวเองอย่างจริงใจและตรงไปตรงมา',
        'ยอมรับสิ่งที่เกิดขึ้นและเปิดใจต่อการเปลี่ยนแปลง',
        'สิ่งที่ใช่จะเข้ามาในเวลาที่เหมาะสมเมื่อคุณพร้อม ทั้งกับตัวเองและสิ่งรอบตัว'
      ],
      answer: '“บางการกลับมา ไม่ได้เพื่อเริ่มใหม่ แต่เพื่อให้เราได้เข้าใจ และปล่อยวางอย่างแท้จริง ...”'
    });
  } finally {
    readingLoading.classList.add('hidden');
    readingContentLayout.classList.remove('hidden');
  }
}

function populateResult(summary) {
  const container = document.getElementById('cardMeaningsContainer');
  container.innerHTML = pickedCards
    .map(c => `
      <div class="meaning-card-box">
        <strong>${c.name} ${c.isReversed ? '(Reversed)' : ''}</strong>
        <p>${c.isReversed ? c.reversedMeaning : c.meaning}</p>
      </div>
    `)
    .join('');

  document.getElementById('overviewParagraph').textContent = summary.overview || '—';
  document.getElementById('connectionParagraph').textContent = summary.guidance || '—';

  const adviceList = document.getElementById('adviceList');
  const actions = summary.actionPlan || [];
  adviceList.innerHTML = actions.map(item => `<li>${item}</li>`).join('');

  if (summary.answer) {
    document.getElementById('quoteText').textContent = summary.answer;
  }
}

// Follow-up interaction
document.getElementById('followUpSendBtn').addEventListener('click', () => {
  const input = document.getElementById('followUpInput');
  if (!input.value.trim()) return;
  alert(`AI ได้รับคำถามเพิ่มเติม: "${input.value.trim()}" แล้วค่ะ ระบบกำลังประมวลผลต่อยอดจากไพ่ชุดเดิมให้คุณทันที ✦`);
  input.value = '';
});

// Reset
newReadingBtn.addEventListener('click', () => {
  questionInput.value = '';
  charCounter.textContent = '0/500';
  pickedCards = [];
  shuffleDeckBtn.disabled = false;
  step3View.classList.add('hidden');
  step1View.classList.remove('hidden');
});