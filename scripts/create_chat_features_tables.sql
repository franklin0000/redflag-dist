-- ==========================================
-- Chat Features: Blocked Users & Muted Chats
-- Run this in Supabase SQL Editor
-- ==========================================

-- BLOCKED USERS
create table if not exists public.blocked_users (
  id uuid default gen_random_uuid() primary key,
  blocker_id uuid references auth.users(id) on delete cascade not null,
  blocked_id uuid references auth.users(id) on delete cascade not null,
  created_at timestamp with time zone default timezone('utc'::text, now()),
  unique(blocker_id, blocked_id)
);

alter table public.blocked_users enable row level security;

-- Users can see their own blocks
create policy "Users can view own blocks" on public.blocked_users
  for select using (auth.uid() = blocker_id);

-- Users can block others
create policy "Users can block" on public.blocked_users
  for insert with check (auth.uid() = blocker_id);

-- Users can unblock
create policy "Users can unblock" on public.blocked_users
  for delete using (auth.uid() = blocker_id);


-- MUTED CHATS
create table if not exists public.muted_chats (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  match_id text not null,  -- The chat room ID (sorted user IDs)
  muted_until timestamp with time zone, -- null = forever, or specific date
  created_at timestamp with time zone default timezone('utc'::text, now()),
  unique(user_id, match_id)
);

alter table public.muted_chats enable row level security;

-- Users can see their own mutes
create policy "Users can view own mutes" on public.muted_chats
  for select using (auth.uid() = user_id);

-- Users can mute
create policy "Users can mute" on public.muted_chats
  for insert with check (auth.uid() = user_id);

-- Users can unmute
create policy "Users can unmute" on public.muted_chats
  for delete using (auth.uid() = user_id);
