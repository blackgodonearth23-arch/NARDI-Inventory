const db = require('../config/db');

const UtilityItem = {
  async getAll(filters = {}, user = null) {
    let query = db('utility_items')
      .leftJoin('labs', 'utility_items.lab_id', 'labs.id')
      .select('utility_items.*', 'labs.name as lab_name')
      .where('utility_items.is_deleted', false);

    if (user && user.role === 'lab_keeper') {
      if (!user.lab_id) throw new Error('No lab assigned');
      query = query.where('utility_items.lab_id', user.lab_id);
    } else if (filters.lab_id) {
      query = query.where('utility_items.lab_id', filters.lab_id);
    }

    if (filters.type) query = query.where('utility_items.type', filters.type);
    if (filters.types && Array.isArray(filters.types) && filters.types.length) {
      query = query.whereIn('utility_items.type', filters.types);
    }
    if (filters.status) query = query.where('utility_items.status', filters.status);
    if (filters.parent_id !== undefined) {
      if (filters.parent_id === null) {
        query = query.whereNull('utility_items.parent_id');
      } else {
        query = query.where('utility_items.parent_id', filters.parent_id);
      }
    }
    if (filters.container_type) {
      query = query.where('utility_items.container_type', filters.container_type);
    }

    if (filters.expiring_within_days) {
      const days = filters.expiring_within_days;
      query = query.where('utility_items.expiry_date', '<=', db.raw(`CURRENT_DATE + INTERVAL '${days} days'`))
        .where('utility_items.expiry_date', '>=', db.raw('CURRENT_DATE'));
    }

    return query;
  },

  async findById(id) {
    return db('utility_items')
      .leftJoin('labs', 'utility_items.lab_id', 'labs.id')
      .select('utility_items.*', 'labs.name as lab_name')
      .where('utility_items.id', id)
      .where('utility_items.is_deleted', false)
      .first();
  },

  async getChildren(parentId) {
    return db('utility_items')
      .where({ parent_id: parentId, is_deleted: false })
      .orderBy('name');
  },

  async create(data, userId) {
    const [item] = await db('utility_items')
      .insert({
        asset_id: data.asset_id || null,
        name: data.name,
        type: data.type,
        lab_id: data.lab_id,
        total_count: data.total_count || 1,
        status: data.status || 'working',
        container_type: data.container_type || 'bottle',
        parent_id: data.parent_id || null,
        expiry_date: data.expiry_date || null,
        properties: data.properties || {},
        is_deleted: false
      })
      .returning('*');
    return this.findById(item.id);
  },

  async update(id, data) {
    const updatable = [
      'asset_id', 'name', 'type', 'lab_id', 'total_count', 'status',
      'container_type', 'parent_id', 'expiry_date', 'properties'
    ];
    const updateData = {};
    updatable.forEach(field => {
      if (data[field] !== undefined) updateData[field] = data[field];
    });
    if (data.asset_id === null) updateData.asset_id = null;
    if (data.expiry_date === null) updateData.expiry_date = null;
    updateData.updated_at = db.fn.now();
    await db('utility_items').where({ id }).update(updateData);
    return this.findById(id);
  },

  async softDelete(id) {
    return db('utility_items').where({ id }).update({ is_deleted: true, updated_at: db.fn.now() });
  },

  async getCalibrationDue(days, labId = null) {
    let query = db('utility_items')
      .where('utility_items.type', 'instrument')
      .where('utility_items.is_deleted', false);
    if (labId) query = query.where('utility_items.lab_id', labId);
    query = query.whereRaw(`
      (properties->>'needs_calibration')::boolean = true
      AND (properties->>'calibration_date')::date
          + (COALESCE((properties->>'calibration_interval_days')::int, 0))
        BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '${days} days'
    `);
    return query.select('*');
  }
};

module.exports = UtilityItem;