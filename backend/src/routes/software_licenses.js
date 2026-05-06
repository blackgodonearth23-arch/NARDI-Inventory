const express = require('express');
const router = express.Router();
const Joi = require('joi');
const SoftwareLicense = require('../models/SoftwareLicense');
const validate = require('../middleware/validate');
const { authenticate, authorize } = require('../middleware/auth');

const schema = Joi.object({
  name: Joi.string().max(255).required(),
  vendor: Joi.string().max(255).allow('', null).optional(),
  license_key: Joi.string().max(500).allow('', null).optional(),
  license_type: Joi.string().valid('org_wide', 'individual').required(),
  total_seats: Joi.number().integer().min(1).optional(),
  expiration_date: Joi.date().allow(null).optional(),
  notes: Joi.string().max(500).allow('', null).optional()
});

const assignSchema = Joi.object({
  user_ids: Joi.array().items(Joi.number().integer()).required()
});

router.get('/', authenticate, authorize('admin', 'ict_keeper'), async (req, res) => {
  try {
    const licenses = await SoftwareLicense.getAll();
    res.json(licenses);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch licenses' });
  }
});

router.post('/', authenticate, authorize('admin', 'ict_keeper'), validate(schema), async (req, res) => {
  try {
    const lic = await SoftwareLicense.create(req.body);
    res.status(201).json(lic);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Creation failed' });
  }
});

router.put('/:id', authenticate, authorize('admin', 'ict_keeper'), validate(schema), async (req, res) => {
  const lic = await SoftwareLicense.findById(req.params.id);
  if (!lic) return res.status(404).json({ error: 'License not found' });
  const updated = await SoftwareLicense.update(req.params.id, req.body);
  res.json(updated);
});

router.delete('/:id', authenticate, authorize('admin', 'ict_keeper'), async (req, res) => {
  const lic = await SoftwareLicense.findById(req.params.id);
  if (!lic) return res.status(404).json({ error: 'License not found' });
  await SoftwareLicense.softDelete(req.params.id);
  res.json({ message: 'License archived' });
});

router.post('/:id/assign', authenticate, authorize('admin', 'ict_keeper'), validate(assignSchema), async (req, res) => {
  try {
    const lic = await SoftwareLicense.assignUsers(req.params.id, req.body.user_ids);
    res.json(lic);
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;