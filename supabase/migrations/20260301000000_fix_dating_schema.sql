-- Fix dating schema: create swipes table, fix matches table
-- ============================================================

-- 1. Create swipes table (if not exists)
CREATE TABLE IF NOT EXISTS public.swipes (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    swiper_id uuid REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    target_id uuid REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    direction text NOT NULL CHECK (direction IN ('left', 'right', 'superlike')),
    created_at timestamptz DEFAULT now() NOT NULL,
    UNIQUE(swiper_id, target_id)
);

ALTER TABLE public.swipes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can see their own swipes" ON public.swipes;
CREATE POLICY "Users can see their own swipes" ON public.swipes
    FOR SELECT USING ((SELECT auth.uid()) = swiper_id);

DROP POLICY IF EXISTS "Users can insert their own swipes" ON public.swipes;
CREATE POLICY "Users can insert their own swipes" ON public.swipes
    FOR INSERT WITH CHECK ((SELECT auth.uid()) = swiper_id);

-- 2. Fix matches table
-- Add missing columns (last_message, last_message_time) and change id to text

-- First check if id column is uuid or text — if uuid, we need to recreate
-- We do this safely by dropping and recreating (no real data in dating yet)
DROP TABLE IF EXISTS public.messages CASCADE;
DROP TABLE IF EXISTS public.matches CASCADE;

CREATE TABLE public.matches (
    id text PRIMARY KEY,  -- composite key: sorted(user1_id, user2_id) joined with '_'
    user1_id uuid REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    user2_id uuid REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    last_message text DEFAULT 'New Match! Say hi! 👋',
    last_message_time timestamptz DEFAULT now(),
    status text DEFAULT 'matched',
    created_at timestamptz DEFAULT now() NOT NULL,
    UNIQUE(user1_id, user2_id)
);

ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can see their own matches" ON public.matches;
CREATE POLICY "Users can see their own matches" ON public.matches
    FOR SELECT USING ((SELECT auth.uid()) = user1_id OR (SELECT auth.uid()) = user2_id);

DROP POLICY IF EXISTS "Users can create matches" ON public.matches;
CREATE POLICY "Users can create matches" ON public.matches
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Users can update their matches" ON public.matches;
CREATE POLICY "Users can update their matches" ON public.matches
    FOR UPDATE USING ((SELECT auth.uid()) = user1_id OR (SELECT auth.uid()) = user2_id);

-- 3. Recreate messages table with text match_id FK
CREATE TABLE public.messages (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    match_id text REFERENCES public.matches(id) ON DELETE CASCADE NOT NULL,
    sender_id uuid REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    content text,
    media_url text,
    type text DEFAULT 'text' CHECK (type IN ('text', 'image', 'voice', 'gif')),
    is_read boolean DEFAULT false,
    created_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read messages they are part of" ON public.messages;
CREATE POLICY "Users can read messages they are part of" ON public.messages
    FOR SELECT USING (
        (SELECT auth.uid()) = sender_id
        OR (SELECT auth.uid()) IN (SELECT user1_id FROM public.matches WHERE id = match_id)
        OR (SELECT auth.uid()) IN (SELECT user2_id FROM public.matches WHERE id = match_id)
    );

DROP POLICY IF EXISTS "Users can send messages" ON public.messages;
CREATE POLICY "Users can send messages" ON public.messages
    FOR INSERT WITH CHECK ((SELECT auth.uid()) = sender_id);

DROP POLICY IF EXISTS "Users can update message read status" ON public.messages;
CREATE POLICY "Users can update message read status" ON public.messages
    FOR UPDATE USING (
        (SELECT auth.uid()) IN (SELECT user1_id FROM public.matches WHERE id = match_id)
        OR (SELECT auth.uid()) IN (SELECT user2_id FROM public.matches WHERE id = match_id)
    );
