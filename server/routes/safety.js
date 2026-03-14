require('dotenv').config();
const express = require('express');
const router = express.Router();
const db = require('../db');

// Get guardian history
router.get('/guardian-history', async (req, res) => {
    try {
        const userId = req.user.id;
        const { rows } = await db.query(
            `SELECT * FROM guardian_sessions 
             WHERE user_id = $1 
             ORDER BY started_at DESC 
             LIMIT 50`,
            [userId]
        );
        res.json(rows);
    } catch (err) {
        console.error('Error fetching guardian history:', err.message);
        res.status(500).json({ error: 'Failed to fetch history' });
    }
});

// Get date guard history
router.get('/date-guard-history', async (req, res) => {
    try {
        const userId = req.user.id;
        const { rows } = await db.query(
            `SELECT * FROM date_guards 
             WHERE user_id = $1 
             ORDER BY started_at DESC 
             LIMIT 50`,
            [userId]
        );
        res.json(rows);
    } catch (err) {
        console.error('Error fetching date guard history:', err.message);
        res.status(500).json({ error: 'Failed to fetch history' });
    }
});

// Create guardian session
router.post('/guardian-session', async (req, res) => {
    try {
        const userId = req.user.id;
        const { guardian_name, expires_in_hours = 24 } = req.body;
        
        const token = require('crypto').randomBytes(32).toString('hex');
        const expires_at = new Date(Date.now() + expires_in_hours * 60 * 60 * 1000);
        
        const { rows } = await db.query(
            `INSERT INTO guardian_sessions (user_id, guardian_name, token, expires_at, status)
             VALUES ($1, $2, $3, $4, 'active')
             RETURNING *`,
            [userId, guardian_name, token, expires_at]
        );
        
        res.json({ ...rows[0], share_url: `/guardian/${token}` });
    } catch (err) {
        console.error('Error creating guardian session:', err.message);
        res.status(500).json({ error: 'Failed to create session' });
    }
});

// Update guardian session status
router.patch('/guardian-session/:id', async (req, res) => {
    try {
        const userId = req.user.id;
        const { id } = req.params;
        const { status, ended_at } = req.body;
        
        const { rows } = await db.query(
            `UPDATE guardian_sessions 
             SET status = $1, ended_at = $2, updated_at = NOW()
             WHERE id = $3 AND user_id = $4
             RETURNING *`,
            [status, ended_at, id, userId]
        );
        
        if (rows.length === 0) {
            return res.status(404).json({ error: 'Session not found' });
        }
        
        res.json(rows[0]);
    } catch (err) {
        console.error('Error updating guardian session:', err.message);
        res.status(500).json({ error: 'Failed to update session' });
    }
});

// Create date guard
router.post('/date-guard', async (req, res) => {
    try {
        const userId = req.user.id;
        const { meeting_name, duration_minutes, contacts } = req.body;
        
        const { rows } = await db.query(
            `INSERT INTO date_guards (user_id, meeting_name, duration_minutes, contacts, status)
             VALUES ($1, $2, $3, $4, 'active')
             RETURNING *`,
            [userId, meeting_name, duration_minutes, JSON.stringify(contacts)]
        );
        
        res.json(rows[0]);
    } catch (err) {
        console.error('Error creating date guard:', err.message);
        res.status(500).json({ error: 'Failed to create date guard' });
    }
});

// Update date guard status
router.patch('/date-guard/:id', async (req, res) => {
    try {
        const userId = req.user.id;
        const { id } = req.params;
        const { status, contacts_notified } = req.body;
        
        const { rows } = await db.query(
            `UPDATE date_guards 
             SET status = $1, contacts_notified = $2, updated_at = NOW()
             WHERE id = $3 AND user_id = $4
             RETURNING *`,
            [status, contacts_notified, id, userId]
        );
        
        if (rows.length === 0) {
            return res.status(404).json({ error: 'Date guard not found' });
        }
        
        res.json(rows[0]);
    } catch (err) {
        console.error('Error updating date guard:', err.message);
        res.status(500).json({ error: 'Failed to update date guard' });
    }
});

module.exports = router;
