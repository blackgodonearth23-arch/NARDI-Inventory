require('dotenv').config();
// Imports
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const authRoutes = require('./routes/auth');
const chemicalRoutes = require('./routes/chemicals');
const transferRoutes = require('./routes/transfers');
const userRoutes = require('./routes/users');
const labRoutes = require('./routes/labs');
const locationRoutes = require('./routes/locations');
const bottleRoutes = require('./routes/bottles');
const equipmentRoutes = require('./routes/equipment');
const utensilRoutes = require('./routes/utensils');
const softwareLicenseRoutes = require('./routes/software_licenses');
const ictHardwareRoutes = require('./routes/ict_hardware');
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

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/chemicals', chemicalRoutes);
app.use('/api/transfers', transferRoutes);
app.use('/api/users', userRoutes);
app.use('/api/labs', labRoutes);
app.use('/api/locations', locationRoutes);
app.use('/api/bottles', bottleRoutes);
app.use('/api/equipment', equipmentRoutes);
app.use('/api/utensils', utensilRoutes);
app.use('/api/ict/hardware', ictHardwareRoutes);
app.use('/api/ict/licenses', softwareLicenseRoutes);
app.use('/api/alerts', alertRoutes);
app.use('/api/reports', reportRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 404
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal server error' });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`NARDI Inventory API running on port ${PORT}`);
});