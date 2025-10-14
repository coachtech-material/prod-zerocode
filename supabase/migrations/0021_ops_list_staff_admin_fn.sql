-- Function: ops_list_staff_admin (SECURITY DEFINER) for staff/admin
create or replace function public.ops_list_staff_admin()
returns table (
  id uuid,
  first_name text,
  last_name text,
  role text
)
security definer
language sql
as $$
  select p.id, p.first_name, p.last_name, p.role
  from public.profiles p
  where exists (
    select 1 from public.profiles me where me.id = auth.uid() and me.role in ('staff','admin')
  )
  and p.role in ('staff','admin');
$$;

