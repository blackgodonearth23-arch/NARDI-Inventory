// backend/src/routes/auth.js
const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Joi = require('joi');
const User = require('../models/User');
const Lab = require('../models/Lab');
const validate = require('../middleware/validate');
const { authenticate, authorize } = require('../middleware/auth');

// --- Schemas (unchanged) ---
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

// --- Token generation ---
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

// --- Enrich user with lab details ---
async function buildUserResponse(user) {
  let lab = null;
  if (user.lab_id) {
    lab = await Lab.findById(user.lab_id);
  }
  return {
    id: user.id,
    email: user.email,
    display_name: user.display_name,
    role: user.role,
    lab_id: user.lab_id,
    lab_type: lab ? lab.type : null,
    allowed_utility_types: lab ? lab.allowed_utility_types : null
  };
}

// --- Register ---
router.post('/register', validate(registerSchema), async (req, res) => {
  try {
    const { email, password, display_name, role, lab_id, pin_4 } = req.body;

    const existing = await User.findByEmail(email);
    if (existing) return res.status(409).json({ error: 'Email already registered' });

    const user = await User.create({ email, password, display_name, role, lab_id, pin_4 });
    const tokens = generateTokens(user);
    const userObj = await buildUserResponse(user);
    res.status(201).json({ user: userObj, ...tokens });
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
    const userObj = await buildUserResponse(user);
    res.json({ user: userObj, ...tokens });
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
    const userObj = await buildUserResponse(user);
    res.json({ accessToken, user: userObj });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'PIN login failed' });
  }
});

router.put('/pin', authenticate, authorize('lab_user'), async (req, res) => {
  const { newPin } = req.body;
  if (!/^\d{4}$/.test(newPin)) return res.status(400).json({ error: 'PIN must be 4 digits' });
  try {
    await User.updatePin(req.user.id, newPin);
    res.json({ message: 'PIN updated' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update PIN' });
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
    res.json(tokens);   // only tokens; client can re‑fetch user via /me
  } catch (err) {
    res.status(401).json({ error: 'Invalid or expired refresh token' });
  }
});

// --- Current User (for client startup) ---
router.get('/me', authenticate, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    const userObj = await buildUserResponse(user);
    res.json(userObj);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

module.exports = router;