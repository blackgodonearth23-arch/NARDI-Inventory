const express = require('express');
const router = express.Router();
const Joi = require('joi');
const User = require('../models/User');
const validate = require('../middleware/validate');
const { authenticate, authorize } = require('../middleware/auth');

// --- Validation schemas ---
const createUserSchema = Joi.object({
  email: Joi.string().email({ tlds: { allow: false } }).required(),
  password: Joi.string().min(6).max(100).required(),
  display_name: Joi.string().min(2).max(255).required(),
  role: Joi.string().valid('admin', 'lab_keeper', 'ict_keeper', 'lab_user').required(),
  lab_id: Joi.number().integer().allow(null).optional(),
  pin_4: Joi.string().length(4).pattern(/^\d{4}$/).optional()
    .when('role', { is: 'lab_user', then: Joi.required() })
});

const updateUserSchema = Joi.object({
  display_name: Joi.string().min(2).max(255).optional(),
  role: Joi.string().valid('admin', 'lab_keeper', 'ict_keeper', 'lab_user').optional(),
  lab_id: Joi.number().integer().allow(null).optional(),
  is_active: Joi.boolean().optional()
});

const updatePinSchema = Joi.object({
  pin_4: Joi.string().length(4).pattern(/^\d{4}$/).required()
});

// --- Routes (all admin only) ---
router.use(authenticate, authorize('admin'));

// GET all users (active and disabled, for management)
router.get('/', async (req, res) => {
  try {
    const db = require('../config/db');
    const users = await db('users').select('id', 'email', 'display_name', 'role', 'lab_id', 'is_active', 'created_at');
    res.json(users);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// POST create a new user
router.post('/', validate(createUserSchema), async (req, res) => {
  try {
    const { email, password, display_name, role, lab_id, pin_4 } = req.body;
    const existing = await User.findByEmail(email);
    if (existing) return res.status(409).json({ error: 'Email already registered' });

    const user = await User.create({ email, password, display_name, role, lab_id, pin_4 });
    res.status(201).json({ id: user.id, email: user.email, display_name: user.display_name, role: user.role, lab_id: user.lab_id, is_active: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'User creation failed' });
  }
});

// PATCH update user (role, lab, active status, display name)
router.patch('/:id', validate(updateUserSchema), async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const db = require('../config/db');
    const updates = {};
    if (req.body.display_name !== undefined) updates.display_name = req.body.display_name;
    if (req.body.role !== undefined) updates.role = req.body.role;
    if (req.body.lab_id !== undefined) updates.lab_id = req.body.lab_id;
    if (req.body.is_active !== undefined) updates.is_active = req.body.is_active;   // disable/enable

    await db('users').where({ id: userId }).update(updates);
    const updatedUser = await User.findById(userId);
    res.json(updatedUser);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Update failed' });
  }
});

// PATCH /:id/pin – set/update 4-digit PIN (admin can reset it)
router.patch('/:id/pin', validate(updatePinSchema), async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: 'User not found' });
    
    await User.updatePin(userId, req.body.pin_4);
    res.json({ message: 'PIN updated' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'PIN update failed' });
  }
});

// DELETE (soft disable) – set is_active = false
router.delete('/:id', async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const db = require('../config/db');
    await db('users').where({ id: userId }).update({ is_active: false });
    res.json({ message: 'User disabled' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to disable user' });
  }
});

module.exports = router;