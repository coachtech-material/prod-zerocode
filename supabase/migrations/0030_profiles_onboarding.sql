begin;

alter table public.profiles
  add column if not exists onboarding_step integer not null default 0,
  add column if not exists onboarding_completed boolean not null default false;

commit;
