-- Refresh PostgREST schema/config cache (Supabase REST API)
select pg_notify('pgrst', 'reload schema');
select pg_notify('pgrst', 'reload config');

