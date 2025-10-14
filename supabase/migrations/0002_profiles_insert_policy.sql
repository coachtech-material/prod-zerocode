-- Allow authenticated users to insert their own profile
create policy profiles_self_insert
on public.profiles for insert
to authenticated
with check ( id = auth.uid() );
