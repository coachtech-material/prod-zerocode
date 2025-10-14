-- Replace ops_list_users_with_status to prefer phone from profiles, fallback to auth.users.phone
create or replace function public.ops_list_users_with_status()
returns table (
  id uuid,
  first_name text,
  last_name text,
  role text,
  last_sign_in_at timestamptz,
  inactive boolean,
  phone text
)
security definer
language sql
as $$
  select p.id,
         p.first_name,
         p.last_name,
         p.role,
         u.last_sign_in_at,
         coalesce(u.last_sign_in_at < (now() - interval '24 hours'), true) as inactive,
         coalesce(p.phone, u.phone) as phone
  from public.profiles p
  left join auth.users u on u.id = p.id
  where exists (
    select 1 from public.profiles me where me.id = auth.uid() and me.role in ('staff','admin')
  )
  and p.role = 'user';
$$;

