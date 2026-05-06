const db = require('../config/db');

const Lab = {
  async getAll() {
    return db('labs').select('*');
  },

  async findById(id) {
    return db('labs').where({ id }).first();
  },

  async create({ name, description }) {
    const [lab] = await db('labs').insert({ name, description }).returning('*');
    return lab;
  },

  async update(id, { name, description }) {
    await db('labs').where({ id }).update({ name, description });
    return this.findById(id);
  },

  async delete(id) {
    // Hard delete for labs (cascades to locations if FK set correctly)
    return db('labs').where({ id }).del();
  }
};

module.exports = Lab;