const router = require('express').Router();
const db = require('../db');
const { requireAuth } = require('../middleware/auth');

let _io = null;
router.setIo = (io) => { _io = io; };

// POST /api/guardian/sessions — create session
router.post('/sessions', requireAuth, async (req, res) => {
  const { dater_name, date_location, check_in_minutes = 30 } = req.body;
  const token = require('crypto').randomBytes(18).toString('hex');
  const expiresAt = new Date(Date.now() + 8 * 60 * 60 * 1000); // 8 hours
  try {
    const { rows } = await db.query(
      `INSERT INTO guardian_sessions
         (dater_id, session_token, dater_name, date_location, check_in_minutes, expires_at)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [req.user.id, token, dater_name || req.user.name, date_location, check_in_minutes, expiresAt]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/guardian/sessions/mine — get active session for current user
router.get('/sessions/mine', requireAuth, async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT * FROM guardian_sessions
       WHERE dater_id=$1 AND is_active=TRUE AND expires_at > NOW()
       ORDER BY created_at DESC LIMIT 1`,
      [req.user.id]
    );
    res.json(rows[0] || null);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/guardian/sessions/:id — get own session by ID
router.get('/sessions/:id', requireAuth, async (req, res) => {
  try {
    const { rows } = await db.query(
      'SELECT * FROM guardian_sessions WHERE id=$1 AND dater_id=$2',
      [req.params.id, req.user.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Session not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/guardian/view/:token — public guardian view (no auth required)
router.get('/view/:token', async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT id, session_token, dater_name, date_location, check_in_minutes,
              is_active, is_sos, sentiment, last_checkin_at, location, expires_at, created_at
       FROM guardian_sessions WHERE session_token=$1 AND is_active=TRUE AND expires_at > NOW()`,
      [req.params.token]
    );
    if (!rows.length) return res.status(404).json({ error: 'Session expired or not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/guardian/sessions/:id/location — update GPS
router.patch('/sessions/:id/location', requireAuth, async (req, res) => {
  const { lat, lng } = req.body;
  if (lat == null || lng == null) return res.status(400).json({ error: 'lat and lng required' });
  try {
    const { rows } = await db.query(
      `UPDATE guardian_sessions
       SET location=$1, last_checkin_at=NOW()
       WHERE id=$2 AND dater_id=$3 RETURNING *`,
      [JSON.stringify({ lat, lng, updatedAt: new Date().toISOString() }), req.params.id, req.user.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Session not found' });
    if (_io) _io.to(`guardian:${rows[0].session_token}`).emit('guardian:location', { lat, lng });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/guardian/sessions/:id/checkin — mark safe
router.post('/sessions/:id/checkin', requireAuth, async (req, res) => {
  try {
    const { rows } = await db.query(
      `UPDATE guardian_sessions
       SET last_checkin_at=NOW(), sentiment='normal', is_sos=FALSE
       WHERE id=$1 AND dater_id=$2 RETURNING *`,
      [req.params.id, req.user.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Session not found' });
    if (_io) _io.to(`guardian:${rows[0].session_token}`).emit('guardian:update', rows[0]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/guardian/sessions/:id/sos — trigger SOS
router.post('/sessions/:id/sos', requireAuth, async (req, res) => {
  const { location } = req.body;
  try {
    const { rows } = await db.query(
      `UPDATE guardian_sessions
       SET is_sos=TRUE, sentiment='alert'
       WHERE id=$1 AND dater_id=$2 RETURNING *`,
      [req.params.id, req.user.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Session not found' });
    // Log SOS alert
    await db.query(
      'INSERT INTO sos_alerts (session_id, location) VALUES ($1,$2)',
      [req.params.id, location ? JSON.stringify(location) : null]
    );
    if (_io) _io.to(`guardian:${rows[0].session_token}`).emit('guardian:sos', { session: rows[0], location });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/guardian/sessions/:id/sos/cancel
router.post('/sessions/:id/sos/cancel', requireAuth, async (req, res) => {
  try {
    const { rows } = await db.query(
      `UPDATE guardian_sessions
       SET is_sos=FALSE, sentiment='normal', last_checkin_at=NOW()
       WHERE id=$1 AND dater_id=$2 RETURNING *`,
      [req.params.id, req.user.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Session not found' });
    if (_io) _io.to(`guardian:${rows[0].session_token}`).emit('guardian:update', rows[0]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/guardian/sessions/:id/end
router.post('/sessions/:id/end', requireAuth, async (req, res) => {
  try {
    const { rows } = await db.query(
      'UPDATE guardian_sessions SET is_active=FALSE WHERE id=$1 AND dater_id=$2 RETURNING session_token',
      [req.params.id, req.user.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Session not found' });
    if (_io) _io.to(`guardian:${rows[0].session_token}`).emit('guardian:ended');
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
