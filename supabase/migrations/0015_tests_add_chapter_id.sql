-- Add chapter association to tests and supporting index
alter table public.tests
  add column if not exists chapter_id uuid references public.chapters(id);

create index if not exists idx_tests_course_chapter on public.tests(course_id, chapter_id);

