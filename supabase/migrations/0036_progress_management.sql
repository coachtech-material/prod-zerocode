-- Add interview completion flag
alter table public.profiles
  add column if not exists interview_completed boolean default false;

alter table public.profiles
  alter column interview_completed set not null;

-- Create progress limits table
create table if not exists public.progress_limits (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  chapter_id uuid not null references public.chapters(id) on delete cascade,
  section_id uuid not null references public.lessons(id) on delete cascade,
  created_at timestamptz not null default now(),
  created_by uuid references public.profiles(id)
);

create unique index if not exists progress_limits_section_idx on public.progress_limits(section_id);

alter table public.progress_limits enable row level security;

drop policy if exists progress_limits_select_any on public.progress_limits;
create policy progress_limits_select_any on public.progress_limits
  for select
  to authenticated
  using (true);

drop policy if exists progress_limits_insert_staff on public.progress_limits;
create policy progress_limits_insert_staff on public.progress_limits
  for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.profiles me
      where me.id = auth.uid()
        and me.role in ('staff','admin')
    )
  );

drop policy if exists progress_limits_delete_staff on public.progress_limits;
create policy progress_limits_delete_staff on public.progress_limits
  for delete
  to authenticated
  using (
    exists (
      select 1
      from public.profiles me
      where me.id = auth.uid()
        and me.role in ('staff','admin')
    )
  );

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
  ops_tagged boolean,
  interview_completed boolean
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
         coalesce(p.ops_tagged, false) as ops_tagged,
         coalesce(p.interview_completed, false) as interview_completed
  from public.profiles p
  left join auth.users u on u.id = p.id
  where exists (
    select 1 from public.profiles me where me.id = auth.uid() and me.role in ('staff','admin')
  )
  and p.role = 'user';
$$;

grant execute on function public.ops_list_users_with_status() to authenticated;

drop policy if exists profiles_staff_admin_update on public.profiles;
create policy profiles_staff_admin_update on public.profiles
  for update
to authenticated
using (
  exists (
    select 1 from public.profiles me
    where me.id = auth.uid()
      and me.role in ('staff','admin')
  )
)
with check (
  exists (
    select 1 from public.profiles me
    where me.id = auth.uid()
      and me.role in ('staff','admin')
  )
);
