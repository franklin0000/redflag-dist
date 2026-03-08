-- Create LIKES table
create table if not exists public.likes (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.users(id) on delete cascade not null,
  post_id uuid references public.posts(id) on delete cascade not null,
  created_at timestamp with time zone default timezone('utc'::text, now()),
  unique(user_id, post_id)
);

-- Create COMMENTS table
create table if not exists public.comments (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.users(id) on delete cascade not null,
  post_id uuid references public.posts(id) on delete cascade not null,
  content text not null,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- Enable RLS
alter table public.likes enable row level security;
alter table public.comments enable row level security;

-- LIKES Policies
create policy "Likes are viewable by everyone" on public.likes for select using (true);
create policy "Users can insert their own likes" on public.likes for insert with check (auth.uid() = user_id);
create policy "Users can delete their own likes" on public.likes for delete using (auth.uid() = user_id);

-- COMMENTS Policies
create policy "Comments are viewable by everyone" on public.comments for select using (true);
create policy "Users can insert their own comments" on public.comments for insert with check (auth.uid() = user_id);
create policy "Users can delete their own comments" on public.comments for delete using (auth.uid() = user_id);
