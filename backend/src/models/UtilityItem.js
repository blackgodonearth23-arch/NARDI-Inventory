const db = require('../config/db');

const UtilityItem = {
  async getAll(filters = {}) {
    let query = db('utility_items').where('is_deleted', false);
    if (filters.type) query = query.where('type', filters.type);
    if (filters.status) query = query.where('status', filters.status);
    if (filters.lab_id) {
      query = query.join('locations', 'utility_items.location_id', 'locations.id')
                   .where('locations.lab_id', filters.lab_id)
                   .select('utility_items.*', 'locations.name as location_name');
    }
    return query;
  },

  async findById(id) {
    return db('utility_items').where({ id, is_deleted: false }).first();
  },

  async create(data) {
    const [item] = await db('utility_items').insert(data).returning('*');
    return item;
  },

  async update(id, data) {
    data.updated_at = db.fn.now();
    await db('utility_items').where({ id }).update(data);
    return this.findById(id);
  },

  async softDelete(id) {
    await db('utility_items').where({ id }).update({ is_deleted: true, updated_at: db.fn.now() });
  }
};

module.exports = UtilityItem;