-- ==========================================
-- 1. Storage Buckets
-- ==========================================
insert into storage.buckets (id, name, public) 
values 
  ('media', 'media', true),
  ('chat-attachments', 'chat-attachments', false),
  ('avatars', 'avatars', true)
on conflict (id) do nothing;

-- Enable RLS on Storage
alter table storage.objects enable row level security;

-- Storage Policies
create policy "Media Public Read" on storage.objects for select using ( bucket_id = 'media' );
create policy "Media Auth Upload" on storage.objects for insert with check ( bucket_id = 'media' and auth.role() = 'authenticated' );

create policy "Chat Auth Read" on storage.objects for select using ( bucket_id = 'chat-attachments' and auth.role() = 'authenticated' );
create policy "Chat Auth Upload" on storage.objects for insert with check ( bucket_id = 'chat-attachments' and auth.role() = 'authenticated' );

create policy "Avatar Public Read" on storage.objects for select using ( bucket_id = 'avatars' );
create policy "Avatar Auth Upload" on storage.objects for insert with check ( bucket_id = 'avatars' and auth.role() = 'authenticated' );


-- ==========================================
-- 2. Tables & Schema
-- ==========================================

-- USERS (Extends auth.users mainly, but we sync profiles usually. 
-- Assuming 'users' table exists as a public profile table linked to auth.users)
create table if not exists public.users (
  id uuid references auth.users on delete cascade primary key,
  email text,
  name text,
  username text unique,
  photo_url text,
  is_verified boolean default false,
  is_verified_web3 boolean default false,
  wallet_address text,
  followers_count int default 0,
  following_count int default 0,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- DATING PROFILES
create table if not exists public.dating_profiles (
  user_id uuid references public.users(id) on delete cascade primary key,
  bio text,
  age int,
  height text,
  location text,
  interests text[],
  photos text[], -- Legacy array
  media jsonb default '{}'::jsonb, -- New media structure { photos: [], videos: [], voice: [] }
  profile_data jsonb default '{}'::jsonb, -- Flexible data (lookingFor, zodiac, etc)
  safety_score int default 100,
  compatibility int default 0, -- Calculated/Cached
  last_active timestamp with time zone default timezone('utc'::text, now())
);

-- MATCHES
create table if not exists public.matches (
  id uuid default gen_random_uuid() primary key,
  user1_id uuid references public.users(id) on delete cascade,
  user2_id uuid references public.users(id) on delete cascade,
  status text default 'pending', -- pending, matched, rejected, superliked
  created_at timestamp with time zone default timezone('utc'::text, now()),
  unique(user1_id, user2_id)
);

-- MESSAGES
create table if not exists public.messages (
  id uuid default gen_random_uuid() primary key,
  match_id uuid references public.matches(id) on delete cascade,
  sender_id uuid references public.users(id) on delete cascade,
  content text,
  media_url text,
  type text default 'text', -- text, image, voice
  is_read boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- POSTS (Community)
create table if not exists public.posts (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.users(id) on delete cascade,
  content text,
  image_url text, -- or media_url
  media_url text,
  likes_count int default 0,
  comments_count int default 0,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- FOLLOWS
create table if not exists public.follows (
  follower_id uuid references public.users(id) on delete cascade,
  following_id uuid references public.users(id) on delete cascade,
  created_at timestamp with time zone default timezone('utc'::text, now()),
  primary key (follower_id, following_id)
);

-- REPORTS (Red Flag Reports)
create table if not exists public.reports (
  id uuid default gen_random_uuid() primary key,
  reporter_id uuid references public.users(id) on delete set null,
  reported_id uuid references public.users(id) on delete cascade,
  reason text,
  description text,
  evidence_url text,
  ipfs_hash text,
  status text default 'pending',
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- ==========================================
-- 3. Row Level Security (RLS)
-- ==========================================

-- Enable RLS on all tables
alter table public.users enable row level security;
alter table public.dating_profiles enable row level security;
alter table public.matches enable row level security;
alter table public.messages enable row level security;
alter table public.posts enable row level security;
alter table public.follows enable row level security;
alter table public.reports enable row level security;

-- Policies (Simplified for MVP, refine for Prod)

-- USERS
create policy "Public profiles are viewable by everyone" on public.users for select using (true);
create policy "Users can insert their own profile" on public.users for insert with check (auth.uid() = id);
create policy "Users can update own profile" on public.users for update using (auth.uid() = id);

-- DATING PROFILES
create policy "Dating profiles are viewable by everyone" on public.dating_profiles for select using (true);
create policy "Users can update own dating profile" on public.dating_profiles for update using (auth.uid() = user_id);
create policy "Users can insert own dating profile" on public.dating_profiles for insert with check (auth.uid() = user_id);

-- POSTS
create policy "Posts are viewable by everyone" on public.posts for select using (true);
create policy "Users can create posts" on public.posts for insert with check (auth.uid() = user_id);

-- MESSAGES
-- Only allow participants of the match to read messages. 
-- Complex logic usually, for MVP strict:
create policy "Users can read messages they are part of" on public.messages for select 
using (auth.uid() = sender_id or auth.uid() in (select user1_id from matches where id = match_id) or auth.uid() in (select user2_id from matches where id = match_id));

create policy "Users can send messages" on public.messages for insert with check (auth.uid() = sender_id);

-- REPORTS
create policy "Anyone can create reports" on public.reports for insert with check (auth.role() = 'authenticated');
create policy "Reports are viewable by everyone" on public.reports for select using (true); -- Public rap sheet as requested

-- MATCHES
create policy "Users can see their own matches" on public.matches for select using (auth.uid() = user1_id or auth.uid() = user2_id);
create policy "Users can create matches" on public.matches for insert with check (auth.role() = 'authenticated');

-- FOLLOWS
create policy "Public follows" on public.follows for select using (true);
create policy "Users can follow" on public.follows for insert with check (auth.uid() = follower_id);
create policy "Users can unfollow" on public.follows for delete using (auth.uid() = follower_id);
