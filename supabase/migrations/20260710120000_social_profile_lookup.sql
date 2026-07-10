-- Allow authenticated users to read basic profile fields for leaderboard,
-- friend search, and chat display. Updates remain own-only.

create policy profiles_select_authenticated on public.profiles
  for select
  to authenticated
  using (true);

-- Lookup helper for friend requests by email (case-insensitive).
create or replace function public.lookup_profile_by_email(p_email text)
returns table (
  user_id uuid,
  email text,
  first_name text,
  last_name text,
  full_name text
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  normalized text := lower(trim(both from coalesce(p_email, '')));
begin
  if normalized = '' or position('@' in normalized) = 0 then
    return;
  end if;

  return query
  select p.user_id, p.email, p.first_name, p.last_name, p.full_name
  from public.profiles p
  where lower(p.email) = normalized
  limit 1;
end;
$$;

grant execute on function public.lookup_profile_by_email(text) to authenticated;
