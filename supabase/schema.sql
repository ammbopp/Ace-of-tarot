-- =====================================================================
-- Ace of Tarot — Supabase schema
--
-- วิธีใช้: เปิด Supabase Dashboard -> โปรเจกต์ของคุณ -> SQL Editor -> New query
-- แล้ววางไฟล์นี้ทั้งหมดรันครั้งเดียว (ปลอดภัยที่จะรันซ้ำได้ ใช้ IF NOT EXISTS/OR REPLACE ทุกจุด)
-- =====================================================================

create extension if not exists pgcrypto; -- ใช้ gen_random_uuid()

-- ============ 1) readings: ประวัติการอ่านไพ่ทั้งหมด (ปกติ + พรีเมียม) ============
create table if not exists public.readings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  question text,
  spread_key text,
  spread_backend text,
  category text,
  cards jsonb not null default '[]',
  summary jsonb,
  followups jsonb not null default '[]',
  is_daily boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists readings_user_id_created_at_idx on public.readings (user_id, created_at desc);

alter table public.readings enable row level security;

drop policy if exists "readings_select_own" on public.readings;
create policy "readings_select_own" on public.readings for select using (auth.uid() = user_id);

drop policy if exists "readings_insert_own" on public.readings;
create policy "readings_insert_own" on public.readings for insert with check (auth.uid() = user_id);

drop policy if exists "readings_update_own" on public.readings;
create policy "readings_update_own" on public.readings for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "readings_delete_own" on public.readings;
create policy "readings_delete_own" on public.readings for delete using (auth.uid() = user_id);

-- ============ 2) daily_state: ไพ่ประจำวัน + streak (sync ข้ามอุปกรณ์) ============
create table if not exists public.daily_state (
  user_id uuid primary key references auth.users(id) on delete cascade,
  last_date date,
  streak integer not null default 0,
  entry_id uuid references public.readings(id) on delete set null,
  updated_at timestamptz not null default now()
);

alter table public.daily_state enable row level security;

drop policy if exists "daily_state_select_own" on public.daily_state;
create policy "daily_state_select_own" on public.daily_state for select using (auth.uid() = user_id);

drop policy if exists "daily_state_insert_own" on public.daily_state;
create policy "daily_state_insert_own" on public.daily_state for insert with check (auth.uid() = user_id);

drop policy if exists "daily_state_update_own" on public.daily_state;
create policy "daily_state_update_own" on public.daily_state for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ============ 3) wallets: ยอดเหรียญคงเหลือของแต่ละคน ============
create table if not exists public.wallets (
  user_id uuid primary key references auth.users(id) on delete cascade,
  coins integer not null default 0 check (coins >= 0),
  updated_at timestamptz not null default now()
);

alter table public.wallets enable row level security;

-- อ่านยอดของตัวเองได้อย่างเดียว ห้าม insert/update/delete ตรงๆ จาก client เด็ดขาด
-- (การเพิ่ม/หักเหรียญทำผ่าน RPC add_coins / spend_coins ด้านล่างเท่านั้น ซึ่งรันแบบ SECURITY DEFINER
--  ทำให้แก้ตารางนี้ได้ทั้งที่ client เองไม่มีสิทธิ์เขียนตรงๆ)
drop policy if exists "wallets_select_own" on public.wallets;
create policy "wallets_select_own" on public.wallets for select using (auth.uid() = user_id);

-- ============ 4) coin_transactions: ledger การเพิ่ม/หักเหรียญทุกครั้ง (audit + กันเครดิตซ้ำ) ============
create table if not exists public.coin_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  amount integer not null, -- บวก = เติมเข้า (topup), ลบ = หักออก (spend)
  type text not null check (type in ('topup', 'spend')),
  reference text not null unique, -- topup: Omise charge id (กัน webhook ยิงซ้ำเครดิตซ้ำ) / spend: premium:<key>:<timestamp>
  created_at timestamptz not null default now()
);
create index if not exists coin_transactions_user_id_idx on public.coin_transactions (user_id, created_at desc);

alter table public.coin_transactions enable row level security;

drop policy if exists "coin_transactions_select_own" on public.coin_transactions;
create policy "coin_transactions_select_own" on public.coin_transactions for select using (auth.uid() = user_id);

-- ============ 5) pending_payments: รายการเติมเหรียญที่รอ/ยืนยันแล้วจาก Omise ============
-- status 'failed' ครอบคลุมทั้ง charge ที่ Omise ตอบ status='failed' จริงๆ และ 'expired' (QR หมดอายุไม่มีคนจ่าย)
-- failure_message เก็บเหตุผลแบบอ่านง่ายไว้โชว์ผู้ใช้ (มาจาก charge.failure_message ของ Omise ถ้ามี)
create table if not exists public.pending_payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  charge_id text not null unique,
  package_coins integer not null,
  package_amount_satang integer not null,
  status text not null default 'pending' check (status in ('pending', 'successful', 'failed')),
  failure_message text,
  created_at timestamptz not null default now()
);

-- ไม่มี policy ให้ client เข้าถึงเลย — เข้าถึงได้เฉพาะฝั่ง server ผ่าน service_role key เท่านั้น
alter table public.pending_payments enable row level security;

-- ---- Migration (รันบล็อกนี้ถ้า pending_payments มีอยู่แล้วในฐานข้อมูลจริง ก่อนเพิ่ม status 'failed') ----
-- alter table public.pending_payments add column if not exists failure_message text;
-- alter table public.pending_payments drop constraint if exists pending_payments_status_check;
-- alter table public.pending_payments add constraint pending_payments_status_check check (status in ('pending', 'successful', 'failed'));

-- ============ 6) RPC: spend_coins — หักเหรียญแบบ atomic เรียกจาก client ที่ล็อกอินอยู่ (ผ่าน user JWT) ============
create or replace function public.spend_coins(p_amount integer, p_reference text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_rows integer;
begin
  if p_amount is null or p_amount <= 0 then
    raise exception 'invalid amount';
  end if;

  update public.wallets
     set coins = coins - p_amount, updated_at = now()
   where user_id = auth.uid()
     and coins >= p_amount;

  get diagnostics v_rows = row_count;
  if v_rows = 0 then
    return false; -- เหรียญไม่พอ หรือยังไม่มี wallet
  end if;

  insert into public.coin_transactions (user_id, amount, type, reference)
  values (auth.uid(), -p_amount, 'spend', p_reference);

  return true;
end;
$$;

revoke all on function public.spend_coins(integer, text) from public;
grant execute on function public.spend_coins(integer, text) to authenticated;

-- ============ 7) RPC: add_coins — เติมเหรียญ เรียกได้เฉพาะฝั่ง server (service_role) เท่านั้น ============
create or replace function public.add_coins(p_user_id uuid, p_amount integer, p_reference text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_amount is null or p_amount <= 0 then
    raise exception 'invalid amount';
  end if;

  -- insert เข้า ledger ก่อนเสมอ: ถ้า reference (charge_id) นี้เคยเครดิตไปแล้ว
  -- unique constraint จะ raise error code 23505 ทันที ทำให้ทั้งฟังก์ชัน rollback (idempotent)
  -- server.js เช็ค error.code === '23505' เพื่อรู้ว่า "เครดิตซ้ำจาก webhook retry ไม่ต้องทำอะไรเพิ่ม"
  insert into public.coin_transactions (user_id, amount, type, reference)
  values (p_user_id, p_amount, 'topup', p_reference);

  insert into public.wallets (user_id, coins)
  values (p_user_id, p_amount)
  on conflict (user_id) do update
    set coins = public.wallets.coins + excluded.coins, updated_at = now();
end;
$$;

revoke all on function public.add_coins(uuid, integer, text) from public;
-- ห้าม grant ให้ authenticated เด็ดขาด (ไม่งั้นใครก็เรียกเติมเหรียญให้ตัวเองฟรีได้)
-- service_role bypass ทุก grant/RLS อยู่แล้วโดยอัตโนมัติ ไม่ต้อง grant เพิ่ม

-- ============ 8) Trigger: สร้าง wallet (0 เหรียญ) ให้ผู้ใช้ใหม่ทุกคนอัตโนมัติตอนสมัครสมาชิก ============
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.wallets (user_id, coins) values (new.id, 0)
  on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============ 9) Backfill (one-time): เผื่อมี user ที่สมัครไว้ก่อนรัน schema นี้ ยังไม่มี wallet ============
insert into public.wallets (user_id, coins)
select id, 0 from auth.users
on conflict (user_id) do nothing;

-- ============ 10) RPC: admin_dashboard_stats — สรุปข้อมูลสำหรับหน้า admin dashboard ============
-- คำนวณผลรวม/นับจำนวนด้วย SQL aggregate ตรงๆ (ไม่ใช่ดึงทุกแถวมานับที่ฝั่ง server) เพื่อให้ได้ตัวเลข
-- ที่ถูกต้องแม่นยำเสมอไม่ว่าตารางจะโตแค่ไหน (PostgREST/.select() ปกติ cap อยู่ที่ 1000 แถวต่อ request
-- ถ้าดึงมานับเองฝั่ง JS ตัวเลขจะผิดทันทีที่มีข้อมูลเกิน 1000 แถว)
create or replace function public.admin_dashboard_stats(p_active_days integer default 7, p_recent_limit integer default 10)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  result jsonb;
begin
  select jsonb_build_object(
    'totalUsers', (select count(*) from auth.users),
    'activeUsers', (
      select count(distinct user_id) from public.readings
      where created_at >= now() - (p_active_days || ' days')::interval
    ),
    'totalReadings', (select count(*) from public.readings),
    'totalRevenueSatang', (
      select coalesce(sum(package_amount_satang), 0) from public.pending_payments where status = 'successful'
    ),
    'totalTopups', (
      select count(*) from public.pending_payments where status = 'successful'
    ),
    'readingsByCategory', (
      select coalesce(jsonb_object_agg(category, cnt), '{}'::jsonb)
      from (
        select coalesce(category, 'ทั่วไป') as category, count(*) as cnt
        from public.readings
        group by coalesce(category, 'ทั่วไป')
      ) t
    ),
    'readingsBySpreadKey', (
      select coalesce(jsonb_object_agg(spread_key, cnt), '{}'::jsonb)
      from (
        select coalesce(spread_key, 'unknown') as spread_key, count(*) as cnt
        from public.readings
        group by coalesce(spread_key, 'unknown')
      ) t
    ),
    'recentTopups', (
      select coalesce(jsonb_agg(row_to_json(rt)), '[]'::jsonb)
      from (
        select charge_id, package_coins, package_amount_satang, created_at
        from public.pending_payments
        where status = 'successful'
        order by created_at desc
        limit p_recent_limit
      ) rt
    )
  ) into result;
  return result;
end;
$$;

revoke all on function public.admin_dashboard_stats(integer, integer) from public;
-- ไม่ grant ให้ authenticated เด็ดขาด (ข้อมูลนี้เห็นภาพรวมของผู้ใช้ทุกคน ไม่ใช่ของตัวเองคนเดียว)
-- เรียกได้เฉพาะฝั่ง server ผ่าน service_role เท่านั้น — server.js เช็ค ADMIN_EMAILS ก่อนเรียกทุกครั้ง
