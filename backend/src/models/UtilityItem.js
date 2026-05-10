const db = require('../config/db');

const UtilityItem = {
  async getAll(filters = {}, user = null) {
    let query = db('utility_items')
      .leftJoin('locations', 'utility_items.location_id', 'locations.id')
      .leftJoin('labs', 'utility_items.lab_id', 'labs.id')
      .select(
        'utility_items.*',
        'locations.name as location_name',
        'labs.name as lab_name'
      )
      .where('utility_items.is_deleted', false);

    if (user && user.role === 'lab_keeper') {
      if (!user.lab_id) throw new Error('No lab assigned');
      query = query.where('utility_items.lab_id', user.lab_id);
    } else if (filters.lab_id) {
      query = query.where('utility_items.lab_id', filters.lab_id);
    }

    if (filters.type) query = query.where('utility_items.type', filters.type);
    if (filters.status) query = query.where('utility_items.status', filters.status);
    return query;
  },

  async findById(id) {
    return db('utility_items')
      .leftJoin('locations', 'utility_items.location_id', 'locations.id')
      .leftJoin('labs', 'utility_items.lab_id', 'labs.id')
      .select('utility_items.*', 'locations.name as location_name', 'labs.name as lab_name')
      .where('utility_items.id', id)
      .where('utility_items.is_deleted', false)
      .first();
  },

  async create(data, userId) {
    const [item] = await db('utility_items')
      .insert({
        asset_id: data.asset_id || null,   // optional
        name: data.name,
        type: data.type,
        location_id: data.location_id || null,
        lab_id: data.lab_id,
        total_count: data.total_count || 1,
        status: data.status || 'working',
        properties: data.properties || {},
        is_deleted: false
      })
      .returning('*');
    return this.findById(item.id);
  },

  async update(id, data) {
    const updatable = ['asset_id', 'name', 'type', 'location_id', 'lab_id', 'total_count', 'status', 'properties'];
    const updateData = {};
    updatable.forEach(field => {
      if (data[field] !== undefined) updateData[field] = data[field];
    });
    // asset_id can be nullified explicitly
    if (data.asset_id === null) updateData.asset_id = null;
    updateData.updated_at = db.fn.now();
    await db('utility_items').where({ id }).update(updateData);
    return this.findById(id);
  },

  async softDelete(id) {
    return db('utility_items').where({ id }).update({ is_deleted: true, updated_at: db.fn.now() });
  }
};

module.exports = UtilityItem;