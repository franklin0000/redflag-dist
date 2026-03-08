-- Geo-matching RPC: returns dating profiles sorted by distance from user
-- Uses Haversine formula (no PostGIS dependency required)

CREATE OR REPLACE FUNCTION get_matches_by_distance(
    user_lat        DOUBLE PRECISION,
    user_lng        DOUBLE PRECISION,
    exclude_ids     UUID[],
    max_distance_meters INTEGER DEFAULT NULL,
    limit_count     INTEGER DEFAULT 50
)
RETURNS TABLE (
    user_id         UUID,
    name            TEXT,
    age             INTEGER,
    bio             TEXT,
    photos          TEXT[],
    interests       TEXT[],
    safety_score    INTEGER,
    location        TEXT,
    lat             DOUBLE PRECISION,
    lng             DOUBLE PRECISION,
    distance_meters DOUBLE PRECISION,
    is_paid         BOOLEAN,
    gender          TEXT
)
LANGUAGE SQL
STABLE
SECURITY DEFINER
AS $$
    SELECT
        dp.user_id,
        u.name,
        dp.age,
        dp.bio,
        dp.photos,
        dp.interests,
        dp.safety_score,
        dp.location,
        dp.lat,
        dp.lng,
        -- Haversine formula (result in meters), clamped to prevent acos domain errors
        (6371000.0 * acos(
            LEAST(1.0, GREATEST(-1.0,
                cos(radians(user_lat)) * cos(radians(dp.lat))
                * cos(radians(dp.lng) - radians(user_lng))
                + sin(radians(user_lat)) * sin(radians(dp.lat))
            ))
        ))::DOUBLE PRECISION AS distance_meters,
        u.is_paid,
        u.gender
    FROM dating_profiles dp
    JOIN users u ON u.id = dp.user_id
    WHERE
        -- Exclude swiped profiles and self
        (exclude_ids IS NULL OR dp.user_id <> ALL(exclude_ids))
        -- Must have GPS coordinates
        AND dp.lat IS NOT NULL
        AND dp.lng IS NOT NULL
        -- Distance filter (null = global, no limit)
        AND (
            max_distance_meters IS NULL
            OR (6371000.0 * acos(
                LEAST(1.0, GREATEST(-1.0,
                    cos(radians(user_lat)) * cos(radians(dp.lat))
                    * cos(radians(dp.lng) - radians(user_lng))
                    + sin(radians(user_lat)) * sin(radians(dp.lat))
                ))
            )) <= max_distance_meters
        )
    ORDER BY distance_meters ASC
    LIMIT limit_count;
$$;

-- Grant execution to authenticated users
GRANT EXECUTE ON FUNCTION get_matches_by_distance TO authenticated;
GRANT EXECUTE ON FUNCTION get_matches_by_distance TO anon;

-- Also add unread_counts helper: returns count of unread messages per match
CREATE OR REPLACE FUNCTION get_unread_count(
    p_room_id   TEXT,
    p_user_id   UUID,
    p_since     TIMESTAMPTZ DEFAULT NULL
)
RETURNS INTEGER
LANGUAGE SQL
STABLE
SECURITY DEFINER
AS $$
    SELECT COUNT(*)::INTEGER
    FROM messages
    WHERE
        room_id = p_room_id
        AND sender_id <> p_user_id
        AND (p_since IS NULL OR created_at > p_since);
$$;

GRANT EXECUTE ON FUNCTION get_unread_count TO authenticated;
