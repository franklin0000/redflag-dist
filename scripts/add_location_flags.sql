-- Migration for Community Location Flags Map
CREATE TABLE IF NOT EXISTS public.location_flags (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    place_id TEXT NOT NULL,
    place_name TEXT NOT NULL,
    lat NUMERIC NOT NULL,
    lng NUMERIC NOT NULL,
    flag_type TEXT NOT NULL CHECK (flag_type IN ('red', 'green')),
    comment TEXT,
    media JSONB DEFAULT '[]'::jsonb,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Realtime (idempotent)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables
        WHERE pubname = 'supabase_realtime'
          AND schemaname = 'public'
          AND tablename = 'location_flags'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.location_flags;
    END IF;
END $$;

-- Set up Row Level Security
ALTER TABLE public.location_flags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view flags" 
    ON public.location_flags
    FOR SELECT 
    USING (true);

CREATE POLICY "Authenticated users can insert flags" 
    ON public.location_flags
    FOR INSERT 
    WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Users can delete their own flags"
    ON public.location_flags
    FOR DELETE
    USING (auth.uid() = user_id);
