const express = require('express');
const router = express.Router();
const Joi = require('joi');
const Chemical = require('../models/Chemical');
const Bottle = require('../models/Bottle');
const validate = require('../middleware/validate');
const { authenticate, authorize } = require('../middleware/auth');

// --- Chemical schemas ---
const chemicalSchema = Joi.object({
  name: Joi.string().min(2).max(255).required(),
  cas_number: Joi.string().max(50).allow('', null).optional(),
  unit: Joi.string().valid('bottle', 'ml', 'g', 'l', 'kg').default('bottle'),
  reorder_threshold: Joi.number().integer().min(0).default(1)
});

const addBottlesSchema = Joi.object({
  quantity: Joi.number().integer().min(1).required(),
  location_id: Joi.number().integer().required()    // must be a lab_sub location (Keeper selects)
});

const openBottleSchema = Joi.object({
  pin_5: Joi.string().length(5).pattern(/^\d{5}$/).required()
});

// --- Chemical CRUD (Inventory Keeper only) ---

router.get('/', authenticate, async (req, res) => {
  // Anyone authenticated can list chemicals (for dropdowns, etc.)
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

// --- Bottle management for a chemical ---

// Get bottles for a chemical (optional query ?location_id=)
router.get('/:id/bottles', authenticate, async (req, res) => {
  const chemicalId = req.params.id;
  const locationId = req.query.location_id ? parseInt(req.query.location_id) : null;
  // Lab users only see bottles in their own lab's locations – we'll filter later via middleware or here.
  // For now, we'll allow if lab_keeper or admin, or restrict for lab_user.
  if (req.user.role === 'lab_user') {
    if (!req.user.lab_id) return res.status(403).json({ error: 'No lab assigned' });
    // Verify location belongs to user's lab, or if no location_id, we return all locations of their lab?
    // We'll require location_id for lab users to be explicit.
    if (!locationId) return res.status(400).json({ error: 'Location ID required' });
    const Location = require('../models/Location');   // reuse existing model
    const loc = await Location.findById(locationId);
    if (!loc || loc.lab_id !== req.user.lab_id) return res.status(403).json({ error: 'Access denied' });
  }
  const bottles = await Bottle.getByChemical(chemicalId, locationId);
  res.json(bottles);
});

// Add unopened bottles (Keeper only)
router.post('/:id/bottles', authenticate, authorize('lab_keeper'), validate(addBottlesSchema), async (req, res) => {
  const chemicalId = req.params.id;
  const chem = await Chemical.findById(chemicalId);
  if (!chem) return res.status(404).json({ error: 'Chemical not found' });

  const { quantity, location_id } = req.body;
  try {
    await Bottle.addBottles(chemicalId, location_id, quantity);
    res.status(201).json({ message: `${quantity} bottle(s) added` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to add bottles' });
  }
});

// Open a bottle (Lab User only, via 5-PIN)
router.post('/:id/open', authenticate, authorize('lab_user'), validate(openBottleSchema), async (req, res) => {
  const { pin_5 } = req.body;
  try {
    const bottle = await Bottle.open(pin_5, req.user.id);
    res.json({ message: 'Bottle opened', bottle });
  } catch (err) {
    if (err.message === 'Bottle not found') return res.status(404).json({ error: err.message });
    if (err.message.startsWith('Bottle is already')) return res.status(409).json({ error: err.message });
    console.error(err);
    res.status(500).json({ error: 'Failed to open bottle' });
  }
});

module.exports = router;