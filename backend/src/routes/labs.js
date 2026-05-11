const express = require('express');
const router = express.Router();
const Joi = require('joi');
const Lab = require('../models/Lab');
const validate = require('../middleware/validate');
const { authenticate, authorize } = require('../middleware/auth');
const db = require('../config/db');

const labSchema = Joi.object({
  name: Joi.string().min(2).max(255).required(),
  description: Joi.string().max(500).allow('', null).optional()
});

// All authenticated users can view labs
router.get('/', authenticate, async (req, res) => {
  const labs = await Lab.getAll();
  res.json(labs);
});

// GET /api/labs/stock – MUST be above /:id to avoid conflict
router.get('/stock', authenticate, async (req, res) => {
  try {
    if (!['lab_user', 'admin'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Access denied' });
    }
    const labId = req.user.lab_id;
    if (!labId) return res.status(400).json({ error: 'No lab assigned' });

    const chemicals = await db.raw(`
      SELECT c.id, c.name, c.cas_number, c.reorder_threshold, c.chemical_type,
             COUNT(cc.id) as unopened_count
      FROM chemicals c
      LEFT JOIN chemical_containers cc ON cc.chemical_id = c.id
        AND cc.status = 'unopened' AND cc.is_deleted = false
        AND cc.location_id IN (SELECT id FROM locations WHERE lab_id = ?)
      WHERE c.is_deleted = false
      GROUP BY c.id, c.name, c.cas_number, c.reorder_threshold, c.chemical_type
      HAVING COUNT(cc.id) > 0
      ORDER BY c.name
    `, [labId]);

    res.json(chemicals.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch lab stock' });
  }
});

// GET /api/labs/:id (now after /stock)
router.get('/:id', authenticate, async (req, res) => {
  const lab = await Lab.findById(req.params.id);
  if (!lab) return res.status(404).json({ error: 'Lab not found' });
  res.json(lab);
});

// Admin only: create
router.post('/', authenticate, authorize('admin'), validate(labSchema), async (req, res) => {
  try {
    const lab = await Lab.create(req.body);
    res.status(201).json(lab);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Lab creation failed' });
  }
});

// Admin only: update
router.put('/:id', authenticate, authorize('admin'), validate(labSchema), async (req, res) => {
  const lab = await Lab.findById(req.params.id);
  if (!lab) return res.status(404).json({ error: 'Lab not found' });
  const updated = await Lab.update(req.params.id, req.body);
  res.json(updated);
});

// Admin only: delete
router.delete('/:id', authenticate, authorize('admin'), async (req, res) => {
  const lab = await Lab.findById(req.params.id);
  if (!lab) return res.status(404).json({ error: 'Lab not found' });
  await Lab.delete(req.params.id);
  res.json({ message: 'Lab deleted' });
});

module.exports = router;