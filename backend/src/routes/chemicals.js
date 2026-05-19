// backend/src/routes/chemicals.js
const express = require('express');
const router = express.Router();
const Joi = require('joi');
const db = require('../config/db');
const Chemical = require('../models/Chemical');
const Container = require('../models/Container');
const Location = require('../models/Location');
const validate = require('../middleware/validate');
const { authenticate, authorize, requireLabType } = require('../middleware/auth');
const { createExpiryAlerts } = require('../services/alertService');

// ---- Validation schemas ----
const chemicalSchema = Joi.object({
  name: Joi.string().min(2).max(255).required(),
  cas_number: Joi.string().max(50).allow('', null).optional(),
  reorder_threshold: Joi.number().integer().min(0).default(1),
  chemical_type: Joi.string().max(50).default('Other'),
});

// GET /api/chemicals/bottles – return all bottles for the lab user's sub-storage
router.get('/bottles', authenticate, async (req, res) => {
  try {
    // Optional: filter by PIN from query (?pin=12345)
    const { pin } = req.query;
    let bottles;

    if (req.user.role === 'lab_user') {
      if (!req.user.lab_id) return res.status(400).json({ error: 'No lab assigned' });
      bottles = await Container.getBottlesForLabUser(req.user.lab_id);
    } else {
      // Admin or keeper – return all non‑deleted bottles
      bottles = await db('chemical_containers')
        .join('chemicals', 'chemical_containers.chemical_id', 'chemicals.id')
        .where('chemical_containers.is_deleted', false)
        .select('chemical_containers.*', 'chemicals.name as chemical_name');
    }

    if (pin) {
      bottles = bottles.filter(b => b.pin_5 === pin); // or use DB where clause
    }

    res.json(bottles);
  } catch (err) {
    next(err);
  }
});


const addContainersSchema = Joi.object({
  quantity: Joi.number().integer().min(1).required(),
  location_id: Joi.number().integer().required(),
  container_type: Joi.string().max(50).default('glass_bottle'),
  container_size: Joi.number().allow(null),
  container_unit: Joi.string().max(20).default('ml'),
  expiry_date: Joi.date().iso().allow(null).optional(),
});

const openContainerSchema = Joi.object({
  pin_5: Joi.string().length(5).pattern(/^\d{5}$/).required(),
});

// ---- Read endpoints ----
router.get('/', authenticate, async (req, res) => {
  const chemicals = await Chemical.getAll();
  res.json(chemicals);
});

router.get('/:id', authenticate, async (req, res) => {
  const chem = await Chemical.findById(req.params.id);
  if (!chem) return res.status(404).json({ error: 'Chemical not found' });
  res.json(chem);
});

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

// New: get all bottles for lab user (Chemistry lab only, sub-storage)
router.get('/bottles', authenticate, authorize('lab_user', 'lab_keeper'), requireLabType('Chemistry'), async (req, res) => {
  try {
    const labId = req.user.lab_id;
    const bottles = await Container.getBottlesForLabUser(labId);
    res.json(bottles);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch bottles' });
  }
});

router.post('/open-by-pin', authenticate, authorize('lab_user'), async (req, res) => {
  try {
    const container = await Container.open(req.body.pin_5, req.user.id);
    res.json({ message: 'Container opened', container });
  } catch (err) {
    const status = err.message === 'Container not found' ? 404 : err.message.includes('already') ? 409 : 500;
    res.status(status).json({ error: err.message });
  }
});

// Void a bottle
router.post('/bottles/:id/void', authenticate, authorize('lab_user'), async (req, res) => {
  try {
    const bottle = await Container.findById(req.params.id);
    if (!bottle) return res.status(404).json({ error: 'Bottle not found' });
    const location = await Location.findById(bottle.location_id);
    if (!location || location.lab_id !== req.user.lab_id) return res.status(403).json({ error: 'Access denied' });
    await Container.voidContainer(req.params.id, req.user.id);
    res.json({ message: 'Bottle voided' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Void failed' });
  }
});

// Edit expiry of a bottle
router.put('/bottles/:id/expiry', authenticate, authorize('lab_user'), async (req, res) => {
  try {
    const { expiry_date } = req.body;
    const bottle = await Container.findById(req.params.id);
    if (!bottle) return res.status(404).json({ error: 'Bottle not found' });
    const location = await Location.findById(bottle.location_id);
    if (!location || location.lab_id !== req.user.lab_id) return res.status(403).json({ error: 'Access denied' });
    await Container.updateExpiry(req.params.id, expiry_date);
    res.json({ message: 'Expiry updated' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Update failed' });
  }
});

// Purge old opened bottles
router.post('/bottles/purge', authenticate, authorize('lab_user'), async (req, res) => {
  try {
    const count = await Container.purgeOldOpened(req.user.lab_id, 30);
    res.json({ message: `Purged ${count} old bottle(s)` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Purge failed' });
  }
});

// ---- Create / Update / Delete – restricted to Chemistry labs ----
router.post('/', authenticate, authorize('admin', 'lab_keeper'), requireLabType('Chemistry'), validate(chemicalSchema), async (req, res) => {
  try {
    const chem = await Chemical.create(req.body);
    res.status(201).json(chem);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Chemical creation failed' });
  }
});

router.put('/:id', authenticate, authorize('admin', 'lab_keeper'), requireLabType('Chemistry'), validate(chemicalSchema), async (req, res) => {
  const chem = await Chemical.findById(req.params.id);
  if (!chem) return res.status(404).json({ error: 'Chemical not found' });
  const updated = await Chemical.update(req.params.id, req.body);
  res.json(updated);
});

router.delete('/:id', authenticate, authorize('admin', 'lab_keeper'), requireLabType('Chemistry'), async (req, res) => {
  const chem = await Chemical.findById(req.params.id);
  if (!chem) return res.status(404).json({ error: 'Chemical not found' });
  await Chemical.softDelete(req.params.id);
  res.json({ message: 'Chemical archived' });
});

// ==== REPLACED HANDLER ====
router.post('/:id/containers', authenticate, authorize('lab_keeper'), validate(addContainersSchema), async (req, res) => {
  const chemicalId = req.params.id;
  const chem = await Chemical.findById(chemicalId);
  if (!chem) return res.status(404).json({ error: 'Chemical not found' });

  const { quantity, location_id, container_type, container_size, container_unit, expiry_date } = req.body;

  // Determine if PIN generation is needed
  const location = await db('locations').where({ id: location_id }).first();
  if (!location) return res.status(400).json({ error: 'Invalid location' });
  if (req.user.role === 'lab_keeper' && location.lab_id !== req.user.lab_id) {
    return res.status(403).json({ error: 'Location not in your lab' });
  }

  const generatePin = location.type !== 'primary';

  try {
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    await Container.addContainers(
      chemicalId,
      location_id,
      quantity,
      container_type || 'glass_bottle',
      container_size || null,
      container_unit || 'ml',
      generatePin,
      expiry_date || null,
      baseUrl   // passed for QR generation
    );

    // If expiry date is set, generate alerts **before** sending the response
    if (expiry_date) {
      const containers = await Container.getByChemical(chemicalId, location_id);
      const addedContainers = containers.slice(-quantity);
      for (const cont of addedContainers) {
        try {
          await createExpiryAlerts({
            id: cont.id,
            lab_id: location.lab_id,
            expiry_date,
          });
        } catch (err) {
          console.error('Failed to create expiry alert for container', cont.id, err);
          // Do not fail the whole request – the bottles are already added
        }
      }
    }

    res.status(201).json({ message: `${quantity} container(s) added` });
  } catch (err) {
    console.error('Add containers error:', err);
    res.status(500).json({ error: 'Failed to add containers' });
  }
});

// Open container
router.post('/:id/open', authenticate, authorize('lab_user'), validate(openContainerSchema), async (req, res) => {
  try {
    const container = await Container.open(req.body.pin_5, req.user.id);
    res.json({ message: 'Container opened', container });
  } catch (err) {
    const status =
      err.message === 'Container not found'
        ? 404
        : err.message.startsWith('Container is already')
        ? 409
        : 500;
    res.status(status).json({ error: err.message });
  }
});

module.exports = router;