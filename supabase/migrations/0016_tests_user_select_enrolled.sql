-- Restrict user-selectable tests to published ones in courses they are enrolled in
drop policy if exists tests_select_published_user on public.tests;
create policy tests_select_user_published_enrolled on public.tests
for select to authenticated
using (
  status = 'published'
  and deleted_at is null
  and (
    course_id is null
    or exists (
      select 1 from public.enrollments e
      where e.user_id = auth.uid()
        and e.course_id = public.tests.course_id
        and e.status = 'active'
    )
  )
);

