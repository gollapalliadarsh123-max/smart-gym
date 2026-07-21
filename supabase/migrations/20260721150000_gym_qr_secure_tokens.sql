-- Secure gym QR tokens + scan audit log for multi-gym check-in.
-- QR payloads contain only a random token (never gym/user IDs).

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table public.gym_qr_codes (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid not null references public.gyms (id) on delete cascade,
  token text not null,
  status text not null default 'active'
    check (status in ('active', 'revoked')),
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  revoked_at timestamptz,
  revoked_by uuid references auth.users (id) on delete set null,
  revoke_reason text not null default '',
  constraint gym_qr_codes_token_format check (token ~ '^[a-f0-9]{64}$')
);

create unique index gym_qr_codes_token_uidx on public.gym_qr_codes (token);
create unique index gym_qr_codes_one_active_per_gym
  on public.gym_qr_codes (gym_id)
  where status = 'active';
create index gym_qr_codes_gym_idx on public.gym_qr_codes (gym_id, created_at desc);

create table public.qr_scan_logs (
  id uuid primary key default gen_random_uuid(),
  qr_code_id uuid references public.gym_qr_codes (id) on delete set null,
  gym_id uuid references public.gyms (id) on delete set null,
  scanned_by uuid references auth.users (id) on delete set null,
  token_fingerprint text not null default '',
  result text not null default 'unknown',
  message text not null default '',
  check_in_kind text not null default ''
    check (check_in_kind in ('', 'home', 'partner')),
  attendance_id uuid references public.attendance (id) on delete set null,
  partner_visit_id uuid references public.partner_gym_visits (id) on delete set null,
  created_at timestamptz not null default now()
);

create index qr_scan_logs_gym_idx on public.qr_scan_logs (gym_id, created_at desc);
create index qr_scan_logs_user_idx on public.qr_scan_logs (scanned_by, created_at desc);
create index qr_scan_logs_qr_idx on public.qr_scan_logs (qr_code_id, created_at desc);

alter table public.gym_qr_codes enable row level security;
alter table public.qr_scan_logs enable row level security;

-- Owners/staff can read QR metadata for their gyms (token included so they can print QR).
create policy gym_qr_codes_select on public.gym_qr_codes for select
  using (
    public.is_platform_admin()
    or public.owns_gym(gym_id)
    or public.staff_of_gym(gym_id)
  );

-- No direct client inserts/updates/deletes — RPCs only
create policy gym_qr_codes_no_insert on public.gym_qr_codes for insert with check (false);
create policy gym_qr_codes_no_update on public.gym_qr_codes for update using (false);
create policy gym_qr_codes_no_delete on public.gym_qr_codes for delete using (false);

-- Scan logs: owners/staff of involved gym, or the member who scanned
create policy qr_scan_logs_select on public.qr_scan_logs for select
  using (
    public.is_platform_admin()
    or scanned_by = auth.uid()
    or (gym_id is not null and (public.owns_gym(gym_id) or public.staff_of_gym(gym_id)))
  );

create policy qr_scan_logs_no_insert on public.qr_scan_logs for insert with check (false);
create policy qr_scan_logs_no_update on public.qr_scan_logs for update using (false);
create policy qr_scan_logs_no_delete on public.qr_scan_logs for delete using (false);

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

create or replace function public.generate_gym_qr_token()
returns text
language plpgsql
volatile
as $$
begin
  return encode(gen_random_bytes(32), 'hex');
end;
$$;

create or replace function public.fingerprint_qr_token(p_token text)
returns text
language sql
immutable
as $$
  select encode(digest(coalesce(p_token, ''), 'sha256'), 'hex');
$$;

create or replace function public.log_qr_scan(
  p_qr_code_id uuid,
  p_gym_id uuid,
  p_scanned_by uuid,
  p_token text,
  p_result text,
  p_message text,
  p_check_in_kind text default '',
  p_attendance_id uuid default null,
  p_partner_visit_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  insert into public.qr_scan_logs (
    qr_code_id, gym_id, scanned_by, token_fingerprint, result, message,
    check_in_kind, attendance_id, partner_visit_id
  ) values (
    p_qr_code_id, p_gym_id, p_scanned_by, public.fingerprint_qr_token(p_token),
    p_result, coalesce(p_message, ''), coalesce(p_check_in_kind, ''),
    p_attendance_id, p_partner_visit_id
  )
  returning id into v_id;
  return v_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- Ensure / regenerate active QR
-- ---------------------------------------------------------------------------

create or replace function public.ensure_active_gym_qr(p_gym_id uuid)
returns public.gym_qr_codes
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid := auth.uid();
  v_row public.gym_qr_codes;
  v_token text;
begin
  if v_actor is null then
    raise exception 'Not authenticated';
  end if;

  if not (public.owns_gym(p_gym_id) or public.staff_of_gym(p_gym_id) or public.is_platform_admin()) then
    raise exception 'Not authorized for this gym';
  end if;

  select * into v_row
  from public.gym_qr_codes
  where gym_id = p_gym_id and status = 'active'
  limit 1;

  if found then
    return v_row;
  end if;

  v_token := public.generate_gym_qr_token();

  insert into public.gym_qr_codes (gym_id, token, status, created_by)
  values (p_gym_id, v_token, 'active', v_actor)
  returning * into v_row;

  return v_row;
end;
$$;

create or replace function public.regenerate_gym_qr(
  p_gym_id uuid,
  p_reason text default 'Rotated by owner'
)
returns public.gym_qr_codes
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid := auth.uid();
  v_new public.gym_qr_codes;
  v_token text;
begin
  if v_actor is null then
    raise exception 'Not authenticated';
  end if;

  if not (public.owns_gym(p_gym_id) or public.is_platform_admin()) then
    raise exception 'Only gym owners can regenerate QR codes';
  end if;

  update public.gym_qr_codes
  set
    status = 'revoked',
    revoked_at = now(),
    revoked_by = v_actor,
    revoke_reason = coalesce(nullif(trim(p_reason), ''), 'Rotated by owner')
  where gym_id = p_gym_id
    and status = 'active';

  v_token := public.generate_gym_qr_token();

  insert into public.gym_qr_codes (gym_id, token, status, created_by)
  values (p_gym_id, v_token, 'active', v_actor)
  returning * into v_new;

  return v_new;
end;
$$;

create or replace function public.get_active_gym_qr(p_gym_id uuid)
returns public.gym_qr_codes
language plpgsql
security definer
set search_path = public
as $$
begin
  return public.ensure_active_gym_qr(p_gym_id);
end;
$$;

create or replace function public.list_gym_qr_history(p_gym_id uuid)
returns setof public.gym_qr_codes
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  if not (public.owns_gym(p_gym_id) or public.staff_of_gym(p_gym_id) or public.is_platform_admin()) then
    raise exception 'Not authorized';
  end if;

  return query
    select *
    from public.gym_qr_codes
    where gym_id = p_gym_id
    order by created_at desc
    limit 50;
end;
$$;

-- ---------------------------------------------------------------------------
-- Unified check-in by QR token (home + partner)
-- ---------------------------------------------------------------------------

create or replace function public.check_in_by_qr_token(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_qr public.gym_qr_codes%rowtype;
  v_gym public.gyms%rowtype;
  v_home boolean := false;
  v_partner jsonb;
  v_expires_at timestamptz;
  v_attendance_id uuid;
  v_used integer;
  v_limit integer := 3;
  v_remaining integer;
  v_msg text;
begin
  if v_user_id is null then
    perform public.log_qr_scan(null, null, null, p_token, 'unauthenticated', 'Sign in required to check in.');
    return jsonb_build_object(
      'success', false,
      'code', 'unauthenticated',
      'message', 'Sign in required to check in.'
    );
  end if;

  if p_token is null or p_token !~ '^[a-f0-9]{64}$' then
    perform public.log_qr_scan(null, null, v_user_id, coalesce(p_token, ''), 'invalid_qr', 'Invalid QR code.');
    return jsonb_build_object(
      'success', false,
      'code', 'invalid_qr',
      'message', 'Invalid QR code.'
    );
  end if;

  -- Serialize concurrent scans for this member
  perform pg_advisory_xact_lock(hashtext('qr_check_in:' || v_user_id::text));

  select * into v_qr
  from public.gym_qr_codes
  where token = p_token
  limit 1;

  if not found then
    perform public.log_qr_scan(null, null, v_user_id, p_token, 'invalid_qr', 'QR code not found.');
    return jsonb_build_object(
      'success', false,
      'code', 'invalid_qr',
      'message', 'Invalid QR code.'
    );
  end if;

  if v_qr.status <> 'active' then
    perform public.log_qr_scan(v_qr.id, v_qr.gym_id, v_user_id, p_token, 'qr_expired', 'This QR code is no longer valid.');
    return jsonb_build_object(
      'success', false,
      'code', 'qr_expired',
      'message', 'QR expired. Ask the gym for the current check-in QR.'
    );
  end if;

  select * into v_gym from public.gyms where id = v_qr.gym_id;
  if not found then
    perform public.log_qr_scan(v_qr.id, v_qr.gym_id, v_user_id, p_token, 'invalid_qr', 'Gym not found.');
    return jsonb_build_object(
      'success', false,
      'code', 'invalid_qr',
      'message', 'Invalid QR code.'
    );
  end if;

  perform public.expire_memberships_if_needed(v_user_id);

  -- Home gym?
  if exists (
    select 1 from public.gym_memberships
    where user_id = v_user_id
      and gym_id = v_qr.gym_id
      and status = 'active'
      and (ends_at is null or ends_at >= current_date)
  ) then
    v_home := true;
  end if;

  if v_home then
    if exists (
      select 1 from public.attendance
      where user_id = v_user_id
        and gym_id = v_qr.gym_id
        and attendance_date = current_date
    ) then
      perform public.log_qr_scan(
        v_qr.id, v_qr.gym_id, v_user_id, p_token,
        'already_checked_in', 'Already checked in today.', 'home'
      );
      return jsonb_build_object(
        'success', false,
        'code', 'already_checked_in',
        'message', 'Already checked in today.',
        'gym_name', v_gym.name,
        'check_in_kind', 'home'
      );
    end if;

    v_expires_at := now() + interval '1 hour';
    insert into public.attendance (
      user_id, gym_id, attendance_date, checked_in_at, expires_at, check_in_code, check_in_method
    ) values (
      v_user_id, v_qr.gym_id, current_date, now(), v_expires_at, '', 'qr_self'
    )
    returning id into v_attendance_id;

    v_msg := format('Checked in successfully. Welcome to %s.', v_gym.name);
    perform public.log_qr_scan(
      v_qr.id, v_qr.gym_id, v_user_id, p_token,
      'success_home', v_msg, 'home', v_attendance_id, null
    );

    return jsonb_build_object(
      'success', true,
      'code', 'success_home',
      'message', v_msg,
      'gym_name', v_gym.name,
      'gym_id', v_qr.gym_id,
      'check_in_kind', 'home',
      'attendance_id', v_attendance_id,
      'visits_used', null,
      'visits_remaining', null,
      'monthly_limit', null
    );
  end if;

  -- Partner path via existing atomic function
  v_partner := public.check_in_at_partner_gym(v_qr.gym_id, 'qr');

  if coalesce((v_partner ->> 'success')::boolean, false) then
    perform public.log_qr_scan(
      v_qr.id, v_qr.gym_id, v_user_id, p_token,
      'success_partner',
      coalesce(v_partner ->> 'message', 'Partner check-in successful.'),
      'partner',
      nullif(v_partner ->> 'attendance_id', '')::uuid,
      nullif(v_partner ->> 'visit_id', '')::uuid
    );

    return jsonb_build_object(
      'success', true,
      'code', 'success_partner',
      'message', 'Partner Gym Check-in Successful',
      'detail', v_partner ->> 'message',
      'gym_name', v_gym.name,
      'gym_id', v_qr.gym_id,
      'check_in_kind', 'partner',
      'attendance_id', v_partner -> 'attendance_id',
      'visit_id', v_partner -> 'visit_id',
      'visits_used', (v_partner ->> 'visits_used')::int,
      'visits_remaining', (v_partner ->> 'visits_remaining')::int,
      'monthly_limit', coalesce((v_partner ->> 'monthly_limit')::int, 3)
    );
  end if;

  -- Map partner failure messages to stable codes
  v_msg := coalesce(v_partner ->> 'message', 'Check-in failed.');
  if v_msg ilike '%not partnered%' then
    perform public.log_qr_scan(v_qr.id, v_qr.gym_id, v_user_id, p_token, 'not_partnered', v_msg);
    return jsonb_build_object('success', false, 'code', 'not_partnered', 'message', 'Gym not partnered.', 'gym_name', v_gym.name);
  elsif v_msg ilike '%membership is not active%' or v_msg ilike '%home-gym membership%' then
    perform public.log_qr_scan(v_qr.id, v_qr.gym_id, v_user_id, p_token, 'membership_inactive', v_msg);
    return jsonb_build_object('success', false, 'code', 'membership_inactive', 'message', 'Membership expired or inactive.', 'gym_name', v_gym.name);
  elsif v_msg ilike '%used all%' or v_msg ilike '%limit%' then
    v_used := coalesce((v_partner ->> 'visits_used')::int, 3);
    v_remaining := coalesce((v_partner ->> 'visits_remaining')::int, 0);
    perform public.log_qr_scan(v_qr.id, v_qr.gym_id, v_user_id, p_token, 'monthly_limit', v_msg);
    return jsonb_build_object(
      'success', false,
      'code', 'monthly_limit',
      'message', 'Monthly limit reached.',
      'detail', v_msg,
      'gym_name', v_gym.name,
      'visits_used', v_used,
      'visits_remaining', v_remaining,
      'monthly_limit', coalesce((v_partner ->> 'monthly_limit')::int, 3)
    );
  elsif v_msg ilike '%already checked in%' then
    perform public.log_qr_scan(v_qr.id, v_qr.gym_id, v_user_id, p_token, 'already_checked_in', v_msg);
    return jsonb_build_object('success', false, 'code', 'already_checked_in', 'message', 'Already checked in today.', 'gym_name', v_gym.name);
  elsif v_msg ilike '%home gym%' then
    perform public.log_qr_scan(v_qr.id, v_qr.gym_id, v_user_id, p_token, 'use_home_checkin', v_msg);
    return jsonb_build_object('success', false, 'code', 'use_home_checkin', 'message', v_msg, 'gym_name', v_gym.name);
  else
    perform public.log_qr_scan(v_qr.id, v_qr.gym_id, v_user_id, p_token, 'rejected', v_msg);
    return jsonb_build_object('success', false, 'code', 'rejected', 'message', v_msg, 'gym_name', v_gym.name);
  end if;
end;
$$;

-- Bootstrap active QR for every existing gym
insert into public.gym_qr_codes (gym_id, token, status, created_by)
select g.id, encode(gen_random_bytes(32), 'hex'), 'active', g.owner_id
from public.gyms g
where not exists (
  select 1 from public.gym_qr_codes q where q.gym_id = g.id and q.status = 'active'
);

grant execute on function public.ensure_active_gym_qr(uuid) to authenticated;
grant execute on function public.regenerate_gym_qr(uuid, text) to authenticated;
grant execute on function public.get_active_gym_qr(uuid) to authenticated;
grant execute on function public.list_gym_qr_history(uuid) to authenticated;
grant execute on function public.check_in_by_qr_token(text) to authenticated;
