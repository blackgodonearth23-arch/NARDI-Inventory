const express = require('express');
const router = express.Router();
const Joi = require('joi');
const Equipment = require('../models/Equipment');
const validate = require('../middleware/validate');
const { authenticate, authorize } = require('../middleware/auth');

const equipmentSchema = Joi.object({
  org_serial: Joi.string().max(100).required(),
  name: Joi.string().max(255).required(),
  type: Joi.string().max(100).required(),
  location_id: Joi.number().integer().required(),
  status: Joi.string().valid('available', 'in_use', 'broken', 'retired').default('available'),
  assigned_to_user_id: Joi.number().integer().allow(null).optional(),
  purchase_date: Joi.date().allow(null).optional(),
  notes: Joi.string().allow('').max(500).optional()
});

const reportSchema = Joi.object({
  notes: Joi.string().max(500).optional()
});

// GET /api/equipment – lab_keeper & admin see all, lab_user sees only own lab
router.get('/', authenticate, async (req, res) => {
  try {
    const filters = {};
    if (req.user.role === 'lab_user') {
      // get equipment in any location belonging to user's lab
      if (!req.user.lab_id) return res.status(403).json({ error: 'No lab assigned' });
      filters.lab_id = req.user.lab_id;
    }
    // optional query param ?location_id=
    if (req.query.location_id) {
      filters.location_id = parseInt(req.query.location_id);
    }
    const equipment = await Equipment.getAll(filters);
    res.json(equipment);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch equipment' });
  }
});

router.get('/:id', authenticate, async (req, res) => {
  try {
    const equip = await Equipment.findById(req.params.id);
    if (!equip) return res.status(404).json({ error: 'Equipment not found' });
    // lab_user can only view if belongs to their lab
    if (req.user.role === 'lab_user') {
      const Location = require('../models/Location');
      const loc = await Location.findById(equip.location_id);
      if (!loc || loc.lab_id !== req.user.lab_id) return res.status(403).json({ error: 'Access denied' });
    }
    res.json(equip);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error fetching equipment' });
  }
});

// Create (lab_keeper, admin)
router.post('/', authenticate, authorize('admin', 'lab_keeper'), validate(equipmentSchema), async (req, res) => {
  try {
    const equip = await Equipment.create(req.body);
    // log creation in transactions
    const db = require('../config/db');
    await db('transactions').insert({
      user_id: req.user.id,
      action_type: 'stock_adjustment',
      item_type: 'equipment',
      item_id: equip.id,
      from_location_id: null,
      to_location_id: req.body.location_id,
      quantity_change: 1,
      metadata: { org_serial: equip.org_serial, name: equip.name }
    });
    res.status(201).json(equip);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Equipment creation failed' });
  }
});

// Update
router.put('/:id', authenticate, authorize('admin', 'lab_keeper'), validate(equipmentSchema), async (req, res) => {
  try {
    const equip = await Equipment.findById(req.params.id);
    if (!equip) return res.status(404).json({ error: 'Equipment not found' });
    const updated = await Equipment.update(req.params.id, req.body);
    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Update failed' });
  }
});

// Soft delete
router.delete('/:id', authenticate, authorize('admin', 'lab_keeper'), async (req, res) => {
  try {
    const equip = await Equipment.findById(req.params.id);
    if (!equip) return res.status(404).json({ error: 'Equipment not found' });
    await Equipment.softDelete(req.params.id);
    res.json({ message: 'Equipment archived' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Deletion failed' });
  }
});

// Report broken (lab_user)
router.post('/:id/report-broken', authenticate, authorize('lab_user'), validate(reportSchema), async (req, res) => {
  try {
    const equip = await Equipment.reportBroken(req.params.id, req.user.id);
    res.json({ message: 'Equipment reported as broken', equip });
  } catch (err) {
    console.error(err);
    if (err.message === 'Equipment not found') return res.status(404).json({ error: err.message });
    res.status(500).json({ error: 'Failed to report broken' });
  }
});

module.exports = router;