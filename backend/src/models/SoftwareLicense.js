const db = require('../config/db');

const SoftwareLicense = {
  async getAll() {
    return db('software_licenses').where({ is_deleted: false }).select('*');
  },

  async findById(id) {
    return db('software_licenses').where({ id, is_deleted: false }).first();
  },

  async create(data) {
    const [lic] = await db('software_licenses').insert({
      name: data.name,
      vendor: data.vendor || null,
      package: data.package || null,
      duration: data.duration || null,
      expiration_date: data.expiration_date || null,
      provider: data.provider || null,
      notes: data.notes || null,
    }).returning('*');
    return lic;
  },

  async update(id, data) {
    const updatable = [
      'name', 'vendor', 'package', 'duration', 'expiration_date',
      'provider', 'notes'
    ];
    const updateData = {};
    updatable.forEach(field => {
      if (data[field] !== undefined) updateData[field] = data[field];
    });
    updateData.updated_at = db.fn.now();
    await db('software_licenses').where({ id }).update(updateData);
    return this.findById(id);
  },

  async softDelete(id) {
    return db('software_licenses').where({ id }).update({ is_deleted: true, updated_at: db.fn.now() });
  }
};

module.exports = SoftwareLicense;