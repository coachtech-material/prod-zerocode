-- Add mode column to tests for confirm test type
alter table public.tests
  add column if not exists mode text check (mode in ('fill_blank','semantic_fill','fix','reorder'));
