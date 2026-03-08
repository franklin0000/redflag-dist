-- Create SafeRide Sessions Table

CREATE TABLE IF NOT EXISTS public.saferide_sessions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    sender_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    receiver_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    match_id TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'requested', -- requested, accepted, en_route, arrived, completed, cancelled
    
    -- Destination details (The Date Spot)
    dest_name TEXT NOT NULL,
    dest_address TEXT NOT NULL,
    dest_lat DOUBLE PRECISION NOT NULL,
    dest_lng DOUBLE PRECISION NOT NULL,
    
    -- Pickup Details (Only visible to receiver, driver, system)
    pickup_address TEXT,
    pickup_lat DOUBLE PRECISION,
    pickup_lng DOUBLE PRECISION,
    
    -- Simulated Car Data (Animated position)
    car_lat DOUBLE PRECISION,
    car_lng DOUBLE PRECISION,
    eta_minutes INTEGER,
    
    -- Simulated Driver Info
    driver_name TEXT,
    car_model TEXT,
    license_plate TEXT,

    -- Uber API metadata (request_id, etc.)
    meta_data JSONB DEFAULT '{}'::jsonb,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Realtime (idempotent)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables
        WHERE pubname = 'supabase_realtime'
          AND schemaname = 'public'
          AND tablename = 'saferide_sessions'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE saferide_sessions;
    END IF;
END $$;

-- RLS
ALTER TABLE public.saferide_sessions ENABLE ROW LEVEL SECURITY;

-- Allow insert if authenticated
CREATE POLICY "Users can create saferides"
ON public.saferide_sessions FOR INSERT
WITH CHECK (auth.uid() = sender_id OR auth.uid() = receiver_id);

-- Allow reading if involved
CREATE POLICY "Users can read own saferides"
ON public.saferide_sessions FOR SELECT
USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

-- Allow updates if involved
CREATE POLICY "Users can update own saferides"
ON public.saferide_sessions FOR UPDATE
USING (auth.uid() = sender_id OR auth.uid() = receiver_id);
