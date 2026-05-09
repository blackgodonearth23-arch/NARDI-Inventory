const express = require('express');
const router = express.Router();
const Joi = require('joi');
const User = require('../models/User');
const validate = require('../middleware/validate');
const { authenticate, authorize } = require('../middleware/auth');

// -------------- Schemas ---------------
const createUserSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required(),
  display_name: Joi.string().min(2).max(255).required(),
  role: Joi.string().valid('admin','lab_keeper','ict_keeper','lab_user').required(),
  lab_id: Joi.number().integer().allow(null).optional(),
  pin_4: Joi.string().length(4).pattern(/^\d{4}$/).optional()
    .when('role', { is: 'lab_user', then: Joi.required() })
});

const updateUserSchema = Joi.object({
  email: Joi.string().email().optional(),
  display_name: Joi.string().min(2).max(255).optional(),
  role: Joi.string().valid('admin','lab_keeper','ict_keeper','lab_user').optional(),
  lab_id: Joi.number().integer().allow(null).optional(),
  pin_4: Joi.string().length(4).pattern(/^\d{4}$/).allow(null).optional(),
  is_active: Joi.boolean().optional()
}).min(1);

// -------------- Routes ---------------
// GET all users – only active ones (hide deleted)
router.get('/', authenticate, authorize('admin'), async (req, res) => {
  try {
    const users = await User.getAllActive();   // we'll add this to the User model
    res.json(users);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// GET single user
router.get('/:id', authenticate, authorize('admin'), async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

// CREATE user (admin only)
router.post('/', authenticate, authorize('admin'), validate(createUserSchema), async (req, res) => {
  try {
    const existing = await User.findByEmail(req.body.email);
    if (existing) return res.status(409).json({ error: 'Email already registered' });
    const user = await User.create(req.body);
    res.status(201).json(user);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'User creation failed' });
  }
});

// UPDATE user (admin only)
router.put('/:id', authenticate, authorize('admin'), validate(updateUserSchema), async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const updatable = ['email','display_name','role','lab_id','pin_4','is_active'];
    const updates = {};
    for (const key of updatable) {
      if (req.body[key] !== undefined) updates[key] = req.body[key];
    }

    if (updates.pin_4 !== undefined) {
      // delegate to User.updatePin which will hash it
      await User.updatePin(req.params.id, updates.pin_4);
      delete updates.pin_4;
    }

    if (Object.keys(updates).length > 0) {
      await User.update(req.params.id, updates);
    }
    const updatedUser = await User.findById(req.params.id);
    res.json(updatedUser);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'User update failed' });
  }
});

// SOFT DELETE user (deactivate)
router.delete('/:id', authenticate, authorize('admin'), async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    await User.deactivate(req.params.id);
    res.json({ message: 'User deactivated' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to deactivate user' });
  }
});

module.exports = router;