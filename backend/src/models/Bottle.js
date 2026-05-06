const db = require('../config/db');

const Bottle = {
  // Get all non-deleted bottles for a chemical at a location (or all)
  async getByChemical(chemicalId, locationId = null) {
    let query = db('chemical_bottles')
      .join('chemicals', 'chemical_bottles.chemical_id', 'chemicals.id')
      .where('chemical_bottles.chemical_id', chemicalId)
      .where('chemical_bottles.is_deleted', false)
      .select('chemical_bottles.*', 'chemicals.name as chemical_name');
    if (locationId) query = query.where('chemical_bottles.location_id', locationId);
    return query;
  },

  async findById(id) {
    return db('chemical_bottles').where({ id, is_deleted: false }).first();
  },

  async findByPin(pin) {
    return db('chemical_bottles').where({ pin_5: pin, is_deleted: false }).first();
  },

  // Add multiple unopened bottles (bulk insert, returns count)
  async addBottles(chemicalId, locationId, count) {
    // Generate unique 5-digit PINs
    const bottles = [];
    for (let i = 0; i < count; i++) {
      bottles.push({
        chemical_id: chemicalId,
        pin_5: await _generateUniquePin(),
        location_id: locationId,
        status: 'unopened',
        is_deleted: false
      });
    }
    await db('chemical_bottles').insert(bottles);
    return count;
  },

  // Mark a bottle as opened by a user
  async open(pin, userId) {
    const bottle = await this.findByPin(pin);
    if (!bottle) throw new Error('Bottle not found');
    if (bottle.status !== 'unopened') throw new Error('Bottle is already opened or not available');
    
    await db('chemical_bottles').where({ id: bottle.id }).update({
      status: 'opened',
      opened_by: userId,
      opened_at: db.fn.now()
    });
    return this.findById(bottle.id);
  },

  async softDelete(id) {
    await db('chemical_bottles').where({ id }).update({ is_deleted: true });
  }
};

// Internal helper: generate a 5-digit PIN not already in use
async function _generateUniquePin() {
  const existing = (await db('chemical_bottles').select('pin_5').where({ is_deleted: false }))
                   .map(row => row.pin_5);
  let pin;
  do {
    pin = String(Math.floor(10000 + Math.random() * 90000)); // 10000-99999
  } while (existing.includes(pin));
  return pin;
}

module.exports = Bottle;