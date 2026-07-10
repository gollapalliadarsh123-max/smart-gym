-- Smart Gym: initial clean schema
-- Improvements over legacy:
--   • Native enums and timestamptz/date types (no text dates)
--   • Separate gym_memberships table (history-friendly)
--   • gym_staff + trainer_assignments for trainer role
--   • No app_docs dual-write layer
--   • RLS helper functions to avoid policy recursion

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------

create type public.user_role as enum (
  'platform_admin',
  'gym_owner',
  'trainer',
  'member'
);

create type public.membership_plan as enum (
  '1_month',
  '3_month',
  '6_month',
  '12_month'
);

create type public.membership_status as enum (
  'pending',
  'active',
  'expired',
  'rejected',
  'cancelled'
);

create type public.payment_status as enum (
  'not_paid',
  'paid',
  'refunded',
  'failed'
);

create type public.join_request_status as enum (
  'pending',
  'approved',
  'rejected'
);

create type public.friend_request_status as enum (
  'pending',
  'accepted',
  'rejected'
);

create type public.gym_staff_role as enum (
  'owner',
  'trainer'
);

-- ---------------------------------------------------------------------------
-- Core tables
-- ---------------------------------------------------------------------------

create table public.gyms (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  location text not null default '',
  phone text not null default '',
  contact_email text not null default '',
  opening_time time,
  closing_time time,
  price_1_month numeric(12, 2) not null default 0,
  price_3_month numeric(12, 2) not null default 0,
  price_6_month numeric(12, 2) not null default 0,
  price_12_month numeric(12, 2) not null default 0,
  owner_id uuid not null references auth.users (id) on delete restrict,
  logo_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint gyms_code_format check (code ~ '^[A-Z0-9]{3,12}$')
);

create table public.profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  role public.user_role not null default 'member',
  first_name text not null default '',
  last_name text not null default '',
  full_name text generated always as (
    trim(both from coalesce(first_name, '') || ' ' || coalesce(last_name, ''))
  ) stored,
  phone text not null default '',
  address_line1 text not null default '',
  address_line2 text not null default '',
  city text not null default '',
  state text not null default '',
  postal_code text not null default '',
  date_of_birth date,
  gender text not null default '',
  avatar_url text,
  body_goal text not null default 'maintain'
    check (body_goal in ('lose', 'maintain', 'gain')),
  onboarding_completed boolean not null default false,
  -- Diet preferences stored as structured JSON (goals, manual targets)
  diet_preferences jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (email)
);

create table public.gym_staff (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid not null references public.gyms (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  staff_role public.gym_staff_role not null,
  created_at timestamptz not null default now(),
  unique (gym_id, user_id)
);

create table public.trainer_assignments (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid not null references public.gyms (id) on delete cascade,
  trainer_id uuid not null references auth.users (id) on delete cascade,
  member_id uuid not null references auth.users (id) on delete cascade,
  assigned_at timestamptz not null default now(),
  unique (trainer_id, member_id),
  constraint trainer_assignments_no_self check (trainer_id <> member_id)
);

create table public.gym_memberships (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  gym_id uuid not null references public.gyms (id) on delete cascade,
  plan public.membership_plan,
  status public.membership_status not null default 'pending',
  payment_status public.payment_status not null default 'not_paid',
  amount numeric(12, 2),
  payment_mode text not null default '',
  starts_at date,
  ends_at date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- One active membership per user per gym
create unique index gym_memberships_one_active_per_user
  on public.gym_memberships (user_id)
  where status = 'active';

create table public.join_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  gym_id uuid not null references public.gyms (id) on delete cascade,
  status public.join_request_status not null default 'pending',
  message text not null default '',
  reviewed_by uuid references auth.users (id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- One pending request per user per gym
create unique index join_requests_one_pending_per_user_gym
  on public.join_requests (user_id, gym_id)
  where status = 'pending';

-- ---------------------------------------------------------------------------
-- Attendance
-- ---------------------------------------------------------------------------

create table public.attendance (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  gym_id uuid not null references public.gyms (id) on delete cascade,
  attendance_date date not null default current_date,
  checked_in_at timestamptz not null default now(),
  expires_at timestamptz not null,
  check_in_code text not null default '',
  check_in_method text not null default 'admin_code'
    check (check_in_method in ('admin_code', 'qr_self', 'trainer')),
  created_at timestamptz not null default now(),
  unique (user_id, attendance_date)
);

create table public.daily_attendance_codes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  gym_id uuid not null references public.gyms (id) on delete cascade,
  code_date date not null default current_date,
  code text not null,
  created_at timestamptz not null default now(),
  unique (user_id, code_date),
  constraint daily_attendance_codes_format check (code ~ '^\d{4}$')
);

create index daily_attendance_codes_lookup on public.daily_attendance_codes (code, code_date);

-- ---------------------------------------------------------------------------
-- Payments
-- ---------------------------------------------------------------------------

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid not null references public.gyms (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  membership_id uuid references public.gym_memberships (id) on delete set null,
  amount numeric(12, 2) not null,
  payment_mode text not null default '',
  status public.payment_status not null default 'paid',
  plan public.membership_plan,
  paid_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Diet & fitness
-- ---------------------------------------------------------------------------

create table public.diet_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  gym_id uuid references public.gyms (id) on delete set null,
  log_date date not null default current_date,
  foods jsonb not null default '[]'::jsonb,
  totals jsonb not null default '{}'::jsonb,
  diet_score smallint not null default 0
    check (diet_score between 0 and 100),
  fitness_score smallint not null default 0
    check (fitness_score between 0 and 100),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, log_date)
);

create table public.diet_daily_summaries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  gym_id uuid references public.gyms (id) on delete set null,
  summary_date date not null,
  score smallint not null default 0 check (score between 0 and 100),
  protein_g numeric(8, 2) not null default 0,
  calories numeric(8, 2) not null default 0,
  clean_ratio numeric(5, 4) not null default 0,
  timing_score smallint not null default 0,
  gym_attended boolean not null default false,
  water_liters numeric(5, 2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, summary_date)
);

create table public.user_streaks (
  user_id uuid primary key references auth.users (id) on delete cascade,
  best_meal_log_streak integer not null default 0,
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- League (global quarterly seasons)
-- ---------------------------------------------------------------------------

create table public.league_seasons (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  gym_id uuid references public.gyms (id) on delete set null,
  season_id text not null,
  day_points jsonb not null default '{}'::jsonb,
  total_points integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, season_id),
  constraint league_seasons_id_format check (season_id ~ '^\d{4}-Q[1-4]$')
);

-- ---------------------------------------------------------------------------
-- Social
-- ---------------------------------------------------------------------------

create table public.friend_requests (
  id uuid primary key default gen_random_uuid(),
  from_user_id uuid not null references auth.users (id) on delete cascade,
  to_user_id uuid not null references auth.users (id) on delete cascade,
  status public.friend_request_status not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint friend_requests_no_self check (from_user_id <> to_user_id)
);

create unique index friend_requests_one_pending_pair
  on public.friend_requests (
    least(from_user_id, to_user_id),
    greatest(from_user_id, to_user_id)
  )
  where status = 'pending';

create table public.friendships (
  id uuid primary key default gen_random_uuid(),
  user_a_id uuid not null references auth.users (id) on delete cascade,
  user_b_id uuid not null references auth.users (id) on delete cascade,
  pair_key text generated always as (
    least(user_a_id::text, user_b_id::text) || ':' || greatest(user_a_id::text, user_b_id::text)
  ) stored unique,
  created_at timestamptz not null default now(),
  constraint friendships_ordered check (user_a_id < user_b_id)
);

create table public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references auth.users (id) on delete cascade,
  recipient_id uuid not null references auth.users (id) on delete cascade,
  body text not null,
  read_at timestamptz,
  created_at timestamptz not null default now(),
  constraint chat_messages_no_self check (sender_id <> recipient_id)
);

create index chat_messages_conversation on public.chat_messages (
  least(sender_id, recipient_id),
  greatest(sender_id, recipient_id),
  created_at desc
);

-- ---------------------------------------------------------------------------
-- Notifications
-- ---------------------------------------------------------------------------

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid not null references public.gyms (id) on delete cascade,
  title text not null,
  body text not null,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------------

create index profiles_role_idx on public.profiles (role);
create index gym_memberships_gym_status_idx on public.gym_memberships (gym_id, status);
create index gym_memberships_user_idx on public.gym_memberships (user_id);
create index attendance_gym_date_idx on public.attendance (gym_id, attendance_date desc);
create index payments_gym_paid_at_idx on public.payments (gym_id, paid_at desc);
create index diet_logs_user_date_idx on public.diet_logs (user_id, log_date desc);
create index diet_daily_summaries_user_date_idx on public.diet_daily_summaries (user_id, summary_date desc);
create index league_seasons_season_points_idx on public.league_seasons (season_id, total_points desc);
create index notifications_gym_created_idx on public.notifications (gym_id, created_at desc);
create index join_requests_gym_status_idx on public.join_requests (gym_id, status);

-- ---------------------------------------------------------------------------
-- Utility triggers
-- ---------------------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger set_gyms_updated_at before update on public.gyms
  for each row execute function public.set_updated_at();
create trigger set_profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();
create trigger set_gym_memberships_updated_at before update on public.gym_memberships
  for each row execute function public.set_updated_at();
create trigger set_join_requests_updated_at before update on public.join_requests
  for each row execute function public.set_updated_at();
create trigger set_diet_logs_updated_at before update on public.diet_logs
  for each row execute function public.set_updated_at();
create trigger set_diet_daily_summaries_updated_at before update on public.diet_daily_summaries
  for each row execute function public.set_updated_at();
create trigger set_league_seasons_updated_at before update on public.league_seasons
  for each row execute function public.set_updated_at();
create trigger set_friend_requests_updated_at before update on public.friend_requests
  for each row execute function public.set_updated_at();

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (user_id, email, role)
  values (new.id, coalesce(new.email, ''), 'member')
  on conflict (user_id) do update set email = excluded.email;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- RLS helper functions (security definer, stable)
-- ---------------------------------------------------------------------------

create or replace function public.current_user_role()
returns public.user_role
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where user_id = auth.uid();
$$;

create or replace function public.is_platform_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where user_id = auth.uid() and role = 'platform_admin'
  );
$$;

create or replace function public.owns_gym(target_gym_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.gyms
    where id = target_gym_id and owner_id = auth.uid()
  );
$$;

create or replace function public.staff_of_gym(target_gym_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.gym_staff
    where gym_id = target_gym_id and user_id = auth.uid()
  ) or public.owns_gym(target_gym_id);
$$;

create or replace function public.member_of_gym(target_gym_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.gym_memberships
    where gym_id = target_gym_id
      and user_id = auth.uid()
      and status = 'active'
  );
$$;

create or replace function public.trainer_assigned_to(target_member_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.trainer_assignments
    where trainer_id = auth.uid() and member_id = target_member_id
  );
$$;

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

alter table public.gyms enable row level security;
alter table public.profiles enable row level security;
alter table public.gym_staff enable row level security;
alter table public.trainer_assignments enable row level security;
alter table public.gym_memberships enable row level security;
alter table public.join_requests enable row level security;
alter table public.attendance enable row level security;
alter table public.daily_attendance_codes enable row level security;
alter table public.payments enable row level security;
alter table public.diet_logs enable row level security;
alter table public.diet_daily_summaries enable row level security;
alter table public.user_streaks enable row level security;
alter table public.league_seasons enable row level security;
alter table public.friend_requests enable row level security;
alter table public.friendships enable row level security;
alter table public.chat_messages enable row level security;
alter table public.notifications enable row level security;

-- Profiles
create policy profiles_select_own on public.profiles for select
  using (user_id = auth.uid() or public.is_platform_admin());

create policy profiles_select_gym_staff on public.profiles for select
  using (
    exists (
      select 1 from public.gym_memberships gm
      join public.gym_staff gs on gs.gym_id = gm.gym_id
      where gm.user_id = profiles.user_id
        and gs.user_id = auth.uid()
        and gm.status = 'active'
    )
  );

create policy profiles_update_own on public.profiles for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Gyms: public read for join flow, owners manage
create policy gyms_select_authenticated on public.gyms for select
  to authenticated using (true);

create policy gyms_insert_owner on public.gyms for insert
  with check (owner_id = auth.uid());

create policy gyms_update_owner on public.gyms for update
  using (public.owns_gym(id) or public.is_platform_admin());

-- Gym memberships
create policy gym_memberships_select_own on public.gym_memberships for select
  using (user_id = auth.uid() or public.staff_of_gym(gym_id) or public.is_platform_admin());

create policy gym_memberships_insert_staff on public.gym_memberships for insert
  with check (public.staff_of_gym(gym_id) or public.is_platform_admin());

create policy gym_memberships_update_staff on public.gym_memberships for update
  using (public.staff_of_gym(gym_id) or public.is_platform_admin());

-- Join requests
create policy join_requests_select on public.join_requests for select
  using (
    user_id = auth.uid()
    or public.staff_of_gym(gym_id)
    or public.is_platform_admin()
  );

create policy join_requests_insert_member on public.join_requests for insert
  with check (user_id = auth.uid());

create policy join_requests_update_staff on public.join_requests for update
  using (public.staff_of_gym(gym_id) or public.is_platform_admin());

-- Attendance
create policy attendance_select on public.attendance for select
  using (
    user_id = auth.uid()
    or public.staff_of_gym(gym_id)
    or public.trainer_assigned_to(user_id)
  );

create policy attendance_insert on public.attendance for insert
  with check (
    user_id = auth.uid()
    or public.staff_of_gym(gym_id)
  );

-- Daily codes: members manage own; staff read same gym
create policy daily_codes_select on public.daily_attendance_codes for select
  using (
    user_id = auth.uid()
    or public.staff_of_gym(gym_id)
  );

create policy daily_codes_insert on public.daily_attendance_codes for insert
  with check (user_id = auth.uid());

create policy daily_codes_update on public.daily_attendance_codes for update
  using (user_id = auth.uid());

create policy daily_codes_delete on public.daily_attendance_codes for delete
  using (user_id = auth.uid());

-- Payments
create policy payments_select on public.payments for select
  using (user_id = auth.uid() or public.staff_of_gym(gym_id));

create policy payments_insert_staff on public.payments for insert
  with check (public.staff_of_gym(gym_id));

-- Diet logs
create policy diet_logs_own on public.diet_logs for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy diet_logs_staff_read on public.diet_logs for select
  using (public.staff_of_gym(gym_id) or public.trainer_assigned_to(user_id));

-- Diet summaries
create policy diet_summaries_own on public.diet_daily_summaries for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy diet_summaries_staff_read on public.diet_daily_summaries for select
  using (public.staff_of_gym(gym_id) or public.trainer_assigned_to(user_id));

-- User streaks
create policy user_streaks_own on public.user_streaks for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- League (global read for leaderboard; own write)
create policy league_select on public.league_seasons for select
  to authenticated using (true);

create policy league_own_write on public.league_seasons for insert
  with check (user_id = auth.uid());

create policy league_own_update on public.league_seasons for update
  using (user_id = auth.uid());

-- Social
create policy friend_requests_involved on public.friend_requests for all
  using (from_user_id = auth.uid() or to_user_id = auth.uid())
  with check (from_user_id = auth.uid() or to_user_id = auth.uid());

create policy friendships_involved on public.friendships for select
  using (user_a_id = auth.uid() or user_b_id = auth.uid());

create policy friendships_insert on public.friendships for insert
  with check (user_a_id = auth.uid() or user_b_id = auth.uid());

create policy chat_messages_involved on public.chat_messages for all
  using (sender_id = auth.uid() or recipient_id = auth.uid())
  with check (sender_id = auth.uid());

-- Notifications
create policy notifications_member_read on public.notifications for select
  using (public.member_of_gym(gym_id));

create policy notifications_staff on public.notifications for all
  using (public.staff_of_gym(gym_id))
  with check (public.staff_of_gym(gym_id));

-- ---------------------------------------------------------------------------
-- Realtime
-- ---------------------------------------------------------------------------

alter publication supabase_realtime add table public.attendance;
alter publication supabase_realtime add table public.chat_messages;
alter publication supabase_realtime add table public.friend_requests;
alter publication supabase_realtime add table public.notifications;
alter publication supabase_realtime add table public.league_seasons;

-- ---------------------------------------------------------------------------
-- Storage buckets
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public)
values
  ('avatars', 'avatars', true),
  ('gym-logos', 'gym-logos', true),
  ('share-cards', 'share-cards', false)
on conflict (id) do nothing;

create policy storage_avatars_read on storage.objects for select
  using (bucket_id = 'avatars');

create policy storage_avatars_own on storage.objects for all
  using (bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1])
  with check (bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]);

create policy storage_gym_logos_read on storage.objects for select
  using (bucket_id = 'gym-logos');

create policy storage_gym_logos_owner on storage.objects for all
  using (
    bucket_id = 'gym-logos'
    and exists (
      select 1 from public.gyms g
      where g.id::text = (storage.foldername(name))[1]
        and g.owner_id = auth.uid()
    )
  );

create policy storage_share_cards_own on storage.objects for all
  using (bucket_id = 'share-cards' and auth.uid()::text = (storage.foldername(name))[1])
  with check (bucket_id = 'share-cards' and auth.uid()::text = (storage.foldername(name))[1]);
