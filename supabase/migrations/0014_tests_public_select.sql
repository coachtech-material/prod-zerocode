-- Allow authenticated learners to read published tests
create policy tests_select_published_user on public.tests
for select to authenticated
using (
  status = 'published' and deleted_at is null
);

