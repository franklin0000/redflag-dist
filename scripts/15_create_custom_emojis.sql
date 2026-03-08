-- Create custom_emojis table
create table public.custom_emojis (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users not null,
  name text not null,
  svg_content text not null, -- Store the SVG string directly
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table public.custom_emojis enable row level security;

-- Policies
create policy "Users can insert their own emojis"
  on public.custom_emojis for insert
  with check (auth.uid() = user_id);

create policy "Users can view their own emojis"
  on public.custom_emojis for select
  using (auth.uid() = user_id);

create policy "Users can delete their own emojis"
  on public.custom_emojis for delete
  using (auth.uid() = user_id);

-- Optional: If emojis are shared in chat, we might need a public read policy or specific logic.
-- For now, let's assume they are sent as stickers (SVGs) in the message content, so the receiver doesn't need to query this table.
-- This table is just for the creator's "My Stickers" library.
