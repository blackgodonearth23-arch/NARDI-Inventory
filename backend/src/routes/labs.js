const express = require('express');
const router = express.Router();
const Joi = require('joi');
const Lab = require('../models/Lab');
const validate = require('../middleware/validate');
const { authenticate, authorize } = require('../middleware/auth');

const labSchema = Joi.object({
  name: Joi.string().min(2).max(255).required(),
  description: Joi.string().max(500).allow('', null).optional()
});

// All authenticated users can view labs
router.get('/', authenticate, async (req, res) => {
  const labs = await Lab.getAll();
  res.json(labs);
});

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