-- Allow authenticated users to select any published test regardless of enrollment
drop policy if exists tests_select_user_published_enrolled on public.tests;
drop policy if exists tests_select_published_user on public.tests;
create policy tests_select_published_user on public.tests
for select to authenticated
using (
  status = 'published' and deleted_at is null
);

