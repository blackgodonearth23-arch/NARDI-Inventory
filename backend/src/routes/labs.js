// backend/src/routes/labs.js
const express = require('express');
const router = express.Router();
const Joi = require('joi');
const Lab = require('../models/Lab');
const validate = require('../middleware/validate');
const { authenticate, authorize } = require('../middleware/auth');
const db = require('../config/db');

// ---- Validation schemas ----
const labSchema = Joi.object({
  name: Joi.string().min(2).max(255).required(),
  description: Joi.string().max(500).allow('', null).optional(),
  type: Joi.string().valid('ICT', 'Chemistry', 'Other').default('Other'),
  allowed_utility_types: Joi.when('type', {
    is: Joi.valid('Chemistry', 'Other'),
    then: Joi.array().items(Joi.string().max(100)).min(1).optional(),
    otherwise: Joi.any().strip()
  })
});

const updateLabSchema = Joi.object({
  name: Joi.string().min(2).max(255).optional(),
  description: Joi.string().max(500).allow('', null).optional(),
  type: Joi.string().valid('ICT', 'Chemistry', 'Other').optional(),
  allowed_utility_types: Joi.when('type', {
    is: Joi.exist(),
    then: Joi.when(Joi.string().valid('Chemistry', 'Other'), {
      then: Joi.array().items(Joi.string().max(100)).min(1).optional(),
      otherwise: Joi.any().strip()
    }),
    otherwise: Joi.when(Joi.ref('/type'), {
      is: Joi.only(),
      then: Joi.array().items(Joi.string().max(100)).min(1).optional(),
      otherwise: Joi.any().strip()
    })
  }).optional()
});

const utilityConfigSchema = Joi.object({
  allowed_utility_types: Joi.array().items(Joi.string().max(100)).required(),
  type_fields: Joi.object().pattern(
    Joi.string().max(100),
    Joi.array().items(Joi.object({
      name: Joi.string().max(100).required(),
      type: Joi.string().valid('text', 'number', 'date', 'boolean').required(),
      label: Joi.string().max(255).required()
    }))
  ).default({})
});

// ---- Routes ----

// GET / (all labs)
router.get('/', authenticate, async (req, res) => {
  const labs = await Lab.getAll();
  res.json(labs);
});

// GET /stock (must be above /:id)
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

// GET /:id
router.get('/:id', authenticate, async (req, res) => {
  const lab = await Lab.findById(req.params.id);
  if (!lab) return res.status(404).json({ error: 'Lab not found' });
  res.json(lab);
});

// POST / (admin only)
router.post('/', authenticate, authorize('admin'), validate(labSchema), async (req, res) => {
  try {
    const lab = await Lab.create(req.body);
    res.status(201).json(lab);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Lab creation failed' });
  }
});

// PUT /:id/utility-config  <-- MUST BE BEFORE generic PUT /:id
router.put('/:id/utility-config',
  authenticate,
  authorize('admin', 'lab_keeper'),
  validate(utilityConfigSchema),
  async (req, res) => {
    try {
      const lab = await Lab.findById(req.params.id);
      if (!lab) return res.status(404).json({ error: 'Lab not found' });

      if (req.user.role === 'lab_keeper' && lab.id !== req.user.lab_id) {
        return res.status(403).json({ error: 'You can only configure your own lab' });
      }
      if (lab.type === 'ICT') {
        return res.status(400).json({ error: 'ICT labs do not support utility configuration' });
      }

      const updatedLab = await Lab.updateUtilityConfig(req.params.id, {
        allowed_utility_types: req.body.allowed_utility_types,
        type_fields: req.body.type_fields
      });

      res.json({
        id: updatedLab.id,
        type: updatedLab.type,
        allowed_utility_types: updatedLab.allowed_utility_types,
        type_fields: updatedLab.type_fields
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to update utility configuration' });
    }
  }
);

// PUT /:id (admin only) – generic lab update
router.put('/:id', authenticate, authorize('admin'), validate(updateLabSchema), async (req, res) => {
  try {
    const lab = await Lab.findById(req.params.id);
    if (!lab) return res.status(404).json({ error: 'Lab not found' });
    const updated = await Lab.update(req.params.id, req.body);
    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Lab update failed' });
  }
});

// DELETE /:id (admin only)
router.delete('/:id', authenticate, authorize('admin'), async (req, res) => {
  try {
    const lab = await Lab.findById(req.params.id);
    if (!lab) return res.status(404).json({ error: 'Lab not found' });
    await Lab.delete(req.params.id);
    res.json({ message: 'Lab deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Lab deletion failed' });
  }
});

module.exports = router;