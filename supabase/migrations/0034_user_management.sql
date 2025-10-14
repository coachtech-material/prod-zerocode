begin;

alter table public.profiles
  add column if not exists login_disabled boolean not null default false;

drop function if exists public.ops_list_users_with_status();
create function public.ops_list_users_with_status()
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
  where exists (
    select 1 from public.profiles me where me.id = auth.uid() and me.role in ('staff','admin')
  )
  and p.role = 'user';
$$;

grant execute on function public.ops_list_users_with_status() to authenticated;

drop function if exists public.ops_list_staff_admin();
create function public.ops_list_staff_admin()
returns table (
  id uuid,
  first_name text,
  last_name text,
  role text,
  issued_at timestamptz
)
language sql
security definer
set search_path = public, auth
as $$
  select p.id,
         p.first_name,
         p.last_name,
         p.role,
         p.created_at as issued_at
  from public.profiles p
  where exists (
    select 1 from public.profiles me where me.id = auth.uid() and me.role in ('staff','admin')
  )
  and p.role in ('staff','admin');
$$;

grant execute on function public.ops_list_staff_admin() to authenticated;

drop function if exists public.ops_set_user_disabled(uuid, boolean);
create function public.ops_set_user_disabled(target uuid, disabled boolean default true)
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  is_allowed boolean;
begin
  select exists(
    select 1
    from public.profiles me
    where me.id = auth.uid()
      and me.role in ('staff','admin')
  ) into is_allowed;

  if not is_allowed then
    raise exception 'not authorized';
  end if;

  if target = auth.uid() then
    raise exception 'cannot disable self';
  end if;

  update public.profiles
  set login_disabled = coalesce(disabled, true),
      updated_at = now()
  where id = target;
end;
$$;

drop function if exists public.ops_delete_user(uuid);
create function public.ops_delete_user(target uuid)
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  is_admin boolean;
begin
  select exists(
    select 1
    from public.profiles me
    where me.id = auth.uid()
      and me.role = 'admin'
  ) into is_admin;

  if not is_admin then
    raise exception 'not authorized';
  end if;

  if target = auth.uid() then
    raise exception 'cannot delete self';
  end if;

  delete from auth.users where id = target;
end;
$$;

grant execute on function public.ops_set_user_disabled(uuid, boolean) to authenticated;
grant execute on function public.ops_delete_user(uuid) to authenticated;

commit;
