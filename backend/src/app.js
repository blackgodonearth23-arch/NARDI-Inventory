require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

const authRoutes = require('./routes/auth');
const chemicalRoutes = require('./routes/chemicals');
const transferRoutes = require('./routes/transfers');
const userRoutes = require('./routes/users');
const labRoutes = require('./routes/labs');
const locationRoutes = require('./routes/locations');
const containerRoutes = require('./routes/containers');
const equipmentRoutes = require('./routes/equipment');        // if you still have it
const utensilRoutes = require('./routes/utensils');            // if you still have it
const utilityRoutes = require('./routes/utilities');
const ictHardwareRoutes = require('./routes/ict_hardware');
const softwareLicenseRoutes = require('./routes/software_licenses');
const alertRoutes = require('./routes/alerts');
const reportRoutes = require('./routes/reports');

// Start daily alert scheduler
require('./jobs/dailyAlerts');

const app = express();

// Middleware
app.use(helmet());
app.use(cors());
app.use(morgan('dev'));
app.use(express.json());

// Rate limiter for auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30,                   // 30 attempts per window per IP
  message: { error: 'Too many requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/auth', authLimiter);

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/chemicals', chemicalRoutes);
app.use('/api/transfers', transferRoutes);
app.use('/api/users', userRoutes);
app.use('/api/labs', labRoutes);
app.use('/api/locations', locationRoutes);
app.use('/api/containers', containerRoutes);
app.use('/api/equipment', equipmentRoutes);        // can keep for backward compat
app.use('/api/utensils', utensilRoutes);            // can keep for backward compat
app.use('/api/utilities', utilityRoutes);
app.use('/api/ict/hardware', ictHardwareRoutes);
app.use('/api/ict/licenses', softwareLicenseRoutes);
app.use('/api/alerts', alertRoutes);
app.use('/api/reports', reportRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('ERROR:', err.stack);
  if (err.isOperational) {
    return res.status(err.statusCode || 500).json({ error: err.message });
  }
  res.status(500).json({ error: 'Internal server error' });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`NARDI Inventory API running on port ${PORT}`);
});