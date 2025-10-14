begin;

-- Remove chat attachment objects if necessary (optional safety check)
delete from storage.objects where bucket_id = 'chat_attachments';

-- Remove the chat storage bucket
delete from storage.buckets where id = 'chat_attachments';

commit;
