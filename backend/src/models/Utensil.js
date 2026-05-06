const db = require('../config/db');

const Utensil = {
  async getAll(filters = {}) {
    let query = db('utensils')
      .join('locations', 'utensils.location_id', 'locations.id')
      .select('utensils.*', 'locations.name as location_name')
      .where('utensils.is_deleted', false);
    if (filters.location_id) query = query.where('utensils.location_id', filters.location_id);
    if (filters.lab_id) {
      query = query.join('labs', 'locations.lab_id', 'labs.id')
                   .where('labs.id', filters.lab_id);
    }
    return query;
  },

  async findById(id) {
    return db('utensils').where({ id, is_deleted: false }).first();
  },

  async create(data) {
    const [ut] = await db('utensils').insert(data).returning('*');
    return ut;
  },

  async update(id, data) {
    await db('utensils').where({ id }).update(data);
    return this.findById(id);
  },

  async softDelete(id) {
    return db('utensils').where({ id }).update({ is_deleted: true });
  },

  async reportBroken(id, userId, quantity = 1) {
    const utensil = await this.findById(id);
    if (!utensil) throw new Error('Utensil not found');
    if (utensil.total_count < quantity) throw new Error('Not enough quantity to report broken');
    await db('utensils').where({ id }).update({
      total_count: db.raw('total_count - ?', [quantity])
    });
    await db('transactions').insert({
      user_id: userId,
      action_type: 'broken_reported',
      item_type: 'utensil',
      item_id: id,
      from_location_id: utensil.location_id,
      to_location_id: null,
      quantity_change: -quantity,
      metadata: { name: utensil.name }
    });
    return this.findById(id);
  }
};

module.exports = Utensil;