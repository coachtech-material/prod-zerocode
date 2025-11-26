begin;

drop function if exists public.ops_export_users();
create function public.ops_export_users()
returns table (
  id uuid,
  first_name text,
  last_name text,
  email text,
  role text,
  last_sign_in_at timestamptz,
  inactive boolean,
  phone text,
  issued_at timestamptz,
  login_disabled boolean
)
language sql
security definer
set search_path = public, auth
as $$
  select p.id,
         p.first_name,
         p.last_name,
         u.email,
         p.role,
         coalesce(p.last_active_at, u.last_sign_in_at) as last_sign_in_at,
         coalesce(coalesce(p.last_active_at, u.last_sign_in_at) < (now() - interval '24 hours'), true) as inactive,
         coalesce(p.phone, u.phone) as phone,
         p.created_at as issued_at,
         coalesce(p.login_disabled, false) as login_disabled
  from public.profiles p
  left join auth.users u on u.id = p.id
  where p.role = 'user';
$$;

revoke all on function public.ops_export_users() from public;
grant execute on function public.ops_export_users() to service_role;

commit;
