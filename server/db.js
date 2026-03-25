const { Pool } = require('pg');

const isLocal = !process.env.DATABASE_URL ||
  process.env.DATABASE_URL.includes('localhost') ||
  process.env.DATABASE_URL.includes('127.0.0.1');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: isLocal ? false : { rejectUnauthorized: false },
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

pool.on('error', (err) => {
  console.error('PostgreSQL pool error:', err.message);
  // Fatal connection errors — let the process manager (Render) restart the service
  const FATAL_CODES = ['ECONNREFUSED', 'ETIMEDOUT', '57P01', '57P02', '57P03'];
  if (FATAL_CODES.includes(err.code)) {
    console.error('[DB] Fatal error, shutting down for restart:', err.code);
    process.exit(1);
  }
});

module.exports = {
  query: (text, params) => pool.query(text, params),
  pool,
};
