const db = require('../config/db');

const Chemical = {
  async getAll() {
    return db('chemicals')
      .where('chemicals.is_deleted', false)
      .select('chemicals.*')
      .select(
        db.raw(`(
          SELECT COUNT(*) FROM chemical_containers
          WHERE chemical_id = chemicals.id
          AND status = 'unopened'
          AND is_deleted = false
        ) as unopened_count`),
        db.raw(`(
          SELECT COUNT(*) FROM chemical_containers cc
          JOIN locations l ON l.id = cc.location_id
          WHERE cc.chemical_id = chemicals.id
          AND cc.status = 'unopened' AND cc.is_deleted = false
          AND l.type = 'primary'
        ) as primary_count`),
        db.raw(`(
          SELECT COUNT(*) FROM chemical_containers cc
          JOIN locations l ON l.id = cc.location_id
          WHERE cc.chemical_id = chemicals.id
          AND cc.status = 'unopened' AND cc.is_deleted = false
          AND l.type = 'lab_sub'
        ) as sub_count`)
      )
      .then(rows =>
        rows.map(row => {
          const unopened = parseInt(row.unopened_count) || 0;
          let stock_status = 'Not in Stock';
          if (unopened > 0) {
            stock_status = row.reorder_threshold && unopened <= row.reorder_threshold
              ? 'Low'
              : 'In Stock';
          }
          return {
            ...row,
            stock_status,
            stock_display: `${parseInt(row.primary_count) || 0} / ${parseInt(row.sub_count) || 0}`
          };
        })
      );
  },

  async findById(id) {
    const chem = await db('chemicals').where({ id, is_deleted: false }).first();
    if (!chem) return null;
    const unopened = await db('chemical_containers')
      .where({ chemical_id: id, status: 'unopened', is_deleted: false })
      .count('*', { as: 'count' });
    chem.unopened_count = parseInt(unopened[0].count);
    chem.stock_status = chem.unopened_count === 0
      ? 'Not in Stock'
      : (chem.reorder_threshold && chem.unopened_count <= chem.reorder_threshold ? 'Low' : 'In Stock');
    return chem;
  },

  async create({ name, cas_number, reorder_threshold, chemical_type }) {
    const [chem] = await db('chemicals')
      .insert({
        name,
        cas_number: cas_number || null,
        reorder_threshold: reorder_threshold || 1,
        chemical_type: chemical_type || 'Other'
      })
      .returning('*');
    chem.stock_status = 'Not in Stock';
    chem.stock_display = '0 / 0';
    return chem;
  },

  async update(id, fields) {
    const updatable = ['name', 'cas_number', 'reorder_threshold', 'chemical_type'];
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