-- Relax user select policies: allow authenticated users to see published chapters/lessons regardless of enrollment

-- Chapters: drop enrolled-only policy and allow published for all authenticated users
drop policy if exists chapters_select_user_published_enrolled on public.chapters;
create policy chapters_select_user_published_all on public.chapters
for select to authenticated
using (
  status = 'published'
  and deleted_at is null
);

-- Lessons: drop enrolled-only policy and allow published for all authenticated users
drop policy if exists lessons_select_user_published_enrolled on public.lessons;
create policy lessons_select_user_published_all on public.lessons
for select to authenticated
using (
  status = 'published'
  and public.lessons.deleted_at is null
);

