-- ============================================================
-- PAKBATTLE ESPORTS — SUPABASE SCHEMA
-- Yeh poora SQL Supabase Dashboard → SQL Editor → New Query mein
-- paste karke "Run" karein. Ek hi baar chalana hai.
-- ============================================================

-- ------------------------------------------------------------
-- 1. EXTENSIONS
-- ------------------------------------------------------------
create extension if not exists "pgcrypto";

-- ------------------------------------------------------------
-- 2. TABLES
-- ------------------------------------------------------------

-- Profiles: har user ka ek row (auth.users se linked)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  pubg_uid text,
  pubg_username text,
  mobile text,
  email text,
  total_wins integer not null default 0,
  total_kills integer not null default 0,
  total_earnings numeric not null default 0,
  last_seen timestamptz default now(),
  created_at timestamptz not null default now()
);

-- Roles: kaun admin hai
create table if not exists public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('admin', 'player')),
  created_at timestamptz not null default now(),
  unique (user_id, role)
);

-- Tournaments
create table if not exists public.tournaments (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  match_type text not null default 'erangel_squad',
  map text,
  entry_fee numeric not null default 0,
  prize_pool numeric not null default 0,
  team_size integer not null default 1,
  total_slots integer not null default 100,
  filled_slots integer not null default 0,
  match_date timestamptz not null,
  status text not null default 'upcoming'
    check (status in ('upcoming','registration_open','live','completed','cancelled')),
  is_featured boolean not null default false,
  description text,
  rules text,
  room_id text,
  room_password text,
  created_at timestamptz not null default now()
);

-- Registrations (ek user, ek tournament mein ek hi baar join kar sake)
create table if not exists public.registrations (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references public.tournaments(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  team_name text,
  status text not null default 'pending'
    check (status in ('pending','approved','rejected')),
  created_at timestamptz not null default now(),
  unique (tournament_id, user_id)
);

-- Payments (EasyPaisa / JazzCash screenshots)
create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  registration_id uuid references public.registrations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  tournament_id uuid not null references public.tournaments(id) on delete cascade,
  method text not null check (method in ('easypaisa','jazzcash')),
  transaction_id text not null,
  amount numeric not null,
  screenshot_url text,
  status text not null default 'pending'
    check (status in ('pending','approved','rejected')),
  admin_note text,
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);

-- Results (winners / positions)
create table if not exists public.results (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references public.tournaments(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  player_name text not null,
  position integer not null,
  kills integer not null default 0,
  prize_amount numeric not null default 0,
  created_at timestamptz not null default now()
);

-- Notifications
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  message text,
  link text,
  read boolean not null default false,
  created_at timestamptz not null default now()
);

-- Reviews (homepage testimonials)
create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  rating integer not null check (rating between 1 and 5),
  comment text,
  created_at timestamptz not null default now()
);

-- Site settings (admin panel ke saare "no-code" fields yahan jate hain)
create table if not exists public.site_settings (
  key text primary key,
  value jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- ------------------------------------------------------------
-- 3. INDEXES
-- ------------------------------------------------------------
create index if not exists idx_tournaments_match_date on public.tournaments (match_date);
create index if not exists idx_registrations_tournament on public.registrations (tournament_id);
create index if not exists idx_registrations_user on public.registrations (user_id);
create index if not exists idx_payments_status on public.payments (status);
create index if not exists idx_payments_user on public.payments (user_id);
create index if not exists idx_results_tournament on public.results (tournament_id);
create index if not exists idx_notifications_user on public.notifications (user_id);

-- ------------------------------------------------------------
-- 4. HELPER FUNCTION: is_admin()
--    (security definer taake RLS policies user_roles par khud
--     recursive na ho jayen)
-- ------------------------------------------------------------
create or replace function public.is_admin(uid uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.user_roles
    where user_id = uid and role = 'admin'
  );
$$;

-- ------------------------------------------------------------
-- 5. TRIGGER: naya auth user banते hi profiles row auto-create
--    (signup ke waqt full_name, pubg_uid, pubg_username, mobile
--     metadata se aate hain — auth-page.js dekhein)
-- ------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, pubg_uid, pubg_username, mobile)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data ->> 'full_name',
    new.raw_user_meta_data ->> 'pubg_uid',
    new.raw_user_meta_data ->> 'pubg_username',
    new.raw_user_meta_data ->> 'mobile'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ------------------------------------------------------------
-- 6. ROW LEVEL SECURITY
-- ------------------------------------------------------------
alter table public.profiles       enable row level security;
alter table public.user_roles     enable row level security;
alter table public.tournaments    enable row level security;
alter table public.registrations  enable row level security;
alter table public.payments       enable row level security;
alter table public.results        enable row level security;
alter table public.notifications  enable row level security;
alter table public.reviews        enable row level security;
alter table public.site_settings  enable row level security;

-- ---------- profiles ----------
drop policy if exists "profiles_select_all" on public.profiles;
create policy "profiles_select_all" on public.profiles
  for select using (true); -- leaderboard/home stats sabko dikhta hai

drop policy if exists "profiles_update_own_or_admin" on public.profiles;
create policy "profiles_update_own_or_admin" on public.profiles
  for update using (auth.uid() = id or public.is_admin(auth.uid()));

-- ---------- user_roles ----------
drop policy if exists "user_roles_select_own_or_admin" on public.user_roles;
create policy "user_roles_select_own_or_admin" on public.user_roles
  for select using (auth.uid() = user_id or public.is_admin(auth.uid()));

drop policy if exists "user_roles_insert_admin_only" on public.user_roles;
create policy "user_roles_insert_admin_only" on public.user_roles
  for insert with check (public.is_admin(auth.uid()));

drop policy if exists "user_roles_delete_admin_only" on public.user_roles;
create policy "user_roles_delete_admin_only" on public.user_roles
  for delete using (public.is_admin(auth.uid()));

-- ---------- tournaments ----------
drop policy if exists "tournaments_select_all" on public.tournaments;
create policy "tournaments_select_all" on public.tournaments
  for select using (true);

drop policy if exists "tournaments_write_admin_only" on public.tournaments;
create policy "tournaments_write_admin_only" on public.tournaments
  for all using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

-- ---------- registrations ----------
drop policy if exists "registrations_select_own_or_admin" on public.registrations;
create policy "registrations_select_own_or_admin" on public.registrations
  for select using (auth.uid() = user_id or public.is_admin(auth.uid()));

drop policy if exists "registrations_insert_own" on public.registrations;
create policy "registrations_insert_own" on public.registrations
  for insert with check (auth.uid() = user_id);

drop policy if exists "registrations_update_admin_only" on public.registrations;
create policy "registrations_update_admin_only" on public.registrations
  for update using (public.is_admin(auth.uid()));

-- ---------- payments ----------
drop policy if exists "payments_select_own_or_admin" on public.payments;
create policy "payments_select_own_or_admin" on public.payments
  for select using (auth.uid() = user_id or public.is_admin(auth.uid()));

drop policy if exists "payments_insert_own" on public.payments;
create policy "payments_insert_own" on public.payments
  for insert with check (auth.uid() = user_id);

drop policy if exists "payments_update_admin_only" on public.payments;
create policy "payments_update_admin_only" on public.payments
  for update using (public.is_admin(auth.uid()));

-- ---------- results ----------
drop policy if exists "results_select_all" on public.results;
create policy "results_select_all" on public.results
  for select using (true); -- home page winners sabko dikhte hain

drop policy if exists "results_write_admin_only" on public.results;
create policy "results_write_admin_only" on public.results
  for all using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

-- ---------- notifications ----------
drop policy if exists "notifications_select_own" on public.notifications;
create policy "notifications_select_own" on public.notifications
  for select using (auth.uid() = user_id);

drop policy if exists "notifications_insert_own_or_admin" on public.notifications;
create policy "notifications_insert_own_or_admin" on public.notifications
  for insert with check (auth.uid() = user_id or public.is_admin(auth.uid()));

drop policy if exists "notifications_update_own" on public.notifications;
create policy "notifications_update_own" on public.notifications
  for update using (auth.uid() = user_id);

-- ---------- reviews ----------
drop policy if exists "reviews_select_all" on public.reviews;
create policy "reviews_select_all" on public.reviews
  for select using (true);

drop policy if exists "reviews_insert_own" on public.reviews;
create policy "reviews_insert_own" on public.reviews
  for insert with check (auth.uid() = user_id);

-- ---------- site_settings ----------
drop policy if exists "site_settings_select_all" on public.site_settings;
create policy "site_settings_select_all" on public.site_settings
  for select using (true); -- live status, payment accounts etc sabko chahiye

drop policy if exists "site_settings_write_admin_only" on public.site_settings;
create policy "site_settings_write_admin_only" on public.site_settings
  for all using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

-- ------------------------------------------------------------
-- 7. STORAGE BUCKET (payment screenshots)
-- ------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('payment-screenshots', 'payment-screenshots', false)
on conflict (id) do nothing;

drop policy if exists "psc_insert_own_folder" on storage.objects;
create policy "psc_insert_own_folder" on storage.objects
  for insert with check (
    bucket_id = 'payment-screenshots'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "psc_select_own_or_admin" on storage.objects;
create policy "psc_select_own_or_admin" on storage.objects
  for select using (
    bucket_id = 'payment-screenshots'
    and (
      (storage.foldername(name))[1] = auth.uid()::text
      or public.is_admin(auth.uid())
    )
  );

-- ------------------------------------------------------------
-- 8. STARTER SITE SETTINGS (khali defaults, admin panel se edit hongi)
-- ------------------------------------------------------------
insert into public.site_settings (key, value) values
  ('payment_accounts', '{"easypaisa":{"title":"","number":""},"jazzcash":{"title":"","number":""}}'),
  ('contact', '{"whatsapp":"","email":"","facebook":"","instagram":"","youtube":"","discord":""}'),
  ('stats', '{"total_players":0,"online_players":0,"daily_tournaments":0,"prize_distributed":0,"total_winners":0}'),
  ('live_stream', '{"is_live":false,"youtube_video_id":""}')
on conflict (key) do nothing;

-- ============================================================
-- DONE. Ab apna account admin banayen:
-- Table Editor -> user_roles -> Insert row
--   user_id = (apna Supabase Auth user id, Authentication tab se copy karein)
--   role    = admin
-- ============================================================
