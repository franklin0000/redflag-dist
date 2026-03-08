-- ==========================================
-- Fix Messages Table for Community & Dating Chat
-- ==========================================
-- Run this in Supabase Dashboard -> SQL Editor -> New Query

-- Step 1: Drop existing table
DROP TABLE IF EXISTS public.messages CASCADE;

-- Step 2: Create complete messages table
-- NOTE: No foreign keys on match_id/sender_id to avoid type conflicts
CREATE TABLE public.messages (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  
  -- Dating chat: match_id is a constructed string like "userId1_userId2"
  match_id text,
  sender_id text,
  
  -- Community chat: room_id is 'women', 'men', etc.
  room_id text,
  
  -- Message content (may be encrypted)
  content text,
  iv text,
  is_encrypted boolean DEFAULT false,
  
  -- Anonymous identity for community chat
  nickname text,
  avatar text,
  
  -- Attachments
  attachment jsonb,
  media_url text,
  
  -- Metadata
  type text DEFAULT 'text',
  is_read boolean DEFAULT false,
  expires_at timestamptz,
  
  created_at timestamptz DEFAULT timezone('utc'::text, now())
);

-- Step 3: Indexes
CREATE INDEX idx_messages_room_id ON public.messages (room_id);
CREATE INDEX idx_messages_match_id ON public.messages (match_id);
CREATE INDEX idx_messages_created_at ON public.messages (created_at);

-- Step 4: Enable RLS
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Step 5: RLS Policies
CREATE POLICY "Read community messages" ON public.messages FOR SELECT
  USING (room_id IS NOT NULL AND auth.role() = 'authenticated');

CREATE POLICY "Send community messages" ON public.messages FOR INSERT
  WITH CHECK (room_id IS NOT NULL AND auth.role() = 'authenticated');

CREATE POLICY "Read match messages" ON public.messages FOR SELECT
  USING (match_id IS NOT NULL AND auth.role() = 'authenticated');

CREATE POLICY "Send match messages" ON public.messages FOR INSERT
  WITH CHECK (match_id IS NOT NULL AND auth.role() = 'authenticated');
