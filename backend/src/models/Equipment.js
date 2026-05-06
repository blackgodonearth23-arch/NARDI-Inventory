const db = require('../config/db');

const Equipment = {
  async getAll(filters = {}) {
    let query = db('equipment')
      .join('locations', 'equipment.location_id', 'locations.id')
      .select('equipment.*', 'locations.name as location_name')
      .where('equipment.is_deleted', false);
    if (filters.location_id) query = query.where('equipment.location_id', filters.location_id);
    if (filters.lab_id) {
      query = query.join('labs', 'locations.lab_id', 'labs.id')
                   .where('labs.id', filters.lab_id);
    }
    return query;
  },

  async findById(id) {
    return db('equipment').where({ id, is_deleted: false }).first();
  },

  async create(data) {
    const [equip] = await db('equipment').insert(data).returning('*');
    return equip;
  },

  async update(id, data) {
    await db('equipment').where({ id }).update(data);
    return this.findById(id);
  },

  async softDelete(id) {
    return db('equipment').where({ id }).update({ is_deleted: true });
  },

  async reportBroken(id, userId) {
    // Set status to broken and record transaction
    const equip = await this.findById(id);
    if (!equip) throw new Error('Equipment not found');
    await db('equipment').where({ id }).update({ status: 'broken' });
    await db('transactions').insert({
      user_id: userId,
      action_type: 'broken_reported',
      item_type: 'equipment',
      item_id: id,
      from_location_id: equip.location_id,
      to_location_id: null,
      quantity_change: null,
      metadata: { org_serial: equip.org_serial, previous_status: equip.status }
    });
    return this.findById(id);
  }
};

module.exports = Equipment;