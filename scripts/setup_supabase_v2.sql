-- 1. Create Storage Buckets (Safe Insert)
insert into storage.buckets (id, name, public) 
values 
  ('media', 'media', true),
  ('chat-attachments', 'chat-attachments', false),
  ('avatars', 'avatars', true)
on conflict (id) do nothing;

-- 2. Policies (Drop first to avoid errors, then recreate)
-- MEDIA
drop policy if exists "Media Public Read" on storage.objects;
create policy "Media Public Read" on storage.objects for select using ( bucket_id = 'media' );

drop policy if exists "Media Auth Upload" on storage.objects;
create policy "Media Auth Upload" on storage.objects for insert with check ( bucket_id = 'media' and auth.role() = 'authenticated' );

-- CHAT
drop policy if exists "Chat Auth Read" on storage.objects;
create policy "Chat Auth Read" on storage.objects for select using ( bucket_id = 'chat-attachments' and auth.role() = 'authenticated' );

drop policy if exists "Chat Auth Upload" on storage.objects;
create policy "Chat Auth Upload" on storage.objects for insert with check ( bucket_id = 'chat-attachments' and auth.role() = 'authenticated' );

-- AVATARS
drop policy if exists "Avatar Public Read" on storage.objects;
create policy "Avatar Public Read" on storage.objects for select using ( bucket_id = 'avatars' );

drop policy if exists "Avatar Auth Upload" on storage.objects;
create policy "Avatar Auth Upload" on storage.objects for insert with check ( bucket_id = 'avatars' and auth.role() = 'authenticated' );

-- 3. Create Reports Table (Safe Create)
create table if not exists public.reports (
  id uuid default gen_random_uuid() primary key,
  reporter_id uuid references auth.users(id),
  reported_id uuid references auth.users(id),
  reason text,
  description text,
  evidence_url text,
  ipfs_hash text,
  status text default 'pending',
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- Enable RLS on Reports (This is a public table, so you ARE the owner)
alter table public.reports enable row level security;

-- Reports Policies
drop policy if exists "Reports Public Read" on public.reports;
create policy "Reports Public Read" on public.reports for select using (true);

drop policy if exists "Reports Auth Insert" on public.reports;
create policy "Reports Auth Insert" on public.reports for insert with check (auth.role() = 'authenticated');
