const express = require('express');
const router = express.Router();
const Joi = require('joi');
const UtilityItem = require('../models/UtilityItem');
const validate = require('../middleware/validate');
const { authenticate, authorize } = require('../middleware/auth');

// Validation schema – type‑specific fields are in "properties" (free‑form JSON)
const utilitySchema = Joi.object({
  name: Joi.string().min(2).max(255).required(),
  type: Joi.string().valid(
    'glassware', 'plasticware', 'equipment', 'instrument',
    'standard', 'consumable_sanitation', 'ppe', 'utensil'
  ).required(),
  location_id: Joi.number().integer().allow(null),
  total_count: Joi.number().integer().min(1).default(1),
  status: Joi.string().valid('working', 'broken', 'under_repair').default('working'),
  org_serial: Joi.string().allow('', null),
  properties: Joi.object().default({})
});

router.get('/', authenticate, async (req, res) => {
  try {
    const filters = {};
    if (req.query.type) filters.type = req.query.type;
    if (req.query.status) filters.status = req.query.status;
    if (req.query.lab_id) filters.lab_id = parseInt(req.query.lab_id);
    const items = await UtilityItem.getAll(filters);
    res.json(items);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch utility items' });
  }
});

router.post('/', authenticate, authorize('admin', 'lab_keeper'), validate(utilitySchema), async (req, res) => {
  try {
    const item = await UtilityItem.create(req.body);
    res.status(201).json(item);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create utility item' });
  }
});

router.put('/:id', authenticate, authorize('admin', 'lab_keeper'), validate(utilitySchema), async (req, res) => {
  try {
    const item = await UtilityItem.findById(req.params.id);
    if (!item) return res.status(404).json({ error: 'Not found' });
    // Keep location ownership check (e.g., keeper can only edit items in their lab)
    // ... add check if needed
    const updated = await UtilityItem.update(req.params.id, req.body);
    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Update failed' });
  }
});

router.delete('/:id', authenticate, authorize('admin', 'lab_keeper'), async (req, res) => {
  try {
    const item = await UtilityItem.findById(req.params.id);
    if (!item) return res.status(404).json({ error: 'Not found' });
    await UtilityItem.softDelete(req.params.id);
    res.json({ message: 'Deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Deletion failed' });
  }
});

module.exports = router;