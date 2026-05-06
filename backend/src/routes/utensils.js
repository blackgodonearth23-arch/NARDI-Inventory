const express = require('express');
const router = express.Router();
const Joi = require('joi');
const Utensil = require('../models/Utensil');
const validate = require('../middleware/validate');
const { authenticate, authorize } = require('../middleware/auth');

const utensilSchema = Joi.object({
  name: Joi.string().max(255).required(),
  location_id: Joi.number().integer().required(),
  total_count: Joi.number().integer().min(0).default(0)
});

const reportSchema = Joi.object({
  quantity: Joi.number().integer().min(1).default(1),
  notes: Joi.string().max(500).optional()
});

router.get('/', authenticate, async (req, res) => {
  try {
    const filters = {};
    if (req.user.role === 'lab_user') {
      if (!req.user.lab_id) return res.status(403).json({ error: 'No lab assigned' });
      filters.lab_id = req.user.lab_id;
    }
    if (req.query.location_id) filters.location_id = parseInt(req.query.location_id);
    const utensils = await Utensil.getAll(filters);
    res.json(utensils);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch utensils' });
  }
});

router.get('/:id', authenticate, async (req, res) => {
  try {
    const ut = await Utensil.findById(req.params.id);
    if (!ut) return res.status(404).json({ error: 'Utensil not found' });
    if (req.user.role === 'lab_user') {
      const Location = require('../models/Location');
      const loc = await Location.findById(ut.location_id);
      if (!loc || loc.lab_id !== req.user.lab_id) return res.status(403).json({ error: 'Access denied' });
    }
    res.json(ut);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error fetching utensil' });
  }
});

router.post('/', authenticate, authorize('admin', 'lab_keeper'), validate(utensilSchema), async (req, res) => {
  try {
    const ut = await Utensil.create(req.body);
    // log creation
    const db = require('../config/db');
    await db('transactions').insert({
      user_id: req.user.id,
      action_type: 'stock_adjustment',
      item_type: 'utensil',
      item_id: ut.id,
      from_location_id: null,
      to_location_id: req.body.location_id,
      quantity_change: ut.total_count,
      metadata: { name: ut.name }
    });
    res.status(201).json(ut);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Utensil creation failed' });
  }
});

router.put('/:id', authenticate, authorize('admin', 'lab_keeper'), validate(utensilSchema), async (req, res) => {
  try {
    const ut = await Utensil.findById(req.params.id);
    if (!ut) return res.status(404).json({ error: 'Utensil not found' });
    const updated = await Utensil.update(req.params.id, req.body);
    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Update failed' });
  }
});

router.delete('/:id', authenticate, authorize('admin', 'lab_keeper'), async (req, res) => {
  try {
    const ut = await Utensil.findById(req.params.id);
    if (!ut) return res.status(404).json({ error: 'Utensil not found' });
    await Utensil.softDelete(req.params.id);
    res.json({ message: 'Utensil archived' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Deletion failed' });
  }
});

// Report broken (lab_user)
router.post('/:id/report-broken', authenticate, authorize('lab_user'), validate(reportSchema), async (req, res) => {
  try {
    const ut = await Utensil.reportBroken(req.params.id, req.user.id, req.body.quantity);
    res.json({ message: 'Broken utensil reported', ut });
  } catch (err) {
    console.error(err);
    if (err.message === 'Utensil not found') return res.status(404).json({ error: err.message });
    if (err.message.includes('Not enough')) return res.status(409).json({ error: err.message });
    res.status(500).json({ error: 'Failed to report broken' });
  }
});

module.exports = router;