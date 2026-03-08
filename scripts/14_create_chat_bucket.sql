
-- Create a new storage bucket for chat attachments
insert into storage.buckets (id, name, public)
values ('chat-attachments', 'chat-attachments', true)
on conflict (id) do nothing;

-- Allow public access to view files
create policy "Public Access"
  on storage.objects for select
  using ( bucket_id = 'chat-attachments' );

-- Allow authenticated users to upload files
create policy "Authenticated Uploads"
  on storage.objects for insert
  with check ( bucket_id = 'chat-attachments' and auth.role() = 'authenticated' );

-- Allow users to delete their own files (optional but good practice)
create policy "Users can delete own files"
  on storage.objects for delete
  using ( bucket_id = 'chat-attachments' and auth.uid() = owner );
