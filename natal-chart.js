// คำนวณดวงเกิด (Western Natal Chart) จากวัน/เวลา/สถานที่เกิดจริง — ไม่ใช่การประมาณจากช่วงวันแบบปฏิทินทั่วไป
// ใช้ astronomy-engine (คำนวณตำแหน่งดาวจริงทางดาราศาสตร์ VSOP87/ELP2000, ไม่พึ่ง API ภายนอก/ไม่มีไฟล์ข้อมูลแยก)
//
// วิธีคำนวณ Ascendant (ราศีลัคนา) ตรวจสอบความถูกต้องแล้วโดยเทียบกับพระอาทิตย์ขึ้นจริง (SearchRiseSet):
// ที่ช่วงเวลาพระอาทิตย์ขึ้นจริง ตำแหน่งสุริยะบนสุริยวิถีต้องเท่ากับ Ascendant ที่คำนวณได้ (คลาดเคลื่อนไม่เกิน
// ~1 องศา ซึ่งเป็นผลจาก atmospheric refraction + รัศมีของดวงอาทิตย์เอง ไม่ใช่ error ของสูตร) — ผลตรงตามคาด
const Astronomy = require('astronomy-engine');

const ZODIAC_SIGNS = ['Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo', 'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'];

const PLANET_BODIES = {
  sun: Astronomy.Body.Sun,
  moon: Astronomy.Body.Moon,
  mercury: Astronomy.Body.Mercury,
  venus: Astronomy.Body.Venus,
  mars: Astronomy.Body.Mars,
  jupiter: Astronomy.Body.Jupiter,
  saturn: Astronomy.Body.Saturn,
  uranus: Astronomy.Body.Uranus,
  neptune: Astronomy.Body.Neptune,
  pluto: Astronomy.Body.Pluto
};

function signForLongitude(eclipticLongitude) {
  const norm = ((eclipticLongitude % 360) + 360) % 360;
  const index = Math.floor(norm / 30);
  return { sign: ZODIAC_SIGNS[index], degreeInSign: norm - index * 30 };
}

// ตำแหน่งบนสุริยวิถี (geocentric ecliptic longitude) ของดาวเคราะห์/ดวงจันทร์/ดวงอาทิตย์ ณ เวลาที่กำหนด
// ใช้ GeoVector+Ecliptic แทน EclipticLongitude() ตรงๆ เพราะ EclipticLongitude คำนวณ heliocentric (ใช้กับ
// ดวงอาทิตย์ไม่ได้ — ตำแหน่งดวงอาทิตย์เทียบกับตัวเองไม่มีความหมาย) วิธีนี้ใช้ได้ทั้งหมดรวมถึงดวงจันทร์ด้วย
function geoEclipticLongitude(body, time) {
  const vector = Astronomy.GeoVector(body, time, true); // true = ชดเชยเวลาที่แสงเดินทางมาถึงโลก (aberration)
  return Astronomy.Ecliptic(vector).elon;
}

// มุมเงย (altitude) ของจุดบนสุริยวิถี (ละติจูดสุริยวิถี=0) ที่ลองจิจูดสุริยวิถีที่กำหนด มองจาก observer ณ เวลานั้น
function eclipticPointHorizon(eclipticLon, time, observer) {
  const eclVec = Astronomy.VectorFromSphere({ lat: 0, lon: eclipticLon, dist: 1 }, time);
  const rotation = Astronomy.Rotation_ECL_HOR(time, observer);
  const horVec = Astronomy.RotateVector(rotation, eclVec);
  return Astronomy.HorizonFromVector(horVec, 'normal'); // { lat: มุมเงย, lon: มุมทิศ (azimuth) }
}

// หา Ascendant: จุดบนสุริยวิถีที่มุมเงย=0 (เส้นขอบฟ้า) ทางฝั่งตะวันออก (azimuth 0-180) ณ เวลา/สถานที่เกิด
// สแกนสุริยวิถีทีละ 0.125 องศาหา zero-crossing ของมุมเงย แล้ว interpolate ให้ละเอียดขึ้น — คืนค่า null
// เฉพาะกรณีขั้วโลกที่สุริยวิถีอาจไม่ตัดกับขอบฟ้าเลย (ไม่เกิดกับพิกัดที่ให้เลือกในแอปนี้)
function findAscendantLongitude(time, observer) {
  // สแกนหา "จุดตัดเส้นขอบฟ้า" ทั้งสองจุดของสุริยวิถี (มุมเงยเปลี่ยนเครื่องหมาย) โดยไม่สนทิศทางการสแกน —
  // ทิศทางที่ลองจิจูดสุริยวิถีเพิ่มขึ้นจากค่าน้อยไปมาก ไม่ได้บอกว่าจุดนั้น "กำลังขึ้น" จริงทางกายภาพ
  // (นั่นเป็นคนละเรื่องกับการสแกนหาค่าที่จุดคงที่ ณ เวลาเดียว) ตัวตัดสินที่ถูกต้องคือ "มุมทิศ" เท่านั้น:
  // ลัคนาคือจุดที่มุมเงย=0 ทางฝั่งตะวันออก (azimuth 0-180) เสมอ ไม่ว่าจะเจอจากการสแกนทิศทางไหน
  const STEPS = 2880;
  const altitudeAt = (lon) => eclipticPointHorizon(lon, time, observer);

  let prevLon = 0;
  let prevAlt = altitudeAt(0).lat;
  for (let i = 1; i <= STEPS; i++) {
    const lon = (i / STEPS) * 360;
    const hor = altitudeAt(lon);
    const crossedZero = (prevAlt < 0 && hor.lat >= 0) || (prevAlt >= 0 && hor.lat < 0);
    if (crossedZero) {
      const t = -prevAlt / (hor.lat - prevAlt);
      const crossLon = prevLon + t * (lon - prevLon);
      const crossHor = altitudeAt(crossLon);
      if (crossHor.lon > 0 && crossHor.lon < 180) return crossLon; // ฝั่งตะวันออก = ลัคนา
    }
    prevLon = lon;
    prevAlt = hor.lat;
  }
  return null;
}

// เรือน (Houses) — ใช้ระบบ Whole Sign House (1 ราศี = 1 เรือนเสมอ) ไม่ใช้ Placidus/ระบบที่คำนวณมุมเรือน
// เอง เพราะ Whole Sign อ้างอิงแค่ "ราศีของลัคนา" ที่ตรวจสอบความถูกต้องแล้วเท่านั้น ไม่ต้องคำนวณสูตรใหม่ที่
// ยังไม่ผ่านการตรวจสอบ (ยังเป็นระบบเรือนที่ใช้จริงในโหราศาสตร์สายเฮลเลนิสติก/ดั้งเดิม ไม่ใช่การประมาณลวกๆ)
// เรือนที่ 1 = ราศีของลัคนา, เรือนที่ 2 = ราศีถัดไป, ... ไล่ตามลำดับราศีเสมอ
function houseForSign(sign, ascendantSign) {
  const signIndex = ZODIAC_SIGNS.indexOf(sign);
  const ascIndex = ZODIAC_SIGNS.indexOf(ascendantSign);
  return ((signIndex - ascIndex + 12) % 12) + 1;
}

// มุมสัมพันธ์ (Aspects) ระหว่างดาวเคราะห์ทุกคู่ — ใช้มุมมาตรฐานของโหราศาสตร์ตะวันตกทั้ง 5 แบบ พร้อม orb
// (ระยะเผื่อ) ตามธรรมเนียมทั่วไป แต่ละคู่ดาวจะได้ aspect ที่ orb แคบที่สุดเพียงแบบเดียว (กันแสดงซ้อนกันหลาย
// แบบสำหรับคู่เดียว) เรียงผลลัพธ์จาก orb แคบที่สุด (แม่นยำที่สุด) ไปหามากที่สุด
const ASPECT_DEFINITIONS = [
  { name: 'conjunction', angle: 0, orb: 8 },
  { name: 'opposition', angle: 180, orb: 8 },
  { name: 'trine', angle: 120, orb: 7 },
  { name: 'square', angle: 90, orb: 7 },
  { name: 'sextile', angle: 60, orb: 6 }
];
function angularDistance(a, b) {
  const d = Math.abs(a - b) % 360;
  return Math.min(d, 360 - d);
}
function computeAspects(longitudes) {
  const keys = Object.keys(longitudes);
  const aspects = [];
  for (let i = 0; i < keys.length; i++) {
    for (let j = i + 1; j < keys.length; j++) {
      const [a, b] = [keys[i], keys[j]];
      const separation = angularDistance(longitudes[a], longitudes[b]);
      let best = null;
      for (const def of ASPECT_DEFINITIONS) {
        const orb = Math.abs(separation - def.angle);
        if (orb <= def.orb && (!best || orb < best.orb)) best = { name: def.name, orb };
      }
      if (best) aspects.push({ a, b, aspect: best.name, angle: Math.round(separation * 10) / 10, orb: Math.round(best.orb * 10) / 10 });
    }
  }
  return aspects.sort((x, y) => x.orb - y.orb);
}

// birthUtcDate: Date (UTC) ของวัน-เวลาเกิดจริง (แปลงจาก local time + utcOffset ไว้ก่อนเรียกฟังก์ชันนี้แล้ว)
// hasExactTime: false = ไม่ทราบเวลาเกิด -> ข้าม Ascendant/เรือน (ต้องรู้เวลาแม่นยำเท่านั้นถึงจะคำนวณได้ความหมาย)
// คืนค่า { placements, aspects } — placements แต่ละดวงมี sign/degreeInSign และ house (ถ้ามีลัคนา)
function computeNatalChart({ birthUtcDate, lat, lon, hasExactTime }) {
  const time = new Astronomy.AstroTime(birthUtcDate);
  const placements = {};
  const longitudes = {};
  Object.keys(PLANET_BODIES).forEach((key) => {
    const lon = geoEclipticLongitude(PLANET_BODIES[key], time);
    longitudes[key] = lon;
    placements[key] = signForLongitude(lon);
  });

  if (hasExactTime) {
    const observer = new Astronomy.Observer(lat, lon, 0);
    const ascLon = findAscendantLongitude(time, observer);
    placements.ascendant = ascLon != null ? signForLongitude(ascLon) : null;
  } else {
    placements.ascendant = null;
  }

  if (placements.ascendant) {
    const ascendantSign = placements.ascendant.sign;
    Object.keys(placements).forEach((key) => {
      if (placements[key]) placements[key].house = houseForSign(placements[key].sign, ascendantSign);
    });
  }

  return { placements, aspects: computeAspects(longitudes) };
}

module.exports = { computeNatalChart, signForLongitude, ZODIAC_SIGNS };
