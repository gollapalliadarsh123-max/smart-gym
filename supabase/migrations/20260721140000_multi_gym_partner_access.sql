-- Multi-gym isolation fixes + partner-gym access (3 visits / month default).
-- Preserves existing data; does not delete records.

-- ---------------------------------------------------------------------------
-- 1) Allow multiple active memberships (one per gym) and per-gym attendance
-- ---------------------------------------------------------------------------

drop index if exists public.gym_memberships_one_active_per_user;

create unique index gym_memberships_one_active_per_user_gym
  on public.gym_memberships (user_id, gym_id)
  where status = 'active';

alter table public.attendance
  drop constraint if exists attendance_user_id_attendance_date_key;

alter table public.attendance
  add constraint attendance_user_gym_date_unique unique (user_id, gym_id, attendance_date);

alter table public.daily_attendance_codes
  drop constraint if exists daily_attendance_codes_user_id_code_date_key;

alter table public.daily_attendance_codes
  add constraint daily_attendance_codes_user_gym_date_unique unique (user_id, gym_id, code_date);

-- Extend home check-in methods with partner
alter table public.attendance
  drop constraint if exists attendance_check_in_method_check;

alter table public.attendance
  add constraint attendance_check_in_method_check
  check (check_in_method in ('admin_code', 'qr_self', 'trainer', 'partner'));

-- Scope existing RPCs to per-gym attendance uniqueness
create or replace function public.generate_daily_attendance_code(p_gym_id uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_code text;
  v_attempts integer := 0;
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  perform public.expire_memberships_if_needed(v_user_id);

  if not exists (
    select 1 from public.gym_memberships
    where user_id = v_user_id
      and gym_id = p_gym_id
      and status = 'active'
      and (ends_at is null or ends_at >= current_date)
  ) then
    raise exception 'Active membership required';
  end if;

  select code into v_code
  from public.daily_attendance_codes
  where user_id = v_user_id
    and gym_id = p_gym_id
    and code_date = current_date;

  if v_code is not null then
    return v_code;
  end if;

  loop
    v_attempts := v_attempts + 1;
    if v_attempts > 20 then
      raise exception 'Could not generate unique code';
    end if;
    v_code := lpad((floor(random() * 10000))::text, 4, '0');
    exit when not exists (
      select 1 from public.daily_attendance_codes
      where code = v_code and code_date = current_date and gym_id = p_gym_id
    );
  end loop;

  insert into public.daily_attendance_codes (user_id, gym_id, code_date, code)
  values (v_user_id, p_gym_id, current_date, v_code)
  on conflict (user_id, gym_id, code_date) do update set code = excluded.code
  returning code into v_code;

  return v_code;
end;
$$;

create or replace function public.mark_attendance_by_code(p_gym_id uuid, p_code text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_member_id uuid;
  v_member_name text;
  v_expires_at timestamptz;
  v_attendance_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  if not public.staff_of_gym(p_gym_id) then
    raise exception 'Not authorized for this gym';
  end if;

  if p_code !~ '^\d{4}$' then
    raise exception 'Invalid code format';
  end if;

  select dac.user_id, coalesce(nullif(p.full_name, ''), p.email)
  into v_member_id, v_member_name
  from public.daily_attendance_codes dac
  join public.profiles p on p.user_id = dac.user_id
  where dac.gym_id = p_gym_id
    and dac.code = p_code
    and dac.code_date = current_date;

  if v_member_id is null then
    raise exception 'Invalid or expired code';
  end if;

  perform public.expire_memberships_if_needed(v_member_id);

  if not exists (
    select 1 from public.gym_memberships
    where user_id = v_member_id
      and gym_id = p_gym_id
      and status = 'active'
      and (ends_at is null or ends_at >= current_date)
  ) then
    raise exception 'Member membership is not active';
  end if;

  if exists (
    select 1 from public.attendance
    where user_id = v_member_id
      and gym_id = p_gym_id
      and attendance_date = current_date
  ) then
    return jsonb_build_object(
      'already_marked', true,
      'member_id', v_member_id,
      'member_name', v_member_name
    );
  end if;

  v_expires_at := now() + interval '1 hour';

  insert into public.attendance (
    user_id, gym_id, attendance_date, checked_in_at, expires_at, check_in_code, check_in_method
  ) values (
    v_member_id, p_gym_id, current_date, now(), v_expires_at, p_code, 'admin_code'
  )
  returning id into v_attendance_id;

  return jsonb_build_object(
    'already_marked', false,
    'attendance_id', v_attendance_id,
    'member_id', v_member_id,
    'member_name', v_member_name,
    'expires_at', v_expires_at
  );
end;
$$;

create or replace function public.self_check_in(p_gym_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_expires_at timestamptz;
  v_attendance_id uuid;
  v_gym_code text;
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  select code into v_gym_code from public.gyms where id = p_gym_id;
  if v_gym_code is null then
    raise exception 'Gym not found';
  end if;

  perform public.expire_memberships_if_needed(v_user_id);

  if not exists (
    select 1 from public.gym_memberships
    where user_id = v_user_id
      and gym_id = p_gym_id
      and status = 'active'
      and (ends_at is null or ends_at >= current_date)
  ) then
    raise exception 'Active membership required';
  end if;

  if exists (
    select 1 from public.attendance
    where user_id = v_user_id
      and gym_id = p_gym_id
      and attendance_date = current_date
  ) then
    return jsonb_build_object('already_marked', true);
  end if;

  v_expires_at := now() + interval '1 hour';

  insert into public.attendance (
    user_id, gym_id, attendance_date, checked_in_at, expires_at, check_in_code, check_in_method
  ) values (
    v_user_id, p_gym_id, current_date, now(), v_expires_at, '', 'qr_self'
  )
  returning id into v_attendance_id;

  return jsonb_build_object(
    'already_marked', false,
    'attendance_id', v_attendance_id,
    'expires_at', v_expires_at
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- 2) Partner tables
-- ---------------------------------------------------------------------------

create type public.gym_partnership_status as enum (
  'pending',
  'active',
  'rejected',
  'suspended',
  'ended'
);

create type public.partner_visit_status as enum (
  'approved',
  'rejected',
  'reversed'
);

create type public.partner_check_in_method as enum (
  'code',
  'qr',
  'staff'
);

create table public.gym_partnerships (
  id uuid primary key default gen_random_uuid(),
  requesting_gym_id uuid not null references public.gyms (id) on delete cascade,
  partner_gym_id uuid not null references public.gyms (id) on delete cascade,
  status public.gym_partnership_status not null default 'pending',
  monthly_visit_limit integer not null default 3
    check (monthly_visit_limit > 0 and monthly_visit_limit <= 31),
  requested_by uuid not null references auth.users (id) on delete restrict,
  approved_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  approved_at timestamptz,
  ended_at timestamptz,
  updated_at timestamptz not null default now(),
  constraint gym_partnerships_no_self check (requesting_gym_id <> partner_gym_id)
);

create unique index gym_partnerships_unique_open_pair
  on public.gym_partnerships (
    least(requesting_gym_id, partner_gym_id),
    greatest(requesting_gym_id, partner_gym_id)
  )
  where status in ('pending', 'active', 'suspended');

create index gym_partnerships_requesting_idx on public.gym_partnerships (requesting_gym_id);
create index gym_partnerships_partner_idx on public.gym_partnerships (partner_gym_id);
create index gym_partnerships_status_idx on public.gym_partnerships (status);

create table public.partner_gym_visits (
  id uuid primary key default gen_random_uuid(),
  member_user_id uuid not null references auth.users (id) on delete cascade,
  home_gym_id uuid not null references public.gyms (id) on delete cascade,
  visited_gym_id uuid not null references public.gyms (id) on delete cascade,
  partnership_id uuid not null references public.gym_partnerships (id) on delete restrict,
  attendance_id uuid references public.attendance (id) on delete set null,
  visit_date date not null default current_date,
  checked_in_at timestamptz not null default now(),
  checked_in_by uuid references auth.users (id) on delete set null,
  check_in_method public.partner_check_in_method not null default 'qr',
  status public.partner_visit_status not null default 'approved',
  rejection_reason text not null default '',
  reversed_by uuid references auth.users (id) on delete set null,
  reversed_at timestamptz,
  reversal_reason text not null default '',
  created_at timestamptz not null default now(),
  constraint partner_gym_visits_different_gyms check (home_gym_id <> visited_gym_id)
);

create unique index partner_gym_visits_one_approved_per_day
  on public.partner_gym_visits (member_user_id, visited_gym_id, visit_date)
  where status = 'approved';

create index partner_gym_visits_member_idx on public.partner_gym_visits (member_user_id);
create index partner_gym_visits_home_idx on public.partner_gym_visits (home_gym_id);
create index partner_gym_visits_visited_idx on public.partner_gym_visits (visited_gym_id);
create index partner_gym_visits_date_idx on public.partner_gym_visits (visit_date);
create index partner_gym_visits_month_member_idx
  on public.partner_gym_visits (member_user_id, visit_date)
  where status = 'approved';

-- ---------------------------------------------------------------------------
-- 3) RLS helpers + policies
-- ---------------------------------------------------------------------------

create or replace function public.partnership_involves_owned_gym(p_partnership_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.gym_partnerships gp
    where gp.id = p_partnership_id
      and (
        public.owns_gym(gp.requesting_gym_id)
        or public.owns_gym(gp.partner_gym_id)
        or public.staff_of_gym(gp.requesting_gym_id)
        or public.staff_of_gym(gp.partner_gym_id)
      )
  );
$$;

create or replace function public.gyms_are_active_partners(p_gym_a uuid, p_gym_b uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.gym_partnerships gp
    where gp.status = 'active'
      and (
        (gp.requesting_gym_id = p_gym_a and gp.partner_gym_id = p_gym_b)
        or (gp.requesting_gym_id = p_gym_b and gp.partner_gym_id = p_gym_a)
      )
  );
$$;

alter table public.gym_partnerships enable row level security;
alter table public.partner_gym_visits enable row level security;

create policy gym_partnerships_select on public.gym_partnerships for select
  using (
    public.is_platform_admin()
    or public.owns_gym(requesting_gym_id)
    or public.owns_gym(partner_gym_id)
    or public.staff_of_gym(requesting_gym_id)
    or public.staff_of_gym(partner_gym_id)
    or (
      public.member_of_gym(requesting_gym_id)
      or public.member_of_gym(partner_gym_id)
    )
  );

create policy gym_partnerships_insert on public.gym_partnerships for insert
  with check (
    public.owns_gym(requesting_gym_id)
    and requested_by = auth.uid()
  );

create policy gym_partnerships_update on public.gym_partnerships for update
  using (
    public.owns_gym(requesting_gym_id)
    or public.owns_gym(partner_gym_id)
  )
  with check (
    public.owns_gym(requesting_gym_id)
    or public.owns_gym(partner_gym_id)
  );

-- Members/staff may read visits they are involved in; no direct inserts/updates by clients
create policy partner_gym_visits_select on public.partner_gym_visits for select
  using (
    public.is_platform_admin()
    or member_user_id = auth.uid()
    or public.owns_gym(home_gym_id)
    or public.owns_gym(visited_gym_id)
    or public.staff_of_gym(home_gym_id)
    or public.staff_of_gym(visited_gym_id)
  );

-- Block direct client writes; RPCs use security definer
create policy partner_gym_visits_no_insert on public.partner_gym_visits for insert
  with check (false);

create policy partner_gym_visits_no_update on public.partner_gym_visits for update
  using (false);

create policy partner_gym_visits_no_delete on public.partner_gym_visits for delete
  using (false);

-- ---------------------------------------------------------------------------
-- 4) Allowance helper + atomic partner check-in RPC
-- ---------------------------------------------------------------------------

create or replace function public.count_approved_partner_visits_this_month(
  p_member_user_id uuid,
  p_as_of date default current_date
)
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select count(*)::integer
  from public.partner_gym_visits
  where member_user_id = p_member_user_id
    and status = 'approved'
    and visit_date >= date_trunc('month', p_as_of::timestamptz)::date
    and visit_date < (date_trunc('month', p_as_of::timestamptz) + interval '1 month')::date;
$$;

create or replace function public.check_in_at_partner_gym(
  p_visited_gym_id uuid,
  p_check_in_method public.partner_check_in_method default 'qr'
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_home_gym_id uuid;
  v_partnership_id uuid;
  v_limit integer;
  v_used integer;
  v_remaining integer;
  v_attendance_id uuid;
  v_visit_id uuid;
  v_expires_at timestamptz;
  v_visit_date date := current_date;
begin
  if v_user_id is null then
    return jsonb_build_object(
      'success', false,
      'message', 'Not authenticated.',
      'visits_used', 0,
      'visits_remaining', 0
    );
  end if;

  if p_visited_gym_id is null then
    return jsonb_build_object(
      'success', false,
      'message', 'Visited gym is required.',
      'visits_used', 0,
      'visits_remaining', 0
    );
  end if;

  -- Serialize concurrent check-ins for this member
  perform pg_advisory_xact_lock(hashtext('partner_check_in:' || v_user_id::text));

  perform public.expire_memberships_if_needed(v_user_id);

  -- Home-gym members should use normal check-in, not partner path
  if exists (
    select 1 from public.gym_memberships
    where user_id = v_user_id
      and gym_id = p_visited_gym_id
      and status = 'active'
      and (ends_at is null or ends_at >= current_date)
  ) then
    return jsonb_build_object(
      'success', false,
      'message', 'This is your home gym. Use regular check-in.',
      'visits_used', 0,
      'visits_remaining', 0
    );
  end if;

  select gm.gym_id, gp.id, gp.monthly_visit_limit
  into v_home_gym_id, v_partnership_id, v_limit
  from public.gym_memberships gm
  join public.gym_partnerships gp on gp.status = 'active'
    and (
      (gp.requesting_gym_id = gm.gym_id and gp.partner_gym_id = p_visited_gym_id)
      or (gp.partner_gym_id = gm.gym_id and gp.requesting_gym_id = p_visited_gym_id)
    )
  where gm.user_id = v_user_id
    and gm.status = 'active'
    and (gm.ends_at is null or gm.ends_at >= current_date)
  order by gm.created_at asc
  limit 1;

  if v_home_gym_id is null or v_partnership_id is null then
    -- Distinguish inactive membership vs no partnership
    if not exists (
      select 1 from public.gym_memberships
      where user_id = v_user_id
        and status = 'active'
        and (ends_at is null or ends_at >= current_date)
    ) then
      return jsonb_build_object(
        'success', false,
        'message', 'Your home-gym membership is not active.',
        'visits_used', 0,
        'visits_remaining', 0
      );
    end if;

    return jsonb_build_object(
      'success', false,
      'message', 'Your gym is not partnered with this gym.',
      'visits_used', 0,
      'visits_remaining', 0
    );
  end if;

  if exists (
    select 1 from public.partner_gym_visits
    where member_user_id = v_user_id
      and visited_gym_id = p_visited_gym_id
      and visit_date = v_visit_date
      and status = 'approved'
  ) then
    v_used := public.count_approved_partner_visits_this_month(v_user_id, v_visit_date);
    return jsonb_build_object(
      'success', false,
      'message', 'You have already checked in here today.',
      'visits_used', v_used,
      'visits_remaining', greatest(v_limit - v_used, 0)
    );
  end if;

  if exists (
    select 1 from public.attendance
    where user_id = v_user_id
      and gym_id = p_visited_gym_id
      and attendance_date = v_visit_date
  ) then
    v_used := public.count_approved_partner_visits_this_month(v_user_id, v_visit_date);
    return jsonb_build_object(
      'success', false,
      'message', 'You have already checked in here today.',
      'visits_used', v_used,
      'visits_remaining', greatest(v_limit - v_used, 0)
    );
  end if;

  v_used := public.count_approved_partner_visits_this_month(v_user_id, v_visit_date);

  if v_used >= v_limit then
    insert into public.partner_gym_visits (
      member_user_id, home_gym_id, visited_gym_id, partnership_id,
      visit_date, checked_in_by, check_in_method, status, rejection_reason
    ) values (
      v_user_id, v_home_gym_id, p_visited_gym_id, v_partnership_id,
      v_visit_date, v_user_id, p_check_in_method, 'rejected',
      format('Monthly partner visit limit of %s reached.', v_limit)
    );

    return jsonb_build_object(
      'success', false,
      'message', format('You have used all %s partner-gym visits for this month.', v_limit),
      'visits_used', v_used,
      'visits_remaining', 0
    );
  end if;

  v_expires_at := now() + interval '1 hour';

  insert into public.attendance (
    user_id, gym_id, attendance_date, checked_in_at, expires_at, check_in_code, check_in_method
  ) values (
    v_user_id, p_visited_gym_id, v_visit_date, now(), v_expires_at, '', 'partner'
  )
  returning id into v_attendance_id;

  insert into public.partner_gym_visits (
    member_user_id, home_gym_id, visited_gym_id, partnership_id, attendance_id,
    visit_date, checked_in_by, check_in_method, status
  ) values (
    v_user_id, v_home_gym_id, p_visited_gym_id, v_partnership_id, v_attendance_id,
    v_visit_date, v_user_id, p_check_in_method, 'approved'
  )
  returning id into v_visit_id;

  v_used := v_used + 1;
  v_remaining := greatest(v_limit - v_used, 0);

  return jsonb_build_object(
    'success', true,
    'message', format(
      'Partner check-in successful. You have %s visit%s remaining this month.',
      v_remaining,
      case when v_remaining = 1 then '' else 's' end
    ),
    'visits_used', v_used,
    'visits_remaining', v_remaining,
    'attendance_id', v_attendance_id,
    'visit_id', v_visit_id,
    'monthly_limit', v_limit,
    'home_gym_id', v_home_gym_id,
    'visited_gym_id', p_visited_gym_id
  );
exception
  when unique_violation then
    v_used := public.count_approved_partner_visits_this_month(v_user_id, current_date);
    return jsonb_build_object(
      'success', false,
      'message', 'You have already checked in here today.',
      'visits_used', v_used,
      'visits_remaining', greatest(coalesce(v_limit, 3) - v_used, 0)
    );
end;
$$;

create or replace function public.reverse_partner_visit(
  p_visit_id uuid,
  p_reason text default ''
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid := auth.uid();
  v_visit public.partner_gym_visits%rowtype;
begin
  if v_actor is null then
    raise exception 'Not authenticated';
  end if;

  select * into v_visit
  from public.partner_gym_visits
  where id = p_visit_id
  for update;

  if not found then
    raise exception 'Partner visit not found';
  end if;

  if not (
    public.owns_gym(v_visit.visited_gym_id)
    or public.staff_of_gym(v_visit.visited_gym_id)
    or public.owns_gym(v_visit.home_gym_id)
    or public.is_platform_admin()
  ) then
    raise exception 'Not authorized to reverse this visit';
  end if;

  if v_visit.status <> 'approved' then
    return jsonb_build_object(
      'success', false,
      'message', 'Only approved visits can be reversed.',
      'status', v_visit.status
    );
  end if;

  update public.partner_gym_visits
  set
    status = 'reversed',
    reversed_by = v_actor,
    reversed_at = now(),
    reversal_reason = coalesce(nullif(trim(p_reason), ''), 'Reversed by staff')
  where id = p_visit_id;

  return jsonb_build_object(
    'success', true,
    'message', 'Partner visit reversed.',
    'visit_id', p_visit_id
  );
end;
$$;

create or replace function public.get_partner_visit_allowance(p_member_user_id uuid default auth.uid())
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_actor uuid := auth.uid();
  v_limit integer := 3;
  v_used integer;
begin
  if v_actor is null then
    raise exception 'Not authenticated';
  end if;

  if p_member_user_id is distinct from v_actor
     and not public.is_platform_admin()
     and not exists (
       select 1
       from public.gym_memberships gm
       join public.gyms g on g.id = gm.gym_id
       where gm.user_id = p_member_user_id
         and (
           g.owner_id = v_actor
           or public.staff_of_gym(gm.gym_id)
         )
     )
  then
    raise exception 'Not authorized';
  end if;

  select coalesce(max(gp.monthly_visit_limit), 3)
  into v_limit
  from public.gym_memberships gm
  join public.gym_partnerships gp on gp.status = 'active'
    and (gp.requesting_gym_id = gm.gym_id or gp.partner_gym_id = gm.gym_id)
  where gm.user_id = p_member_user_id
    and gm.status = 'active'
    and (gm.ends_at is null or gm.ends_at >= current_date);

  v_used := public.count_approved_partner_visits_this_month(p_member_user_id, current_date);

  return jsonb_build_object(
    'monthly_limit', v_limit,
    'visits_used', v_used,
    'visits_remaining', greatest(v_limit - v_used, 0)
  );
end;
$$;

grant execute on function public.count_approved_partner_visits_this_month(uuid, date) to authenticated;
grant execute on function public.check_in_at_partner_gym(uuid, public.partner_check_in_method) to authenticated;
grant execute on function public.reverse_partner_visit(uuid, text) to authenticated;
grant execute on function public.get_partner_visit_allowance(uuid) to authenticated;
grant execute on function public.gyms_are_active_partners(uuid, uuid) to authenticated;
grant execute on function public.partnership_involves_owned_gym(uuid) to authenticated;
