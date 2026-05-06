const express = require('express');
const router = express.Router();
const Joi = require('joi');
const Location = require('../models/Location');
const validate = require('../middleware/validate');
const { authenticate, authorize } = require('../middleware/auth');

const locationSchema = Joi.object({
  name: Joi.string().min(2).max(255).required(),
  type: Joi.string().valid('main', 'lab_sub').required(),
  lab_id: Joi.number().integer().when('type', { is: 'lab_sub', then: Joi.required(), otherwise: Joi.optional() }),
  parent_id: Joi.number().integer().allow(null).optional(),
  description: Joi.string().max(500).allow('', null).optional()
});

// All authenticated users: GET locations (filter by lab for lab_user)
router.get('/', authenticate, async (req, res) => {
  let locations;
  if (req.user.role === 'lab_user') {
    if (!req.user.lab_id) return res.status(403).json({ error: 'No lab assigned' });
    locations = await Location.findByLab(req.user.lab_id);
  } else if (['admin', 'lab_keeper'].includes(req.user.role)) {
    locations = await Location.getAll();
  } else {
    return res.status(403).json({ error: 'Access denied' });
  }
  res.json(locations);
});

router.get('/:id', authenticate, async (req, res) => {
  const loc = await Location.findById(req.params.id);
  if (!loc) return res.status(404).json({ error: 'Location not found' });
  if (req.user.role === 'lab_user' && loc.lab_id !== req.user.lab_id) {
    return res.status(403).json({ error: 'Access denied' });
  }
  res.json(loc);
});

// Admin & Lab Keeper: create
router.post('/', authenticate, authorize('admin', 'lab_keeper'), validate(locationSchema), async (req, res) => {
  try {
    const location = await Location.create(req.body);
    res.status(201).json(location);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Location creation failed' });
  }
});

// Admin & Lab Keeper: update
router.put('/:id', authenticate, authorize('admin', 'lab_keeper'), validate(locationSchema), async (req, res) => {
  const loc = await Location.findById(req.params.id);
  if (!loc) return res.status(404).json({ error: 'Location not found' });
  const updated = await Location.update(req.params.id, req.body);
  res.json(updated);
});

// Admin & Lab Keeper: delete
router.delete('/:id', authenticate, authorize('admin', 'lab_keeper'), async (req, res) => {
  const loc = await Location.findById(req.params.id);
  if (!loc) return res.status(404).json({ error: 'Location not found' });
  await Location.delete(req.params.id);
  res.json({ message: 'Location deleted' });
});

module.exports = router;