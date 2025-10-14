-- Daily learning reports schema

create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  color text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists categories_user_name_key on public.categories (user_id, lower(name));

create table if not exists public.daily_reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  report_date date not null,
  reflection_text text,
  total_minutes integer not null default 0 check (total_minutes >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists daily_reports_user_date_key on public.daily_reports (user_id, report_date);

create table if not exists public.daily_report_items (
  id uuid primary key default gen_random_uuid(),
  daily_report_id uuid not null references public.daily_reports(id) on delete cascade,
  category_id uuid references public.categories(id) on delete set null,
  category_name text not null,
  note text,
  minutes integer not null check (minutes > 0),
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists daily_report_items_report_idx on public.daily_report_items (daily_report_id, sort_order);

create table if not exists public.monthly_goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  year integer not null,
  month integer not null check (month between 1 and 12),
  text text not null,
  target_minutes integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, year, month)
);

alter table public.categories enable row level security;
alter table public.daily_reports enable row level security;
alter table public.daily_report_items enable row level security;
alter table public.monthly_goals enable row level security;

create or replace function public.handle_timestamp_update()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists categories_set_updated_at on public.categories;
create trigger categories_set_updated_at
before update on public.categories
for each row execute procedure public.handle_timestamp_update();

drop trigger if exists daily_reports_set_updated_at on public.daily_reports;
create trigger daily_reports_set_updated_at
before update on public.daily_reports
for each row execute procedure public.handle_timestamp_update();

drop trigger if exists monthly_goals_set_updated_at on public.monthly_goals;
create trigger monthly_goals_set_updated_at
before update on public.monthly_goals
for each row execute procedure public.handle_timestamp_update();

-- RLS policies

drop policy if exists "categories_select_own" on public.categories;
create policy "categories_select_own" on public.categories
  for select using (auth.uid() = user_id);

drop policy if exists "categories_modify_own" on public.categories;
create policy "categories_modify_own" on public.categories
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "daily_reports_select_own" on public.daily_reports;
create policy "daily_reports_select_own" on public.daily_reports
  for select using (auth.uid() = user_id);

drop policy if exists "daily_reports_modify_own" on public.daily_reports;
create policy "daily_reports_modify_own" on public.daily_reports
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "daily_report_items_select_own" on public.daily_report_items;
create policy "daily_report_items_select_own" on public.daily_report_items
  for select using (
    exists (
      select 1 from public.daily_reports dr
      where dr.id = daily_report_items.daily_report_id
        and dr.user_id = auth.uid()
    )
  );

drop policy if exists "daily_report_items_modify_own" on public.daily_report_items;
create policy "daily_report_items_modify_own" on public.daily_report_items
  for all using (
    exists (
      select 1 from public.daily_reports dr
      where dr.id = daily_report_items.daily_report_id
        and dr.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.daily_reports dr
      where dr.id = daily_report_items.daily_report_id
        and dr.user_id = auth.uid()
    )
  );

drop policy if exists "monthly_goals_select_own" on public.monthly_goals;
create policy "monthly_goals_select_own" on public.monthly_goals
  for select using (auth.uid() = user_id);

drop policy if exists "monthly_goals_modify_own" on public.monthly_goals;
create policy "monthly_goals_modify_own" on public.monthly_goals
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
