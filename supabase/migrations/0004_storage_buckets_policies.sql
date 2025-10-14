-- Create public buckets for lesson assets and thumbnails
insert into storage.buckets (id, name, public)
values ('lesson-assets', 'lesson-assets', true)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('thumbnails', 'thumbnails', true)
on conflict (id) do nothing;

-- Policies for storage.objects
-- Allow public read on these buckets
create policy storage_public_read on storage.objects
for select to public
using ( bucket_id in ('lesson-assets', 'thumbnails') );

-- Only staff/admin can write (insert/update) to these buckets
create policy storage_write_staff_admin on storage.objects
for insert to authenticated
with check (
  bucket_id in ('lesson-assets', 'thumbnails') and
  exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('staff','admin'))
);

create policy storage_update_staff_admin on storage.objects
for update to authenticated
using (
  bucket_id in ('lesson-assets', 'thumbnails') and
  exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('staff','admin'))
)
with check (
  bucket_id in ('lesson-assets', 'thumbnails') and
  exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('staff','admin'))
);

-- Only admin can delete
create policy storage_delete_admin on storage.objects
for delete to authenticated
using (
  bucket_id in ('lesson-assets', 'thumbnails') and
  exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
);

