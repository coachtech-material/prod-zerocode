-- Allow authenticated enrolled users to read published chapter/section metadata

-- Recreate safely (DROP IF EXISTS, then CREATE)
drop policy if exists chapters_select_user_published_enrolled on public.chapters;
create policy chapters_select_user_published_enrolled on public.chapters
for select to authenticated
using (
  status = 'published'
  and deleted_at is null
  and exists (
    select 1 from public.enrollments e
    where e.user_id = auth.uid()
      and e.course_id = chapters.course_id
      and e.status = 'active'
  )
);

drop policy if exists lessons_select_user_published_enrolled on public.lessons;
-- Note: This policy permits enrolled users to read lesson metadata for listing.
-- Keep content access gated at the application level, or split content into a separate table for stricter RLS.
create policy lessons_select_user_published_enrolled on public.lessons
for select to authenticated
using (
  status = 'published'
  and lessons.deleted_at is null
  and exists (
    select 1 from public.enrollments e
    where e.user_id = auth.uid()
      and e.course_id = lessons.course_id
      and e.status = 'active'
  )
);
