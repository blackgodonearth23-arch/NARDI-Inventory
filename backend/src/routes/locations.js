const express = require('express');
const router = express.Router();
const Joi = require('joi');
const Location = require('../models/Location');
const validate = require('../middleware/validate');
const { authenticate, authorize } = require('../middleware/auth');

const locationSchema = Joi.object({
  name: Joi.string().min(2).max(255).required(),
  type: Joi.string().valid('primary', 'lab_sub').required(),
  lab_id: Joi.number().integer().when('type', { is: 'lab_sub', then: Joi.required(), otherwise: Joi.optional() }),
  parent_id: Joi.number().integer().allow(null).optional(),
  description: Joi.string().max(500).allow('', null).optional()
});

// GET / – all locations, filtered by role
router.get('/', authenticate, async (req, res) => {
  try {
    let filter = {};

    if (req.user.role === 'lab_keeper' || req.user.role === 'lab_user') {
      // Both roles can only see locations linked to their assigned lab
      if (!req.user.lab_id) {
        return res.status(403).json({ error: 'No lab assigned' });
      }
      filter = { lab_id: req.user.lab_id };
    } else if (req.query.lab_id) {
      // Admin / ict_keeper can optionally filter by ?lab_id=
      filter = { lab_id: req.query.lab_id };
    }

    const locations = await Location.findAll(filter);
    res.json(locations);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch locations' });
  }
});

// GET /:id – single location
router.get('/:id', authenticate, async (req, res) => {
  const loc = await Location.findById(req.params.id);
  if (!loc) return res.status(404).json({ error: 'Location not found' });

  if (req.user.role === 'lab_user' && loc.lab_id !== req.user.lab_id) {
    return res.status(403).json({ error: 'Access denied' });
  }
  res.json(loc);
});

// POST / – create (admin, lab_keeper)
router.post('/', authenticate, authorize('admin', 'lab_keeper'), validate(locationSchema), async (req, res) => {
  try {
    const location = await Location.create(req.body);
    res.status(201).json(location);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Location creation failed' });
  }
});

// PUT /:id – update (admin, lab_keeper)
router.put('/:id', authenticate, authorize('admin', 'lab_keeper'), validate(locationSchema), async (req, res) => {
  const loc = await Location.findById(req.params.id);
  if (!loc) return res.status(404).json({ error: 'Location not found' });
  const updated = await Location.update(req.params.id, req.body);
  res.json(updated);
});

// DELETE /:id – delete (admin, lab_keeper)
router.delete('/:id', authenticate, authorize('admin', 'lab_keeper'), async (req, res) => {
  const loc = await Location.findById(req.params.id);
  if (!loc) return res.status(404).json({ error: 'Location not found' });
  await Location.delete(req.params.id);
  res.json({ message: 'Location deleted' });
});

module.exports = router;