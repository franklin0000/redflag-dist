-- Fix messages table to support both anonymous community chat and dating chat.
-- chatService.js uses room_id, nickname, avatar, iv, is_encrypted, attachment, expires_at
-- The previous schema (match_id NOT NULL) was incompatible.

-- 1. Drop old messages table (it was unusable due to schema mismatch)
DROP TABLE IF EXISTS public.messages CASCADE;

-- 2. Create unified messages table compatible with chatService.js
CREATE TABLE public.messages (
    id          uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
    room_id     text        NOT NULL,           -- 'women', 'men', or dating match ID
    sender_id   uuid        REFERENCES public.users(id) ON DELETE SET NULL,
    content     text,                           -- AES-256-GCM ciphertext (or plain text)
    iv          text,                           -- Encryption IV (hex)
    is_encrypted boolean    DEFAULT false,
    nickname    text,                           -- Anonymous display name
    avatar      text,                           -- Emoji avatar
    attachment  jsonb,                          -- { url, type, name } or null
    type        text        DEFAULT 'text',
    expires_at  timestamptz,                    -- Auto-expire for community rooms (24h)
    created_at  timestamptz DEFAULT now() NOT NULL
);

-- 3. Index for fast room queries
CREATE INDEX messages_room_id_idx ON public.messages(room_id, created_at ASC);

-- 4. Enable Row Level Security
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies

-- Anyone authenticated can read messages in any room
CREATE POLICY "Authenticated users can read messages"
    ON public.messages FOR SELECT
    USING (auth.role() = 'authenticated');

-- Authenticated users can insert messages
-- sender_id must match their uid (or be null for fully anonymous)
CREATE POLICY "Authenticated users can send messages"
    ON public.messages FOR INSERT
    WITH CHECK (
        auth.role() = 'authenticated'
        AND (sender_id IS NULL OR sender_id = (SELECT auth.uid()))
    );

-- 6. Enable realtime for this table
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
