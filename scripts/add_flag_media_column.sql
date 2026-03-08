-- Add media column to location_flags for multimedia uploads (photos, audio, documents)
ALTER TABLE public.location_flags 
ADD COLUMN IF NOT EXISTS media JSONB DEFAULT '[]'::jsonb;
