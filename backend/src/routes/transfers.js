// backend/src/routes/transfers.js
const express = require('express');
const router = express.Router();
const Joi = require('joi');
const db = require('../config/db');
const Container = require('../models/Container');
const ICTHardware = require('../models/ICTHardware');
const validate = require('../middleware/validate');
const { authenticate, authorize, requireLabType } = require('../middleware/auth');
const { createExpiryAlerts } = require('../services/alertService');

const PDFDocument = require('pdfkit');
const QRCode = require('qrcode');
const path = require('path');
const fs = require('fs');

// Updated schema – added expiry_date optional
const transferSchema = Joi.object({
  item_type: Joi.string().valid('chemical', 'ict_hardware').required(),
  // Fields for chemical
  chemical_id: Joi.when('item_type', {
    is: 'chemical',
    then: Joi.number().integer().required(),
    otherwise: Joi.any().strip()
  }),
  quantity: Joi.when('item_type', {
    is: 'chemical',
    then: Joi.number().integer().min(1).required(),
    otherwise: Joi.any().strip()
  }),
  from_location_id: Joi.number().integer().required(),
  to_location_id: Joi.number().integer().required(),
  // Fields for ICT hardware
  hardware_id: Joi.when('item_type', {
    is: 'ict_hardware',
    then: Joi.number().integer().required(),
    otherwise: Joi.any().strip()
  }),
  // Optional fields
  new_computer_name: Joi.string().max(100).optional(),
  assigned_to_employee: Joi.string().max(255).allow('').optional(),
  office_number: Joi.string().max(20).allow('').optional(),
  expiry_date: Joi.date().iso().allow(null).optional()
});

router.post('/', authenticate, authorize('lab_keeper', 'admin'), requireLabType('Chemistry', 'ICT'), validate(transferSchema), async (req, res) => {
  const { item_type } = req.body;
  const userId = req.user.id;
  const labId = req.user.lab_id;

  try {
    if (item_type === 'chemical') {
      const { chemical_id, quantity, from_location_id, to_location_id, expiry_date } = req.body;
      const baseUrl = `${req.protocol}://${req.get('host')}`;

      // Validate locations
      const [from, to] = await Promise.all([
        db('locations').where({ id: from_location_id }).first(),
        db('locations').where({ id: to_location_id }).first()
      ]);

      if (!from || !to) throw new Error('Invalid location');
      if (from.type !== 'primary') throw new Error('Source must be Primary Storage');
      if (to.type !== 'lab_sub') throw new Error('Destination must be a Sub-storage');
      if (from.lab_id !== labId || to.lab_id !== labId) {
        throw new Error('You can only transfer within your own lab');
      }

      // Execute transfer
      const containers = await Container.transferContainers(
        chemical_id, 
        quantity, 
        from_location_id, 
        to_location_id, 
        userId,
        baseUrl,           // for QR code generation
        expiry_date || null
      );

      // Update transactions with user_id
      if (containers.length > 0) {
        await db('transactions')
          .whereIn('item_id', containers.map(c => c.id))
          .where('action_type', 'transfer')
          .whereNull('user_id')
          .update({ user_id: userId });
      }

      // Generate expiry alerts (non-blocking)
      if (expiry_date && containers.length > 0) {
        for (const cont of containers) {
          try {
            await createExpiryAlerts({
              id: cont.id,
              lab_id: labId,
              expiry_date,
            });
          } catch (e) {
            console.error('Failed to create expiry alert for container', cont.id, e);
          }
        }
      }

      return res.json({
        message: `Successfully transferred ${containers.length} container(s)`,
        containers: containers
      });
    }

    if (item_type === 'ict_hardware') {
      const { hardware_id, to_location_id, new_computer_name, assigned_to_employee, office_number } = req.body;

      const hardware = await ICTHardware.findById(hardware_id);
      if (!hardware) throw new Error('ICT hardware not found');

      if (req.user.role !== 'admin' && hardware.lab_id !== labId) {
        throw new Error('You can only transfer hardware from your own lab');
      }

      const updated = await ICTHardware.transfer(hardware_id, {
        to_location_id,
        new_computer_name,
        assigned_to_employee,
        office_number
      }, userId);

      return res.json({ message: 'ICT hardware transferred', hardware: updated });
    }

    throw new Error('Invalid item type');
  } catch (err) {
    console.error(err);
    
    // Improved error status handling
    let status = 500;
    if (err.message.includes('Not enough') ||
        err.message.includes('Source') ||
        err.message.includes('Destination') ||
        err.message.includes('lab') ||
        err.message.includes('Invalid') ||
        err.message.includes('not found')) {
      status = 400;
    }

    res.status(status).json({ error: err.message });
  }
});

module.exports = router;