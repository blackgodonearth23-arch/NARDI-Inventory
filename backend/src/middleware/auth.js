const jwt = require('jsonwebtoken');
const Lab = require('../models/Lab');

async function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Access token missing' });
  }
  const token = authHeader.split(' ')[1];
  try {
    const payload = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
    req.user = {
      id: payload.id,
      email: payload.email,
      role: payload.role,
      lab_id: payload.lab_id || null
    };

    if (req.user.lab_id) {
      try {
        const labDetails = await Lab.getDetailsForUser(req.user.lab_id);
        if (labDetails) {
          req.user.lab_type = labDetails.type;
          req.user.allowed_utility_types = labDetails.allowed_utility_types || [];
          req.user.type_fields = labDetails.type_fields || {};
        }
      } catch (err) {
        console.error(`Failed to fetch lab details for user ${req.user.id}:`, err.message);
      }
    }

    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired access token' });
  }
}

function authorize(...roles) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'Not authenticated' });
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    next();
  };
}

function requireLabType(...allowedTypes) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'Not authenticated' });
    if (req.user.role === 'admin') return next();
    if (!req.user.lab_type) {
      return res.status(403).json({ error: 'No lab assigned or lab type unknown' });
    }
    if (!allowedTypes.includes(req.user.lab_type)) {
      return res.status(403).json({ error: 'This module is not available for your lab type' });
    }
    next();
  };
}

module.exports = { authenticate, authorize, requireLabType };