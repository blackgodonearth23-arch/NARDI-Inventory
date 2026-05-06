const db = require('../config/db');

const Chemical = {
  // Return non-deleted chemicals (with current unopened counts optionally)
  async getAll() {
    return db('chemicals').where({ is_deleted: false }).select('*');
  },

  async findById(id) {
    return db('chemicals').where({ id, is_deleted: false }).first();
  },

  async create({ name, cas_number, unit, reorder_threshold }) {
    const [chem] = await db('chemicals')
      .insert({ name, cas_number, unit, reorder_threshold })
      .returning('*');
    return chem;
  },

  async update(id, fields) {
    const updatable = ['name', 'cas_number', 'unit', 'reorder_threshold'];
    const updateData = {};
    updatable.forEach(field => {
      if (fields[field] !== undefined) updateData[field] = fields[field];
    });
    updateData.updated_at = db.fn.now();
    await db('chemicals').where({ id }).update(updateData);
    return this.findById(id);
  },

  async softDelete(id) {
    await db('chemicals').where({ id }).update({ is_deleted: true, updated_at: db.fn.now() });
  }
};

module.exports = Chemical;