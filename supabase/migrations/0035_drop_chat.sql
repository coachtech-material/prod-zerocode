begin;

-- Drop chat trigger functions (if any)
drop function if exists public.chat_notify cascade;
drop function if exists public.chat_message_notify cascade;

-- Drop chat tables (order based on FK dependencies)
drop table if exists public.chat_message_reads cascade;
drop table if exists public.chat_messages cascade;
drop table if exists public.chat_conversations cascade;
drop table if exists public.chat_attachments cascade;

-- Remove chat storage bucket
delete from storage.buckets where id = 'chat_attachments';

commit;
