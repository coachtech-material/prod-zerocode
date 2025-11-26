begin;

create table if not exists public.test_results (
  id uuid primary key default gen_random_uuid(),
  test_id uuid not null references public.tests(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  is_passed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists test_results_test_user_key on public.test_results (test_id, user_id);

alter table public.test_results enable row level security;

grant select, insert, update, delete on public.test_results to authenticated;
grant select on public.test_results to anon;

drop policy if exists test_results_select_self on public.test_results;
create policy test_results_select_self on public.test_results
  for select
  using (auth.uid() = user_id);

drop policy if exists test_results_modify_self on public.test_results;
create policy test_results_modify_self on public.test_results
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create trigger trg_test_results_updated_at
  before update on public.test_results
  for each row
  execute function public.handle_timestamp_update();

commit;
