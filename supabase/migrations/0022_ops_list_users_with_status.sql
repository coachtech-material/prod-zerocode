-- Function: ops_list_users_with_status (SECURITY DEFINER) for staff/admin
-- Returns user (role=user) with last_sign_in_at and inactive flag (≥24h no login or never)
create or replace function public.ops_list_users_with_status()
returns table (
  id uuid,
  first_name text,
  last_name text,
  role text,
  last_sign_in_at timestamptz,
  inactive boolean
)
security definer
language sql
as $$
  select p.id,
         p.first_name,
         p.last_name,
         p.role,
         u.last_sign_in_at,
         coalesce(u.last_sign_in_at < (now() - interval '24 hours'), true) as inactive
  from public.profiles p
  left join auth.users u on u.id = p.id
  where exists (
    select 1 from public.profiles me where me.id = auth.uid() and me.role in ('staff','admin')
  )
  and p.role = 'user';
$$;

