const express = require('express');
const router = express.Router();
const Joi = require('joi');
const UtilityItem = require('../models/UtilityItem');
const { authenticate, authorize, requireLabType } = require('../middleware/auth');

function buildPropertiesSchema(typeFieldsForType) {
  const shape = {};
  if (Array.isArray(typeFieldsForType)) {
    typeFieldsForType.forEach(field => {
      let fieldSchema;
      switch (field.type) {
        case 'number': fieldSchema = Joi.number().allow(null, ''); break;
        case 'date': fieldSchema = Joi.date().iso().allow(null); break;
        case 'boolean': fieldSchema = Joi.boolean().allow(null); break;
        default: fieldSchema = Joi.string().max(500).allow('', null);
      }
      shape[field.name] = fieldSchema.optional();
    });
  }
  return Joi.object(shape).default({});
}

// ---- Alert endpoints ----
router.get('/expiring', authenticate, authorize('admin', 'lab_keeper', 'lab_user'), requireLabType('Chemistry', 'Other'), async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 30;
    const filters = { expiring_within_days: days };
    if (req.user.role !== 'admin') {
      filters.lab_id = req.user.lab_id;
    }
    const items = await UtilityItem.getAll(filters, req.user);
    res.json(items);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch expiring items' });
  }
});

router.get('/calibration-due', authenticate, authorize('admin', 'lab_keeper', 'lab_user'), requireLabType('Chemistry', 'Other'), async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 30;
    const labId = req.user.role === 'admin' ? null : req.user.lab_id;
    const items = await UtilityItem.getCalibrationDue(days, labId);
    res.json(items);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch calibration due items' });
  }
});

// ---- Standard CRUD ----
router.get('/', authenticate, authorize('admin', 'lab_keeper', 'lab_user'), requireLabType('Chemistry', 'Other'), async (req, res) => {
  try {
    const filters = { ...req.query };
    if (req.user.role !== 'admin') {
      filters.types = req.user.allowed_utility_types || [];
    }
    if (req.query.top_level === 'true') {
      filters.parent_id = null;
    } else if (req.query.parent_id) {
      filters.parent_id = parseInt(req.query.parent_id);
    }
    const items = await UtilityItem.getAll(filters, req.user);
    res.json(items);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch items' });
  }
});

router.get('/:id', authenticate, authorize('admin', 'lab_keeper', 'lab_user'), requireLabType('Chemistry', 'Other'), async (req, res) => {
  try {
    const item = await UtilityItem.findById(req.params.id);
    if (!item) return res.status(404).json({ error: 'Not found' });
    res.json(item);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error fetching item' });
  }
});

router.post('/', authenticate, authorize('admin', 'lab_keeper', 'lab_user'), requireLabType('Chemistry', 'Other'), async (req, res) => {
  try {
    if (req.user.role === 'lab_keeper') {
      req.body.lab_id = req.user.lab_id;
    }
    const labId = req.body.lab_id;
    const type = req.body.type;
    const typeFields = req.user.type_fields || {};
    const propertiesSchema = buildPropertiesSchema(typeFields[type]);

    const baseSchema = Joi.object({
      asset_id: Joi.string().max(50).allow(null, '').optional(),
      name: Joi.string().min(2).max(255).required(),
      type: Joi.string().max(100).required(),
      lab_id: Joi.number().integer().required(),
      total_count: Joi.number().integer().min(1).default(1),
      status: Joi.string().valid('working', 'broken', 'under_repair').default('working'),
      container_type: Joi.string().max(100).default('bottle'),
      parent_id: Joi.number().integer().allow(null).optional(),
      expiry_date: Joi.date().iso().allow(null).optional(),
      properties: propertiesSchema
    });

    const { error, value } = baseSchema.validate(req.body, { stripUnknown: true });
    if (error) return res.status(400).json({ error: error.details[0].message });

    const allowed = req.user.allowed_utility_types || [];
    if (!allowed.includes(value.type)) {
      return res.status(400).json({ error: `Type "${value.type}" is not allowed.` });
    }
    if (value.parent_id) {
      const parent = await UtilityItem.findById(value.parent_id);
      if (!parent || parent.lab_id !== value.lab_id) {
        return res.status(400).json({ error: 'Invalid parent item.' });
      }
    }

    const item = await UtilityItem.create(value, req.user.id);
    res.status(201).json(item);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Creation failed' });
  }
});

router.put('/:id', authenticate, authorize('admin', 'lab_keeper', 'lab_user'), requireLabType('Chemistry', 'Other'), async (req, res) => {
  try {
    const existing = await UtilityItem.findById(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Not found' });
    if (req.user.role === 'lab_keeper' && existing.lab_id !== req.user.lab_id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const type = req.body.type || existing.type;
    const typeFields = req.user.type_fields || {};
    const propertiesSchema = buildPropertiesSchema(typeFields[type]);

    const baseSchema = Joi.object({
      asset_id: Joi.string().max(50).allow(null, '').optional(),
      name: Joi.string().min(2).max(255).optional(),
      type: Joi.string().max(100).optional(),
      lab_id: Joi.number().integer().optional(),
      total_count: Joi.number().integer().min(1).optional(),
      status: Joi.string().valid('working', 'broken', 'under_repair').optional(),
      container_type: Joi.string().max(100).optional(),
      parent_id: Joi.number().integer().allow(null).optional(),
      expiry_date: Joi.date().iso().allow(null).optional(),
      properties: propertiesSchema
    });

    const { error, value } = baseSchema.validate(req.body, { stripUnknown: true });
    if (error) return res.status(400).json({ error: error.details[0].message });

    if (value.parent_id && value.parent_id !== existing.parent_id) {
      const parent = await UtilityItem.findById(value.parent_id);
      if (!parent || parent.lab_id !== existing.lab_id) {
        return res.status(400).json({ error: 'Invalid parent item.' });
      }
    }

    const updated = await UtilityItem.update(req.params.id, value);
    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Update failed' });
  }
});

router.delete('/:id', authenticate, authorize('admin', 'lab_keeper', 'lab_user'), requireLabType('Chemistry', 'Other'), async (req, res) => {
  try {
    const existing = await UtilityItem.findById(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Not found' });
    if (req.user.role === 'lab_keeper' && existing.lab_id !== req.user.lab_id) {
      return res.status(403).json({ error: 'Access denied' });
    }
    await UtilityItem.softDelete(req.params.id);
    res.json({ message: 'Item archived' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Deletion failed' });
  }
});

module.exports = router;