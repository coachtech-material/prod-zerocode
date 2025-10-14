-- Add last_active_at to profiles to track app-side activity
alter table public.profiles
  add column if not exists last_active_at timestamptz;

