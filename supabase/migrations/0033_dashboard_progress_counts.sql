create or replace function public.dashboard_progress_counts()
returns table (
  total_sections bigint,
  completed_sections bigint,
  total_tests bigint,
  passed_tests bigint
)
security definer
set search_path = public
language plpgsql
as $$
declare
  uid uuid := auth.uid();
  has_test_results boolean := false;
  section_totals record;
  tests_total bigint := 0;
  tests_passed bigint := 0;
begin
  if uid is null then
    return query select 0::bigint, 0::bigint, 0::bigint, 0::bigint;
    return;
  end if;

  with visible_sections as (
    select l.id
    from public.lessons l
    join public.courses c on c.id = l.course_id
    left join public.chapters ch on ch.id = l.chapter_id
    where l.status = 'published'
      and l.deleted_at is null
      and c.status = 'published'
      and c.deleted_at is null
      and (
        ch.id is null
        or (ch.status = 'published' and ch.deleted_at is null)
      )
  )
  select
    coalesce(
      (select count(*)::bigint from visible_sections),
      0::bigint
    ) as total_sections,
    coalesce(
      (
        select count(*)::bigint
        from public.progress p
        join visible_sections vs on vs.id = p.lesson_id
        where p.user_id = uid
          and p.is_completed is true
      ),
      0::bigint
    ) as completed_sections
  into section_totals;

  select coalesce(count(*), 0)::bigint
  into tests_total
  from (
    select t.id
    from public.tests t
    left join public.courses c on c.id = t.course_id
    left join public.chapters ch on ch.id = t.chapter_id
    where t.status = 'published'
      and t.deleted_at is null
      and t.mode is not null
      and (
        t.course_id is null
        or (
          c.status = 'published'
          and c.deleted_at is null
        )
      )
      and (
        t.chapter_id is null
        or (
          ch.status = 'published'
          and ch.deleted_at is null
        )
      )
  ) as visible_tests;

  select to_regclass('public.test_results') is not null
  into has_test_results;

  if has_test_results then
    select coalesce(count(distinct tr.test_id), 0)::bigint
    into tests_passed
    from public.test_results tr
    join (
      select t.id
      from public.tests t
      left join public.courses c on c.id = t.course_id
      left join public.chapters ch on ch.id = t.chapter_id
      where t.status = 'published'
        and t.deleted_at is null
        and t.mode is not null
        and (
          t.course_id is null
          or (
            c.status = 'published'
            and c.deleted_at is null
          )
        )
        and (
          t.chapter_id is null
          or (
            ch.status = 'published'
            and ch.deleted_at is null
          )
        )
    ) vt on vt.id = tr.test_id
    where tr.user_id = uid
      and tr.is_passed is true
      ;
  else
    tests_passed := 0;
  end if;

  return query select
    coalesce(section_totals.total_sections, 0::bigint),
    coalesce(section_totals.completed_sections, 0::bigint),
    coalesce(tests_total, 0::bigint),
    coalesce(tests_passed, 0::bigint);
end;
$$;
