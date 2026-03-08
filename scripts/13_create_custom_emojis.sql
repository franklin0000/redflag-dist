-- Create custom_emojis table
create table if not exists public.custom_emojis (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  layers jsonb not null,
  svg_content text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table public.custom_emojis enable row level security;

-- Policies
create policy "Users can view their own emojis"
  on public.custom_emojis for select
  using (auth.uid() = user_id);

create policy "Users can insert their own emojis"
  on public.custom_emojis for insert
  with check (auth.uid() = user_id);

create policy "Users can delete their own emojis"
  on public.custom_emojis for delete
  using (auth.uid() = user_id);
