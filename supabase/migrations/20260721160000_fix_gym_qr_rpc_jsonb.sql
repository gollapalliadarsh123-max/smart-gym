-- Fix gym QR RPC return types for PostgREST (composite rows often fail in the JS client).
-- Must DROP first: CREATE OR REPLACE cannot change a function's return type.

drop function if exists public.get_active_gym_qr(uuid);
drop function if exists public.ensure_active_gym_qr(uuid);
drop function if exists public.regenerate_gym_qr(uuid, text);
drop function if exists public.list_gym_qr_history(uuid);

create function public.ensure_active_gym_qr(p_gym_id uuid)
returns jsonb
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
    return to_jsonb(v_row);
  end if;

  v_token := public.generate_gym_qr_token();

  insert into public.gym_qr_codes (gym_id, token, status, created_by)
  values (p_gym_id, v_token, 'active', v_actor)
  returning * into v_row;

  return to_jsonb(v_row);
end;
$$;

create function public.get_active_gym_qr(p_gym_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  return public.ensure_active_gym_qr(p_gym_id);
end;
$$;

create function public.regenerate_gym_qr(
  p_gym_id uuid,
  p_reason text default 'Rotated by owner'
)
returns jsonb
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

  return to_jsonb(v_new);
end;
$$;

create function public.list_gym_qr_history(p_gym_id uuid)
returns jsonb
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

  return coalesce(
    (
      select jsonb_agg(to_jsonb(q) order by q.created_at desc)
      from (
        select *
        from public.gym_qr_codes
        where gym_id = p_gym_id
        order by created_at desc
        limit 50
      ) q
    ),
    '[]'::jsonb
  );
end;
$$;

grant execute on function public.ensure_active_gym_qr(uuid) to authenticated;
grant execute on function public.regenerate_gym_qr(uuid, text) to authenticated;
grant execute on function public.get_active_gym_qr(uuid) to authenticated;
grant execute on function public.list_gym_qr_history(uuid) to authenticated;
