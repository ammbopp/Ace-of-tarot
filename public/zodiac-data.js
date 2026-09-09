/* ---------------------------------------------------------------------
 * ข้อมูล 12 ราศี (ชื่อไทย/สัญลักษณ์/ธาตุ) — แหล่งความจริงเดียวร่วมกับ server.js สำหรับฟีเจอร์ "ดวงเกิด"
 * key ตรงกับชื่อภาษาอังกฤษที่ natal-chart.js คำนวณได้ (Aries, Taurus, ...) ให้ map หา label ไทย/สัญลักษณ์ได้ตรงกัน
 * โหลดได้สองทาง เหมือน spread-catalog.js: server.js require(...) / browser <script src="/zodiac-data.js">
 * --------------------------------------------------------------------- */
(function () {
  var ZODIAC_INFO = {
    Aries: { label: 'ราศีเมษ', symbol: '♈', element: 'ไฟ', dateRange: '21 มี.ค. - 19 เม.ย.' },
    Taurus: { label: 'ราศีพฤษภ', symbol: '♉', element: 'ดิน', dateRange: '20 เม.ย. - 20 พ.ค.' },
    Gemini: { label: 'ราศีเมถุน', symbol: '♊', element: 'ลม', dateRange: '21 พ.ค. - 20 มิ.ย.' },
    Cancer: { label: 'ราศีกรกฎ', symbol: '♋', element: 'น้ำ', dateRange: '21 มิ.ย. - 22 ก.ค.' },
    Leo: { label: 'ราศีสิงห์', symbol: '♌', element: 'ไฟ', dateRange: '23 ก.ค. - 22 ส.ค.' },
    Virgo: { label: 'ราศีกันย์', symbol: '♍', element: 'ดิน', dateRange: '23 ส.ค. - 22 ก.ย.' },
    Libra: { label: 'ราศีตุลย์', symbol: '♎', element: 'ลม', dateRange: '23 ก.ย. - 22 ต.ค.' },
    Scorpio: { label: 'ราศีพิจิก', symbol: '♏', element: 'น้ำ', dateRange: '23 ต.ค. - 21 พ.ย.' },
    Sagittarius: { label: 'ราศีธนู', symbol: '♐', element: 'ไฟ', dateRange: '22 พ.ย. - 21 ธ.ค.' },
    Capricorn: { label: 'ราศีมังกร', symbol: '♑', element: 'ดิน', dateRange: '22 ธ.ค. - 19 ม.ค.' },
    Aquarius: { label: 'ราศีกุมภ์', symbol: '♒', element: 'ลม', dateRange: '20 ม.ค. - 18 ก.พ.' },
    Pisces: { label: 'ราศีมีน', symbol: '♓', element: 'น้ำ', dateRange: '19 ก.พ. - 20 มี.ค.' }
  };

  // ดาว/จุดที่แสดงในดวงเกิด — ลำดับการแสดงผล + ชื่อไทย + ความหมายเชิงสัญลักษณ์สั้นๆ (ใช้ทั้งฝั่งแสดงผลและ prompt ของ Gemini)
  var PLANET_INFO = {
    sun: { label: 'ดวงอาทิตย์', symbol: '☉', meaning: 'ตัวตนแท้จริง อัตลักษณ์หลัก และแก่นของบุคลิกภาพ' },
    moon: { label: 'ดวงจันทร์', symbol: '☽', meaning: 'อารมณ์ ความรู้สึกภายใน และสิ่งที่ทำให้รู้สึกมั่นคง' },
    ascendant: { label: 'ลัคนา (Ascendant)', symbol: '↑', meaning: 'ภาพลักษณ์ภายนอกและวิธีที่คนอื่นมองเห็นคุณในแรกพบ' },
    mercury: { label: 'ดาวพุธ', symbol: '☿', meaning: 'วิธีคิด การสื่อสาร และการเรียนรู้' },
    venus: { label: 'ดาวศุกร์', symbol: '♀', meaning: 'ความรัก ความสัมพันธ์ และรสนิยมความสวยงาม' },
    mars: { label: 'ดาวอังคาร', symbol: '♂', meaning: 'พลังขับเคลื่อน ความกล้า และวิธีจัดการความขัดแย้ง' },
    jupiter: { label: 'ดาวพฤหัสบดี', symbol: '♃', meaning: 'การเติบโต โอกาส และมุมมองต่อโลก' },
    saturn: { label: 'ดาวเสาร์', symbol: '♄', meaning: 'ระเบียบวินัย ความรับผิดชอบ และบทเรียนชีวิต' },
    uranus: { label: 'ดาวยูเรนัส', symbol: '♅', meaning: 'ความเป็นตัวของตัวเองและการเปลี่ยนแปลงแบบก้าวกระโดด' },
    neptune: { label: 'ดาวเนปจูน', symbol: '♆', meaning: 'จินตนาการ สัญชาตญาณ และโลกฝัน' },
    pluto: { label: 'ดาวพลูโต', symbol: '♇', meaning: 'การเปลี่ยนแปลงเชิงลึกและพลังแห่งการเกิดใหม่' }
  };
  var PLANET_ORDER = ['sun', 'moon', 'ascendant', 'mercury', 'venus', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune', 'pluto'];

  var data = { ZODIAC_INFO: ZODIAC_INFO, PLANET_INFO: PLANET_INFO, PLANET_ORDER: PLANET_ORDER };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = data;
  } else {
    window.ZODIAC_DATA = data;
  }
})();
