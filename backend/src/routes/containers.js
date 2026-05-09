const express = require('express');
const router = express.Router();
const Container = require('../models/Container');
const Location = require('../models/Location');
const { authenticate } = require('../middleware/auth');

// GET /api/containers?location_id=...
router.get('/', authenticate, async (req, res) => {
  try {
    const location_id = req.query.location_id ? parseInt(req.query.location_id) : null;

    if (req.user.role === 'lab_user') {
      if (!location_id) return res.status(400).json({ error: 'Location ID required' });
      const loc = await Location.findById(location_id);
      if (!loc || loc.lab_id !== req.user.lab_id) {
        return res.status(403).json({ error: 'Access denied' });
      }
    }

    const containers = location_id
      ? await Container.getByLocation(location_id)
      : []; // No global list endpoint yet
    res.json(containers);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch containers' });
  }
});

module.exports = router;