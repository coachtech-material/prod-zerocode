-- Enable needed extensions
create extension if not exists pgcrypto;

-- Helper: role checks via profiles
-- Note: We rely on application-maintained public.profiles.role

-- Tables
create table if not exists public.courses (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description_md text,
  thumbnail_url text,
  status text not null default 'draft' check (status in ('draft','published')),
  version int not null default 1,
  published_at timestamptz,
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists public.lessons (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  title text not null,
  content_md text,
  video_url text,
  pdf_url text,
  order_index int not null default 0,
  status text not null default 'draft' check (status in ('draft','published')),
  published_at timestamptz,
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists public.enrollments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete cascade,
  status text not null default 'active' check (status in ('active','completed','dropped')),
  enrolled_at timestamptz not null default now(),
  unique (user_id, course_id)
);

create table if not exists public.progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete cascade,
  lesson_id uuid not null references public.lessons(id) on delete cascade,
  is_unlocked boolean not null default false,
  is_completed boolean not null default false,
  updated_at timestamptz not null default now(),
  unique (user_id, lesson_id)
);

-- Enable RLS
alter table public.courses enable row level security;
alter table public.lessons enable row level security;
alter table public.enrollments enable row level security;
alter table public.progress enable row level security;

-- Deny by default
revoke all on public.courses from public;
revoke all on public.lessons from public;
revoke all on public.enrollments from public;
revoke all on public.progress from public;

-- Helper expressions
-- staff_or_admin: user has role in ('staff','admin')
-- admin_only: user has role = 'admin'

-- Courses policies
create policy courses_select_staff_admin on public.courses
for select to authenticated
using (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role in ('staff','admin')
  )
);

create policy courses_select_user on public.courses
for select to authenticated
using (
  status = 'published'
  and exists (
    select 1 from public.enrollments e
    where e.user_id = auth.uid() and e.course_id = id and e.status = 'active'
  )
);

create policy courses_insert_staff_admin on public.courses
for insert to authenticated
with check (
  exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('staff','admin'))
);

create policy courses_update_staff_admin on public.courses
for update to authenticated
using (
  exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('staff','admin'))
)
with check (
  exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('staff','admin'))
);

create policy courses_delete_admin on public.courses
for delete to authenticated
using (
  exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
);

-- Lessons policies
create policy lessons_select_staff_admin on public.lessons
for select to authenticated
using (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role in ('staff','admin')
  )
);

create policy lessons_select_user on public.lessons
for select to authenticated
using (
  status = 'published'
  and exists (
    select 1 from public.enrollments e
    where e.user_id = auth.uid() and e.course_id = lessons.course_id and e.status = 'active'
  )
  and exists (
    select 1 from public.progress pr
    where pr.user_id = auth.uid() and pr.lesson_id = lessons.id and pr.is_unlocked is true
  )
);

create policy lessons_insert_staff_admin on public.lessons
for insert to authenticated
with check (
  exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('staff','admin'))
);

create policy lessons_update_staff_admin on public.lessons
for update to authenticated
using (
  exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('staff','admin'))
)
with check (
  exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('staff','admin'))
);

create policy lessons_delete_admin on public.lessons
for delete to authenticated
using (
  exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
);

-- Enrollments policies (MVP):
-- users can select/insert/update their own; staff/admin can select/update/insert all
create policy enrollments_select_self on public.enrollments
for select to authenticated
using ( user_id = auth.uid() );

create policy enrollments_select_staff_admin on public.enrollments
for select to authenticated
using ( exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('staff','admin')) );

create policy enrollments_insert_self on public.enrollments
for insert to authenticated
with check ( user_id = auth.uid() );

create policy enrollments_insert_staff_admin on public.enrollments
for insert to authenticated
with check ( exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('staff','admin')) );

create policy enrollments_update_self on public.enrollments
for update to authenticated
using ( user_id = auth.uid() )
with check ( user_id = auth.uid() );

create policy enrollments_update_staff_admin on public.enrollments
for update to authenticated
using ( exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('staff','admin')) )
with check ( exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('staff','admin')) );

-- Progress policies (MVP):
create policy progress_select_self on public.progress
for select to authenticated
using ( user_id = auth.uid() );

create policy progress_select_staff_admin on public.progress
for select to authenticated
using ( exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('staff','admin')) );

create policy progress_insert_self on public.progress
for insert to authenticated
with check ( user_id = auth.uid() );

create policy progress_insert_staff_admin on public.progress
for insert to authenticated
with check ( exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('staff','admin')) );

create policy progress_update_self on public.progress
for update to authenticated
using ( user_id = auth.uid() )
with check ( user_id = auth.uid() );

create policy progress_update_staff_admin on public.progress
for update to authenticated
using ( exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('staff','admin')) )
with check ( exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('staff','admin')) );

