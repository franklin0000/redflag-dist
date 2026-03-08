-- Add lat/lng to dating_profiles (without PostGIS)
ALTER TABLE public.dating_profiles
    ADD COLUMN IF NOT EXISTS lat double precision,
    ADD COLUMN IF NOT EXISTS lng double precision;

CREATE INDEX IF NOT EXISTS dating_profiles_lat_lng_idx
    ON public.dating_profiles (lat, lng)
    WHERE lat IS NOT NULL AND lng IS NOT NULL;
