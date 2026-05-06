const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { authenticate } = require('../middleware/auth');

// GET /api/bottles?location_id=...
router.get('/', authenticate, async (req, res) => {
  const { location_id } = req.query;
  try {
    let query = db('chemical_bottles')
      .join('chemicals', 'chemical_bottles.chemical_id', 'chemicals.id')
      .where('chemical_bottles.is_deleted', false)
      .select('chemical_bottles.*', 'chemicals.name as chemical_name');
    if (location_id) {
      query = query.where('chemical_bottles.location_id', parseInt(location_id));
    }
    const bottles = await query;
    res.json(bottles);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch bottles' });
  }
});

module.exports = router;