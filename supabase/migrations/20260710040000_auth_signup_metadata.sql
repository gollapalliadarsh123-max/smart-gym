-- Apply safe signup metadata when creating the profile row.
-- Only gym_owner may be requested via metadata; all other values default to member.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  requested_role text := coalesce(new.raw_user_meta_data->>'role', 'member');
  resolved_role public.user_role := 'member';
begin
  if requested_role = 'gym_owner' then
    resolved_role := 'gym_owner';
  end if;

  insert into public.profiles (
    user_id,
    email,
    role,
    first_name,
    last_name,
    phone
  )
  values (
    new.id,
    coalesce(new.email, ''),
    resolved_role,
    coalesce(new.raw_user_meta_data->>'first_name', ''),
    coalesce(new.raw_user_meta_data->>'last_name', ''),
    coalesce(new.raw_user_meta_data->>'phone', '')
  );

  return new;
end;
$$;
