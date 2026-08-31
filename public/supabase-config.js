/* ---------------------------------------------------------------------
 * ตั้งค่าการเชื่อมต่อ Supabase (Postgres + Auth)
 *
 * วิธีหาค่าทั้งสองตัวนี้:
 * 1) เข้า https://supabase.com -> สร้างโปรเจกต์ใหม่ (ฟรี)
 * 2) ไปที่ Project Settings -> API
 * 3) คัดลอกค่า "Project URL" มาใส่ SUPABASE_URL
 * 4) คัดลอกค่า "anon public" key มาใส่ SUPABASE_ANON_KEY
 *    (ใช้ตัว "anon public" เท่านั้น ห้ามใช้ "service_role" ฝั่ง client เด็ดขาด
 *     เพราะ service_role ข้าม RLS ได้หมด ถ้าหลุดไปอยู่ใน frontend code
 *     คนอื่นจะเข้าถึงข้อมูลทุกคนในระบบได้)
 * --------------------------------------------------------------------- */
const SUPABASE_URL = 'https://pdykweaorxhfwkwkfxgv.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBkeWt3ZWFvcnhoZndrd2tmeGd2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgxMTI3ODIsImV4cCI6MjEwMzY4ODc4Mn0.2HjC-ZXAFoa2dqFuIojg6xEo6F74G0o6-K8s60ueXiU';

let supabaseClient = null;
if(SUPABASE_URL == 'https://pdykweaorxhfwkwkfxgv.supabase.co' && SUPABASE_ANON_KEY == 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBkeWt3ZWFvcnhoZndrd2tmeGd2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgxMTI3ODIsImV4cCI6MjEwMzY4ODc4Mn0.2HjC-ZXAFoa2dqFuIojg6xEo6F74G0o6-K8s60ueXiU'){
  supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
} else {
  console.warn('[Ace of Tarot] ยังไม่ได้ตั้งค่า Supabase ใน supabase-config.js — แอปจะทำงานแบบ guest mode (บันทึกลง localStorage เครื่องนี้เท่านั้น ไม่ sync ข้ามอุปกรณ์)');
}
