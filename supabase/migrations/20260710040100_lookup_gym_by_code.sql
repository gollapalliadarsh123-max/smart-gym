-- Allow pre-auth gym code lookup during member signup (limited fields only).

create or replace function public.lookup_gym_by_code(p_code text)
returns table (
  id uuid,
  code text,
  name text,
  location text
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  normalized text := upper(trim(both from coalesce(p_code, '')));
begin
  if normalized = '' or length(normalized) < 3 or length(normalized) > 12 then
    return;
  end if;

  return query
  select g.id, g.code, g.name, g.location
  from public.gyms g
  where g.code = normalized
  limit 1;
end;
$$;

grant execute on function public.lookup_gym_by_code(text) to anon, authenticated;
