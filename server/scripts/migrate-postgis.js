require('dotenv').config();
const db = require('../db');

async function applyPostGIS() {
  console.log('Applying PostGIS extension and spatial indexes...');
  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Enable PostGIS
    await client.query('CREATE EXTENSION IF NOT EXISTS postgis;');

    // 2. Add Geography column to users and dating_profiles
    // We retain lat/lng for backwards compatibility and add `geom` for PostGIS queries.
    await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS geom GEOGRAPHY(Point, 4326);`);
    await client.query(`ALTER TABLE dating_profiles ADD COLUMN IF NOT EXISTS geom GEOGRAPHY(Point, 4326);`);

    // Backfill existing coordinates into the geom column
    await client.query(`UPDATE users SET geom = ST_SetSRID(ST_MakePoint(lng, lat), 4326) WHERE lat IS NOT NULL AND lng IS NOT NULL;`);
    await client.query(`UPDATE dating_profiles SET geom = ST_SetSRID(ST_MakePoint(lng, lat), 4326) WHERE lat IS NOT NULL AND lng IS NOT NULL;`);

    // 3. Create GIST Spatial Indexes
    console.log('Creating GIST indexes...');
    await client.query(`CREATE INDEX IF NOT EXISTS idx_users_geom ON users USING GIST (geom);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_dating_profiles_geom ON dating_profiles USING GIST (geom);`);

    // 4. Update Geo Match function to use ST_Distance and ST_DWithin (100x faster than Haversine)
    console.log('Replacing get_matches_by_distance with PostGIS implementation...');
    await client.query(`
      CREATE OR REPLACE FUNCTION get_matches_by_distance(
        p_user_id UUID,
        p_lat DOUBLE PRECISION,
        p_lng DOUBLE PRECISION,
        p_max_km INTEGER DEFAULT 100,
        p_limit INTEGER DEFAULT 50
      ) RETURNS TABLE (
        user_id UUID, name TEXT, age INTEGER, bio TEXT,
        photos TEXT[], interests TEXT[], safety_score INTEGER,
        location TEXT, lat DOUBLE PRECISION, lng DOUBLE PRECISION,
        distance_km DOUBLE PRECISION, gender TEXT
      ) AS $$
      DECLARE
        p_geom GEOGRAPHY = ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326);
      BEGIN
        RETURN QUERY
        SELECT
          u.id, u.name, dp.age, dp.bio,
          dp.photos, dp.interests, dp.safety_score,
          dp.location, dp.lat, dp.lng,
          (ST_Distance(dp.geom, p_geom) / 1000.0)::DOUBLE PRECISION AS distance_km,
          dp.gender
        FROM dating_profiles dp
        JOIN users u ON u.id = dp.user_id
        WHERE dp.is_active = TRUE
          AND dp.user_id != p_user_id
          AND dp.geom IS NOT NULL
          AND ST_DWithin(dp.geom, p_geom, p_max_km * 1000)
          AND dp.user_id NOT IN (
            SELECT swiped_id FROM swipes WHERE swiper_id = p_user_id
          )
        ORDER BY distance_km ASC
        LIMIT p_limit;
      END;
      $$ LANGUAGE plpgsql;
    `);

    await client.query('COMMIT');
    console.log('✅ PostGIS Phase 2 Migration complete.');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Migration failed:', err);
    process.exit(1);
  } finally {
    client.release();
    process.exit(0);
  }
}

applyPostGIS();
