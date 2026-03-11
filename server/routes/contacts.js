const router = require('express').Router();
const db = require('../db');
const { requireAuth } = require('../middleware/auth');

// GET /api/contacts — list trusted contacts
router.get('/', requireAuth, async (req, res) => {
  try {
    const { rows } = await db.query(
      'SELECT * FROM trusted_contacts WHERE user_id=$1 ORDER BY created_at ASC',
      [req.user.id]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/contacts — add contact
router.post('/', requireAuth, async (req, res) => {
  const { name, phone, relationship = 'friend' } = req.body;
  if (!name || !phone) return res.status(400).json({ error: 'name and phone required' });
  try {
    // Max 3 contacts per user
    const { rows: existing } = await db.query(
      'SELECT COUNT(*) FROM trusted_contacts WHERE user_id=$1', [req.user.id]
    );
    if (parseInt(existing[0].count) >= 3)
      return res.status(400).json({ error: 'Maximum 3 contacts allowed' });

    const { rows } = await db.query(
      `INSERT INTO trusted_contacts (user_id, name, phone, relationship)
       VALUES ($1,$2,$3,$4) RETURNING *`,
      [req.user.id, name, phone, relationship]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/contacts/:id — update contact
router.patch('/:id', requireAuth, async (req, res) => {
  const { name, phone, relationship } = req.body;
  try {
    const { rows } = await db.query(
      `UPDATE trusted_contacts
       SET name=COALESCE($1,name), phone=COALESCE($2,phone), relationship=COALESCE($3,relationship)
       WHERE id=$4 AND user_id=$5 RETURNING *`,
      [name, phone, relationship, req.params.id, req.user.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Contact not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/contacts/:id — remove contact
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const { rowCount } = await db.query(
      'DELETE FROM trusted_contacts WHERE id=$1 AND user_id=$2',
      [req.params.id, req.user.id]
    );
    if (!rowCount) return res.status(404).json({ error: 'Contact not found' });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
