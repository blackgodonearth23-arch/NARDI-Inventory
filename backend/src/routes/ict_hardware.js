const express = require('express');
const router = express.Router();
const Joi = require('joi');
const ICTHardware = require('../models/ICTHardware');
const validate = require('../middleware/validate');
const { authenticate, authorize } = require('../middleware/auth');

const schema = Joi.object({
  org_serial: Joi.string().max(100).required(),
  type: Joi.string().valid('pc', 'printer', 'monitor', 'peripheral', 'other').required(),
  model: Joi.string().max(255).allow('', null).optional(),
  status: Joi.string().valid('available', 'in_use', 'under_repair', 'decommissioned').default('available'),
  location_id: Joi.number().integer().allow(null).optional(),
  assigned_to_user_id: Joi.number().integer().allow(null).optional(),
  purchase_date: Joi.date().allow(null).optional(),
  notes: Joi.string().max(500).allow('', null).optional()
});

router.get('/', authenticate, authorize('admin', 'ict_keeper'), async (req, res) => {
  try {
    const hardware = await ICTHardware.getAll(req.query);
    res.json(hardware);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch hardware' });
  }
});

router.post('/', authenticate, authorize('admin', 'ict_keeper'), validate(schema), async (req, res) => {
  try {
    const hw = await ICTHardware.create(req.body);
    res.status(201).json(hw);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Creation failed' });
  }
});

router.put('/:id', authenticate, authorize('admin', 'ict_keeper'), validate(schema), async (req, res) => {
  const hw = await ICTHardware.findById(req.params.id);
  if (!hw) return res.status(404).json({ error: 'Hardware not found' });
  const updated = await ICTHardware.update(req.params.id, req.body);
  res.json(updated);
});

router.delete('/:id', authenticate, authorize('admin', 'ict_keeper'), async (req, res) => {
  const hw = await ICTHardware.findById(req.params.id);
  if (!hw) return res.status(404).json({ error: 'Hardware not found' });
  await ICTHardware.softDelete(req.params.id);
  res.json({ message: 'Hardware archived' });
});

module.exports = router;