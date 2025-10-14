-- Chapters table
create table if not exists public.chapters (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  title text not null,
  chapter_sort_key int not null default 0,
  status text not null default 'draft' check (status in ('draft','published')),
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

alter table public.chapters enable row level security;
revoke all on public.chapters from public;

-- RLS policies for chapters
create policy chapters_select_staff_admin on public.chapters
for select to authenticated
using ( exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('staff','admin')) );

create policy chapters_insert_staff_admin on public.chapters
for insert to authenticated
with check ( exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('staff','admin')) );

create policy chapters_update_staff_admin on public.chapters
for update to authenticated
using ( exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('staff','admin')) )
with check ( exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('staff','admin')) );

create policy chapters_delete_admin on public.chapters
for delete to authenticated
using ( exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin') );

-- Lessons as sections: add chapter linkage and section_sort_key
alter table public.lessons
  add column if not exists chapter_id uuid references public.chapters(id),
  add column if not exists section_sort_key int not null default 0;

