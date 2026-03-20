const express = require('express');
const router = express.Router();
const db = require('../db');
const { requireAuth } = require('../middleware/auth');

// Auto-migrate: date_guards table
db.query(`
  CREATE TABLE IF NOT EXISTS date_guards (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id          UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    meeting_name     TEXT,
    duration_minutes INTEGER DEFAULT 120,
    contacts         JSONB DEFAULT '[]',
    status           TEXT DEFAULT 'active',
    contacts_notified BOOLEAN DEFAULT FALSE,
    started_at       TIMESTAMPTZ DEFAULT NOW(),
    ended_at         TIMESTAMPTZ,
    triggered_at     TIMESTAMPTZ,
    created_at       TIMESTAMPTZ DEFAULT NOW()
  )
`).catch(err => console.error('Migration error (date_guards):', err.message));

// GET /api/safety/guardian-history — uses guardian_sessions (canonical schema)
router.get('/guardian-history', requireAuth, async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT id, session_token, dater_name, date_location,
              check_in_minutes, is_active, is_sos, sentiment,
              last_checkin_at, location, expires_at, created_at
       FROM guardian_sessions
       WHERE dater_id = $1
       ORDER BY created_at DESC
       LIMIT 50`,
      [req.user.id]
    );
    res.json(rows);
  } catch (err) {
    console.error('Error fetching guardian history:', err.message);
    res.status(500).json({ error: 'Failed to fetch history' });
  }
});

// GET /api/safety/date-guard-history
router.get('/date-guard-history', requireAuth, async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT * FROM date_guards
       WHERE user_id = $1
       ORDER BY started_at DESC
       LIMIT 50`,
      [req.user.id]
    );
    res.json(rows);
  } catch (err) {
    console.error('Error fetching date guard history:', err.message);
    res.status(500).json({ error: 'Failed to fetch history' });
  }
});

// POST /api/safety/guardian-session — create via canonical guardian_sessions schema
router.post('/guardian-session', requireAuth, async (req, res) => {
  const { dater_name, date_location, check_in_minutes = 30 } = req.body;
  const token = require('crypto').randomBytes(18).toString('hex');
  const expiresAt = new Date(Date.now() + 8 * 60 * 60 * 1000);
  try {
    const { rows } = await db.query(
      `INSERT INTO guardian_sessions
         (dater_id, session_token, dater_name, date_location, check_in_minutes, expires_at)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [req.user.id, token, dater_name || req.user.name, date_location, check_in_minutes, expiresAt]
    );
    res.status(201).json({ ...rows[0], share_url: `/guardian/${token}` });
  } catch (err) {
    console.error('Error creating guardian session:', err.message);
    res.status(500).json({ error: 'Failed to create session' });
  }
});

// PATCH /api/safety/guardian-session/:id
router.patch('/guardian-session/:id', requireAuth, async (req, res) => {
  const { is_active, is_sos, sentiment } = req.body;
  try {
    const { rows } = await db.query(
      `UPDATE guardian_sessions
       SET is_active  = COALESCE($1, is_active),
           is_sos     = COALESCE($2, is_sos),
           sentiment  = COALESCE($3, sentiment)
       WHERE id = $4 AND dater_id = $5
       RETURNING *`,
      [is_active, is_sos, sentiment, req.params.id, req.user.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Session not found' });
    res.json(rows[0]);
  } catch (err) {
    console.error('Error updating guardian session:', err.message);
    res.status(500).json({ error: 'Failed to update session' });
  }
});

// POST /api/safety/date-guard
router.post('/date-guard', requireAuth, async (req, res) => {
  const { meeting_name, duration_minutes = 120, contacts = [] } = req.body;
  try {
    const { rows } = await db.query(
      `INSERT INTO date_guards (user_id, meeting_name, duration_minutes, contacts, status)
       VALUES ($1,$2,$3,$4,'active') RETURNING *`,
      [req.user.id, meeting_name, duration_minutes, JSON.stringify(contacts)]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error('Error creating date guard:', err.message);
    res.status(500).json({ error: 'Failed to create date guard' });
  }
});

// PATCH /api/safety/date-guard/:id
router.patch('/date-guard/:id', requireAuth, async (req, res) => {
  const { status, contacts_notified } = req.body;
  try {
    const { rows } = await db.query(
      `UPDATE date_guards
       SET status             = COALESCE($1, status),
           contacts_notified  = COALESCE($2, contacts_notified),
           ended_at           = CASE WHEN $1 IN ('ended','cancelled') THEN NOW() ELSE ended_at END,
           triggered_at       = CASE WHEN $1 = 'triggered' THEN NOW() ELSE triggered_at END
       WHERE id = $3 AND user_id = $4
       RETURNING *`,
      [status, contacts_notified, req.params.id, req.user.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Date guard not found' });
    res.json(rows[0]);
  } catch (err) {
    console.error('Error updating date guard:', err.message);
    res.status(500).json({ error: 'Failed to update date guard' });
  }
});

module.exports = router;
