const db = require('../config/db');

const Location = {
  async getAll() {
    return db('locations').select('*');
  },

  async findByLab(labId) {
    return db('locations').where({ lab_id: labId }).orWhere({ type: 'main' });
  },

  async findById(id) {
    return db('locations').where({ id }).first();
  },

  async create({ name, type, lab_id, parent_id, description }) {
    const [loc] = await db('locations').insert({
      name, type,
      lab_id: lab_id || null,
      parent_id: parent_id || null,
      description
    }).returning('*');
    return loc;
  },

  async update(id, fields) {
    await db('locations').where({ id }).update(fields);
    return this.findById(id);
  },

  async delete(id) {
    return db('locations').where({ id }).del();
  }
};

module.exports = Location;