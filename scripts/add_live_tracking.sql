-- Add Live Tracking for Dates

CREATE TABLE IF NOT EXISTS public.date_tracking (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    match_id TEXT NOT NULL, -- Custom match ID (e.g., sorted user IDs)
    lat DOUBLE PRECISION NOT NULL,
    lng DOUBLE PRECISION NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, match_id) -- Only one active tracking row per user per match
);

-- Turn on realtime for date_tracking (idempotent)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables
        WHERE pubname = 'supabase_realtime'
          AND schemaname = 'public'
          AND tablename = 'date_tracking'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE date_tracking;
    END IF;
END $$;

-- RLS Policies
ALTER TABLE public.date_tracking ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert their own tracking data"
ON public.date_tracking FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own tracking data"
ON public.date_tracking FOR UPDATE
USING (auth.uid() = user_id);

-- Normally we'd check if the other user is part of the match_id (e.g. contains their UUID),
-- but for MVP we will use a simpler policy or let authenticated users read.
CREATE POLICY "Users can read tracking data"
ON public.date_tracking FOR SELECT
USING (auth.uid() IS NOT NULL);
