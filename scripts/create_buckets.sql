-- Create Storage Buckets
insert into storage.buckets (id, name, public) values ('media', 'media', true);
insert into storage.buckets (id, name, public) values ('chat-attachments', 'chat-attachments', false);
insert into storage.buckets (id, name, public) values ('avatars', 'avatars', true);

-- Enable RLS
alter table storage.objects enable row level security;

-- Policy: Media Bucket (Public Read, Auth Write)
create policy "Media Public Read"
on storage.objects for select
using ( bucket_id = 'media' );

create policy "Media Auth Upload"
on storage.objects for insert
with check ( bucket_id = 'media' and auth.role() = 'authenticated' );

-- Policy: Chat Attachments (Auth Read/Write)
create policy "Chat Auth Read"
on storage.objects for select
using ( bucket_id = 'chat-attachments' and auth.role() = 'authenticated' );

create policy "Chat Auth Upload"
on storage.objects for insert
with check ( bucket_id = 'chat-attachments' and auth.role() = 'authenticated' );

-- Policy: Avatars (Public Read, Auth Write)
create policy "Avatar Public Read"
on storage.objects for select
using ( bucket_id = 'avatars' );

create policy "Avatar Auth Upload"
on storage.objects for insert
with check ( bucket_id = 'avatars' and auth.role() = 'authenticated' );
