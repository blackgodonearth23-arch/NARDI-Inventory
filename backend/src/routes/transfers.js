const express = require('express');
const router = express.Router();
const Joi = require('joi');
const db = require('../config/db');
const Container = require('../models/Container');
const validate = require('../middleware/validate');
const { authenticate, authorize } = require('../middleware/auth');

const transferSchema = Joi.object({
  chemical_id: Joi.number().integer().required(),
  quantity: Joi.number().integer().min(1).required(),
  from_location_id: Joi.number().integer().required(),
  to_location_id: Joi.number().integer().required()
});

router.post('/', authenticate, authorize('lab_keeper'), validate(transferSchema), async (req, res) => {
  const { chemical_id, quantity, from_location_id, to_location_id } = req.body;
  const userId = req.user.id;
  const labId = req.user.lab_id;

  try {
    // 1. Validate locations
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

    // 2. Execute transfer (model handles PIN generation and logging)
    const containers = await Container.transferContainers(chemical_id, quantity, from_location_id, to_location_id);

    // 3. Update transactions with user_id (since model didn't have it)
    await db('transactions')
      .whereIn('item_id', containers.map(c => c.id))
      .where('action_type', 'transfer')
      .whereNull('user_id')
      .update({ user_id: userId });

    res.json({ message: `Successfully transferred ${containers.length} container(s)` });
  } catch (err) {
    console.error(err);
    const status = err.message.includes('Source') || err.message.includes('Destination') ||
                   err.message.includes('lab') || err.message.includes('Invalid') ? 400 : 500;
    res.status(status).json({ error: err.message });
  }
});

module.exports = router;