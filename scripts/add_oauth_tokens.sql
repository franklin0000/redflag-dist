-- Migration to add OAuth tokens support to Supabase

CREATE TABLE IF NOT EXISTS public.user_oauth_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    provider TEXT NOT NULL,
    access_token TEXT NOT NULL,
    refresh_token TEXT,
    expires_at TIMESTAMPTZ,
    scope TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, provider)
);

-- RLS Policies
ALTER TABLE public.user_oauth_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own tokens"
    ON public.user_oauth_tokens
    FOR SELECT
    USING (auth.uid() = user_id);

-- Normally, users shouldn't update their own tokens directly (done via Edge Functions),
-- but for simplicity in MVP we might allow it or restrict it to service role only.
-- Edge Functions bypass RLS.
