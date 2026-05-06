const db = require('../config/db');

const ICTHardware = {
  async getAll(filters = {}) {
    let query = db('ict_hardware')
      .leftJoin('locations', 'ict_hardware.location_id', 'locations.id')
      .leftJoin('users', 'ict_hardware.assigned_to_user_id', 'users.id')
      .select(
        'ict_hardware.*',
        'locations.name as location_name',
        'users.display_name as assigned_user_name'
      )
      .where('ict_hardware.is_deleted', false);
    if (filters.type) query = query.where('ict_hardware.type', filters.type);
    if (filters.status) query = query.where('ict_hardware.status', filters.status);
    return query;
  },

  async findById(id) {
    return db('ict_hardware').where({ id, is_deleted: false }).first();
  },

  async create(data) {
    const [hw] = await db('ict_hardware').insert(data).returning('*');
    return hw;
  },

  async update(id, data) {
    await db('ict_hardware').where({ id }).update(data);
    return this.findById(id);
  },

  async softDelete(id) {
    return db('ict_hardware').where({ id }).update({ is_deleted: true });
  }
};

module.exports = ICTHardware;