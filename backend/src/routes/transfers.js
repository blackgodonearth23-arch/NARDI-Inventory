// backend/src/routes/transfers.js
const express = require('express');
const router = express.Router();
const Joi = require('joi');
const db = require('../config/db');
const Container = require('../models/Container');
const ICTHardware = require('../models/ICTHardware');
const validate = require('../middleware/validate');
const { authenticate, authorize, requireLabType } = require('../middleware/auth');
const PDFDocument = require('pdfkit');
const QRCode = require('qrcode');
const path = require('path');
const fs = require('fs');

// Base schema – type determines which fields are required
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
  // Optional extra fields for ICT transfer
  new_computer_name: Joi.string().max(100).optional(),
  assigned_to_employee: Joi.string().max(255).allow('').optional(),
  office_number: Joi.string().max(20).allow('').optional()
});

// Apply lab type restriction – only Chemistry and ICT labs can transfer
router.post('/', authenticate, authorize('lab_keeper', 'admin'), requireLabType('Chemistry', 'ICT'), validate(transferSchema), async (req, res) => {
  const { item_type } = req.body;
  const userId = req.user.id;
  const labId = req.user.lab_id;   // keepers are scoped to their lab

  try {
    if (item_type === 'chemical') {
      // Existing chemical transfer logic
      const { chemical_id, quantity, from_location_id, to_location_id } = req.body;

      // Validate locations
      const [from, to] = await Promise.all([
        db('locations').where({ id: from_location_id }).first(),
        db('locations').where({ id: to_location_id }).first()
      ]);
      if (!from || !to) throw new Error('Invalid location');
      if (from.type !== 'primary') throw new Error('Source must be Primary Storage');
      if (to.type !== 'lab_sub') throw new Error('Destination must be a Sub‑storage');
      if (from.lab_id !== labId || to.lab_id !== labId) {
        throw new Error('You can only transfer within your own lab');
      }

      // Execute transfer
      const containers = await Container.transferContainers(
        chemical_id, quantity, from_location_id, to_location_id, userId
      );

      // Update transactions with user_id (model didn't have it)
      await db('transactions')
        .whereIn('item_id', containers.map(c => c.id))
        .where('action_type', 'transfer')
        .whereNull('user_id')
        .update({ user_id: userId });

      return res.json({ message: `Successfully transferred ${containers.length} container(s)` });
    }



// ... after successful transfer, containers is array of updated container objects

// Generate PDF with QR codes
const doc = new PDFDocument();
const pdfDir = path.join(__dirname, '..', 'public', 'pdfs');
if (!fs.existsSync(pdfDir)) fs.mkdirSync(pdfDir, { recursive: true });
const pdfPath = path.join(pdfDir, `transfer_${Date.now()}.pdf`);
const writeStream = fs.createWriteStream(pdfPath);
doc.pipe(writeStream);

doc.fontSize(16).text('Transfer Receipt', { align: 'center' });
doc.moveDown();
doc.fontSize(12).text(`Date: ${new Date().toISOString().slice(0,10)}`);
doc.text(`Chemical: ${chem.name}`); // need chem name, fetch if not in scope

for (const cont of updatedContainers) {
  doc.moveDown();
  doc.text(`PIN: ${cont.pin_5}`);
  if (cont.qr_code) {
    doc.image(cont.qr_code, { width: 100 });
  }
}

doc.end();

await new Promise((resolve, reject) => {
  writeStream.on('finish', resolve);
  writeStream.on('error', reject);
});

// Save record
await db('transfer_pdfs').insert({
  transfer_id: null, // we could link to a transactions record if we had one; for now null
  file_path: pdfPath,
  lab_id: labId,
  created_at: new Date()
});

// Return PDF download URL in response
const pdfUrl = `/pdfs/${path.basename(pdfPath)}`;
return res.json({
  message: `Successfully transferred ${containers.length} container(s)`,
  pdfUrl
});

    if (item_type === 'ict_hardware') {
      const { hardware_id, to_location_id, new_computer_name, assigned_to_employee, office_number } = req.body;
      const hardware = await ICTHardware.findById(hardware_id);
      if (!hardware) throw new Error('ICT hardware not found');
      if (req.user.role !== 'admin' && hardware.lab_id !== labId) {
        throw new Error('You can only transfer hardware from your own lab');
      }

      // Use existing ICTHardware.transfer method, but keep lab_id unchanged
      const updated = await ICTHardware.transfer(hardware_id, {
        to_location_id,
        new_computer_name,
        assigned_to_employee,
        office_number
      }, userId);

      return res.json({ message: 'ICT hardware transferred', hardware: updated });
    }

    // Should not reach here
    throw new Error('Invalid item type');
  } catch (err) {
    console.error(err);
    const status = err.message.includes('Source') || err.message.includes('Destination') ||
                   err.message.includes('lab') || err.message.includes('Invalid') ||
                   err.message.includes('not found') ? 400 : 500;
    res.status(status).json({ error: err.message });
  }
});

module.exports = router;