const db = require('../config/db');

const ICTHardware = {
  async getAll(filters = {}, user = null) {
    let query = db('ict_hardware')
      .leftJoin('locations', 'ict_hardware.location_id', 'locations.id')
      .leftJoin('users', 'ict_hardware.assigned_to_user_id', 'users.id')
      .leftJoin('labs', 'ict_hardware.lab_id', 'labs.id')
      .select(
        'ict_hardware.*',
        'locations.name as location_name',
        'users.display_name as assigned_user_name',
        'labs.name as lab_name'
      )
      .where('ict_hardware.is_deleted', false);

    // Role‑based filtering
    if (user && user.role === 'ict_keeper') {
      if (!user.lab_id) throw new Error('No branch assigned');
      query = query.where('ict_hardware.lab_id', user.lab_id);
    } else if (filters.lab_id) {
      query = query.where('ict_hardware.lab_id', filters.lab_id);
    }

    if (filters.type) query = query.where('ict_hardware.type', filters.type);
    if (filters.status) query = query.where('ict_hardware.status', filters.status);
    return query;
  },

  async findById(id) {
    return db('ict_hardware')
      .leftJoin('locations', 'ict_hardware.location_id', 'locations.id')
      .leftJoin('users', 'ict_hardware.assigned_to_user_id', 'users.id')
      .select('ict_hardware.*', 'locations.name as location_name', 'users.display_name as assigned_user_name')
      .where('ict_hardware.id', id)
      .where('ict_hardware.is_deleted', false)
      .first();
  },

  async create(data, user = null) {
    // Enforce branch for keeper
    if (user && user.role === 'ict_keeper') {
      data.lab_id = user.lab_id;
    }
    const [hw] = await db('ict_hardware').insert(data).returning('*');
    return this.findById(hw.id);
  },

  async update(id, data, user = null) {
    const existing = await db('ict_hardware').where({ id, is_deleted: false }).first();
    if (!existing) return null;
    if (user && user.role === 'ict_keeper' && existing.lab_id !== user.lab_id) {
      throw new Error('Access denied');
    }
    data.updated_at = db.fn.now();
    await db('ict_hardware').where({ id }).update(data);
    return this.findById(id);
  },

  async transfer(id, { to_lab_id, to_location_id, new_computer_name }, user) {
    const existing = await db('ict_hardware').where({ id, is_deleted: false }).first();
    if (!existing) throw new Error('Hardware not found');
    if (user.role === 'ict_keeper' && existing.lab_id !== user.lab_id) {
      throw new Error('Access denied: you can only transfer from your own branch');
    }
    // Verify destination branch exists
    const destLab = await db('labs').where({ id: to_lab_id }).first();
    if (!destLab) throw new Error('Destination branch not found');

    const updateData = {
      lab_id: to_lab_id,
      location_id: to_location_id || null,
      computer_name: new_computer_name || existing.computer_name,
      updated_at: db.fn.now()
    };
    await db('ict_hardware').where({ id }).update(updateData);
    return this.findById(id);
  },

  async softDelete(id, user = null) {
    const existing = await db('ict_hardware').where({ id, is_deleted: false }).first();
    if (!existing) return;
    if (user && user.role === 'ict_keeper' && existing.lab_id !== user.lab_id) {
      throw new Error('Access denied');
    }
    return db('ict_hardware').where({ id }).update({ is_deleted: true, updated_at: db.fn.now() });
  }
};

module.exports = ICTHardware;