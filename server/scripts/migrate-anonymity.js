require('dotenv').config();
const db = require('../db');

async function migrateReportsAnonymity() {
  console.log('Migrating reports and comments for absolute anonymity...');
  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Add reporter_hash column to reports
    await client.query(`
      ALTER TABLE reports 
      ADD COLUMN IF NOT EXISTS reporter_hash TEXT;
    `);

    // 2. Add reporter_hash column to comments
    await client.query(`
      ALTER TABLE comments 
      ADD COLUMN IF NOT EXISTS reporter_hash TEXT;
    `);

    // 3. Drop reporter_id from reports (WARNING: deletes foreign key mapping permanently)
    await client.query(`
      ALTER TABLE reports DROP COLUMN IF EXISTS reporter_id;
    `);

    // 4. Drop user_id from comments
    await client.query(`
      ALTER TABLE comments DROP COLUMN IF EXISTS user_id;
    `);

    await client.query('COMMIT');
    console.log('✅ Anonymity migration complete. Removed direct user relationships.');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Migration failed:', err);
    process.exit(1);
  } finally {
    client.release();
    process.exit(0);
  }
}

migrateReportsAnonymity();
