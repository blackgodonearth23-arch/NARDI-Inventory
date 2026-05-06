const express = require('express');
const router = express.Router();
const Joi = require('joi');
const db = require('../config/db');
const validate = require('../middleware/validate');
const { authenticate, authorize } = require('../middleware/auth');

// --- Validation schema for transfer request ---
const transferSchema = Joi.object({
  from_location_id: Joi.number().integer().required(),
  to_location_id: Joi.number().integer().required(),
  items: Joi.array().min(1).items(
    Joi.object({
      item_type: Joi.string().valid('bottle', 'equipment', 'utensil').required(),
      item_id: Joi.number().integer().required(),
      quantity: Joi.number().integer().min(1).default(1)  // used only for utensils, but always present
    })
  ).required()
});

// --- Helper: validate that the transfer is Main Storage → Lab Sub-storage ---
async function validateTransferDirection(fromLocationId, toLocationId) {
  const [from] = await db('locations').where({ id: fromLocationId });
  const [to] = await db('locations').where({ id: toLocationId });
  
  if (!from || !to) throw new Error('Invalid location');
  if (from.type !== 'main') throw new Error('Source must be Main Storage');
  if (to.type !== 'lab_sub') throw new Error('Destination must be a Lab Sub-storage');
  
  return { from, to };
}

// --- Process a single transfer item within a transaction ---
async function processItem(trx, userId, fromLocationId, toLocationId, item) {
  const { item_type, item_id, quantity } = item;

  if (item_type === 'bottle') {
    // Move a specific unopened bottle from one location to another
    const bottle = await trx('chemical_bottles')
                      .where({ id: item_id, location_id: fromLocationId, status: 'unopened', is_deleted: false })
                      .first();
    if (!bottle) throw new Error(`Bottle #${item_id} not found or not in source location`);
    
    await trx('chemical_bottles').where({ id: item_id }).update({ location_id: toLocationId });
    
    // Log transaction
    await trx('transactions').insert({
      user_id: userId,
      action_type: 'transfer',
      item_type: 'bottle',
      item_id: item_id,
      from_location_id: fromLocationId,
      to_location_id: toLocationId,
      quantity_change: 1,
      metadata: { pin_5: bottle.pin_5, chemical_id: bottle.chemical_id }
    });
  }
  else if (item_type === 'equipment') {
    // Move a piece of equipment (change location)
    const equip = await trx('equipment')
                      .where({ id: item_id, location_id: fromLocationId, is_deleted: false })
                      .first();
    if (!equip) throw new Error(`Equipment #${item_id} not found or not in source location`);
    
    await trx('equipment').where({ id: item_id }).update({ location_id: toLocationId });
    
    await trx('transactions').insert({
      user_id: userId,
      action_type: 'transfer',
      item_type: 'equipment',
      item_id: item_id,
      from_location_id: fromLocationId,
      to_location_id: toLocationId,
      quantity_change: 1,
      metadata: { org_serial: equip.org_serial, name: equip.name }
    });
  }
  else if (item_type === 'utensil') {
    // Decrement count from source, increment at destination
    const utensil = await trx('utensils')
                        .where({ id: item_id, location_id: fromLocationId, is_deleted: false })
                        .first();
    if (!utensil) throw new Error(`Utensil #${item_id} not found or not in source location`);
    if (utensil.total_count < quantity) throw new Error(`Insufficient quantity (have ${utensil.total_count})`);
    
    // Deduct from source
    await trx('utensils').where({ id: item_id }).decrement('total_count', quantity);
    
    // Look for existing record at destination
    const destUtensil = await trx('utensils')
                            .where({ name: utensil.name, location_id: toLocationId, is_deleted: false })
                            .first();
    if (destUtensil) {
      await trx('utensils').where({ id: destUtensil.id }).increment('total_count', quantity);
    } else {
      await trx('utensils').insert({
        name: utensil.name,
        location_id: toLocationId,
        total_count: quantity,
        is_deleted: false
      });
    }
    
    await trx('transactions').insert({
      user_id: userId,
      action_type: 'transfer',
      item_type: 'utensil',
      item_id: item_id,
      from_location_id: fromLocationId,
      to_location_id: toLocationId,
      quantity_change: quantity,
      metadata: { name: utensil.name }
    });
  }
}

// --- POST /api/transfers ---
router.post('/', authenticate, authorize('lab_keeper'), validate(transferSchema), async (req, res) => {
  const { from_location_id, to_location_id, items } = req.body;
  const userId = req.user.id;

  try {
    // 1. Validate direction
    await validateTransferDirection(from_location_id, to_location_id);

    // 2. Execute transfer in a database transaction
    await db.transaction(async (trx) => {
      for (const item of items) {
        await processItem(trx, userId, from_location_id, to_location_id, item);
      }
    });

    res.json({ message: 'Transfer completed successfully', itemCount: items.length });
  } catch (err) {
    console.error(err);
    // Determine appropriate status code
    if (err.message.includes('not found') || err.message.includes('Invalid') || err.message.includes('Source') || err.message.includes('Destination')) {
      return res.status(400).json({ error: err.message });
    }
    if (err.message.includes('Insufficient')) {
      return res.status(409).json({ error: err.message });
    }
    res.status(500).json({ error: 'Transfer failed' });
  }
});

module.exports = router;