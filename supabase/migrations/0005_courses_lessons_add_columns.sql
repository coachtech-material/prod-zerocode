-- Add requested columns to courses
alter table public.courses
  add column if not exists sort_key int not null default 0,
  add column if not exists overview_video_url text;

-- Add duration_min to lessons for duration aggregates
alter table public.lessons
  add column if not exists duration_min int not null default 0;

