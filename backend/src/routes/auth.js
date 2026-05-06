const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Joi = require('joi');
const User = require('../models/User');
const validate = require('../middleware/validate');
const { authenticate } = require('../middleware/auth');

// --- Schemas ---
const registerSchema = Joi.object({
  email: Joi.string().email({ tlds: { allow: false } }).required(),
  password: Joi.string().min(6).max(100).required(),
  display_name: Joi.string().min(2).max(255).required(),
  role: Joi.string().valid('admin', 'lab_keeper', 'ict_keeper', 'lab_user').default('lab_user'),
  lab_id: Joi.number().integer().allow(null).optional(),
  pin_4: Joi.string().length(4).pattern(/^\d{4}$/).optional()
    .when('role', { is: 'lab_user', then: Joi.required() })
});

const loginSchema = Joi.object({
  email: Joi.string().email({ tlds: { allow: false } }).required(),
  password: Joi.string().required()
});

const pinLoginSchema = Joi.object({
  pin_4: Joi.string().length(4).pattern(/^\d{4}$/).required(),
  lab_id: Joi.number().integer().optional()
});

const refreshSchema = Joi.object({
  refreshToken: Joi.string().required()
});

// --- Helper: generate tokens ---
function generateTokens(user) {
  const payload = { id: user.id, email: user.email, role: user.role, lab_id: user.lab_id };
  const accessToken = jwt.sign(payload, process.env.JWT_ACCESS_SECRET, {
    expiresIn: process.env.JWT_ACCESS_EXPIRES
  });
  const refreshToken = jwt.sign({ id: user.id }, process.env.JWT_REFRESH_SECRET, {
    expiresIn: process.env.JWT_REFRESH_EXPIRES
  });
  return { accessToken, refreshToken };
}

// --- Register ---
router.post('/register', validate(registerSchema), async (req, res) => {
  try {
    const { email, password, display_name, role, lab_id, pin_4 } = req.body;

    const existing = await User.findByEmail(email);
    if (existing) return res.status(409).json({ error: 'Email already registered' });

    const user = await User.create({ email, password, display_name, role, lab_id, pin_4 });
    const tokens = generateTokens(user);
    res.status(201).json({
      user: { id: user.id, email: user.email, role: user.role, lab_id: user.lab_id },
      ...tokens
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// --- Login ---
router.post('/login', validate(loginSchema), async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findByEmail(email);
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });

    const validPw = await bcrypt.compare(password, user.password_hash);
    if (!validPw) return res.status(401).json({ error: 'Invalid credentials' });

    const tokens = generateTokens(user);
    res.json({
      user: { id: user.id, email: user.email, role: user.role, lab_id: user.lab_id },
      ...tokens
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Login failed' });
  }
});

// --- Lab Terminal PIN Login ---
router.post('/pin', validate(pinLoginSchema), async (req, res) => {
  try {
    const { pin_4, lab_id } = req.body;
    const user = await User.findByPin(pin_4, lab_id);
    if (!user) return res.status(401).json({ error: 'Invalid PIN' });

    const payload = { id: user.id, email: user.email, role: user.role, lab_id: user.lab_id };
    const accessToken = jwt.sign(payload, process.env.JWT_ACCESS_SECRET, { expiresIn: '5m' });
    res.json({ accessToken, user: { id: user.id, display_name: user.display_name, lab_id: user.lab_id } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'PIN login failed' });
  }
});

// --- Refresh Token ---
router.post('/refresh', validate(refreshSchema), async (req, res) => {
  try {
    const { refreshToken } = req.body;
    const payload = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    const user = await User.findById(payload.id);
    if (!user) return res.status(401).json({ error: 'User not found or deactivated' });

    const tokens = generateTokens(user);
    res.json(tokens);
  } catch (err) {
    res.status(401).json({ error: 'Invalid or expired refresh token' });
  }
});

module.exports = router;