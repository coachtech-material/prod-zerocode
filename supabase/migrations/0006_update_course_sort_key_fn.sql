-- Re-sequence sort_key and place a course at the desired key.
-- Keeps a stable order using current sort_key then created_at, replacing the target row's key with the requested one.
create or replace function public.update_course_sort_key(p_course uuid, p_key int)
returns void
language sql
as $$
with ordered as (
  select id,
         row_number() over (
           order by case when id = p_course then p_key else sort_key end, created_at
         ) as new_key
  from public.courses
  where deleted_at is null
)
update public.courses c
set sort_key = o.new_key,
    updated_at = now()
from ordered o
where c.id = o.id;
$$;

grant execute on function public.update_course_sort_key(uuid, int) to authenticated;

