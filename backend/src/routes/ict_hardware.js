const express = require('express');
const router = express.Router();
const Joi = require('joi');
const ICTHardware = require('../models/ICTHardware');
const validate = require('../middleware/validate');
const { authenticate, authorize } = require('../middleware/auth');

const createSchema = Joi.object({
  computer_name: Joi.string().max(100).required(),
  org_serial: Joi.string().max(100).required(),
  type: Joi.string().valid('laptop', 'desktop', 'phone', 'printer', 'projector', 'other').required(),
  type_other: Joi.string().max(50).when('type', { is: 'other', then: Joi.required() }),
  model: Joi.string().max(255).allow('', null),
  status: Joi.string().valid('available', 'in_use', 'under_repair', 'decommissioned').default('available'),
  lab_id: Joi.number().integer().when('$isAdmin', { is: true, then: Joi.required(), otherwise: Joi.optional() }),
  location_id: Joi.number().integer().allow(null),
  assigned_to_user_id: Joi.number().integer().allow(null),
  assigned_to_employee: Joi.string().max(255).allow('', null),
  purchase_date: Joi.date().allow(null),
  notes: Joi.string().max(500).allow('', null)
});

const updateSchema = createSchema.keys({
  computer_name: Joi.string().max(100).required(),
  org_serial: Joi.string().max(100).required()
});

const transferSchema = Joi.object({
  to_lab_id: Joi.number().integer().required(),
  to_location_id: Joi.number().integer().allow(null),
  new_computer_name: Joi.string().max(100).required()
});

// ---- Routes ----
router.get('/', authenticate, authorize('admin', 'ict_keeper'), async (req, res) => {
  try {
    const hardware = await ICTHardware.getAll(req.query, req.user);
    res.json(hardware);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch hardware' });
  }
});

router.post('/', authenticate, authorize('admin', 'ict_keeper'), async (req, res, next) => {
  // Pre‑process type_other -> type
  if (req.body.type === 'other' && req.body.type_other) {
    req.body.type = req.body.type_other;
  }
  delete req.body.type_other;
  // Validate using a schema that accepts the resolved type
  const schema = createSchema.tailor('$isAdmin', req.user.role === 'admin');
  const { error } = schema.validate(req.body, { context: { isAdmin: req.user.role === 'admin' } });
  if (error) return res.status(400).json({ error: error.details[0].message });

  try {
    const hw = await ICTHardware.create(req.body, req.user);
    res.status(201).json(hw);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Creation failed' });
  }
});

router.put('/:id', authenticate, authorize('admin', 'ict_keeper'), async (req, res) => {
  // Handle type_other as above
  if (req.body.type === 'other' && req.body.type_other) {
    req.body.type = req.body.type_other;
  }
  delete req.body.type_other;
  const schema = updateSchema.tailor('$isAdmin', req.user.role === 'admin');
  const { error } = schema.validate(req.body, { context: { isAdmin: req.user.role === 'admin' } });
  if (error) return res.status(400).json({ error: error.details[0].message });

  try {
    const hw = await ICTHardware.update(req.params.id, req.body, req.user);
    if (!hw) return res.status(404).json({ error: 'Hardware not found' });
    res.json(hw);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Update failed' });
  }
});

router.post('/:id/transfer', authenticate, authorize('admin', 'ict_keeper'), validate(transferSchema), async (req, res) => {
  try {
    const hw = await ICTHardware.transfer(req.params.id, req.body, req.user);
    res.json(hw);
  } catch (err) {
    console.error(err);
    const status = err.message.includes('Access denied') ? 403 : 400;
    res.status(status).json({ error: err.message });
  }
});

router.delete('/:id', authenticate, authorize('admin', 'ict_keeper'), async (req, res) => {
  try {
    await ICTHardware.softDelete(req.params.id, req.user);
    res.json({ message: 'Hardware archived' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Deletion failed' });
  }
});

module.exports = router;