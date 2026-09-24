// i18n.js — ระบบสองภาษา (ไทย/อังกฤษ) ของทั้งแอป ต้องโหลดก่อน app.js และก่อน partial ทุกไฟล์เสมอ
// (ดู index.html: <script src="/i18n.js"> อยู่ก่อน <script src="/app.js">) เพราะ t()/getLang() ถูกเรียกใช้
// ตั้งแต่ตอน render UI ครั้งแรก
//
// สถาปัตยกรรมสำคัญที่ต้องรู้ก่อนแก้ไฟล์นี้: "key" ภายในระบบ (เช่น CATEGORIES ใน app.js ที่มีค่าเป็น
// 'ทั่วไป'/'ความรัก'/... ตรงๆ) เป็นภาษาไทยมาแต่เดิม และถูกใช้เป็นค่าจริงที่ส่งไป/มาจาก server + เก็บลง
// ฐานข้อมูล (คอลัมน์ category ใน readings/support_reports) — ห้ามเปลี่ยน key พวกนี้เป็นภาษาอังกฤษเด็ดขาด
// ไม่งั้นข้อมูลเก่าที่มีอยู่แล้วจะไม่ตรงกับของใหม่ทันที ระบบนี้จึงแปลแค่ "สิ่งที่แสดงผลบนจอ" เท่านั้น
// ไม่แตะ key ภายในเลย (ดู categoryLabel() ใน app.js ที่ครอบ CATEGORIES.label ไว้อีกที)
//
// วิธีใช้:
// 1) markup แบบ static (ข้อความคงที่ ไม่เปลี่ยนตามข้อมูล) — ใส่ data-i18n="key" ไว้ที่ element แล้วเรียก
//    applyStaticTranslations() ครั้งเดียวตอน bootstrap (ทำอัตโนมัติใน app.js หลัง partialsReady) —
//    data-i18n-placeholder / data-i18n-aria-label / data-i18n-title / data-i18n-alt ก็ใช้ได้เหมือนกัน สำหรับ attribute นั้นๆ
// 2) เนื้อหาที่สร้างจาก template literal แบบไดนามิก (render ใหม่ทุกครั้งจากข้อมูล) — เรียก t('key') ตรงๆ
//    ในโค้ดตรงจุดที่สร้าง HTML string เลย ไม่ต้องพึ่ง data-i18n (เพราะ DOM ส่วนนี้ถูกสร้างใหม่ทุกรอบอยู่แล้ว)

const LANG_KEY = 'ace_tarot_lang';

// ค่าเริ่มต้น = 'th' เสมอถ้ายังไม่เคยกดสลับ (ไม่ auto-detect ตามภาษาเครื่อง ตามที่ตกลงกันไว้ — เว็บนี้เป็น
// ภาษาไทยเป็นหลักโดยธรรมชาติ ให้ผู้ใช้กดสลับเป็นอังกฤษเองถ้าต้องการ)
function getLang(){
  try{
    return localStorage.getItem(LANG_KEY) === 'en' ? 'en' : 'th';
  }catch(e){ return 'th'; }
}

function isEnglish(){ return getLang() === 'en'; }

// vars (optional) แทนที่ token แบบ {name} ในข้อความ เช่น t('pd.greeting', {name: 'บอล'})
function t(key, vars){
  const entry = I18N[key];
  if(!entry){
    console.warn('[i18n] ไม่พบคำแปลของ key:', key);
    return key;
  }
  const lang = getLang();
  let str = entry[lang] || entry.th || key;
  if(vars){
    Object.keys(vars).forEach(k => {
      str = str.replace(new RegExp('\\{' + k + '\\}', 'g'), vars[k]);
    });
  }
  return str;
}

// แปล element ที่ tag ด้วย data-i18n* ทั้งหมดภายใน root (default = ทั้งหน้า) — เรียกครั้งแรกตอน bootstrap
// และเรียกซ้ำทุกครั้งที่สลับภาษา (setLang) เพื่ออัปเดต markup แบบ static ที่ค้างอยู่ใน DOM อยู่แล้ว
function applyStaticTranslations(root){
  const scope = root || document;
  scope.querySelectorAll('[data-i18n]').forEach(el => { el.textContent = t(el.getAttribute('data-i18n')); });
  scope.querySelectorAll('[data-i18n-html]').forEach(el => { el.innerHTML = t(el.getAttribute('data-i18n-html')); });
  scope.querySelectorAll('[data-i18n-placeholder]').forEach(el => { el.placeholder = t(el.getAttribute('data-i18n-placeholder')); });
  scope.querySelectorAll('[data-i18n-aria-label]').forEach(el => { el.setAttribute('aria-label', t(el.getAttribute('data-i18n-aria-label'))); });
  scope.querySelectorAll('[data-i18n-title]').forEach(el => { el.setAttribute('title', t(el.getAttribute('data-i18n-title'))); });
  scope.querySelectorAll('[data-i18n-alt]').forEach(el => { el.setAttribute('alt', t(el.getAttribute('data-i18n-alt'))); });
}

// รีเฟรชเนื้อหาไดนามิกของ "หน้าที่กำลังเปิดอยู่" ตอนนี้ทันทีที่สลับภาษา (เนื้อหาไดนามิกของหน้าอื่นที่ไม่ได้
// เปิดอยู่จะอัปเดตเป็นภาษาใหม่เองตอนถูก render รอบถัดไปตามปกติอยู่แล้ว ไม่ต้องรีเฟรชล่วงหน้า)
function refreshCurrentScreenLang(){
  const activeId = document.querySelector('.screen.visible')?.id;
  if(activeId === 'screen-home'){
    if(typeof renderDailyStrip === 'function') renderDailyStrip();
    if(typeof renderPersonalDashboard === 'function') renderPersonalDashboard();
  } else if(activeId === 'screen-ask'){
    if(typeof renderCatGrid === 'function') renderCatGrid();
    if(typeof renderChips === 'function') renderChips();
  } else if(activeId === 'screen-auth' && typeof updateAuthUI === 'function'){
    updateAuthUI();
  } else if(activeId === 'screen-premium' && typeof renderPremiumGrid === 'function'){
    renderPremiumGrid();
  } else if(activeId === 'screen-topup' && typeof renderCoinHistoryList === 'function'){
    renderCoinHistoryList();
  } else if(activeId === 'screen-support'){
    if(typeof renderSupportCatGrid === 'function') renderSupportCatGrid();
    if(typeof updateSupportAttachmentHint === 'function') updateSupportAttachmentHint();
  } else if(activeId === 'screen-journal' && typeof renderJournal === 'function'){
    renderJournal();
  } else if(activeId === 'screen-result' && typeof state !== 'undefined' && state.currentReading && typeof renderResult === 'function'){
    const premiumInfo = (typeof SPREAD_CATALOG_SAFE !== 'undefined') ? SPREAD_CATALOG_SAFE.PREMIUM_READINGS[state.currentReading.spreadKey] : null;
    if(premiumInfo && premiumInfo.skipQuestion && typeof renderMonthlyOverviewResult === 'function') renderMonthlyOverviewResult(state.currentReading);
    else renderResult(state.currentReading);
  }
}

function setLang(lang){
  const next = (lang === 'en') ? 'en' : 'th';
  try{ localStorage.setItem(LANG_KEY, next); }catch(e){}
  document.documentElement.setAttribute('lang', next);
  applyStaticTranslations();
  if(typeof renderSoundPanel === 'function') renderSoundPanel(); // panel เดียวกับ dark mode toggle มีสวิตช์ภาษาด้วย
  // nav-auth-area/mtab-profile/mtab-coin ตั้งค่าผ่าน textContent/innerHTML ตอน auth state เปลี่ยน ไม่ใช่ data-i18n
  // เลยต้อง re-render เองตรงนี้ ไม่งั้นจะค้างเป็นภาษาเดิมจนกว่าจะมี auth event ครั้งถัดไป
  if(typeof updateNavAuthUI === 'function') updateNavAuthUI();
  if(typeof renderCoinBadge === 'function') renderCoinBadge();
  refreshCurrentScreenLang();
}
function toggleLang(){ setLang(isEnglish() ? 'th' : 'en'); }

document.documentElement.setAttribute('lang', getLang());

/* ==================== พจนานุกรมคำแปล ====================
   จัดกลุ่มตามหน้า/ส่วนของแอป เพื่อหาง่าย — key เป็น "section.name" ไม่ nest ลึกกว่านี้ (เขียน/ค้นง่ายกว่า
   nested object เยอะ ทั้งไฟล์นี้จะยาวมากอยู่แล้วจากจำนวนข้อความทั้งหมดในแอป) */
const I18N = {
  /* ---- Category labels (key = CATEGORIES[].key ภาษาไทยเดิมใน app.js ห้ามเปลี่ยน — ใช้ผ่าน categoryLabel() เท่านั้น) ---- */
  'cat.ทั่วไป': { th: 'ทั่วไป', en: 'General' },
  'cat.ความรัก': { th: 'ความรัก', en: 'Love' },
  'cat.การงาน': { th: 'การงาน', en: 'Career' },
  'cat.การเงิน': { th: 'การเงิน', en: 'Money' },
  'cat.สุขภาพ': { th: 'สุขภาพ', en: 'Health' },

  /* ---- Nav / shell (index.html) ---- */
  'nav.home': { th: 'หน้าแรก', en: 'Home' },
  'nav.journal': { th: 'บันทึกของฉัน', en: 'My Journal' },
  'nav.birthchart': { th: 'ดวงเกิด', en: 'Birth Chart' },
  'nav.login': { th: 'เข้าสู่ระบบ', en: 'Log In' },
  'nav.logout': { th: 'ออกจากระบบ', en: 'Log Out' },
  'nav.settings': { th: 'ตั้งค่าเสียง/การแสดงผล', en: 'Sound & Display Settings' },
  'mtab.home': { th: 'หน้าแรก', en: 'Home' },
  'mtab.journal': { th: 'บันทึก', en: 'Journal' },
  'mtab.premium': { th: 'พรีเมียม', en: 'Premium' },
  'mtab.coin': { th: 'เหรียญ', en: 'Coins' },
  'mtab.profile.login': { th: 'เข้าสู่ระบบ', en: 'Log In' },
  'mtab.profile.default': { th: 'โปรไฟล์', en: 'Profile' },
  'footer.report': { th: 'แจ้งปัญหา', en: 'Report an Issue' },
  'footer.contact': { th: 'ติดต่อทีมงาน', en: 'Contact Us' },
  'footer.disclaimer': { th: 'Ace of Tarot ให้บริการเพื่อความบันเทิงและการไตร่ตรองส่วนตัวเท่านั้น ไม่ใช่คำแนะนำทางการแพทย์ กฎหมาย หรือการเงิน', en: 'Ace of Tarot is provided for entertainment and personal reflection only — not medical, legal, or financial advice.' },
  'footer.copy': { th: '© 2026 Ace of Tarot', en: '© 2026 Ace of Tarot' },

  /* ---- Sound/settings panel ---- */
  'sound.sfx': { th: '🎴 เสียงเอฟเฟกต์', en: '🎴 Sound Effects' },
  'sound.music': { th: '🎵 เพลงพื้นหลัง', en: '🎵 Background Music' },
  'sound.dark': { th: 'โหมดมืด', en: 'Dark Mode' },
  'sound.lang': { th: '🌐 English', en: '🌐 English' },

  /* ---- Home ---- */
  'home.eyebrow': { th: 'TAROT GUIDANCE, ALWAYS WITH YOU', en: 'TAROT GUIDANCE, ALWAYS WITH YOU' },
  'home.title': { th: 'Ace of Tarot', en: 'Ace of Tarot' },
  'home.tag': { th: 'Your Questions, Deeper Answers.', en: 'Your Questions, Deeper Answers.' },
  'home.tagTh': { th: 'ทุกคำถาม มีคำตอบในแบบที่ลึกซึ้งของคุณ', en: 'Every question deserves an answer as deep as it is.' },
  'home.startJourney': { th: 'Start Your Journey', en: 'Start Your Journey' },
  'home.viewJournal': { th: 'ดูบันทึกของฉัน', en: 'View My Journal' },
  'home.virtue.clarity': { th: 'Clarity', en: 'Clarity' },
  'home.virtue.claritySub': { th: 'เห็นภาพชัดขึ้น', en: 'See things more clearly' },
  'home.virtue.healing': { th: 'Healing', en: 'Healing' },
  'home.virtue.healingSub': { th: 'เยียวยาหัวใจ', en: 'Heal your heart' },
  'home.virtue.growth': { th: 'Growth', en: 'Growth' },
  'home.virtue.growthSub': { th: 'เติบโตในแบบคุณ', en: 'Grow in your own way' },
  'home.virtue.kinder': { th: 'A Kinder You', en: 'A Kinder You' },
  'home.virtue.kinderSub': { th: 'อ่อนโยนต่อใจตัวเอง', en: 'Be gentle with yourself' },
  'home.nickname.greeting': { th: 'สวัสดี', en: 'Hello' },
  'home.nickname.ask': { th: 'เราจะเรียกคุณว่าอะไรดี?', en: 'What should we call you?' },
  'home.nickname.placeholder': { th: 'ชื่อเล่นของคุณ', en: 'Your nickname' },
  'home.nickname.save': { th: 'บันทึก', en: 'Save' },
  'home.nickname.skip': { th: 'ข้ามไปก่อน', en: 'Skip for now' },
  'home.quote': { th: '"เพราะทุกคำถาม คือจุดเริ่มต้นของการเติบโต"', en: '"Every question is the start of growth"' },
  'home.quote.by': { th: '— Ace of Tarot', en: '— Ace of Tarot' },
  'home.daily.title': { th: 'ไพ่ประจำวัน', en: "Daily Card" },
  'home.daily.desc': { th: 'จั่วไพ่หนึ่งใบสำหรับวันนี้ — ฟรีทุกวัน', en: 'Draw one card for today — free every day' },
  'home.daily.drawBtn': { th: 'จั่วไพ่วันนี้', en: "Draw Today's Card" },
  'home.daily.doneTitle': { th: 'ไพ่ประจำวันของวันนี้', en: "Today's Daily Card" },
  'home.daily.doneDesc': { th: 'คุณจั่วไพ่ประจำวันไปแล้ว พรุ่งนี้กลับมาต่อ streak ได้เลย', en: "You've drawn today's card. Come back tomorrow to keep your streak going." },
  'home.daily.viewBtn': { th: 'ดูไพ่วันนี้', en: "View Today's Card" },
  'home.daily.streak': { th: '🔥 ต่อเนื่อง {n} วัน', en: '🔥 {n}-day streak' },
  'home.premium.title': { th: 'ไพ่พรีเมียม', en: 'Premium Readings' },
  'home.premium.desc': { th: 'Deep Reading · Love Reading · Celtic Cross · Compatibility — ปลดล็อกเจาะลึกด้วยเหรียญ', en: 'Deep Reading · Love Reading · Celtic Cross · Compatibility — unlock deeper insight with coins' },
  'home.premium.btn': { th: 'ดูไพ่พรีเมียม', en: 'View Premium Readings' },
  'home.birthchart.title': { th: 'ดวงเกิด (Birth Chart)', en: 'Birth Chart' },
  'home.birthchart.desc': { th: 'วิเคราะห์ดวงเกิดแบบ Western Natal Chart จากวัน-เวลา-สถานที่เกิดจริง — ใช้งานฟรี', en: 'A Western Natal Chart reading from your real birth date, time, and place — free to use' },
  'home.birthchart.btn': { th: 'ดูดวงเกิด', en: 'View Birth Chart' },
  'pd.greeting': { th: 'ยินดีต้อนรับกลับมา, {name}', en: 'Welcome back, {name}' },
  'pd.you': { th: 'คุณ', en: 'there' },
  'pd.coins': { th: 'เหรียญ', en: 'Coins' },
  'pd.totalReadings': { th: 'คำทำนายทั้งหมด', en: 'Total Readings' },
  'pd.streakDays': { th: 'วันต่อเนื่อง', en: 'Day Streak' },
  'pd.favCategory': { th: 'คุณถามเรื่อง{cat}บ่อยที่สุด', en: 'You ask about {cat} the most' },
  'pd.latestLabel': { th: 'คำทำนายล่าสุดของคุณ', en: 'Your Latest Reading' },
  'pd.viewAgain': { th: 'ดูอีกครั้ง', en: 'View Again' },
  'pd.emptyLabel': { th: 'ยังไม่มีประวัติการทำนาย', en: 'No reading history yet' },
  'pd.emptyDesc': { th: 'เริ่มต้นคำถามแรกของคุณได้เลย', en: 'Start with your first question' },

  /* ---- Auth (login/signup/forgot/reset) ---- */
  'auth.loginSubtitle': { th: 'เข้าสู่ระบบเพื่อดูประวัติคำทำนายของคุณได้จากทุกอุปกรณ์', en: 'Log in to see your reading history on any device' },
  'auth.emailLabel': { th: 'อีเมล', en: 'Email' },
  'auth.passwordLabel': { th: 'รหัสผ่าน', en: 'Password' },
  'auth.passwordPlaceholder': { th: 'อย่างน้อย 6 ตัวอักษร', en: 'At least 6 characters' },
  'auth.showPassword': { th: 'แสดงรหัสผ่าน', en: 'Show password' },
  'auth.hidePassword': { th: 'ซ่อนรหัสผ่าน', en: 'Hide password' },
  'auth.rememberMe': { th: 'จำอีเมลและรหัสผ่านไว้', en: 'Remember my email and password' },
  'auth.forgotPassword': { th: 'ลืมรหัสผ่าน?', en: 'Forgot password?' },
  'auth.sendResetBtn': { th: 'ส่งลิงก์รีเซ็ตรหัสผ่าน', en: 'Send Reset Link' },
  'auth.backToLogin': { th: 'กลับไปเข้าสู่ระบบ', en: 'Back to Login' },
  'auth.newPasswordLabel': { th: 'รหัสผ่านใหม่', en: 'New Password' },
  'auth.confirmPasswordLabel': { th: 'ยืนยันรหัสผ่านใหม่', en: 'Confirm New Password' },
  'auth.confirmPasswordPlaceholder': { th: 'พิมพ์รหัสผ่านใหม่อีกครั้ง', en: 'Type the new password again' },
  'auth.savePasswordBtn': { th: 'บันทึกรหัสผ่านใหม่', en: 'Save New Password' },
  'auth.noAccount': { th: 'ยังไม่มีบัญชี?', en: "Don't have an account?" },
  'auth.signupLink': { th: 'สมัครสมาชิก', en: 'Sign Up' },
  'auth.guestNotePrefix': { th: 'หรือ', en: 'Or' },
  'auth.guestContinueLink': { th: 'ใช้งานแบบไม่ล็อกอินต่อไป', en: 'continue without logging in' },
  'auth.guestNoteSuffix': { th: '— บันทึกจะเก็บไว้ในเครื่องนี้เท่านั้น', en: '— your readings will only be saved on this device' },
  'auth.signupTitle': { th: 'สมัครสมาชิก', en: 'Sign Up' },
  'auth.signupSubtitle': { th: 'สมัครบัญชีฟรี เพื่อเริ่มเก็บประวัติคำทำนายข้ามอุปกรณ์', en: 'Create a free account to keep your reading history across devices' },
  'auth.hasAccount': { th: 'มีบัญชีอยู่แล้ว?', en: 'Already have an account?' },
  'auth.forgotTitle': { th: 'ลืมรหัสผ่าน?', en: 'Forgot Password?' },
  'auth.forgotSubtitle': { th: 'กรอกอีเมลที่ใช้สมัครไว้ เราจะส่งลิงก์สำหรับตั้งรหัสผ่านใหม่ไปให้ทางอีเมล', en: "Enter the email you signed up with — we'll send a password reset link to it" },
  'auth.resetTitle': { th: 'ตั้งรหัสผ่านใหม่', en: 'Set a New Password' },
  'auth.resetSubtitle': { th: 'กรอกรหัสผ่านใหม่ที่ต้องการใช้เข้าสู่ระบบต่อจากนี้', en: 'Enter the new password you want to use to log in from now on' },
  'auth.errNotReady': { th: 'ระบบล็อกอินยังไม่พร้อมใช้งาน (ยังไม่ได้ตั้งค่า Supabase) กรุณาติดต่อผู้ดูแลเว็บไซต์', en: 'The login system is not ready yet (Supabase is not configured) — please contact the site admin' },
  'auth.errFillBoth': { th: 'กรุณากรอกอีเมลและรหัสผ่าน', en: 'Please enter your email and password' },
  'auth.processing': { th: 'กำลังดำเนินการ...', en: 'Processing...' },
  'auth.signupSuccessConfirmEmail': { th: 'สมัครสำเร็จ! กรุณาเช็คอีเมลเพื่อยืนยันบัญชีก่อนเข้าสู่ระบบ', en: 'Signed up successfully! Please check your email to confirm your account before logging in' },
  'auth.genericError': { th: 'เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง', en: 'Something went wrong — please try again' },
  'auth.errFillEmail': { th: 'กรุณากรอกอีเมล', en: 'Please enter your email' },
  'auth.sending': { th: 'กำลังส่ง...', en: 'Sending...' },
  'auth.resetEmailSent': { th: 'ถ้าอีเมลนี้มีบัญชีอยู่ในระบบ เราได้ส่งลิงก์สำหรับตั้งรหัสผ่านใหม่ไปให้แล้ว กรุณาตรวจสอบกล่องจดหมาย (รวมถึงโฟลเดอร์สแปม)', en: "If an account exists for this email, we've sent a password reset link — please check your inbox (including spam)" },
  'auth.errPasswordMin': { th: 'รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร', en: 'Password must be at least 6 characters' },
  'auth.errPasswordMismatch': { th: 'รหัสผ่านทั้งสองช่องไม่ตรงกัน', en: 'The two passwords do not match' },
  'auth.saving': { th: 'กำลังบันทึก...', en: 'Saving...' },
  'auth.resetSuccess': { th: 'ตั้งรหัสผ่านใหม่สำเร็จแล้ว กำลังพาเข้าสู่ระบบ...', en: 'Password reset successfully — logging you in...' },
  'auth.errInvalidCreds': { th: 'อีเมลหรือรหัสผ่านไม่ถูกต้อง', en: 'Incorrect email or password' },
  'auth.errAlreadyRegistered': { th: 'อีเมลนี้ถูกใช้สมัครสมาชิกไปแล้ว ลองเข้าสู่ระบบแทน', en: 'This email is already registered — try logging in instead' },
  'auth.errInvalidEmail': { th: 'รูปแบบอีเมลไม่ถูกต้อง', en: 'Invalid email format' },
  'auth.errExpiredLink': { th: 'ลิงก์นี้หมดอายุหรือเคยใช้ไปแล้ว กรุณากดขอลิงก์รีเซ็ตรหัสผ่านใหม่อีกครั้ง', en: 'This link has expired or was already used — please request a new password reset link' },
  'auth.migrateConfirm': { th: 'พบบันทึกคำทำนาย {n} รายการที่เก็บไว้ในเครื่องนี้ (ก่อนล็อกอิน)\n\nต้องการย้ายเข้าบัญชีของคุณหรือไม่? (บันทึกในเครื่องจะถูกลบหลังย้ายสำเร็จ)', en: 'Found {n} reading(s) saved on this device (from before you logged in).\n\nMove them into your account? (The local copies will be removed once the move succeeds.)' },
  'auth.migrateDone': { th: 'ย้ายบันทึกสำเร็จ {migrated} จาก {total} รายการ', en: 'Successfully moved {migrated} of {total} reading(s)' },

  /* ---- Premium store ---- */
  'premium.pageTitle': { th: 'ไพ่พรีเมียม', en: 'Premium Readings' },
  'premium.pageSubtitle': { th: 'ปลดล็อกการอ่านไพ่เจาะลึกด้วยเหรียญ — ใช้ครั้งเดียว ได้คำตอบที่ลึกกว่าเดิม', en: 'Unlock a deeper reading with coins — one-time use for a richer answer' },
  'premium.balance': { th: '🪙 คุณมี {n} เหรียญ', en: '🪙 You have {n} coins' },
  'premium.topupLink': { th: 'เติมเหรียญ', en: 'Top Up' },
  'premium.loginRequired': { th: 'กรุณา {link} ก่อนใช้ไพ่พรีเมียม', en: 'Please {link} before using premium readings' },
  'premium.loginLink': { th: 'เข้าสู่ระบบ', en: 'log in' },
  'premium.loginFirstBtn': { th: 'เข้าสู่ระบบก่อน', en: 'Log In First' },
  'premium.unlockBtn': { th: 'ปลดล็อก · 🪙 {cost}', en: 'Unlock · 🪙 {cost}' },
  'premium.insufficientBtn': { th: 'เหรียญไม่พอ · เติมเหรียญ', en: 'Not Enough Coins · Top Up' },

  /* ---- Birth Chart (chrome only — ชื่อราศี/ดาว/เนื้อหาตีความจริงมาจาก zodiac-data.js + Gemini คงเป็นไทยไว้ก่อน
     จนกว่าจะเชื่อม lang ฝั่ง server เพราะข้อมูลชุดเดียวกันนี้ถูกใช้สร้าง prompt ให้ Gemini ด้วย) ---- */
  'bc.pageTitle': { th: 'ดวงเกิด (Birth Chart)', en: 'Birth Chart' },
  'bc.pageSubtitle': { th: 'วิเคราะห์ดวงเกิดแบบ Western Natal Chart จากตำแหน่งดาวจริง — ใช้งานได้ฟรี ไม่ต้องล็อกอิน ไม่ใช้เหรียญ', en: 'A Western Natal Chart analysis based on real planetary positions — free, no login, no coins needed' },
  'bc.nameLabel': { th: 'ชื่อ (ไม่บังคับ)', en: 'Name (optional)' },
  'bc.namePlaceholder': { th: 'ชื่อของคุณ', en: 'Your name' },
  'bc.dobLabel': { th: 'วันเกิด', en: 'Date of Birth' },
  'bc.selectDob': { th: 'เลือกวันเกิด', en: 'Select date of birth' },
  'bc.timeLabel': { th: 'เวลาเกิด', en: 'Time of Birth' },
  'bc.selectTime': { th: 'เลือกเวลาเกิด', en: 'Select time of birth' },
  'bc.timeUnknown': { th: 'ไม่ทราบเวลาเกิดแน่นอน', en: "I don't know the exact time" },
  'bc.timeHint': { th: 'ถ้าไม่ทราบเวลาเกิด จะไม่สามารถคำนวณลัคนา (Ascendant) ได้ — ดาวอื่นๆ ยังคำนวณได้ตามปกติ', en: 'Without a birth time, the Ascendant cannot be calculated — other placements are still calculated normally' },
  'bc.locationLabel': { th: 'สถานที่เกิด', en: 'Place of Birth' },
  'bc.locationHint': { th: 'เขตเวลาที่ใช้คือเวลามาตรฐานปัจจุบันของแต่ละสถานที่ (ไม่ได้ไล่ประวัติเวลาออมแสงในอดีต) — สำหรับคนเกิดในประเทศไทยจะแม่นยำเสมอ เพราะไทยใช้ UTC+7 คงที่มาตลอด', en: "The time zone used is each location's current standard time (not historical daylight-saving records) — always accurate for people born in Thailand, since Thailand has used a fixed UTC+7 throughout." },
  'bc.submitBtn': { th: 'ดูดวงเกิด', en: 'View My Birth Chart' },
  'bc.prevMonth': { th: 'เดือนก่อนหน้า', en: 'Previous month' },
  'bc.nextMonth': { th: 'เดือนถัดไป', en: 'Next month' },
  'bc.hourLabel': { th: 'ชั่วโมง', en: 'Hour' },
  'bc.minuteLabel': { th: 'นาที', en: 'Minute' },
  'bc.doneBtn': { th: 'เสร็จสิ้น', en: 'Done' },
  'bc.locationSearchPlaceholder': { th: 'ค้นหาจังหวัด/ประเทศ...', en: 'Search province/country...' },
  'bc.thailandGroup': { th: 'ประเทศไทย', en: 'Thailand' },
  'bc.worldGroup': { th: 'ต่างประเทศ', en: 'International' },
  'bc.noLocationFound': { th: 'ไม่พบสถานที่ที่ค้นหา', en: 'No matching location found' },
  'bc.selectLocationPlaceholder': { th: 'เลือกสถานที่เกิด', en: 'Select place of birth' },
  'bc.errSelectDob': { th: 'กรุณาเลือกวันเกิดก่อนนะครับ', en: 'Please select your date of birth first' },
  'bc.errSelectTime': { th: 'กรุณากรอกเวลาเกิด หรือติ๊ก "ไม่ทราบเวลาเกิดแน่นอน" แทน', en: 'Please enter your time of birth, or check "I don\'t know the exact time" instead' },
  'bc.calculating': { th: 'กำลังคำนวณดวงเกิด...', en: 'Calculating your birth chart...' },
  'bc.calcError': { th: 'ไม่สามารถคำนวณดวงเกิดได้ กรุณาลองใหม่อีกครั้ง', en: 'Could not calculate the birth chart — please try again' },
  'bc.sunPreview': { th: '{symbol} ดวงอาทิตย์ของคุณน่าจะอยู่ใน{sign}', en: '{symbol} Your Sun is likely in {sign}' },
  'bc.chartTitleOwner': { th: 'ดวงเกิดของ{name}', en: "{name}'s Birth Chart" },
  'bc.chartTitleDefault': { th: 'ดวงเกิดของคุณ', en: 'Your Birth Chart' },
  'bc.overviewDefaultTitle': { th: 'ภาพรวมดวงเกิด', en: 'Chart Overview' },
  'bc.mainPlanetsLabel': { th: 'ดาวหลักของดวงเกิด', en: 'The Big Three' },
  'bc.deepPersonalityLabel': { th: 'บุคลิกภาพเชิงลึก', en: 'Deep Personality' },
  'bc.strengthsLabel': { th: 'จุดแข็งของคุณ', en: 'Your Strengths' },
  'bc.growthLabel': { th: 'สิ่งที่ควรพัฒนา', en: 'Areas to Grow' },
  'bc.hiddenTraitsLabel': { th: 'ด้านที่ซ่อนอยู่ภายใน', en: 'Hidden Traits' },
  'bc.innerConflictLabel': { th: 'ความขัดแย้งภายใน', en: 'Inner Conflict' },
  'bc.loveTitle': { th: 'ความรัก', en: 'Love' },
  'bc.careerTitle': { th: 'การงาน', en: 'Career' },
  'bc.financeTitle': { th: 'การเงิน', en: 'Finance' },
  'bc.lifePathTitle': { th: 'เส้นทางชีวิต', en: 'Life Path' },
  'bc.love.style': { th: 'รูปแบบความรัก', en: 'Love Style' },
  'bc.love.needs': { th: 'สิ่งที่ต้องการจากความสัมพันธ์', en: 'What You Need From a Relationship' },
  'bc.love.strengths': { th: 'จุดแข็งด้านความรัก', en: 'Strengths in Love' },
  'bc.cautionsLabel': { th: 'สิ่งที่ควรระวัง', en: 'What to Watch Out For' },
  'bc.love.idealRelationship': { th: 'ความสัมพันธ์ที่เหมาะกับคุณ', en: 'A Relationship That Suits You' },
  'bc.career.workStyle': { th: 'รูปแบบการทำงาน', en: 'Work Style' },
  'bc.career.strengths': { th: 'จุดแข็งในการทำงาน', en: 'Strengths at Work' },
  'bc.career.suitableFields': { th: 'สายงานที่มีแนวโน้มเหมาะ', en: 'Fields That May Suit You' },
  'bc.career.challenges': { th: 'ความท้าทายด้านการงาน', en: 'Career Challenges' },
  'bc.career.direction': { th: 'แนวทางเติบโต', en: 'Growth Direction' },
  'bc.finance.pattern': { th: 'ทัศนคติต่อเงิน', en: 'Attitude Toward Money' },
  'bc.finance.strengths': { th: 'จุดแข็งด้านการเงิน', en: 'Financial Strengths' },
  'bc.lifePath.mainLesson': { th: 'บทเรียนสำคัญ', en: 'Key Lesson' },
  'bc.lifePath.potential': { th: 'ศักยภาพ', en: 'Potential' },
  'bc.lifePath.guidance': { th: 'คำแนะนำ', en: 'Guidance' },
  'bc.keyPlacementsLabel': { th: 'ตำแหน่งดาวที่โดดเด่น', en: 'Notable Placements' },
  'bc.impactLabel': { th: 'ผลต่อคุณ:', en: 'Impact on you:' },
  'bc.allPlacementsLabel': { th: 'ตำแหน่งดาวทั้งหมด', en: 'All Placements' },
  'bc.houseOrdinal': { th: 'เรือนที่ {n}', en: 'House {n}' },
  'bc.houseShort': { th: 'เรือน {n}', en: 'House {n}' },
  'bc.defaultClosing': { th: '"ดวงดาวเป็นเพียงแผนที่ ไม่ใช่ปลายทาง"', en: '"The stars are only a map, not a destination"' },
  'bc.viewNewBtn': { th: 'ดูดวงเกิดใหม่', en: 'View a New Chart' },
  'bc.big3.strength': { th: 'จุดแข็ง', en: 'Strength' },
  'bc.big3.emotionalNeed': { th: 'ความต้องการภายใน', en: 'Emotional Need' },
  'bc.big3.firstImpression': { th: 'ภาพลักษณ์แรกพบ', en: 'First Impression' },

  /* ---- Support / report an issue ---- */
  'support.pageTitle': { th: 'แจ้งปัญหา / ติดต่อทีมงาน', en: 'Report an Issue / Contact Us' },
  'support.pageSubtitle': { th: 'พบปัญหาการใช้งาน อยากสอบถาม หรือมีข้อเสนอแนะ? ส่งข้อความถึงทีมงานได้ที่นี่ เราจะติดต่อกลับทางอีเมลโดยเร็วที่สุด', en: "Found a bug, have a question, or a suggestion? Send us a message here — we'll get back to you by email as soon as we can." },
  'support.categoryLabel': { th: 'หมวดหมู่', en: 'Category' },
  'support.emailLabel': { th: 'อีเมลสำหรับติดต่อกลับ', en: 'Contact Email' },
  'support.messageLabel': { th: 'รายละเอียดปัญหา', en: 'Details' },
  'support.messagePlaceholder': { th: 'อธิบายปัญหาที่พบโดยละเอียด เช่น ทำอะไรอยู่ตอนที่เจอปัญหา, ข้อความ error ที่เห็น (ถ้ามี)...', en: 'Describe the issue in detail — what you were doing when it happened, any error message you saw...' },
  'support.attachmentLabel': { th: 'แนบไฟล์/รูปภาพ (ถ้ามี)', en: 'Attach a File/Image (optional)' },
  'support.attachmentHintDefault': { th: 'แนบภาพหน้าจอหรือไฟล์ที่เกี่ยวข้องกับปัญหาได้ (ไม่บังคับ)', en: 'Attach a screenshot or a related file (optional)' },
  'support.attachmentHintPayment': { th: 'แนะนำให้แนบสลิปการโอนเงิน/หลักฐานการชำระเงิน เพื่อให้ทีมงานตรวจสอบและแก้ไขให้ได้เร็วขึ้น', en: 'We recommend attaching your payment slip/proof of payment so we can review and resolve this faster' },
  'support.dropChooseOrDrag': { th: 'เลือกไฟล์ หรือลากมาวางที่นี่', en: 'Choose a file, or drag one here' },
  'support.dropTypesHint': { th: 'JPG, PNG, WEBP, GIF หรือ PDF — สูงสุด 5MB', en: 'JPG, PNG, WEBP, GIF, or PDF — up to 5MB' },
  'support.attachmentPreviewAlt': { th: 'ตัวอย่างไฟล์แนบ', en: 'Attachment preview' },
  'support.removeAttachmentBtn': { th: 'ลบไฟล์แนบ', en: 'Remove Attachment' },
  'support.submitBtn': { th: 'ส่งคำร้อง', en: 'Submit Report' },
  'support.contactDirectNote': { th: 'หรือส่งอีเมลถึงทีมงานโดยตรงที่', en: 'Or email us directly at' },
  'support.cat.bug': { th: 'บั๊ก/ใช้งานไม่ได้', en: 'Bug/Not Working' },
  'support.cat.payment': { th: 'การชำระเงิน/เหรียญ', en: 'Payment/Coins' },
  'support.cat.account': { th: 'บัญชีผู้ใช้', en: 'Account' },
  'support.cat.other': { th: 'อื่นๆ', en: 'Other' },
  'support.willContactAt': { th: 'จะติดต่อกลับที่ {email}', en: "We'll get back to you at {email}" },
  'support.errInvalidFileType': { th: 'ไฟล์แนบไม่ถูกต้อง (รองรับเฉพาะรูปภาพ JPG/PNG/WEBP/GIF หรือ PDF)', en: 'Invalid attachment (only JPG/PNG/WEBP/GIF images or PDF are supported)' },
  'support.errFileTooLarge': { th: 'ไฟล์แนบมีขนาดใหญ่เกินไป (สูงสุด 5MB)', en: 'The attachment is too large (5MB max)' },
  'support.errNeedMessage': { th: 'กรุณาอธิบายปัญหาที่พบ', en: 'Please describe the issue' },
  'support.errNeedEmail': { th: 'กรุณากรอกอีเมลสำหรับติดต่อกลับ', en: 'Please enter a contact email' },
  'support.sending': { th: 'กำลังส่ง...', en: 'Sending...' },
  'support.submitError': { th: 'ส่งคำร้องไม่สำเร็จ กรุณาลองใหม่อีกครั้ง', en: 'Could not submit the report — please try again' },
  'support.successAttachmentFailed': { th: 'ส่งคำร้องเรียบร้อยแล้ว แต่แนบไฟล์ไม่สำเร็จ (คำร้องยังถูกบันทึกไว้ปกติ) ทีมงานจะติดต่อกลับทางอีเมลโดยเร็วที่สุด', en: "Report submitted, but the attachment failed to upload (the report itself was saved normally). We'll get back to you by email as soon as we can." },
  'support.successGeneric': { th: 'ส่งคำร้องเรียบร้อยแล้ว ทีมงานจะติดต่อกลับทางอีเมลโดยเร็วที่สุด ขอบคุณที่แจ้งให้เราทราบ', en: "Report submitted. We'll get back to you by email as soon as we can — thank you for letting us know." },

  /* ---- Ask screen ---- */
  'ask.backHome': { th: 'กลับหน้าแรก', en: 'Back to Home' },
  'ask.title': { th: 'วันนี้คุณอยากถามไพ่อะไร?', en: 'What would you like to ask the cards today?' },
  'ask.subtitle': { th: 'เขียนคำถามของคุณได้อย่างอิสระ ทุกคำถามมีความหมาย เราพร้อมรับฟังโดยไม่ตัดสิน', en: 'Write your question freely — every question matters, and we listen without judgment.' },
  'ask.placeholder': { th: 'พิมพ์คำถามของคุณที่นี่...', en: 'Type your question here...' },
  'ask.filterLabel': { th: 'กรองตัวอย่างคำถามตามหมวดหมู่:', en: 'Filter example questions by category:' },
  'ask.drawBtn': { th: 'จั่วไพ่วันนี้', en: 'Draw a Card' },
  'ask.dailyAutoQuestion': { th: 'ข้อความสำหรับวันนี้ ฉันควรรู้อะไรบ้าง?', en: 'What should I know for today?' },

  /* ---- Draw screen ---- */
  'draw.chooseTitle': { th: 'เลือกไพ่ด้วยสัญชาตญาณของคุณ', en: 'Choose your cards by intuition' },
  'draw.selected': { th: 'เลือกแล้ว {n}/{total} ใบ', en: '{n}/{total} selected' },
  'draw.shuffle': { th: 'สับไพ่ใหม่', en: 'Shuffle Again' },
  'draw.viewReading': { th: 'ดูคำทำนาย', en: 'View Reading' },
  'draw.cardNotFlipped': { th: 'ไพ่ใบที่ {n} ยังไม่เปิด กดเพื่อเลือกไพ่ใบนี้', en: 'Card {n} not revealed — tap to choose this card' },
  'draw.cardSelected': { th: 'ไพ่ที่เลือก: {name}', en: 'Selected card: {name}' },
  'draw.editQuestion': { th: 'แก้ไขคำถาม', en: 'Edit Question' },
  'draw.backPremium': { th: 'เลือกไพ่พรีเมียมอื่น', en: 'Choose Another Premium Spread' },
  'draw.validationAlert': { th: 'กรุณากรอกคำถามของคุณก่อนเริ่มทำนาย', en: 'Please enter your question before starting the reading' },
  'draw.predictError': { th: 'ไม่สามารถรับคำทำนายได้ กรุณาลองใหม่อีกครั้ง', en: 'Could not get a reading — please try again' },
  'draw.insufficientCoins': { th: 'เหรียญไม่พอ กรุณาเติมเหรียญก่อน', en: 'Not enough coins — please top up first' },
  'draw.premiumPredictError': { th: 'ไม่สามารถอ่านไพ่ได้ กรุณาลองใหม่อีกครั้ง', en: 'Could not read the cards — please try again' },
  'draw.errorPrefix': { th: 'ขออภัย เกิดข้อผิดพลาด:', en: 'Sorry, an error occurred:' },
  'draw.connectFailed': { th: 'เชื่อมต่อกับไพ่ไม่สำเร็จ', en: 'Could not connect to the cards' },
  'draw.retryBtn': { th: 'ลองใหม่อีกครั้ง', en: 'Try Again' },

  /* ---- Loading ---- */
  'loading.msg1': { th: 'กำลังสับไพ่แห่งจักรวาล...', en: 'Shuffling the cards of the cosmos...' },
  'loading.msg2': { th: 'กำลังฟังเสียงไพ่...', en: 'Listening to the cards...' },
  'loading.msg3': { th: 'กำลังเชื่อมโยงคำถามของคุณกับไพ่...', en: 'Connecting your question to the cards...' },
  'loading.msg4': { th: 'กำลังถอดความหมาย...', en: 'Decoding the meaning...' },
  'loading.msg5': { th: 'อีกสักครู่นะ...', en: 'Just a moment more...' },

  /* ---- Result screen (chrome only — เนื้อหาคำทำนายจริงมาจาก Gemini ตามภาษาที่ส่งไปแล้ว) ---- */
  'result.yourQuestion': { th: 'YOUR QUESTION', en: 'YOUR QUESTION' },
  'result.saveImage': { th: 'บันทึกเป็นรูปภาพ', en: 'Save as Image' },
  'result.share': { th: 'แชร์ผลลัพธ์', en: 'Share Result' },
  'result.shareIgStory': { th: 'แชร์ลง IG Story', en: 'Share to IG Story' },
  'result.downloadPdf': { th: 'ดาวน์โหลด PDF', en: 'Download PDF' },
  'result.overview': { th: 'ภาพรวมสถานการณ์ (Overview)', en: 'Overview' },
  'result.guidance': { th: 'การร้อยเรียงเรื่องราวของไพ่ (Guidance & Timeline)', en: 'Guidance & Timeline' },
  'result.actionPlan': { th: 'แนวทางปฏิบัติเพื่อปลดล็อกสถานการณ์ (Action Plan)', en: 'Action Plan' },
  'result.positionByPosition': { th: 'ตีความไพ่ทีละตำแหน่ง', en: 'Card-by-Card Interpretation' },
  'result.positionHint': { th: 'หัวข้อด้านล่างจะเปลี่ยนไปตามวิธีการอ่านไพ่ที่คุณเลือก', en: 'The sections below change depending on the spread you chose' },
  'result.askFollowup': { th: 'ถามต่อจากไพ่ชุดนี้', en: 'Ask a Follow-up' },
  'result.followupHint': { th: 'ถามเจาะลึกเพิ่มเติมได้เลย โดยไม่ต้องจับไพ่ใหม่ — เราจะตีความจากไพ่ชุดเดิมที่คุณจับไปแล้ว', en: 'Ask a deeper question without drawing new cards — we’ll interpret using the same cards you already drew.' },
  'result.followupPlaceholder': { th: 'เช่น แล้วถ้าฉันเลือกทางนี้แทนล่ะ?', en: 'e.g. What if I chose this path instead?' },
  'result.followupBtn': { th: 'ถามต่อ', en: 'Ask' },
  'result.newQuestion': { th: 'ถามคำถามใหม่', en: 'Ask a New Question' },
  'result.viewAllJournal': { th: 'ดูบันทึกทั้งหมด', en: 'View All Journal Entries' },
  'result.reversed': { th: 'กลับหัว', en: 'Reversed' },
  'result.monthlyOverview': { th: 'ภาพรวมเดือนนี้', en: "This Month's Overview" },
  'result.question': { th: 'คำถาม', en: 'Question' },
  'result.opportunities': { th: 'โอกาสของเดือนนี้', en: 'Opportunities This Month' },
  'result.warnings': { th: 'สิ่งที่ควรระวัง', en: 'Things to Watch Out For' },
  'result.followupPrompt': { th: 'พิมพ์คำถามที่อยากถามต่อก่อนนะครับ', en: 'Please type your follow-up question first' },
  'result.followupLoading': { th: 'กำลังตีความไพ่ชุดเดิมเพื่อตอบคำถามนี้...', en: 'Interpreting your cards to answer this question...' },
  'result.followupError': { th: 'ไม่สามารถตอบคำถามต่อได้ กรุณาลองใหม่อีกครั้ง', en: 'Could not answer the follow-up — please try again' },
  'result.aceOfTarot': { th: 'Ace of Tarot', en: 'Ace of Tarot' },
  'result.backNewQuestion': { th: 'เริ่มคำถามใหม่', en: 'Start a New Question' },
  'result.focusDefaultTitle': { th: 'มุมมองเจาะลึกด้าน{cat}', en: 'A Closer Look at {cat}' },
  'result.defaultActionItem': { th: 'โฟกัสกับสิ่งที่คุณลงมือทำได้ทันทีในวันนี้', en: 'Focus on what you can act on today' },
  'result.defaultPositionInsight': { th: '{name} ในตำแหน่งนี้ชี้ให้เห็นพลังงานสำคัญที่ควรพิจารณาประกอบกับตำแหน่งอื่นๆ ในชุดไพ่นี้', en: '{name} in this position points to an important energy worth considering alongside the other cards in this spread' },
  'result.defaultClosingQuote': { th: '"บางคำถามอาจต้องการมุมมองที่ลึกซึ้งเพื่อให้คุณเติบโตอย่างมั่นคง"', en: '"Some questions call for a deeper perspective so you can grow on steady footing"' },
  'result.defaultMonthlyTitle': { th: 'ภาพรวมไพ่ประจำเดือน', en: "This Month's Card Overview" },
  'result.defaultMonthlyClosing': { th: 'เดือนนี้คือโอกาสในการทบทวนและเติบโตไปอีกขั้น', en: 'This month is a chance to reflect and grow even further' },
  'result.adviceLabel': { th: 'คำแนะนำ:', en: 'Advice:' },
  'result.area.overall': { th: 'ภาพรวมชีวิต', en: 'Life Overview' },
  'result.area.career': { th: 'การงาน / การเรียน', en: 'Career / Studies' },
  'result.area.finance': { th: 'การเงิน', en: 'Finance' },
  'result.area.love': { th: 'ความรัก / ความสัมพันธ์', en: 'Love / Relationships' },
  'result.area.health': { th: 'สุขภาพและการดูแลตัวเอง', en: 'Health & Self-Care' },
  'result.imageGenError': { th: 'ขออภัย ไม่สามารถสร้างรูปภาพได้ในขณะนี้ กรุณาลองใหม่อีกครั้ง', en: 'Sorry, could not generate the image right now — please try again' },
  'result.pdfGenError': { th: 'ขออภัย ไม่สามารถสร้าง PDF ได้ในขณะนี้ กรุณาลองใหม่อีกครั้ง', en: 'Sorry, could not generate the PDF right now — please try again' },
  'result.igStorySavedAlert': { th: 'บันทึกภาพสำหรับ IG Story แล้ว เปิดแอป Instagram แล้วเลือกภาพนี้เพื่อโพสต์ลง Story ได้เลย', en: 'Image saved for IG Story — open Instagram and pick this image to post it to your Story' },
  'result.shareCtaHost': { th: 'ลองทำนายไพ่ทาโรต์ของคุณได้ที่', en: 'Try your own tarot reading at' },
  'result.clipboardCopied': { th: 'คัดลอกข้อความผลทำนายไปยังคลิปบอร์ดแล้ว นำไปวางแชร์ต่อได้เลย', en: 'Reading text copied to clipboard — paste it anywhere to share' },
  'result.shareError': { th: 'ขออภัย ไม่สามารถแชร์ผลลัพธ์ได้ในขณะนี้ กรุณาลองใหม่อีกครั้ง', en: 'Sorry, could not share the result right now — please try again' },
  'result.extraCards': { th: '+{n}<br>ใบ', en: '+{n}<br>more' },
  'result.shareTextHeadlineMonthly': { th: 'ภาพรวมเดือนนี้: {title}', en: "This month's overview: {title}" },
  'result.shareTextQuestionPrefix': { th: 'คำถาม: "{q}"', en: 'Question: "{q}"' },
  'result.shareTextCards': { th: 'ไพ่ที่จับได้: {cards}', en: 'Cards drawn: {cards}' },
  'result.shareTextCta': { th: 'ลองทำนายไพ่ทาโรต์ด้วยตัวเองได้ที่ {url}', en: 'Try your own tarot reading at {url}' },

  /* ---- Journal ---- */
  'journal.title': { th: 'My Tarot Journal', en: 'My Tarot Journal' },
  'journal.searchPlaceholder': { th: 'ค้นหาคำถาม...', en: 'Search questions...' },
  'journal.allCategories': { th: 'ทุกหมวดหมู่', en: 'All Categories' },
  'journal.allSpreads': { th: 'ทุกรูปแบบ', en: 'All Spreads' },
  'journal.empty': { th: 'ยังไม่มีบันทึกการทำนาย', en: 'No readings yet' },
  'journal.deleteConfirmTitle': { th: 'ลบบันทึกนี้?', en: 'Delete this entry?' },
  'journal.deleteConfirmBody': { th: 'การลบไม่สามารถย้อนกลับได้', en: 'This cannot be undone.' },
  'journal.cancel': { th: 'ยกเลิก', en: 'Cancel' },
  'journal.delete': { th: 'ลบบันทึก', en: 'Delete Entry' },
  'journal.loading': { th: 'กำลังโหลดบันทึก...', en: 'Loading readings...' },
  'journal.emptyStartBtn': { th: 'เริ่มการอ่านไพ่ครั้งแรก', en: 'Start Your First Reading' },
  'journal.noMatch': { th: 'ไม่พบรายการที่ตรงกับตัวกรอง', en: 'No entries match your filters' },
  'journal.countLabel': { th: '{filtered} / {total} การอ่านที่บันทึกไว้', en: '{filtered} / {total} saved readings' },
  'journal.deleteBtnTitle': { th: 'ลบบันทึกนี้', en: 'Delete this entry' },

  /* ---- Shared modals (index.html shell) ---- */
  'topup.successTitle': { th: 'เติมเหรียญสำเร็จ!', en: 'Top-up Successful!' },
  'topup.successBodyBefore': { th: 'คุณได้รับ', en: "You've received" },
  'topup.successBodyAfter': { th: 'เหรียญเข้าบัญชีเรียบร้อยแล้ว', en: 'coins into your account' },
  'topup.backHome': { th: 'กลับหน้าหลัก', en: 'Back to Home' },
  'topup.backToPremium': { th: 'กลับไปเลือกไพ่พรีเมียม', en: 'Back to Premium Readings' },
  'topup.pageTitle': { th: 'เติมเหรียญ', en: 'Top Up Coins' },
  'topup.pageSubtitle': { th: 'ชำระผ่าน PromptPay สแกนจ่ายแล้วรับเหรียญให้อัตโนมัติ', en: 'Pay via PromptPay — scan to pay and coins are added automatically' },
  'topup.historyTitle': { th: 'ประวัติการใช้เหรียญ', en: 'Coin History' },
  'topup.filterAll': { th: 'ทั้งหมด', en: 'All' },
  'topup.topupLabel': { th: 'เติมเหรียญ', en: 'Top Up' },
  'topup.spendLabel': { th: 'ใช้เหรียญ', en: 'Spent' },
  'topup.historyLoading': { th: 'กำลังโหลดประวัติ...', en: 'Loading history...' },
  'topup.historyLoginRequired': { th: 'กรุณา {link} เพื่อดูประวัติการใช้เหรียญ', en: 'Please {link} to view your coin history' },
  'topup.historyEmptyTopup': { th: 'ยังไม่มีประวัติการเติมเหรียญ', en: 'No top-up history yet' },
  'topup.historyEmpty': { th: 'ยังไม่มีประวัติการใช้เหรียญ', en: 'No coin history yet' },
  'topup.usedCard': { th: 'ใช้ไพ่ {name}', en: 'Used {name}' },
  'topup.creatingCharge': { th: 'กำลังสร้างรายการชำระเงิน...', en: 'Creating your payment...' },
  'topup.chargeCreateError': { th: 'ไม่สามารถสร้างรายการชำระเงินได้', en: 'Could not create the payment' },
  'topup.amountLabel': { th: 'ยอดชำระ {amount}', en: 'Amount due {amount}' },
  'topup.qrInstructions': { th: 'สแกนจ่ายผ่านแอปธนาคาร รอสักครู่ ระบบจะเติมเหรียญให้อัตโนมัติ', en: 'Scan to pay with your banking app — coins will be added automatically' },
  'topup.timeLeftPrefix': { th: 'เหลือเวลาชำระ', en: 'Time left to pay' },
  'topup.waitingPayment': { th: 'กำลังรอการชำระเงิน...', en: 'Waiting for payment...' },
  'topup.genericError': { th: 'เกิดข้อผิดพลาด', en: 'Something went wrong' },
  'topup.successBanner': { th: '✓ เติมเหรียญสำเร็จ!', en: '✓ Top-up successful!' },
  'topup.paymentFailedTitle': { th: 'ชำระเงินไม่สำเร็จ', en: 'Payment Failed' },
  'topup.paymentTimeoutTitle': { th: 'หมดเวลาชำระเงิน', en: 'Payment Timed Out' },
  'topup.paymentTimeoutSub': { th: 'ชำระเงินไม่สำเร็จ — QR นี้หมดอายุแล้ว กรุณาลองสร้างรายการใหม่อีกครั้ง', en: 'Payment failed — this QR code has expired, please start a new payment' },
  'topup.retryBtn': { th: 'ลองอีกครั้ง', en: 'Try Again' },
};
