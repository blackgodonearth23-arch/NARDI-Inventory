const express = require('express');
const router = express.Router();
const Joi = require('joi');
const Chemical = require('../models/Chemical');
const Container = require('../models/Container');
const Location = require('../models/Location');
const validate = require('../middleware/validate');
const { authenticate, authorize } = require('../middleware/auth');

const chemicalSchema = Joi.object({
  name: Joi.string().min(2).max(255).required(),
  cas_number: Joi.string().max(50).allow('', null).optional(),
  unit: Joi.string().valid('container', 'ml', 'g', 'l', 'kg').default('container'),
  reorder_threshold: Joi.number().integer().min(0).default(1),
  chemical_type: Joi.string().max(50).default('Other')
});

const addContainersSchema = Joi.object({
  quantity: Joi.number().integer().min(1).required(),
  location_id: Joi.number().integer().required()
});

const openContainerSchema = Joi.object({
  pin_5: Joi.string().length(5).pattern(/^\d{5}$/).required()
});

// --- Chemical CRUD ---
router.get('/', authenticate, async (req, res) => {
  const chemicals = await Chemical.getAll();
  res.json(chemicals);
});

router.get('/:id', authenticate, async (req, res) => {
  const chem = await Chemical.findById(req.params.id);
  if (!chem) return res.status(404).json({ error: 'Chemical not found' });
  res.json(chem);
});

router.post('/', authenticate, authorize('lab_keeper'), validate(chemicalSchema), async (req, res) => {
  try {
    const chem = await Chemical.create(req.body);
    res.status(201).json(chem);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Chemical creation failed' });
  }
});

router.put('/:id', authenticate, authorize('lab_keeper'), validate(chemicalSchema), async (req, res) => {
  const chem = await Chemical.findById(req.params.id);
  if (!chem) return res.status(404).json({ error: 'Chemical not found' });
  const updated = await Chemical.update(req.params.id, req.body);
  res.json(updated);
});

router.delete('/:id', authenticate, authorize('lab_keeper'), async (req, res) => {
  const chem = await Chemical.findById(req.params.id);
  if (!chem) return res.status(404).json({ error: 'Chemical not found' });
  await Chemical.softDelete(req.params.id);
  res.json({ message: 'Chemical archived' });
});

// --- Container management for a chemical ---
router.get('/:id/containers', authenticate, async (req, res) => {
  const chemicalId = req.params.id;
  const locationId = req.query.location_id ? parseInt(req.query.location_id) : null;

  if (req.user.role === 'lab_user') {
    if (!req.user.lab_id) return res.status(403).json({ error: 'No lab assigned' });
    if (!locationId) return res.status(400).json({ error: 'Location ID required' });
    const loc = await Location.findById(locationId);
    if (!loc || loc.lab_id !== req.user.lab_id) return res.status(403).json({ error: 'Access denied' });
  }

  const containers = await Container.getByChemical(chemicalId, locationId);
  res.json(containers);
});

router.post('/:id/containers', authenticate, authorize('lab_keeper'), validate(addContainersSchema), async (req, res) => {
  const chemicalId = req.params.id;
  const chem = await Chemical.findById(chemicalId);
  if (!chem) return res.status(404).json({ error: 'Chemical not found' });

  const { quantity, location_id } = req.body;
  try {
    await Container.addContainers(chemicalId, location_id, quantity);
    res.status(201).json({ message: `${quantity} container(s) added` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to add containers' });
  }
});

router.post('/:id/open', authenticate, authorize('lab_user'), validate(openContainerSchema), async (req, res) => {
  try {
    const container = await Container.open(req.body.pin_5, req.user.id);
    res.json({ message: 'Container opened', container });
  } catch (err) {
    const status =
      err.message === 'Container not found' ? 404 :
      err.message.startsWith('Container is already') ? 409 :
      500;
    res.status(status).json({ error: err.message });
  }
});

module.exports = router;