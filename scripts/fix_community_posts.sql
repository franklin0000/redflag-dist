-- =============================================================================
-- FIX: Community Posts — Add missing columns + create RPC functions
-- Run this in Supabase SQL Editor (Dashboard → SQL Editor → New Query)
-- =============================================================================

-- ── 1. Add missing columns to posts table ────────────────────────────────────

ALTER TABLE public.posts
  ADD COLUMN IF NOT EXISTS room_id   text,
  ADD COLUMN IF NOT EXISTS media_type text,
  ADD COLUMN IF NOT EXISTS media_name text,
  ADD COLUMN IF NOT EXISTS reactions  jsonb DEFAULT '{"❤️":0,"👏":0,"😢":0,"😡":0}'::jsonb,
  ADD COLUMN IF NOT EXISTS replies    jsonb DEFAULT '[]'::jsonb;

-- ── 2. Add missing columns to users table ────────────────────────────────────

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS gender    text,
  ADD COLUMN IF NOT EXISTS is_paid   boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS settings  jsonb DEFAULT '{}'::jsonb;

-- ── 3. RPC: increment_reaction ────────────────────────────────────────────────
-- Called by CommunityRoom when a user reacts to a post with an emoji.

CREATE OR REPLACE FUNCTION increment_reaction(post_id uuid, emoji text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_reactions jsonb;
  current_count     int;
BEGIN
  SELECT COALESCE(reactions, '{"❤️":0,"👏":0,"😢":0,"😡":0}'::jsonb)
    INTO current_reactions
    FROM public.posts
   WHERE id = post_id;

  current_count := COALESCE((current_reactions ->> emoji)::int, 0);

  UPDATE public.posts
     SET reactions = current_reactions || jsonb_build_object(emoji, current_count + 1)
   WHERE id = post_id;
END;
$$;

GRANT EXECUTE ON FUNCTION increment_reaction(uuid, text) TO authenticated;

-- ── 4. RPC: add_reply ─────────────────────────────────────────────────────────
-- Called by CommunityRoom when a user replies to a post.

CREATE OR REPLACE FUNCTION add_reply(post_id uuid, reply_data jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.posts
     SET replies = COALESCE(replies, '[]'::jsonb) || jsonb_build_array(reply_data)
   WHERE id = post_id;
END;
$$;

GRANT EXECUTE ON FUNCTION add_reply(uuid, jsonb) TO authenticated;

-- ── 5. RLS policy: allow users to update reactions/replies on posts ───────────

DROP POLICY IF EXISTS "Users can update posts reactions" ON public.posts;
CREATE POLICY "Users can update posts reactions"
  ON public.posts FOR UPDATE
  USING (true)  -- any authenticated user can update (reactions/replies)
  WITH CHECK (auth.role() = 'authenticated');

-- ── 6. RLS: allow users to delete their own posts ────────────────────────────

DROP POLICY IF EXISTS "Users can delete their own posts" ON public.posts;
CREATE POLICY "Users can delete their own posts"
  ON public.posts FOR DELETE
  USING (auth.uid() = user_id);

-- ── 7. Index on room_id for faster feed queries ───────────────────────────────

CREATE INDEX IF NOT EXISTS posts_room_id_idx ON public.posts (room_id, created_at DESC);

-- ── DONE ─────────────────────────────────────────────────────────────────────
-- After running this script, community posts, reactions, and replies should
-- work correctly. No app code changes needed.
