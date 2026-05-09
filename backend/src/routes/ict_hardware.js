const express = require('express');
const router = express.Router();
const Joi = require('joi');
const ICTHardware = require('../models/ICTHardware');
const validate = require('../middleware/validate');
const { authenticate, authorize } = require('../middleware/auth');

// Type specific details schema (depends on type)
const detailsSchema = Joi.object({
  os: Joi.string().optional(),
  processor: Joi.string().optional(),
  ram: Joi.string().optional(),
  imei: Joi.string().optional(),
  phone_number: Joi.string().optional(),
  voucher: Joi.string().optional(),
  brand: Joi.string().optional(),
  model: Joi.string().optional(),
  extension: Joi.string().optional(),
  mount: Joi.string().valid('ceiling', 'mobile').optional(),
  ip_address: Joi.string().optional(),
  ports_count: Joi.number().optional(),
  resolution: Joi.string().optional()
}).unknown(true); // allow extra

const createSchema = Joi.object({
  asset_id: Joi.string().max(50).required(),
  computer_name: Joi.string().max(100).when('type', {
    is: Joi.string().valid('laptop', 'desktop'),
    then: Joi.required(),
    otherwise: Joi.optional()
  }),
  serial_number: Joi.string().max(100).required(),
  type: Joi.string().valid('laptop', 'desktop', 'smartphone', 'lan_phone', 'projector', 'cctv_cam', 'switch', 'router', 'other').required(),
  model: Joi.string().max(255).allow(''),
  status: Joi.string().valid('new', 'available', 'in_use', 'under_repair', 'decommissioned').default('new'),
  office_number: Joi.string().max(20).allow(''),
  assigned_to_employee: Joi.string().max(255).allow(''),
  issued_date: Joi.date().allow(null),
  return_date: Joi.date().allow(null),
  price: Joi.number().allow(null),
  details: detailsSchema.default({}),
  lab_id: Joi.number().integer().required(),
  location_id: Joi.number().integer().allow(null),
  notes: Joi.string().max(500).allow(''),
  purchase_date: Joi.date().allow(null)
});

const updateSchema = createSchema.keys({
  asset_id: Joi.string().max(50).optional(),
  serial_number: Joi.string().max(100).optional(),
  type: Joi.string().optional(),
  lab_id: Joi.number().integer().optional(),
  location_id: Joi.number().integer().allow(null)
});

const transferSchema = Joi.object({
  to_lab_id: Joi.number().integer().optional(),
  to_location_id: Joi.number().integer().allow(null).optional(),
  new_computer_name: Joi.string().max(100).optional(),
  assigned_to_employee: Joi.string().max(255).allow('').optional(),
  office_number: Joi.string().max(20).allow('').optional()
});

// All ICT keepers and admins have full access to ICT hardware
const ictAuthorize = [authenticate, authorize('admin', 'ict_keeper')];

router.get('/', ...ictAuthorize, async (req, res) => {
  try {
    const hardware = await ICTHardware.getAll(req.query, req.user);
    res.json(hardware);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch hardware' });
  }
});

router.get('/assignments', ...ictAuthorize, async (req, res) => {
  try {
    const { employee } = req.query;
    if (!employee) return res.status(400).json({ error: 'Employee name required' });
    const items = await ICTHardware.getByEmployee(employee);
    res.json(items);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch assignments' });
  }
});

router.get('/:id', ...ictAuthorize, async (req, res) => {
  try {
    const hw = await ICTHardware.findById(req.params.id);
    if (!hw) return res.status(404).json({ error: 'Hardware not found' });
    res.json(hw);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch hardware' });
  }
});

router.get('/:id/history', ...ictAuthorize, async (req, res) => {
  try {
    const history = await ICTHardware.getHistory(req.params.id);
    res.json(history);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch history' });
  }
});

router.post('/', ...ictAuthorize, validate(createSchema), async (req, res) => {
  try {
    const hw = await ICTHardware.create(req.body, req.user.id);
    res.status(201).json(hw);
  } catch (err) {
    console.error(err);
    if (err.message.includes('Asset ID already exists')) {
      return res.status(409).json({ error: err.message });
    }
    res.status(500).json({ error: 'Creation failed' });
  }
});

router.put('/:id', ...ictAuthorize, validate(updateSchema), async (req, res) => {
  try {
    const hw = await ICTHardware.update(req.params.id, req.body, req.user.id);
    res.json(hw);
  } catch (err) {
    console.error(err);
    const status = err.message === 'Hardware not found' ? 404 : 500;
    res.status(status).json({ error: err.message });
  }
});

router.post('/:id/transfer', ...ictAuthorize, validate(transferSchema), async (req, res) => {
  try {
    // Admin can change lab_id; ICT keeper cannot.
    if (req.user.role !== 'admin' && req.body.to_lab_id) {
      return res.status(403).json({ error: 'Only admin can change department' });
    }
    const hw = await ICTHardware.transfer(req.params.id, req.body, req.user.id);
    res.json(hw);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', ...ictAuthorize, async (req, res) => {
  try {
    await ICTHardware.softDelete(req.params.id);
    res.json({ message: 'Hardware archived' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Deletion failed' });
  }
});

module.exports = router;