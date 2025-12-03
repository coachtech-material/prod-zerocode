-- Adds ops_tagged flag to profiles and exposes it via ops_list_users_with_status
alter table public.profiles
  add column if not exists ops_tagged boolean default false;

alter table public.profiles
  alter column ops_tagged set not null;

drop function if exists public.ops_list_users_with_status();
create function public.ops_list_users_with_status()
returns table(
  id uuid,
  first_name text,
  last_name text,
  email text,
  role text,
  last_sign_in_at timestamptz,
  inactive boolean,
  phone text,
  issued_at timestamptz,
  login_disabled boolean,
  ops_tagged boolean
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
         coalesce(p.login_disabled, false) as login_disabled,
         coalesce(p.ops_tagged, false) as ops_tagged
  from public.profiles p
  left join auth.users u on u.id = p.id
  where exists (
    select 1 from public.profiles me where me.id = auth.uid() and me.role in ('staff','admin')
  )
  and p.role = 'user';
$$;

grant execute on function public.ops_list_users_with_status() to authenticated;
