-- Enable extension if needed
-- create extension if not exists pgcrypto;

-- profiles table
create table if not exists public.profiles(
  id uuid primary key references auth.users(id) on delete cascade,
  role text check (role in ('user','staff','admin')) not null default 'user',
  full_name text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Enable RLS
alter table public.profiles enable row level security;

-- Revoke default privileges
revoke all on public.profiles from public;

-- Policies: self can select/update own profile
create policy profiles_self_select
on public.profiles for select
to authenticated
using ( id = auth.uid() );

create policy profiles_self_update
on public.profiles for update
to authenticated
using ( id = auth.uid() )
with check ( id = auth.uid() );

-- Note: Role updates are allowed by application-side checks (admin only).
-- For production hardening, consider SECURITY DEFINER functions and finer policies.

