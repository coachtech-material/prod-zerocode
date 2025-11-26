begin;

alter table public.tests
  add column if not exists test_sort_key int not null default 0;

create index if not exists tests_course_sort_key_idx on public.tests (course_id, test_sort_key);

commit;
