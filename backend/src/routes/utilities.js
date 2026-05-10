const express = require('express');
const router = express.Router();
const Joi = require('joi');
const UtilityItem = require('../models/UtilityItem');
const validate = require('../middleware/validate');
const { authenticate, authorize } = require('../middleware/auth');

const schema = Joi.object({
  asset_id: Joi.string().max(50).allow(null, '').optional(),  // optional
  name: Joi.string().min(2).max(255).required(),
  type: Joi.string().valid(
    'glassware', 'plasticware', 'equipment', 'instrument',
    'standard', 'consumable_sanitation', 'ppe', 'utensil'
  ).required(),
  location_id: Joi.number().integer().allow(null),
  lab_id: Joi.number().integer().required(),
  total_count: Joi.number().integer().min(1).default(1),
  status: Joi.string().valid('working', 'broken', 'under_repair').default('working'),
  properties: Joi.object().default({})
});

router.get('/', authenticate, authorize('admin', 'lab_keeper'), async (req, res) => {
  try {
    const filters = { ...req.query };
    const items = await UtilityItem.getAll(filters, req.user);
    res.json(items);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch utility items' });
  }
});

router.post('/', authenticate, authorize('admin', 'lab_keeper'), validate(schema), async (req, res) => {
  try {
    // For lab_keeper, force lab_id to their own
    if (req.user.role === 'lab_keeper') {
      req.body.lab_id = req.user.lab_id;
    }
    const item = await UtilityItem.create(req.body, req.user.id);
    res.status(201).json(item);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Creation failed' });
  }
});

router.put('/:id', authenticate, authorize('admin', 'lab_keeper'), validate(schema), async (req, res) => {
  try {
    const existing = await UtilityItem.findById(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Item not found' });

    // Lab keeper can only update items in their own lab
    if (req.user.role === 'lab_keeper' && existing.lab_id !== req.user.lab_id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Force lab_id to their own for keeper
    if (req.user.role === 'lab_keeper') {
      req.body.lab_id = req.user.lab_id;
    }

    const updated = await UtilityItem.update(req.params.id, req.body);
    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Update failed' });
  }
});

router.delete('/:id', authenticate, authorize('admin', 'lab_keeper'), async (req, res) => {
  try {
    const existing = await UtilityItem.findById(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Item not found' });

    if (req.user.role === 'lab_keeper' && existing.lab_id !== req.user.lab_id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    await UtilityItem.softDelete(req.params.id);
    res.json({ message: 'Item archived' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Deletion failed' });
  }
});

module.exports = router;