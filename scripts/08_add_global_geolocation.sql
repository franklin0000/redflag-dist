-- =============================================================================
-- MIGRATION: 08_add_global_geolocation.sql
-- Enables PostGIS and adds location features to dating profiles
-- Run this in Supabase SQL Editor
-- =============================================================================

-- 1. Enable PostGIS Extension
CREATE EXTENSION IF NOT EXISTS postgis SCHEMA extensions;

-- 2. Add Geolocation columns to dating_profiles table
ALTER TABLE public.dating_profiles
  ADD COLUMN IF NOT EXISTS lat double precision,
  ADD COLUMN IF NOT EXISTS lng double precision,
  ADD COLUMN IF NOT EXISTS location_point geometry(POINT, 4326);

-- 3. Create a trigger function to automatically update the PostGIS POINT
-- whenever the lat and lng columns change.
CREATE OR REPLACE FUNCTION public.set_location_point()
RETURNS trigger AS $$
BEGIN
  IF NEW.lat IS NOT NULL AND NEW.lng IS NOT NULL THEN
    NEW.location_point := st_setsrid(st_makepoint(NEW.lng, NEW.lat), 4326);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. Create trigger
DROP TRIGGER IF EXISTS update_profile_location ON public.dating_profiles;
CREATE TRIGGER update_profile_location
  BEFORE INSERT OR UPDATE OF lat, lng
  ON public.dating_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.set_location_point();

-- 5. Create Spatial Index for faster distance queries
CREATE INDEX IF NOT EXISTS dating_profiles_location_idx
  ON public.dating_profiles
  USING GIST (location_point);

-- 6. RPC Function: get_matches_by_distance
-- Allows the frontend to fetch profiles ordered by distance,
-- with an optional max distance for "Local" search mode.
-- If max_distance_meters is NULL, it searches globally (ordering by distance anyway).

CREATE OR REPLACE FUNCTION get_matches_by_distance(
  user_lat double precision,
  user_lng double precision,
  exclude_ids uuid[],
  max_distance_meters integer DEFAULT NULL,
  limit_count integer DEFAULT 50
)
RETURNS TABLE (
  profile_id uuid,
  user_id uuid,
  bio text,
  age integer,
  height text,
  location text,
  interests text[],
  photos text[],
  media jsonb,
  safety_score integer,
  profile_data jsonb,
  lat double precision,
  lng double precision,
  distance_meters double precision
) AS $$
DECLARE
  target_point geometry;
BEGIN
  -- Create the starting point
  target_point := st_setsrid(st_makepoint(user_lng, user_lat), 4326);

  RETURN QUERY
  SELECT 
    dp.id as profile_id,
    dp.user_id,
    dp.bio,
    dp.age,
    dp.height,
    dp.location,
    dp.interests,
    dp.photos,
    dp.media,
    dp.safety_score,
    dp.profile_data,
    dp.lat,
    dp.lng,
    -- Calculate distance in meters using PostGIS ST_Distance
    ST_Distance(dp.location_point::geography, target_point::geography) as distance_meters
  FROM public.dating_profiles dp
  WHERE 
    dp.lat IS NOT NULL AND dp.lng IS NOT NULL
    AND NOT (dp.user_id = ANY(exclude_ids))
    -- Filter by distance if max_distance is provided (e.g., 50km = 50000)
    AND (
      max_distance_meters IS NULL 
      OR ST_DWithin(dp.location_point::geography, target_point::geography, max_distance_meters)
    )
  ORDER BY 
    ST_Distance(dp.location_point::geography, target_point::geography) ASC
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_matches_by_distance(double precision, double precision, uuid[], integer, integer) TO authenticated;
