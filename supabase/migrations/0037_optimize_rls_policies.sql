begin;

-- Profiles
drop policy if exists profiles_self_select on public.profiles;
drop policy if exists profiles_self_update on public.profiles;
drop policy if exists profiles_self_insert on public.profiles;
drop policy if exists profiles_select_self on public.profiles;
drop policy if exists profiles_update_self on public.profiles;
drop policy if exists profiles_insert_self on public.profiles;

create policy profiles_select_self on public.profiles
for select
to authenticated
using ( id = (select auth.uid()) );

create policy profiles_update_self on public.profiles
for update
to authenticated
using ( id = (select auth.uid()) )
with check ( id = (select auth.uid()) );

create policy profiles_insert_self on public.profiles
for insert
to authenticated
with check ( id = (select auth.uid()) );

-- Courses
drop policy if exists courses_select_staff_admin on public.courses;
drop policy if exists courses_select_user on public.courses;
drop policy if exists courses_select_published_all on public.courses;
drop policy if exists courses_select_authenticated on public.courses;

create policy courses_select_authenticated on public.courses
for select
to authenticated
using (
  status = 'published'
  and deleted_at is null
);

create policy courses_select_staff_admin on public.courses
for select
to authenticated
using (
  exists (
    select 1
    from public.profiles p
    where p.id = (select auth.uid())
      and p.role in ('staff','admin')
  )
);

drop policy if exists courses_insert_staff_admin on public.courses;
create policy courses_insert_staff_admin on public.courses
for insert
to authenticated
with check (
  exists (
    select 1
    from public.profiles p
    where p.id = (select auth.uid())
      and p.role in ('staff','admin')
  )
);

drop policy if exists courses_update_staff_admin on public.courses;
create policy courses_update_staff_admin on public.courses
for update
to authenticated
using (
  exists (
    select 1
    from public.profiles p
    where p.id = (select auth.uid())
      and p.role in ('staff','admin')
  )
)
with check (
  exists (
    select 1
    from public.profiles p
    where p.id = (select auth.uid())
      and p.role in ('staff','admin')
  )
);

drop policy if exists courses_delete_admin on public.courses;
create policy courses_delete_admin on public.courses
for delete
to authenticated
using (
  exists (
    select 1
    from public.profiles p
    where p.id = (select auth.uid())
      and p.role = 'admin'
  )
);

-- Chapters
drop policy if exists chapters_select_staff_admin on public.chapters;
drop policy if exists chapters_select_user_published_all on public.chapters;
drop policy if exists chapters_select_authenticated on public.chapters;

create policy chapters_select_authenticated on public.chapters
for select
to authenticated
using (
  exists (
    select 1
    from public.profiles p
    where p.id = (select auth.uid())
      and p.role in ('staff','admin')
  )
  or (
    status = 'published'
    and deleted_at is null
  )
);

drop policy if exists chapters_insert_staff_admin on public.chapters;
create policy chapters_insert_staff_admin on public.chapters
for insert
to authenticated
with check (
  exists (
    select 1
    from public.profiles p
    where p.id = (select auth.uid())
      and p.role in ('staff','admin')
  )
);

drop policy if exists chapters_update_staff_admin on public.chapters;
create policy chapters_update_staff_admin on public.chapters
for update
to authenticated
using (
  exists (
    select 1
    from public.profiles p
    where p.id = (select auth.uid())
      and p.role in ('staff','admin')
  )
)
with check (
  exists (
    select 1
    from public.profiles p
    where p.id = (select auth.uid())
      and p.role in ('staff','admin')
  )
);

drop policy if exists chapters_delete_admin on public.chapters;
create policy chapters_delete_admin on public.chapters
for delete
to authenticated
using (
  exists (
    select 1
    from public.profiles p
    where p.id = (select auth.uid())
      and p.role = 'admin'
  )
);

-- Lessons
drop policy if exists lessons_select_staff_admin on public.lessons;
drop policy if exists lessons_select_user on public.lessons;
drop policy if exists lessons_select_user_published_all on public.lessons;
drop policy if exists lessons_select_authenticated on public.lessons;

create policy lessons_select_authenticated on public.lessons
for select
to authenticated
using (
  status = 'published'
  and public.lessons.deleted_at is null
);

create policy lessons_select_staff_admin on public.lessons
for select
to authenticated
using (
  exists (
    select 1
    from public.profiles p
    where p.id = (select auth.uid())
      and p.role in ('staff','admin')
  )
);

drop policy if exists lessons_insert_staff_admin on public.lessons;
create policy lessons_insert_staff_admin on public.lessons
for insert
to authenticated
with check (
  exists (
    select 1
    from public.profiles p
    where p.id = (select auth.uid())
      and p.role in ('staff','admin')
  )
);

drop policy if exists lessons_update_staff_admin on public.lessons;
create policy lessons_update_staff_admin on public.lessons
for update
to authenticated
using (
  exists (
    select 1
    from public.profiles p
    where p.id = (select auth.uid())
      and p.role in ('staff','admin')
  )
)
with check (
  exists (
    select 1
    from public.profiles p
    where p.id = (select auth.uid())
      and p.role in ('staff','admin')
  )
);

drop policy if exists lessons_delete_admin on public.lessons;
create policy lessons_delete_admin on public.lessons
for delete
to authenticated
using (
  exists (
    select 1
    from public.profiles p
    where p.id = (select auth.uid())
      and p.role = 'admin'
  )
);

-- Enrollments
drop policy if exists enrollments_select_self on public.enrollments;
drop policy if exists enrollments_select_staff_admin on public.enrollments;
drop policy if exists enrollments_select_authenticated on public.enrollments;

create policy enrollments_select_authenticated on public.enrollments
for select
to authenticated
using (
  public.enrollments.user_id = (select auth.uid())
  or exists (
    select 1
    from public.profiles p
    where p.id = (select auth.uid())
      and p.role in ('staff','admin')
  )
);

drop policy if exists enrollments_insert_self on public.enrollments;
drop policy if exists enrollments_insert_staff_admin on public.enrollments;
drop policy if exists enrollments_insert_authenticated on public.enrollments;

create policy enrollments_insert_authenticated on public.enrollments
for insert
to authenticated
with check (
  public.enrollments.user_id = (select auth.uid())
  or exists (
    select 1
    from public.profiles p
    where p.id = (select auth.uid())
      and p.role in ('staff','admin')
  )
);

drop policy if exists enrollments_update_self on public.enrollments;
drop policy if exists enrollments_update_staff_admin on public.enrollments;
drop policy if exists enrollments_update_authenticated on public.enrollments;

create policy enrollments_update_authenticated on public.enrollments
for update
to authenticated
using (
  public.enrollments.user_id = (select auth.uid())
  or exists (
    select 1
    from public.profiles p
    where p.id = (select auth.uid())
      and p.role in ('staff','admin')
  )
)
with check (
  public.enrollments.user_id = (select auth.uid())
  or exists (
    select 1
    from public.profiles p
    where p.id = (select auth.uid())
      and p.role in ('staff','admin')
  )
);

-- Progress
drop policy if exists progress_select_self on public.progress;
drop policy if exists progress_select_staff_admin on public.progress;
drop policy if exists progress_select_authenticated on public.progress;

create policy progress_select_authenticated on public.progress
for select
to authenticated
using (
  public.progress.user_id = (select auth.uid())
  or exists (
    select 1
    from public.profiles p
    where p.id = (select auth.uid())
      and p.role in ('staff','admin')
  )
);

drop policy if exists progress_insert_self on public.progress;
drop policy if exists progress_insert_staff_admin on public.progress;
drop policy if exists progress_insert_authenticated on public.progress;

create policy progress_insert_authenticated on public.progress
for insert
to authenticated
with check (
  public.progress.user_id = (select auth.uid())
  or exists (
    select 1
    from public.profiles p
    where p.id = (select auth.uid())
      and p.role in ('staff','admin')
  )
);

drop policy if exists progress_update_self on public.progress;
drop policy if exists progress_update_staff_admin on public.progress;
drop policy if exists progress_update_authenticated on public.progress;

create policy progress_update_authenticated on public.progress
for update
to authenticated
using (
  public.progress.user_id = (select auth.uid())
  or exists (
    select 1
    from public.profiles p
    where p.id = (select auth.uid())
      and p.role in ('staff','admin')
  )
)
with check (
  public.progress.user_id = (select auth.uid())
  or exists (
    select 1
    from public.profiles p
    where p.id = (select auth.uid())
      and p.role in ('staff','admin')
  )
);

-- Tests
drop policy if exists tests_select_staff_admin on public.tests;
drop policy if exists tests_select_published_user on public.tests;
drop policy if exists tests_select_authenticated on public.tests;

create policy tests_select_authenticated on public.tests
for select
to authenticated
using (
  status = 'published'
  and deleted_at is null
);

create policy tests_select_staff_admin on public.tests
for select
to authenticated
using (
  exists (
    select 1
    from public.profiles p
    where p.id = (select auth.uid())
      and p.role in ('staff','admin')
  )
);

drop policy if exists tests_insert_staff_admin on public.tests;
create policy tests_insert_staff_admin on public.tests
for insert
to authenticated
with check (
  exists (
    select 1
    from public.profiles p
    where p.id = (select auth.uid())
      and p.role in ('staff','admin')
  )
);

drop policy if exists tests_update_staff_admin on public.tests;
create policy tests_update_staff_admin on public.tests
for update
to authenticated
using (
  exists (
    select 1
    from public.profiles p
    where p.id = (select auth.uid())
      and p.role in ('staff','admin')
  )
)
with check (
  exists (
    select 1
    from public.profiles p
    where p.id = (select auth.uid())
      and p.role in ('staff','admin')
  )
);

drop policy if exists tests_delete_admin on public.tests;
create policy tests_delete_admin on public.tests
for delete
to authenticated
using (
  exists (
    select 1
    from public.profiles p
    where p.id = (select auth.uid())
      and p.role = 'admin'
  )
);

-- Test assets
drop policy if exists test_assets_select_staff_admin on public.test_assets;
create policy test_assets_select_staff_admin on public.test_assets
for select
to authenticated
using (
  exists (
    select 1
    from public.profiles p
    where p.id = (select auth.uid())
      and p.role in ('staff','admin')
  )
);

drop policy if exists test_assets_insert_staff_admin on public.test_assets;
create policy test_assets_insert_staff_admin on public.test_assets
for insert
to authenticated
with check (
  exists (
    select 1
    from public.profiles p
    where p.id = (select auth.uid())
      and p.role in ('staff','admin')
  )
);

drop policy if exists test_assets_update_staff_admin on public.test_assets;
create policy test_assets_update_staff_admin on public.test_assets
for update
to authenticated
using (
  exists (
    select 1
    from public.profiles p
    where p.id = (select auth.uid())
      and p.role in ('staff','admin')
  )
)
with check (
  exists (
    select 1
    from public.profiles p
    where p.id = (select auth.uid())
      and p.role in ('staff','admin')
  )
);

drop policy if exists test_assets_delete_admin on public.test_assets;
create policy test_assets_delete_admin on public.test_assets
for delete
to authenticated
using (
  exists (
    select 1
    from public.profiles p
    where p.id = (select auth.uid())
      and p.role = 'admin'
  )
);

-- Categories (learning reports)
drop policy if exists categories_select_own on public.categories;
drop policy if exists categories_modify_own on public.categories;
drop policy if exists categories_select_authenticated on public.categories;
drop policy if exists categories_insert_authenticated on public.categories;
drop policy if exists categories_update_authenticated on public.categories;
drop policy if exists categories_delete_authenticated on public.categories;

create policy categories_select_authenticated on public.categories
for select
to authenticated
using ( user_id = (select auth.uid()) );

create policy categories_insert_authenticated on public.categories
for insert
to authenticated
with check ( user_id = (select auth.uid()) );

create policy categories_update_authenticated on public.categories
for update
to authenticated
using ( user_id = (select auth.uid()) )
with check ( user_id = (select auth.uid()) );

create policy categories_delete_authenticated on public.categories
for delete
to authenticated
using ( user_id = (select auth.uid()) );

-- Daily reports
drop policy if exists daily_reports_select_own on public.daily_reports;
drop policy if exists daily_reports_modify_own on public.daily_reports;
drop policy if exists daily_reports_select_authenticated on public.daily_reports;
drop policy if exists daily_reports_insert_authenticated on public.daily_reports;
drop policy if exists daily_reports_update_authenticated on public.daily_reports;
drop policy if exists daily_reports_delete_authenticated on public.daily_reports;

create policy daily_reports_select_authenticated on public.daily_reports
for select
to authenticated
using ( user_id = (select auth.uid()) );

create policy daily_reports_insert_authenticated on public.daily_reports
for insert
to authenticated
with check ( user_id = (select auth.uid()) );

create policy daily_reports_update_authenticated on public.daily_reports
for update
to authenticated
using ( user_id = (select auth.uid()) )
with check ( user_id = (select auth.uid()) );

create policy daily_reports_delete_authenticated on public.daily_reports
for delete
to authenticated
using ( user_id = (select auth.uid()) );

-- Daily report items
drop policy if exists daily_report_items_select_own on public.daily_report_items;
drop policy if exists daily_report_items_modify_own on public.daily_report_items;
drop policy if exists daily_report_items_select_authenticated on public.daily_report_items;
drop policy if exists daily_report_items_insert_authenticated on public.daily_report_items;
drop policy if exists daily_report_items_update_authenticated on public.daily_report_items;
drop policy if exists daily_report_items_delete_authenticated on public.daily_report_items;

create policy daily_report_items_select_authenticated on public.daily_report_items
for select
to authenticated
using (
  exists (
    select 1
    from public.daily_reports dr
    where dr.id = public.daily_report_items.daily_report_id
      and dr.user_id = (select auth.uid())
  )
);

create policy daily_report_items_insert_authenticated on public.daily_report_items
for insert
to authenticated
with check (
  exists (
    select 1
    from public.daily_reports dr
    where dr.id = public.daily_report_items.daily_report_id
      and dr.user_id = (select auth.uid())
  )
);

create policy daily_report_items_update_authenticated on public.daily_report_items
for update
to authenticated
using (
  exists (
    select 1
    from public.daily_reports dr
    where dr.id = public.daily_report_items.daily_report_id
      and dr.user_id = (select auth.uid())
  )
)
with check (
  exists (
    select 1
    from public.daily_reports dr
    where dr.id = public.daily_report_items.daily_report_id
      and dr.user_id = (select auth.uid())
  )
);

create policy daily_report_items_delete_authenticated on public.daily_report_items
for delete
to authenticated
using (
  exists (
    select 1
    from public.daily_reports dr
    where dr.id = public.daily_report_items.daily_report_id
      and dr.user_id = (select auth.uid())
  )
);

-- Monthly goals
drop policy if exists monthly_goals_select_own on public.monthly_goals;
drop policy if exists monthly_goals_modify_own on public.monthly_goals;
drop policy if exists monthly_goals_select_authenticated on public.monthly_goals;
drop policy if exists monthly_goals_insert_authenticated on public.monthly_goals;
drop policy if exists monthly_goals_update_authenticated on public.monthly_goals;
drop policy if exists monthly_goals_delete_authenticated on public.monthly_goals;

create policy monthly_goals_select_authenticated on public.monthly_goals
for select
to authenticated
using ( user_id = (select auth.uid()) );

create policy monthly_goals_insert_authenticated on public.monthly_goals
for insert
to authenticated
with check ( user_id = (select auth.uid()) );

create policy monthly_goals_update_authenticated on public.monthly_goals
for update
to authenticated
using ( user_id = (select auth.uid()) )
with check ( user_id = (select auth.uid()) );

create policy monthly_goals_delete_authenticated on public.monthly_goals
for delete
to authenticated
using ( user_id = (select auth.uid()) );

commit;
