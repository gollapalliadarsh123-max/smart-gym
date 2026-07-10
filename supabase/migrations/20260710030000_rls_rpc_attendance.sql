-- Fix RLS gaps, add server-side attendance RPCs, and membership expiry helper.

-- ---------------------------------------------------------------------------
-- Missing RLS policies (gym_staff, trainer_assignments)
-- ---------------------------------------------------------------------------

create policy gym_staff_select on public.gym_staff for select
  using (
    user_id = auth.uid()
    or public.staff_of_gym(gym_id)
    or public.is_platform_admin()
  );

create policy gym_staff_insert_owner on public.gym_staff for insert
  with check (public.owns_gym(gym_id) or public.is_platform_admin());

create policy gym_staff_delete_owner on public.gym_staff for delete
  using (public.owns_gym(gym_id) or public.is_platform_admin());

create policy trainer_assignments_select on public.trainer_assignments for select
  using (
    trainer_id = auth.uid()
    or member_id = auth.uid()
    or public.staff_of_gym(gym_id)
    or public.is_platform_admin()
  );

create policy trainer_assignments_insert_staff on public.trainer_assignments for insert
  with check (public.staff_of_gym(gym_id) or public.is_platform_admin());

create policy trainer_assignments_delete_staff on public.trainer_assignments for delete
  using (public.staff_of_gym(gym_id) or public.is_platform_admin());

-- Profiles: gym owners can read members in their gym
create policy profiles_select_gym_owner on public.profiles for select
  using (
    exists (
      select 1
      from public.gym_memberships gm
      join public.gyms g on g.id = gm.gym_id
      where gm.user_id = profiles.user_id
        and g.owner_id = auth.uid()
        and gm.status in ('active', 'pending', 'expired')
    )
  );

-- ---------------------------------------------------------------------------
-- Membership expiry (replaces client-side checkAndExpireMembership)
-- ---------------------------------------------------------------------------

create or replace function public.expire_memberships_if_needed(p_user_id uuid default auth.uid())
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.gym_memberships
  set status = 'expired', updated_at = now()
  where user_id = p_user_id
    and status = 'active'
    and ends_at is not null
    and ends_at < current_date;

  delete from public.daily_attendance_codes dac
  using public.gym_memberships gm
  where dac.user_id = p_user_id
    and gm.user_id = p_user_id
    and gm.status = 'expired'
    and dac.code_date >= gm.ends_at;
end;
$$;

-- ---------------------------------------------------------------------------
-- Generate 4-digit daily attendance code (member)
-- ---------------------------------------------------------------------------

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
  where user_id = v_user_id and code_date = current_date;

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
  on conflict (user_id, code_date) do update set code = excluded.code
  returning code into v_code;

  return v_code;
end;
$$;

-- ---------------------------------------------------------------------------
-- Mark attendance by 4-digit code (gym staff)
-- ---------------------------------------------------------------------------

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
    where user_id = v_member_id and attendance_date = current_date
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

-- ---------------------------------------------------------------------------
-- Self check-in via QR (member)
-- ---------------------------------------------------------------------------

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
    where user_id = v_user_id and attendance_date = current_date
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

grant execute on function public.expire_memberships_if_needed(uuid) to authenticated;
grant execute on function public.generate_daily_attendance_code(uuid) to authenticated;
grant execute on function public.mark_attendance_by_code(uuid, text) to authenticated;
grant execute on function public.self_check_in(uuid) to authenticated;
