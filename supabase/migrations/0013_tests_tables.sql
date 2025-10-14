create table if not exists public.tests (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  course_id uuid references public.courses(id),
  type text not null check (type in ('cli','git','db','docker','php','laravel')),
  description_md text,
  time_limit_sec int not null default 60,
  pass_threshold int not null default 80,
  status text not null default 'draft' check (status in ('draft','published')),
  spec_yaml text,
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists public.test_assets (
  id uuid primary key default gen_random_uuid(),
  test_id uuid not null references public.tests(id) on delete cascade,
  name text not null,
  url text not null,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

alter table public.tests enable row level security;
alter table public.test_assets enable row level security;

-- staff/admin can select/insert/update; admin can delete. Soft delete via deleted_at.
create policy tests_select_staff_admin on public.tests for select to authenticated using (
  exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('staff','admin'))
);
create policy tests_insert_staff_admin on public.tests for insert to authenticated with check (
  exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('staff','admin'))
);
create policy tests_update_staff_admin on public.tests for update to authenticated using (
  exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('staff','admin'))
) with check (
  exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('staff','admin'))
);
create policy tests_delete_admin on public.tests for delete to authenticated using (
  exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
);

create policy test_assets_select_staff_admin on public.test_assets for select to authenticated using (
  exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('staff','admin'))
);
create policy test_assets_insert_staff_admin on public.test_assets for insert to authenticated with check (
  exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('staff','admin'))
);
create policy test_assets_update_staff_admin on public.test_assets for update to authenticated using (
  exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('staff','admin'))
) with check (
  exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('staff','admin'))
);
create policy test_assets_delete_admin on public.test_assets for delete to authenticated using (
  exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
);

