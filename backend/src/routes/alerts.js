const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { authenticate } = require('../middleware/auth');

// GET /api/alerts – returns unread alerts for the logged-in user (most recent first)
router.get('/', authenticate, async (req, res) => {
  try {
    const alerts = await db('alerts')
      .where({ user_id: req.user.id })
      .orderBy('created_at', 'desc')
      .limit(50);
    res.json(alerts);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch alerts' });
  }
});

// PATCH /api/alerts/:id/read – mark as read
router.patch('/:id/read', authenticate, async (req, res) => {
  try {
    await db('alerts').where({ id: req.params.id, user_id: req.user.id }).update({ is_read: true });
    res.json({ message: 'Marked read' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update alert' });
  }
});

// PATCH /api/alerts/read-all – mark all as read for user
router.patch('/read-all', authenticate, async (req, res) => {
  try {
    await db('alerts').where({ user_id: req.user.id, is_read: false }).update({ is_read: true });
    res.json({ message: 'All marked read' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update alerts' });
  }
});

module.exports = router;